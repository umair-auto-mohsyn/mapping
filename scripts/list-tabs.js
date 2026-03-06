const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function listTabs() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) return;

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
        console.log("Fetching Spreadsheet Metadata for ID:", spreadsheetId);
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const tabs = meta.data.sheets.map(s => s.properties.title);
        console.log("Tabs available:", tabs);
    } catch (e) {
        console.error("Error:", e.message);
        if (e.message.includes("not found")) {
            console.log("The spreadsheet ID might be wrong or the service account does not have access.");
            console.log("Service Account Email:", credentials.client_email);
        }
    }
}

listTabs();
