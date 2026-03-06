function dmsToDecimal(degrees, minutes, seconds) {
    return degrees + minutes / 60 + seconds / 3600;
}

function extractCoordinates(raw) {
    if (!raw) return null;

    const decimalRegex = /(-?\d+\.\d+)°?\s*(?:N|S)?\s*[,/]\s*(-?\d+\.\d+)°?\s*(?:E|W)?/i;
    const decimalMatch = raw.match(decimalRegex);
    if (decimalMatch) {
        return { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]) };
    }

    const prefixedRegex = /N\s*(\d{2})(\d{2})(\d{2}\.?\d*)\s*[,/]\s*E\s*(\d{2,3})(\d{2})(\d{2}\.?\d*)/i;
    const prefixedMatch = raw.match(prefixedRegex);
    if (prefixedMatch) {
        return {
            lat: dmsToDecimal(parseFloat(prefixedMatch[1]), parseFloat(prefixedMatch[2]), parseFloat(prefixedMatch[3])),
            lng: dmsToDecimal(parseFloat(prefixedMatch[4]), parseFloat(prefixedMatch[5]), parseFloat(prefixedMatch[6]))
        };
    }

    // 3. DMS format: 24°49'55.7"N 67°04'12.9"E
    const dmsRegex = /(\d+)(?:°|\.)(\d+)'(\d+\.?\d*)"\s*N\s+(\d+)(?:°|\.)(\d+)'(\d+\.?\d*)"\s*E/i;
    const dmsMatch = raw.match(dmsRegex);
    if (dmsMatch) {
        return {
            lat: dmsToDecimal(parseFloat(dmsMatch[1]), parseFloat(dmsMatch[2]), parseFloat(dmsMatch[3])),
            lng: dmsToDecimal(parseFloat(dmsMatch[4]), parseFloat(dmsMatch[5]), parseFloat(dmsMatch[6]))
        };
    }

    return null;
}

const testStrings = [
    "house 228, street 9 G block, sector 2, DHA 11 Rahbar \n97PF+MQR Lahore, Pakistan\n31°23'12.2\"N 74°16'27.8\"E",
    "House #68/B, Main Khayaban-e-Ghalib, DHA Phase 8, Karachi\nhttps://maps.app.goo.gl/cjw2vv7nW99HCHpy7"
];

testStrings.forEach((s, i) => {
    console.log(`\nTest ${i + 1}: ${s.split('\n')[0]}...`);
    const coords = extractCoordinates(s);
    console.log("Result:", coords);
});
