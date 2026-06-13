// Envía el carrusel de BRA-vs-MAR/previa (ya generado) a Buffer como
// BORRADOR, con la descripción que armamos para Instagram.
//
// Uso:
//   set BUFFER_API_KEY=tu_clave
//   node publish-bra-mar.js

const key = process.env.BUFFER_API_KEY;
if (!key) {
  console.error("Falta BUFFER_API_KEY.");
  process.exit(1);
}

const CHANNEL_ID = "6a2c8db338b55793458cfd3e";

const BASE = "https://raw.githubusercontent.com/Samipty/Mundial-bot/main/salida/BRA-vs-MAR/previa/";
const SLIDES = [
  "slide-1-hook.png",
  "slide-2-story.png",
  "slide-3-quotes.png",
  "slide-4-stats.png",
  "slide-5-injuries.png",
  "slide-6-verdict.png"
];

const TEXT = `Brasil llega como favorito al Grupo C... pero hay un detalle que casi nadie recuerda: la última vez que se enfrentaron, ganó Marruecos 2-1. 🇧🇷🇲🇦

Ancelotti debuta en un Mundial con Vinícius como bandera, pero sin Rodrygo y con Neymar en duda. Del otro lado, Hakimi y Amrabat ya demostraron que se la pueden jugar de tú a tú.

¿Se repite la historia o Brasil cierra la cuenta pendiente?

#Brasil #Marruecos #Mundial2026 #GrupoC #Vinicius #Hakimi`;

const assets = SLIDES.map((s) => `{ image: { url: ${JSON.stringify(BASE + s)} } }`).join(",\n        ");

const query = `
  mutation PublishBraMar {
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
        instagram: { type: post, shouldShareToFeed: true }
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
