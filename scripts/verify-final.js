const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function verifyFinalOptimization() {
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    try {
        console.log("Starting Final Verification...");

        // Find Umair Yar Khan
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: externalId,
            range: "'Contacts Raw'!A:O"
        });

        const rows = res.data.values || [];
        const index = rows.findIndex(row => row.join(" ").toLowerCase().includes("umair yar khan"));

        if (index !== -1) {
            console.log(`Found Umair at Row ${index + 1}`);
            const rawAddress = rows[index][14];
            console.log(`Current Address Field: "${rawAddress.split('\n')[0]}..."`);

            // Perform Geocode (simulated like in the app)
            const city = rows[index][12] || "Karachi";
            const cleanAddress = rawAddress.split('\n')[0];
            const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress + ", " + city)}&key=${apiKey}`;

            const geoRes = await (await fetch(geoUrl)).json();
            if (geoRes.status === "OK") {
                const coords = geoRes.results[0].geometry.location;
                console.log(`Geocode Success: ${coords.lat}, ${coords.lng}`);

                // Write back test
                const updatedAddress = `${rawAddress}\n${coords.lat}, ${coords.lng}`;
                console.log("Writing back to sheet...");
                await sheets.spreadsheets.values.update({
                    spreadsheetId: externalId,
                    range: `'Contacts Raw'!O${index + 1}`,
                    valueInputOption: "USER_ENTERED",
                    requestBody: {
                        values: [[updatedAddress]]
                    }
                });
                console.log("VERIFIED: Write-back Successful!");
            } else {
                console.error("Geocode failed. Is API enabled? Status:", geoRes.status);
                if (geoRes.error_message) console.log("Error:", geoRes.error_message);
            }
        }
    } catch (e) {
        console.error("Verification failed:", e.message);
    }
}

verifyFinalOptimization();
