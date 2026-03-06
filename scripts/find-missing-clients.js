const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function findMissingClients() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) {
        console.error("GOOGLE_SERVICE_ACCOUNT_KEY missing");
        return;
    }

    keyString = keyString.trim();
    if ((keyString.startsWith("'") && keyString.endsWith("'")) ||
        (keyString.startsWith('"') && keyString.endsWith('"'))) {
        keyString = keyString.slice(1, -1);
    }

    let credentials;
    try {
        credentials = JSON.parse(keyString);
    } catch (e) {
        console.error("Failed to parse JSON:", e.message);
        return;
    }

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

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });
    const externalId = process.env.HUBSPOT_SHEET_ID || "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84";

    try {
        console.log("Searching for Umair Yar khan and Muhammad Ahsan Iqbal...");
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: externalId,
            range: "'Contacts Raw'!A:O"
        });

        const rows = res.data.values || [];
        console.log(`Total rows fetched: ${rows.length}`);

        const targets = ["umair yar khan", "muhammad ahsan iqbal"];

        let foundAny = false;
        rows.forEach((row, index) => {
            const rowStr = row.join(" ").toLowerCase();
            targets.forEach(target => {
                if (rowStr.includes(target)) {
                    foundAny = true;
                    console.log(`\nMATCH FOUND at Row ${index + 1}:`);
                    console.log(JSON.stringify(row, null, 2));

                    // Check if city exists
                    console.log("Serving City (Idx 12):", row[12]);
                    console.log("Address (Idx 14):", row[14]);
                }
            });
        });

        if (!foundAny) {
            console.log("No matches found for targets.");
            // Print a sample of some other new-looking rows
            console.log("\nLast 5 rows in sheet:");
            rows.slice(-5).forEach((r, i) => console.log(`${rows.length - 4 + i}: ${r[2]} ${r[3]} (${r[12]})`));
        }

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response && e.response.data) console.error("Details:", e.response.data);
    }
}

findMissingClients();
