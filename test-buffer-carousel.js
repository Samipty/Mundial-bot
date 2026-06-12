// Prueba: crea un post tipo CARRUSEL (varias imágenes) en modo BORRADOR,
// usando las 7 imágenes ya generadas de CAN-vs-BIH/resultado.
//
// Uso:
//   set BUFFER_API_KEY=tu_clave
//   node test-buffer-carousel.js

const key = process.env.BUFFER_API_KEY;
if (!key) {
  console.error("Falta BUFFER_API_KEY.");
  process.exit(1);
}

const CHANNEL_ID = "6a2c8db338b55793458cfd3e";

const BASE = "https://raw.githubusercontent.com/Samipty/Mundial-bot/main/salida/CAN-vs-BIH/resultado/";
const SLIDES = [
  "slide-1-rhook.png",
  "slide-2-story.png",
  "slide-3-goals.png",
  "slide-4-incidentes.png",
  "slide-5-figura.png",
  "slide-6-stats.png",
  "slide-7-cierre.png"
];

const TEXT = "Prueba de carrusel automático — Cara o Cruz ⚽ #Mundial2026 #CANvBIH";

const assets = SLIDES.map((s) => `{ image: { url: ${JSON.stringify(BASE + s)} } }`).join(",\n        ");

const query = `
  mutation TestCarouselDraft {
    createPost(input: {
      text: ${JSON.stringify(TEXT)},
      channelId: "${CHANNEL_ID}",
      schedulingType: automatic,
      mode: addToQueue,
      saveToDraft: true,
      assets: [
        ${assets}
      ],
      metadata: {
        instagram: {
          type: post,
          shouldShareToFeed: true
        }
      }
    }) {
      ... on PostActionSuccess {
        post { id text dueAt assets { id mimeType } }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

const res = await fetch("https://api.buffer.com", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  },
  body: JSON.stringify({ query })
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
