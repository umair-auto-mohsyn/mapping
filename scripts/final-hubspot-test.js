const { google } = require("googleapis");
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function finalTest() {
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const creds = JSON.parse(rawKey.trim().replace(/^['"]|['"]$/g, ''));

    // Fix key if needed (the app logic)
    if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }

    const auth = new google.auth.JWT(
        creds.client_email,
        null,
        creds.private_key,
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84';

    try {
        console.log(`Checking access to: ${spreadsheetId}`);
        const response = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("Success!");
        console.log("Name:", response.data.properties.title);
        console.log("Tabs:", response.data.sheets.map(s => s.properties.title));
    } catch (err) {
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
    }
}

finalTest();
