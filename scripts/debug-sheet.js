const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function debugSheet() {
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

            // Log for debugging
            console.log("Header found:", true);
            console.log("Footer found:", true);
            console.log("Base64 length:", base64Part.length);
            console.log("Base64 Start:", base64Part.substring(0, 20));
            console.log("Base64 End:", base64Part.substring(base64Part.length - 20));

            credentials.private_key = `${header}\n${base64Part}\n${footer}`;
        }
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    try {
        const sheets = google.sheets({ version: "v4", auth });
        const res = await sheets.spreadsheets.get({ spreadsheetId: "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84" });
        console.log("Success! Spreadsheet title:", res.data.properties.title);

        const dataRes = await sheets.spreadsheets.values.get({
            spreadsheetId: "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84",
            range: "'Contacts Raw'!A1:Z5"
        });
        const rows = dataRes.data.values || [];
        rows[0].forEach((h, i) => console.log(`${String.fromCharCode(65 + i)}: ${h}`));
        if (rows[1]) rows[1].forEach((v, i) => console.log(`${String.fromCharCode(65 + i)}: ${v}`));
    } catch (e) {
        console.error("DEBUG ERROR:", e.message);
    }
}

debugSheet();
