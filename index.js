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
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON), // Usar el JSON de las credenciales desde la variable de entorno
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  console.log("SPREADSHEET_ID:", SPREADSHEET_ID);  // Verifica que el ID se esté extrayendo correctamente

  const intentName = req.body.queryResult.intent.displayName;
  console.log("Intent recibido:", intentName);

  if (intentName === "Consultas") {
    const { nombreCompleto, documento } = req.body.queryResult.parameters;
    console.log("Parámetros recibidos:", { nombreCompleto, documento });}
    else if (intentName.startsWith("Consultas -")) {
      // Extraer los contextos de salida
      const context = req.body.queryResult.outputContexts.find((c) =>
        c.name.includes("consulta_context")
      );
    
      // Asegúrate de extraer correctamente los parámetros del contexto
      const nombreCompleto = context?.parameters?.nombreCompleto || "";
      const documento = context?.parameters?.documento || "";
      let additionalData = "";
    
      // Validar y asignar additionalData según el intent recibido
      if (intentName === "Consultas - Servicios Publicos-4") {
        additionalData = "Servicios Públicos";
      } else if (intentName === "Consultas - Defensa del consumidor-1") {
        additionalData = "Defensa del Consumidor";
      } else if (intentName === "Consultas - Juventud-3") {
        additionalData = "Juventud";
      } else if (intentName === "Consultas - Defensoría Itinerante-5") {
        additionalData = "Defensoría Itinerante";
      } else if (intentName === "Consultas - Derechos De Inquilinos-2") {
        additionalData = "Derechos de Inquilinos";
      } 
    try {
      const client = await auth.getClient();
      console.log("Cliente autenticado correctamente.");

      // Escribir en Google Sheets
      await sheets.spreadsheets.values.append({
        auth: client,
        spreadsheetId: SPREADSHEET_ID,
        range: "Hoja 1!A:C", // Asegúrate de que la hoja y el rango sean correctos
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[nombreCompleto, documento, additionalData]],
        },
      });

      console.log("Datos escritos en Google Sheets.");
      res.status(200).end();
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
