// Orquestador: decide qué generar (previa / resultado) según la hora del partido.
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { research } from "./research.js";
import { renderMatch } from "./render.js";

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
    const data = await research(
      { a: fx.a, b: fx.b, stage: fx.stage, datetime: fx.datetime, venue: fx.venue },
      mode
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
  `\n✅ Listo. Revisa "${config.outDir}/<partido>/previa" y "/resultado",\n` +
  `   aprueba y publica (paso manual por ahora).`
);
