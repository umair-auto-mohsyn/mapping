const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");
const nodeFetch = require("node-fetch");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

function dmsToDecimal(degrees, minutes, seconds) {
    return degrees + minutes / 60 + seconds / 3600;
}

function extractCoordinates(raw) {
    if (!raw) return null;

    // 1. Decimal format: (lat, lng) or just 24.822255, 67.060573
    const decimalRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const decimalMatch = raw.match(decimalRegex);
    if (decimalMatch) {
        return { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]) };
    }

    // 2. Prefixed N/E format without symbols: N333514.24 , E731146.56
    // Assuming DDMMSS.SS format
    const prefixedRegex = /N(\d{2})(\d{2})(\d{2}\.?\d*)\s*,\s*E(\d{2,3})(\d{2})(\d{2}\.?\d*)/;
    const prefixedMatch = raw.match(prefixedRegex);
    if (prefixedMatch) {
        return {
            lat: dmsToDecimal(parseFloat(prefixedMatch[1]), parseFloat(prefixedMatch[2]), parseFloat(prefixedMatch[3])),
            lng: dmsToDecimal(parseFloat(prefixedMatch[4]), parseFloat(prefixedMatch[5]), parseFloat(prefixedMatch[6]))
        };
    }

    // 3. Standard DMS format: 24°49'55.7"N 67°04'12.9"E
    const dmsRegex = /(\d+)°(\d+)'(\d+\.?\d*)"N\s+(\d+)°(\d+)'(\d+\.?\d*)"E/;
    const dmsMatch = raw.match(dmsRegex);
    if (dmsMatch) {
        return {
            lat: dmsToDecimal(parseFloat(dmsMatch[1]), parseFloat(dmsMatch[2]), parseFloat(dmsMatch[3])),
            lng: dmsToDecimal(parseFloat(dmsMatch[4]), parseFloat(dmsMatch[5]), parseFloat(dmsMatch[6]))
        };
    }

    return null;
}

async function geocode(address, apiKey) {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const res = await nodeFetch(url);
        const data = await res.json();
        if (data.status === "OK" && data.results.length > 0) {
            return data.results[0].geometry.location;
        }
    } catch (e) {
        console.error("Geocoding failed for:", address, e.message);
    }
    return null;
}

async function runClientExtraction() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!keyString || !apiKey) throw new Error("Missing keys");

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

    const sourceSpreadsheetId = "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84";
    const targetSpreadsheetId = "1NyHwjHgkjjicZghQVc6wzzl4uXUUi5dLYiJOkehUtMM";

    try {
        console.log("Fetching source clients...");
        const sourceRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sourceSpreadsheetId,
            range: "'Contacts Raw'!A2:O500", // Increased to 500
        });

        const rows = sourceRes.data.values || [];
        const finalClients = [];

        console.log(`Processing ${rows.length} rows...`);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const firstName = row[2] || "Unknown";
            const lastName = row[3] || "Client";
            const email = row[4] || `no-email-${i}@mohsyn.com`;
            const city = row[12];
            const isLive = row[10]; // Column K: Is Live Customer?
            const rawAddress = row[14]; // Column O

            if (isLive !== "Yes" || !rawAddress) continue;

            let lat, lng;
            const foundCoords = extractCoordinates(rawAddress);

            if (foundCoords) {
                lat = foundCoords.lat;
                lng = foundCoords.lng;
                console.log(`  [Found Coords] ${firstName} ${lastName}`);
            } else {
                console.log(`  [Geocoding...] ${firstName} ${lastName} @ ${rawAddress.split('\n')[0]}`);
                // Use first line of address for geocoding
                const cleanAddress = rawAddress.split('\n')[0];
                const gCoords = await geocode(cleanAddress, apiKey);
                if (gCoords) {
                    lat = gCoords.lat;
                    lng = gCoords.lng;
                }
            }

            if (lat && lng) {
                finalClients.push([firstName, lastName, email, city, lat, lng]);
            }
        }

        console.log(`Ready to save ${finalClients.length} clients.`);

        if (finalClients.length > 0) {
            // Write to target sheet
            await sheets.spreadsheets.values.update({
                spreadsheetId: targetSpreadsheetId,
                range: "'Client Coordinates Update'!A2:F" + (finalClients.length + 1),
                valueInputOption: "USER_ENTERED",
                requestBody: { values: finalClients },
            });
            console.log("Successfully updated target sheet!");
        }

    } catch (e) {
        console.error("Extraction failed:", e.stack);
    }
}

runClientExtraction();
