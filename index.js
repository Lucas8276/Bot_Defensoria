const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());

const sheets = google.sheets("v4");

app.post("/webhook", async (req, res) => {
  console.log("Webhook recibido", req.body);

  // Imprimir todos los parámetros para depuración
  console.log("Parametros completos recibidos:", JSON.stringify(req.body.queryResult.parameters, null, 2));

  // Obtener los parámetros desde la intención correctamente
  const { nombreCompleto, documento } = req.body.queryResult.parameters;
  console.log("Parámetros extraídos:", { nombreCompleto, documento });

  if (!nombreCompleto || !documento) {
    console.log("Faltan parámetros: nombreCompleto o documento no encontrados.");
    res.json({
      fulfillmentText: "Faltan parámetros requeridos. Por favor, intenta nuevamente."
    });
    return;
  }

  const intentName = req.body.queryResult.intent.displayName;
  console.log("Intent recibido:", intentName);

  let additionalData = "Área no especificada";

  // Determina el área según la intención
  if (intentName === "Consultas - Servicios Públicos-4") {
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
    // Autenticación con Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON), // Usa el JSON de las credenciales
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();
    console.log("Cliente autenticado correctamente.");

    // Preparar los valores para insertar en Google Sheets
    const valores = [[nombreCompleto, documento, additionalData]];

    console.log("Valores a escribir en Google Sheets:", valores);

    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    console.log("SPREADSHEET_ID:", SPREADSHEET_ID);

    // Escribir en Google Sheets
    await sheets.spreadsheets.values.append({
      auth: client,
      spreadsheetId: SPREADSHEET_ID,
      range: "Hoja 1!A:C", // Asegúrate de que el rango sea correcto
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: valores,
      },
    });

    console.log("Datos escritos en Google Sheets.");
    res.status(200).end();
  } catch (error) {
    console.error("Error al escribir en Google Sheets:", error);
    res.json({ fulfillmentText: "Hubo un error al guardar los datos." });
  }
});

module.exports = app;
