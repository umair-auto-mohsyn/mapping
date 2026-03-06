const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function testWriteAccess() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) return;

    keyString = keyString.trim();
    if ((keyString.startsWith("'") && keyString.endsWith("'")) ||
        (keyString.startsWith('"') && keyString.endsWith('"'))) {
        keyString = keyString.slice(1, -1);
    }

    let credentials = JSON.parse(keyString);
    if (credentials.private_key) {
        let key = credentials.private_key.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
        const header = "-----BEGIN PRIVATE KEY-----";
        const footer = "-----END PRIVATE KEY-----";

        if (key.includes(header) && key.includes(footer)) {
            const startIndex = key.indexOf(header) + header.length;
            const endIndex = key.indexOf(footer);
            let base64Part = key.substring(startIndex, endIndex).replace(/[^A-Za-z0-9+/=]/g, "");
            while (base64Part.length % 4 !== 0) {
                base64Part += "=";
            }
            credentials.private_key = `${header}\n${base64Part}\n${footer}`;
        } else {
            credentials.private_key = key;
        }
    }

    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    const externalId = process.env.HUBSPOT_SHEET_ID || "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84";

    try {
        console.log("Testing WRITE access to HubSpot sheet...");
        // Try to update a dummy cell far away (e.g., Z100)
        const res = await sheets.spreadsheets.values.update({
            spreadsheetId: externalId,
            range: "'Contacts Raw'!Z100",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [["Write Test: " + new Date().toISOString()]]
            }
        });
        console.log("Write SUCCESS:", res.statusText);

        // Clear it back
        await sheets.spreadsheets.values.clear({
            spreadsheetId: externalId,
            range: "'Contacts Raw'!Z100"
        });
        console.log("Clear SUCCESS");
    } catch (e) {
        console.error("Write FAILED:", e.message);
        if (e.response && e.response.data) console.error("Details:", e.response.data);
    }
}

testWriteAccess();
