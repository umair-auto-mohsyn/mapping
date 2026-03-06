const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function verifyFinal() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) {
        console.error("GOOGLE_SERVICE_ACCOUNT_KEY missing");
        return;
    }

    keyString = keyString.trim().replace(/^['"]|['"]$/g, '');
    let credentials = JSON.parse(keyString);
    if (credentials.private_key) {
        let key = credentials.private_key.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
        const header = "-----BEGIN PRIVATE KEY-----";
        const footer = "-----END PRIVATE KEY-----";
        if (key.includes(header) && key.includes(footer)) {
            const startIndex = key.indexOf(header) + header.length;
            const endIndex = key.indexOf(footer);
            let base64Part = key.substring(startIndex, endIndex).replace(/[^A-Za-z0-9+/=]/g, "");
            while (base64Part.length % 4 !== 0) base64Part += "=";
            credentials.private_key = `${header}\n${base64Part}\n${footer}`;
        }
    }

    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });
    const externalId = "167tn8tQ_P5tD_BkbLoT6KYvYvMTpaLaukZ8g887vX84";

    try {
        console.log("Fetching first 5 rows from HubSpot 'Contacts Raw'...");
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: externalId,
            range: "'Contacts Raw'!A1:O6",
        });
        const rows = res.data.values || [];
        console.log("Successfully fetched HubSpot data!");
        console.log("Headers:", rows[0]);
        console.log("First Data Row Sample:", rows[1]);
        console.log("Total rows fetched for sample:", rows.length);
    } catch (e) {
        console.error("Error fetching HubSpot data:", e.message);
    }
}

verifyFinal();
