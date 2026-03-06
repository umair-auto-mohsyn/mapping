const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

async function testGeocode() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const address = "DHA Phase 8, Karachi, Karachi";

    console.log("Testing Geocode API with key:", apiKey.substring(0, 10) + "...");

    // Test standard call
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    try {
        const res = await (await fetch(url)).json();
        console.log("Standard Call Status:", res.status);
        if (res.error_message) console.log("Error Message:", res.error_message);

        // Test with a fake referrer (if it's a referrer restriction)
        const url2 = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const res2 = await (await fetch(url2, {
            headers: { 'Referer': 'http://localhost:3000' }
        })).json();
        console.log("Call with Referrer Status:", res2.status);
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}

testGeocode();
