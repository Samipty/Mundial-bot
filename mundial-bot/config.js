// Ajustes generales. Edita esto y nada más para personalizar.
export const config = {
  account: "@mundialaldia",

  // Modelo de Claude. Verifica/actualiza el nombre exacto en docs.claude.com
  model: "claude-sonnet-4-6",

  // PREVIA: se genera si el partido arranca dentro de estas horas.
  previaWindowHours: 48,

  // RESULTADO: se genera cuando ya pasaron estas horas desde el inicio
  // (≈ partido terminado), y solo si arrancó dentro de "resultadoLookbackHours".
  resultadoAfterHours: 2.5,
  resultadoLookbackHours: 24,

  generatorPath: "./generator.html",
  outDir: "./salida"
};
