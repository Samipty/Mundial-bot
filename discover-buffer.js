// Descubre tu organizationId y el channelId de tu canal de Instagram en Buffer.
// Uso (en la carpeta del proyecto, con Node instalado):
//
//   Windows (PowerShell):  $env:BUFFER_API_KEY="tu_clave"; node discover-buffer.js
//   Windows (cmd):         set BUFFER_API_KEY=tu_clave && node discover-buffer.js
//
// Imprime la respuesta cruda de Buffer. Busca tu organización y, dentro de
// "channels", el que tenga service: "instagram" — anota sus dos "id".

const key = process.env.BUFFER_API_KEY;
if (!key) {
  console.error("Falta BUFFER_API_KEY. Define la variable de entorno con tu clave personal de Buffer.");
  process.exit(1);
}

const query = `
  query Discover {
    account {
      id
      organizations {
        id
        name
        channels {
          id
          service
          displayName
        }
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

if (data.errors) {
  console.log("\n⚠ La API devolvió errores (arriba). Es una API en beta — si el");
  console.log("  nombre de algún campo cambió, el mensaje de error suele sugerir");
  console.log("  el nombre correcto. Compárteme esta salida completa.");
} else {
  console.log("\n✅ Busca arriba: organizations[].id (organizationId) y, dentro de");
  console.log("   channels[], el que tenga service: \"instagram\" -> ese id es el channelId.");
}
