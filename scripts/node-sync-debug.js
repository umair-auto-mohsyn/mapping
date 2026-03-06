console.log("--- DEBUG SCRIPT START ---");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");

const envPath = path.join(__dirname, "../../.env.local");
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

function extractCoordinates(text) {
    if (!text) return null;
    const cleanText = text.replace(/\n/g, ' ');

    const decimalMatch = cleanText.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (decimalMatch) return { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]) };

    const dmsMatch = cleanText.match(/(\d+)°(\d+)'([\d\.]+)"?([NS])\s*(\d+)°(\d+)'([\d\.]+)"?([EW])/i);
    if (dmsMatch) {
        const toDec = (d, m, s, dir) => {
            let res = parseInt(d) + parseInt(m) / 60 + parseFloat(s) / 3600;
            if (dir === 'S' || dir === 'W') res = -res;
            return res;
        };
        return {
            lat: toDec(dmsMatch[1], dmsMatch[2], dmsMatch[3], dmsMatch[4].toUpperCase()),
            lng: toDec(dmsMatch[5], dmsMatch[6], dmsMatch[7], dmsMatch[8].toUpperCase())
        };
    }

    const prefixMatch = cleanText.match(/([NS])\s*(\d{2})(\d{2})(\d{2}\.\d+)\s*,\s*([EW])\s*(\d{2})(\d{2})(\d{2}\.\d+)/i);
    if (prefixMatch) {
        const parsePrefix = (dir, d, m, s) => {
            let res = parseInt(d) + parseInt(m) / 60 + parseFloat(s) / 3600;
            if (dir.toUpperCase() === 'S' || dir.toUpperCase() === 'W') res = -res;
            return res;
        };
        return {
            lat: parsePrefix(prefixMatch[1], prefixMatch[2], prefixMatch[3], prefixMatch[4]),
            lng: parsePrefix(prefixMatch[5], prefixMatch[6], prefixMatch[7], prefixMatch[8])
        };
    }

    return null;
}

async function runDebug() {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) { console.error("GOOGLE_SERVICE_ACCOUNT_KEY NOT FOUND IN ENV"); process.exit(1); }

    keyString = keyString.trim().replace(/^['"]|['"]$/g, '');
    let credentials = JSON.parse(keyString);
    if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
    }

    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = "167tn8tQ_P5tD_BkbLoT6KYvYvMTpaLaukZ8g887vX84";
    console.log("Checking Sheet ID:", spreadsheetId);

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Contacts Raw'!A2:O"
    });

    const rows = res.data.values || [];
    console.log(`Total rows fetched: ${rows.length}`);

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        const name = `${row[2]} ${row[3]}`;
        const city = row[12];
        const addr = row[14] || "";
        const coords = extractCoordinates(addr);
        console.log(`Row ${i + 2}: ${name.padEnd(25)} | City: ${String(city).padEnd(12)} | Coords: ${coords ? "FOUND" : "MISSING"}`);
    }
}

runDebug().catch(err => {
    console.error("CRITICAL ERROR:", err.message);
    process.exit(1);
});
