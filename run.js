// Orquestador: decide qué generar (previa / resultado) según la hora del partido.
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { research } from "./research.js";
import { renderMatch } from "./render.js";
import { getForm, getHeadToHead, getFixtureResult } from "./sportsdata.js";
import { sendToBuffer } from "./publish.js";

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
      { a: fx.a, b: fx.b, stage: fx.stage, datetime: fx.datetime, venue: fx.venue },
      mode,
      officialData
    );
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "match.json"), JSON.stringify(data, null, 2));
    const files = await renderMatch(data, config.generatorPath, dir);
    console.log(`  ✓ ${files.length} PNG en ${dir}`);
    await sendToBuffer(dir, data);
  } catch (err) {
    console.error(`  ✗ Error en ${fx.id} [${mode}]: ${err.message}`);
  }
}

const bufferNote = process.env.BUFFER_API_KEY
  ? `   Los carruseles nuevos ya quedaron como borrador en Buffer — revisa y aprueba ahí.`
  : `   aprueba y publica (paso manual por ahora).`;

console.log(
  `\n✅ Listo. Revisa "${config.outDir}/<partido>/previa" y "/resultado",\n${bufferNote}`
);
