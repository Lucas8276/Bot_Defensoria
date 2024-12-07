const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());

const sheets = google.sheets("v4");

app.post("/webhook", async (req, res) => {
  console.log("Webhook recibido", req.body);  // Verifica que se recibe la solicitud correctamente

  // Autenticación básica (si se desea mantener)
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);

  if (!authHeader || authHeader.indexOf("Basic ") === -1) {
    res.status(401).send("Unauthorized: Missing or invalid credentials");
    return;
  }

  // Decodificar credenciales
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
  const [username, password] = credentials.split(":");

  console.log("Username:", username, "Password:", password);

  // Validar credenciales
  const validUsername = process.env.WEBHOOK_USERNAME;
  const validPassword = process.env.WEBHOOK_PASSWORD;

  if (username !== validUsername || password !== validPassword) {
    res.status(401).send("Unauthorized: Invalid credentials");
    return;
  }

  console.log("Autenticación exitosa");

  // Configurar autenticación con la API de Google Sheets
  const auth = new google.auth.GoogleAuth({
    keyFile: "./prueba-fpgt-62b3ef880b1e.json", // Cambiar si es necesario o usar variables de entorno
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  console.log("SPREADSHEET_ID:", SPREADSHEET_ID);  // Verifica que el ID se esté extrayendo correctamente

  const intentName = req.body.queryResult.intent.displayName;
  console.log("Intent recibido:", intentName);

  if (intentName === "Consultas") {
    const { nombreCompleto, documento } = req.body.queryResult.parameters;
    console.log("Parámetros recibidos:", { nombreCompleto, documento });

    try {
      const client = await auth.getClient();
      console.log("Cliente autenticado correctamente.");

      // Escribir en Google Sheets
      await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId: SPREADSHEET_ID,
        range: "Hoja 1!A:B", // Asegúrate de que la hoja y el rango sean correctos
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[nombreCompleto, documento]],
        },
      });

      console.log("Datos escritos en Google Sheets.");
      res.json({ fulfillmentText: "Los datos se han guardado exitosamente." });
    } catch (error) {
      console.error("Error al escribir en Google Sheets:", error);
      res.json({ fulfillmentText: "Hubo un error al guardar los datos." });
    }
  } else {
    console.log("Intención no manejada:", intentName);
    res.json({ fulfillmentText: "Intención no manejada." });
  }
});

module.exports = app;