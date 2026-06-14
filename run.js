// Orquestador: decide qué generar (previa / resultado) según la hora del partido.
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { research } from "./research.js";
import { renderMatch } from "./render.js";
import { getForm, getHeadToHead, getFixtureResult } from "./sportsdata.js";

// Colores de selecciones — visibles sobre fondo oscuro #0A0E14.
// Equipos con blanco/colores muy claros usan su color secundario oscuro.
const TEAM_COLORS = {
  ARG: "#74ACDF", BRA: "#F7B71D", MEX: "#006847", ESP: "#AA151B",
  FRA: "#0055A4", POR: "#AD2020", COL: "#D4A017", ENG: "#003090",
  PAN: "#DB0000", NZL: "#1A1A1A", USA: "#002868", CAN: "#CC0001",
  IRN: "#239F40", MAR: "#C1272D", CPV: "#003893", KOR: "#003478",
  CZE: "#D7141A", BIH: "#002395", PAR: "#D52B1E", RSA: "#007A4D",
  AUS: "#00843D", NOR: "#EF2B2D", EGY: "#CC0001", BEL: "#EF3340",
  HAI: "#00209F", QAT: "#8D1B3D", KSA: "#006C35", URU: "#5EB6E4",
  JPN: "#BC002D", CRO: "#FF0000", SCO: "#003087", SUI: "#FF0000",
  SEN: "#00853F", GHA: "#006B3F", TUR: "#E30A17", ALG: "#006233",
  IRQ: "#CC0001", COD: "#007FFF", JOR: "#007A3D", UZB: "#1EB53A",
};

// Aplica colores canónicos a los equipos del partido.
function applyColors(team) {
  const color = TEAM_COLORS[team.code];
  return color ? { ...team, color } : team;
}

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const ONLY = args.includes("--previa") ? "previa" : args.includes("--resultado") ? "resultado" : null;

const fixtures = JSON.parse(fs.readFileSync("./fixtures.json", "utf8"));
const now = Date.now();
const H = 3600 * 1000;

function modesDue(fx) {
  const k = Date.parse(fx.kickoff);
  const modes = [];
  if (ALL) {
    modes.push("previa", "resultado");
  } else {
    // PREVIA: arranca dentro de la ventana hacia adelante
    if (k >= now && k <= now + config.previaWindowHours * H) modes.push("previa");
    // RESULTADO: ya pasó suficiente desde el inicio (terminado) y es reciente
    if (k <= now - config.resultadoAfterHours * H && k >= now - config.resultadoLookbackHours * H)
      modes.push("resultado");
  }
  return ONLY ? modes.filter((m) => m === ONLY) : modes;
}

const jobs = [];
for (const fx of fixtures) {
  for (const mode of modesDue(fx)) {
    const dir = path.join(config.outDir, fx.id, mode);
    if (!ALL && fs.existsSync(path.join(dir, "match.json"))) continue; // ya generado
    jobs.push({ fx, mode, dir });
  }
}

// Trae datos verificados de API-Football (si hay API_SPORTS_KEY y el dato ya
// existe). Devuelve null si no aplica — research() cae a búsqueda web normal.
async function getOfficialData(fx, mode) {
  try {
    if (mode === "previa") {
      const [formA, formB, h2h] = await Promise.all([
        getForm(fx.a.code),
        getForm(fx.b.code),
        getHeadToHead(fx.a.code, fx.b.code)
      ]);
      if (!formA && !formB && !h2h) return null;
      const out = {};
      if (formA) out.formA = formA;
      if (formB) out.formB = formB;
      if (h2h) out.h2h = h2h;
      return out;
    } else {
      return await getFixtureResult(fx.a.code, fx.b.code, fx.kickoff);
    }
  } catch (err) {
    console.error(`  ⚠ API-Sports falló para ${fx.id} [${mode}]: ${err.message}`);
    return null;
  }
}

if (jobs.length === 0) {
  console.log(
    `Nada que generar ahora.\n` +
    `Prueba:  node run.js --all              (todo el calendario, previa + resultado)\n` +
    `         node run.js --all --previa     (solo previas de todo)\n`
  );
  process.exit(0);
}

console.log(`Tareas: ${jobs.length}`);
for (const { fx, mode, dir } of jobs) {
  console.log(`\n▶ ${fx.id} [${mode}] — investigando...`);
  try {
    const officialData = await getOfficialData(fx, mode);
    const data = await research(
      { a: applyColors(fx.a), b: applyColors(fx.b), stage: fx.stage, datetime: fx.datetime, venue: fx.venue, account: config.account },
      mode,
      officialData
    );
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "match.json"), JSON.stringify(data, null, 2));
    const files = await renderMatch(data, config.generatorPath, dir);
    console.log(`  ✓ ${files.length} PNG en ${dir}`);
  } catch (err) {
    console.error(`  ✗ Error en ${fx.id} [${mode}]: ${err.message}`);
  }
}

console.log(
  `\n✅ Listo. Revisa "${config.outDir}/<partido>/previa" y "/resultado".\n` +
  `   (El envío a Buffer, si aplica, es el siguiente paso del workflow.)`
);
