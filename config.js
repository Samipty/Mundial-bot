// Ajustes generales. Edita esto y nada más para personalizar.
//
// Variables de entorno usadas:
//   ANTHROPIC_API_KEY  (obligatoria) — investigación con Claude.
//   API_SPORTS_KEY     (opcional)    — datos verificados de API-Football
//                                      (forma, h2h, marcador, goles, rojas/VAR).
//                                      Sin ella, todo sigue funcionando solo
//                                      con búsqueda web, como antes.
//   BUFFER_API_KEY     (opcional)    — envía cada carrusel nuevo como
//                                      BORRADOR a Buffer (Instagram), listo
//                                      para tu aprobación. Sin ella, el bot
//                                      solo genera los PNG, como antes.
export const config = {
  account: "@caraocruzfutbol",

  // Canal de Instagram en Buffer (de discover-buffer.js). Solo se usa si
  // BUFFER_API_KEY está definida.
  bufferChannelId: "6a2c8db338b55793458cfd3e",

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
