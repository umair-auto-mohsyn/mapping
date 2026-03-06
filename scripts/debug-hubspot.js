const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function debugHubSpot() {
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
    const spreadsheetId = "167tn8tQ_P5tD_BkbLoT6KYvYvMTpaLaukZ8g887vX84";

    try {
        console.log("Fetching Sheet Metadata...");
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const tabs = meta.data.sheets.map(s => s.properties.title);
        console.log("Tabs available:", tabs);

        console.log("Fetching 'Contacts Raw' Headers...");
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'Contacts Raw'!A1:P2", // Fetch headers and first row
        });
        const rows = res.data.values || [];
        if (rows.length > 0) {
            console.log("Headers (Row 1):", rows[0]);
            if (rows.length > 1) {
                console.log("First Data Row (Row 2):", rows[1]);
            }
        } else {
            console.log("No data found in 'Contacts Raw'");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

debugHubSpot();
