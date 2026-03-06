const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function finalVerification() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) return;

    keyString = keyString.trim().replace(/^['"]|['"]$/g, '');
    let credentials = JSON.parse(keyString);

    // Exact logic from google-sheets.ts
    if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            private_key: credentials.private_key,
            client_email: credentials.client_email
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    const sheets = google.sheets({ version: "v4", auth });

    const externalId = "167tn8tQ_P5tD_BkbLoT6KYvYvMTpaLaukZ8g887vX84";

    try {
        console.log("Checking HubSpot Sheet Access...");
        const meta = await sheets.spreadsheets.get({ spreadsheetId: externalId });
        console.log("SUCCESS! Title:", meta.data.properties.title);

        const data = await sheets.spreadsheets.values.get({
            spreadsheetId: externalId,
            range: "'Contacts Raw'!A1:O5"
        });
        console.log("Fetched 5 rows successfully!");
        console.log("Columns M and O sample:", data.data.values[1].slice(12, 15));
    } catch (e) {
        console.error("Failed:", e.message);
    }
}

finalVerification();
