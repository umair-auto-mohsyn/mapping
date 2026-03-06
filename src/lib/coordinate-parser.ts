import { Client } from "../types";

/**
 * Extracts Latitude and Longitude from inconsistent string formats.
 * Handles:
 * 1. Decimal: "24.822255, 67.060573"
 * 2. DMS: "24°49'55.7"N 67°04'12.9"E"
 * 3. Prefixed: "N334121.33 , E731255.01"
 * 4. Parentheses: "Islamabad (33.586667, 73.201197)"
 */
export function extractCoordinates(raw: string): { lat: number, lng: number } | null {
    if (!raw) return null;

    // 1. Decimal format: (lat, lng) or just lat, lng or 24.9006° N, 67.1164° E (simple decimal degrees with suffix)
    // Also handles (33.586667, 73.201197) and 31.4909, 74.3207
    const decimalRegex = /(-?\d+\.\d+)°?\s*(?:N|S)?\s*[,/]\s*(-?\d+\.\d+)°?\s*(?:E|W)?/i;
    const decimalMatch = raw.match(decimalRegex);
    if (decimalMatch) {
        return { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]) };
    }

    // 2. Prefixed N/E format: N334121.33 , E731255.01 (DDMMSS.SS)
    const prefixedRegex = /N\s*(\d{2})(\d{2})(\d{2}\.?\d*)\s*[,/]\s*E\s*(\d{2,3})(\d{2})(\d{2}\.?\d*)/i;
    const prefixedMatch = raw.match(prefixedRegex);
    if (prefixedMatch) {
        return {
            lat: dmsToDecimal(parseFloat(prefixedMatch[1]), parseFloat(prefixedMatch[2]), parseFloat(prefixedMatch[3])),
            lng: dmsToDecimal(parseFloat(prefixedMatch[4]), parseFloat(prefixedMatch[5]), parseFloat(prefixedMatch[6]))
        };
    }

    // 3. DMS format: 24°49'55.7"N 67°04'12.9"E or 24.49'55.7"N 67.04'12.9"E
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

function dmsToDecimal(degrees: number, minutes: number, seconds: number): number {
    return degrees + minutes / 60 + seconds / 3600;
}
