// Datos oficiales del Mundial vía API-Football (api-sports.io).
//
// Diseño: todo aquí es "best effort, con apagado silencioso". Si falta la
// clave, la API no tiene el dato aún (normal al inicio del torneo), o algo
// falla, las funciones devuelven null y el pipeline sigue funcionando con
// investigación por búsqueda web como hasta ahora — esto NUNCA debe romper
// una corrida.
//
// Cobertura confirmada para el Mundial 2026: league=1, season=2026
// (https://v3.football.api-sports.io/fixtures?league=1&season=2026)

import fs from "fs";
import path from "path";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1; // FIFA World Cup
const SEASON = 2026;
const CACHE_DIR = "./cache";

function authHeader() {
  const key = process.env.API_SPORTS_KEY;
  return key ? { "x-apisports-key": key } : null;
}

async function call(endpoint, params = {}) {
  const headers = authHeader();
  if (!headers) return null;
  const url = new URL(BASE + endpoint);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.response) ? data.response : null;
  } catch {
    return null;
  }
}

function readCache(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, name), "utf8"));
  } catch {
    return null;
  }
}

function writeCache(name, data) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, name), JSON.stringify(data, null, 2));
  } catch {
    /* no-op: si no se puede escribir caché, simplemente se recalcula luego */
  }
}

// Mapa código FIFA (3 letras, el mismo que usamos en fixtures.json) -> id de
// equipo en API-Football. Se calcula una vez y se cachea en cache/team-ids.json
// (ese archivo queda en el repo, así que corridas futuras no repiten la llamada).
let _teamIdsPromise = null;
async function getTeamIdMap() {
  const cached = readCache("team-ids.json");
  if (cached) return cached;
  if (_teamIdsPromise) return _teamIdsPromise;
  _teamIdsPromise = (async () => {
    const teams = await call("/teams", { league: LEAGUE, season: SEASON });
    if (!teams) return {};
    const map = {};
    for (const t of teams) {
      const code = t.team?.code;
      if (code) map[code] = t.team.id;
    }
    if (Object.keys(map).length) writeCache("team-ids.json", map);
    return map;
  })();
  return _teamIdsPromise;
}

// Resultado W/D/L de un fixture desde la perspectiva de teamId.
function resultFor(fx, teamId) {
  const { home, away } = fx.goals || {};
  if (home == null || away == null) return null;
  const isHome = fx.teams?.home?.id === teamId;
  const own = isHome ? home : away;
  const opp = isHome ? away : home;
  if (own > opp) return "W";
  if (own < opp) return "L";
  return "D";
}

// Últimos `n` resultados (W/D/L) de la selección, del más antiguo al más
// reciente. null si no hay datos suficientes o falta la clave.
export async function getForm(code, n = 5) {
  const ids = await getTeamIdMap();
  const id = ids[code];
  if (!id) return null;
  const fixtures = await call("/fixtures", { team: id, last: n, status: "FT" });
  if (!fixtures || !fixtures.length) return null;
  const form = fixtures
    .slice()
    .reverse() // la API entrega más reciente primero
    .map((fx) => resultFor(fx, id))
    .filter(Boolean);
  return form.length ? form : null;
}

// Historial cara a cara reciente entre dos selecciones (perspectiva de codeA).
export async function getHeadToHead(codeA, codeB, n = 5) {
  const ids = await getTeamIdMap();
  const idA = ids[codeA];
  const idB = ids[codeB];
  if (!idA || !idB) return null;
  const fixtures = await call("/fixtures/headtohead", {
    h2h: `${idA}-${idB}`,
    last: n,
    status: "FT"
  });
  if (!fixtures || !fixtures.length) return null;
  let winsA = 0, winsB = 0, draws = 0;
  for (const fx of fixtures) {
    const r = resultFor(fx, idA);
    if (r === "W") winsA++;
    else if (r === "L") winsB++;
    else if (r === "D") draws++;
  }
  return { matches: fixtures.length, winsA, winsB, draws };
}

// Busca el fixture_id de API-Football para un partido del Mundial dado el
// código de ambas selecciones y la fecha aproximada (ISO) de fixtures.json.
async function findFixtureId(codeA, codeB, isoDate) {
  const ids = await getTeamIdMap();
  const idA = ids[codeA];
  const idB = ids[codeB];
  if (!idA || !idB) return null;
  const date = String(isoDate).slice(0, 10); // YYYY-MM-DD
  const fixtures = await call("/fixtures", { league: LEAGUE, season: SEASON, date });
  if (!fixtures) return null;
  const match = fixtures.find((fx) => {
    const h = fx.teams?.home?.id;
    const a = fx.teams?.away?.id;
    return (h === idA && a === idB) || (h === idB && a === idA);
  });
  return match ? match.fixture.id : null;
}

const cardLabel = { "Red Card": "Tarjeta roja", "Yellow Card": "Tarjeta amarilla" };

// Resultado oficial ya finalizado: marcador, goles (minuto/jugador/equipo) y
// tarjetas rojas / revisiones VAR. Devuelve null si el partido aún no termina
// (status != FT) o si no hay datos — en ese caso el bot sigue con búsqueda web.
export async function getFixtureResult(codeA, codeB, isoDate) {
  const fixtureId = await findFixtureId(codeA, codeB, isoDate);
  if (!fixtureId) return null;

  const ids = await getTeamIdMap();
  const idA = ids[codeA];

  const fx = await call("/fixtures", { id: fixtureId });
  if (!fx || !fx[0]) return null;
  const f = fx[0];
  if (f.fixture?.status?.short !== "FT") return null; // todavía no termina

  const homeIsA = f.teams?.home?.id === idA;
  const score = homeIsA
    ? { a: f.goals.home, b: f.goals.away }
    : { a: f.goals.away, b: f.goals.home };

  const events = (await call("/fixtures/events", { fixture: fixtureId })) || [];
  const sideOf = (teamId) => (teamId === idA ? "a" : "b");
  const minuteOf = (e) => String(e.time.elapsed) + (e.time.extra ? `+${e.time.extra}` : "");

  const goals = events
    .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty")
    .map((e) => ({
      minute: minuteOf(e),
      player: e.player?.name || "",
      team: sideOf(e.team.id)
    }));

  // Solo lo objetivo (rojas y revisiones VAR). Amarillas relevantes y
  // momentos polémicos los sigue cubriendo Claude vía búsqueda web.
  const incidents = events
    .filter((e) => (e.type === "Card" && e.detail === "Red Card") || e.type === "Var")
    .map((e) => ({
      minute: minuteOf(e),
      type: e.type === "Var" ? "var" : "roja",
      player: e.player?.name || "",
      team: sideOf(e.team.id),
      note: e.comments || cardLabel[e.detail] || e.detail || ""
    }));

  return { score, goals, incidents };
}
