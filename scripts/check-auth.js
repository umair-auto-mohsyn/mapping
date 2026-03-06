const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function checkAuth() {
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

    const primaryId = "1NyHwjHgkjjicZghQVc6wzzl4uXUUi5dLYiJOkehUtMM";
    const externalId = "167tn8tQ_P5tD_BkbLoT6KYvYvMTpaLaukZ8g887vX84";

    console.log("Service Account:", credentials.client_email);

    try {
        console.log("Checking Primary Sheet...");
        const primaryMeta = await sheets.spreadsheets.get({ spreadsheetId: primaryId });
        console.log("Primary Sheet Success! Tabs:", primaryMeta.data.sheets.map(s => s.properties.title));
    } catch (e) {
        console.error("Primary Sheet Error:", e.message);
    }

    try {
        console.log("Checking HubSpot Sheet...");
        const externalMeta = await sheets.spreadsheets.get({ spreadsheetId: externalId });
        console.log("HubSpot Sheet Success! Tabs:", externalMeta.data.sheets.map(s => s.properties.title));
    } catch (e) {
        console.error("HubSpot Sheet Error:", e.message);
    }
}

checkAuth();
