// Prueba: crea UNA publicación en modo BORRADOR (no se publica sola — queda
// esperando tu aprobación en la app de Buffer) en tu canal de Instagram, con
// una imagen de prueba y un texto de prueba.
//
// Uso (misma terminal/clave que usamos para discover-buffer.js):
//   set BUFFER_API_KEY=tu_clave
//   node test-buffer.js

const key = process.env.BUFFER_API_KEY;
if (!key) {
  console.error("Falta BUFFER_API_KEY. Define la variable de entorno con tu clave personal de Buffer.");
  process.exit(1);
}

// Tu canal de Instagram en Buffer (de la prueba anterior).
const CHANNEL_ID = "6a2c8db338b55793458cfd3e";

// Una imagen ya generada por el bot, servida desde el repo (debe ser público).
const IMAGE_URL = "https://raw.githubusercontent.com/Samipty/Mundial-bot/main/salida/CAN-vs-BIH/resultado/slide-1-rhook.png";

const TEXT = "Prueba de publicación automática desde Cara o Cruz ⚽ #Mundial2026";

const query = `
  mutation TestDraftPost {
    createPost(input: {
      text: ${JSON.stringify(TEXT)},
      channelId: "${CHANNEL_ID}",
      schedulingType: automatic,
      mode: addToQueue,
      saveToDraft: true,
      assets: [
        { image: { url: ${JSON.stringify(IMAGE_URL)} } }
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
