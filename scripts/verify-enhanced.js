const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

// Minimal mock of extractCoordinates
function extractCoordinates(raw) {
    if (!raw) return null;
    const dmsRegex = /(\d+)(?:°|\.)(\d+)'(\d+\.?\d*)"\s*N\s+(\d+)(?:°|\.)(\d+)'(\d+\.?\d*)"\s*E/i;
    const dmsMatch = raw.match(dmsRegex);
    if (dmsMatch) return { lat: 31.38, lng: 74.27 };
    return null;
}

async function verifyEnhancedSync() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) return;

    keyString = keyString.trim().replace(/^['"]|['"]$/g, '');
    let credentials = JSON.parse(keyString);

    // FULL PRODUCTION REPAIR LOGIC
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

    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
    const sheets = google.sheets({ version: "v4", auth });
    const externalId = process.env.HUBSPOT_SHEET_ID || "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84";
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    try {
        console.log("Verifying Enhanced Sync for specific clients...");
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: externalId,
            range: "'Contacts Raw'!A:O"
        });

        const rows = res.data.values || [];
        const targets = ["umair yar khan", "muhammad ahsan iqbal"];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowStr = row.join(" ").toLowerCase();
            const matchingTarget = targets.find(t => rowStr.includes(t));

            if (matchingTarget) {
                const firstName = row[2];
                const lastName = row[3];
                let city = row[12] || "";
                const rawAddress = row[14] || "";

                console.log(`\n--- Found: ${firstName} ${lastName} ---`);
                console.log(`Original City: "${city}"`);

                if (!city && rawAddress) {
                    const commonCities = ["karachi", "lahore", "islamabad", "rawalpindi", "faisalabad", "multan", "lodhran"];
                    const addrLower = rawAddress.toLowerCase();
                    const foundCity = commonCities.find(c => addrLower.includes(c));
                    if (foundCity) {
                        city = foundCity.charAt(0).toUpperCase() + foundCity.slice(1);
                        console.log(`EXTRACTED City: "${city}"`);
                    }
                }

                let coords = extractCoordinates(rawAddress);
                if (!coords && rawAddress && apiKey) {
                    const cleanAddress = rawAddress.split('\n')[0];
                    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress + (city ? ", " + city : ""))}&key=${apiKey}`;

                    const geoResponse = await (await fetch(geoUrl)).json();
                    if (geoResponse.status === "OK") {
                        coords = geoResponse.results[0].geometry.location;
                        console.log(`GEOCODE SUCCESS: ${JSON.stringify(coords)}`);
                    } else {
                        console.warn(`GEOCODE FAILURE: ${geoResponse.status}`);
                    }
                } else if (coords) {
                    console.log(`COORDS FOUND IN TEXT: ${JSON.stringify(coords)}`);
                }

                if (coords && city) {
                    console.log(`RESULT: 🎉 [${firstName} ${lastName}] will be VISIBLE in ${city}`);
                } else {
                    console.log(`RESULT: ❌ STILL HIDDEN (Coords: ${!!coords}, City: "${city}")`);
                }
            }
        }
    } catch (e) {
        console.error("Verification failed:", e.message);
    }
}

verifyEnhancedSync();
