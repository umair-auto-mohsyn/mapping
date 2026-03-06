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

    // 1. Decimal format: (lat, lng) or 24.822255, 67.060573
    const decimalRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const decimalMatch = raw.match(decimalRegex);
    if (decimalMatch) {
        return { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]), method: "Regex (Decimal)" };
    }

    // 2. Prefixed N/E format without symbols: N333514.24 , E731146.56
    const prefixedRegex = /N(\d{2})(\d{2})(\d{2}\.?\d*)\s*,\s*E(\d{2,3})(\d{2})(\d{2}\.?\d*)/;
    const prefixedMatch = raw.match(prefixedRegex);
    if (prefixedMatch) {
        return {
            lat: dmsToDecimal(parseFloat(prefixedMatch[1]), parseFloat(prefixedMatch[2]), parseFloat(prefixedMatch[3])),
            lng: dmsToDecimal(parseFloat(prefixedMatch[4]), parseFloat(prefixedMatch[5]), parseFloat(prefixedMatch[6])),
            method: "Regex (Prefix DMS)"
        };
    }

    // 3. Degree symbol format: 24.9006° N, 67.1164° E
    const degSymbolRegex = /(-?\d+\.\d+)°\s*(?:N|S)\s*,\s*(-?\d+\.\d+)°\s*(?:E|W)/i;
    const degMatch = raw.match(degSymbolRegex);
    if (degMatch) {
        return { lat: parseFloat(degMatch[1]), lng: parseFloat(degMatch[2]), method: "Regex (Degrees)" };
    }

    // 4. Standard DMS format: 24°49'55.7"N 67°04'12.9"E
    const dmsRegex = /(\d+)°(\d+)'(\d+\.?\d*)"N\s+(\d+)°(\d+)'(\d+\.?\d*)"E/;
    const dmsMatch = raw.match(dmsRegex);
    if (dmsMatch) {
        return {
            lat: dmsToDecimal(parseFloat(dmsMatch[1]), parseFloat(dmsMatch[2]), parseFloat(dmsMatch[3])),
            lng: dmsToDecimal(parseFloat(dmsMatch[4]), parseFloat(dmsMatch[5]), parseFloat(dmsMatch[6])),
            method: "Regex (DMS)"
        };
    }

    return null;
}

async function geocode(address, apiKey) {
    if (!apiKey) return null;
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const res = await nodeFetch(url);
        const data = await res.json();
        if (data.status === "OK" && data.results.length > 0) {
            return { lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng, method: "Google Geocoding" };
        }
    } catch (e) { }
    return null;
}

const rawAddresses = [
    `H# 41, 5th Commercial Street, DHA 4, Karachi\nhttps://maps.app.goo.gl/AbhmBeL4r4x8sfua8?g_st=aw\n24.822255, 67.060573`,
    `Teachers Street, Kumharan Wali Gali, Near Madina Super Store, Lodhran\n29.5339° N, 71.6324° E`,
    `H# 306, Phase 1, Malir Cantt, Karachi`,
    `H# A103, Block D, North Nazimabad, Karachi\nhttps://maps.app.goo.gl/Hj89yJ5NEG6XLRmv7`,
    `Apt513, Royal Mall residences, Sector A Bahria enclave, Islamabad\nhttps://maps.app.goo.gl/ZpCA2qwFRmD8qPoo6\n33.68904119541159, 73.21441042599692\n\nN334121.33 , E731255.01`,
    `House 81, Block L, Naval Anchorage, Islamabad (33.566667, 73.201197)`,
    `SDH 349, Street 27, Falcon Complex, Lahore\n31.4909, 74.3207`,
    `House #7, Street #8, Block A, Naval Anchorage, Islamabad\nN333402.12 , E731127.12`,
    `House #7, Street #8, Block ‘A’, Naval Anchorage, Islamabad (33.566723, 73.191313)`,
    `House 13, Street 38, Block M, Naval Anchorage, Islamabad\nN333514.24 , E731146.56`,
    `Phase 2 Commercial Area, Defence Housing Authority, Karachi, 75500, Pakistan\nhttps://maps.app.goo.gl/QSPGfiin2E3JdzQbA\n24°49'55.7"N 67°04'12.9"E`,
    `Apt 59-A, Street 17, Askari IV, Rashid Minhas Road\nhttps://maps.app.goo.gl/rCSmx1P6ed3tngWM7\n24.9006° N, 67.1164° E`,
    `79 G Johar Town Lahore \nhttps://maps.app.goo.gl/VVvziqf57JnTKYHBA\n31.476536, 74.283624`,
    `28 Link Allaudin Road Lahore Cantt\nhttps://maps.app.goo.gl/jRQdg1n6p7iZ57jV9\n(31.527620447977057, 74.37230559577391)`,
    `House no 150, Street no 4, Air Force Officers Housing Society, Falcon Complex, Lehtrar Road`,
    `Apartment 08, Karakoram Blessings, Plot 15, F-11/1. The building is in front of Shaheen Chemist in F-11 Markaz.(33.682096817925476, 72.98625191534424)`,
    `13/d scheme 2, Royal Icon Tower, Tower 1, 3rd floor, Flat no 307, Gulshan e Iqbal\nhttps://maps.app.goo.gl/wuw4g1uNiGCNmMHt7`,
    `Flat 104, KA6, Karimabad Colony, FB Area, Karachi\n24.921534, 67.057995\nhttps://maps.app.goo.gl/S2scPa9kJ8xgrhPP9`,
    `Florida homes apartments 0-21 2nd floor 33rd B St DHA phase 5\n24.7972° N, 67.0412° E`,
    `37A, Street 38, Haider Road, IslamPura, Lahore.\n31.5657° N, 74.2938° E\n(Opposite SahibuZamaan Masjid)`,
    `House -202, street 33, sector A, askari 11 lahore\n31°27'28.3"N 74°26'11.2"E\nhttps://maps.app.goo.gl/qnVqG64ujs5GgDoc8`,
    `689, 2nd floor, Block 10, Liaquatabad, Karachi\n24°54'30.8"N 67°03'04.8"E\n24.908546, 67.051340`,
    `39/1 Khyaban-e-Rahat, DHA Phase 6, Karachi\n24.797569, 67.059000`,
    `Building A-1, Flat 1004, 10th Floor, Rafi Premier Residence, University Road, Scheme 33, Karachi\n24.940674031055135, 67.16334792393671`,
    `House no 277 Block B Punjab Society Defence Road Lahore\n31.45222° N, 74.37444° E`,
    `House number KH-1960, Fauji Metal Road, near Rah-e-Aman, New Lalazar, Rawalpindi\nhttps://maps.app.goo.gl/nscBosz4QQoGP1ve6`,
    `Apartment 15-D, Building 15, Block Askari 1, Chaudhry Khaliq-uz-Zaman Road, Clifton, Karachi (24.835164, 67.038696)`,
    `House no C-364, Block 6, FB Area, Karachi`,
    `278E, E Block, EME Sector, DHA, Thokar Niaz Baig, Lahore\n31.455° N, 74.225° E`,
    `House no C 17/G1, Block 5, Gulshan e Iqbal, Karachi\n24.9207° N, 67.0922° E`,
    `House No. 4, Street No. 9, Sector A, DHA 1, Islamabad\nN333227.26 , E730606.02`,
    `House C10, Block 11, Federal B Area, Karachi\n24.9357° N, 67.0604° E`,
    `House # 15- II, Neelam Block, Allama Iqbal Town, Lahore\n31.5217° N, 74.2993° E`,
    `Address: House number 33A, Street number 9, Adjacent to Amin Furniture, Near Bibi Pak Daman Shrine\n31.56438° N, 74.33979° E`,
    `A 152 Askari 5 Kalma Chowk\n31.4975° N, 74.3852° E`,
    `Address: 149-B Askari V Gulberg III Lahore\n31.5054° N, 74.3500° E`,
    `House # 621, Block A(Extension), State Life Housing (Lake City Meadows), Lahore\n31°26'35.7"N 74°23'31.3"E`,
    `168 Ahmed Block, New Garden Town, Lahore.\n31°30'23.0"N 74°19'14.2"E`,
    `house 228, street 9 G block, sector 2, DHA 11 Rahbar\n31°23'12.2"N 74°16'27.8"E`
];

async function generateTable() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log("| Raw Address Excerpt | Extracted Lat | Extracted Lng | Method |");
    console.log("|---|---|---|---|");

    for (const raw of rawAddresses) {
        let result = extractCoordinates(raw);
        if (!result) {
            const clean = raw.split('\n')[0].replace(/Address: /g, '').replace(/Parents' Address: /g, '');
            result = await geocode(clean, apiKey);
        }

        const excerpt = raw.split('\n')[0].substring(0, 40).replace(/|/g, '') + "...";
        if (result) {
            console.log(`| ${excerpt} | ${result.lat.toFixed(6)} | ${result.lng.toFixed(6)} | ${result.method} |`);
        } else {
            console.log(`| ${excerpt} | FAILED | FAILED | FAILED |`);
        }
    }
}

generateTable();
