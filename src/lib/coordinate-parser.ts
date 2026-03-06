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

    // 1. Decimal format: (lat, lng) or just lat, lng
    const decimalRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const decimalMatch = raw.match(decimalRegex);
    if (decimalMatch) {
        return { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]) };
    }

    // 2. Prefixed N/E format without symbols: N334121.33 , E731255.01
    // This looks like DDMMSS.SS or similar. 
    // From user image: N333514.24 -> 33°35'14.24" -> 33.58728
    const prefixedRegex = /N(\d{2})(\d{2})(\d{2}\.?\d*)\s*,\s*E(\d{2})(\d{2})(\d{2}\.?\d*)/;
    const prefixedMatch = raw.match(prefixedRegex);
    if (prefixedMatch) {
        const lat = dmsToDecimal(parseFloat(prefixedMatch[1]), parseFloat(prefixedMatch[2]), parseFloat(prefixedMatch[3]));
        const lng = dmsToDecimal(parseFloat(prefixedMatch[4]), parseFloat(prefixedMatch[5]), parseFloat(prefixedMatch[6]));
        return { lat, lng };
    }

    // 3. Standard DMS format: 24°49'55.7"N 67°04'12.9"E
    const dmsRegex = /(\d+)°(\d+)'(\d+\.?\d*)"N\s+(\d+)°(\d+)'(\d+\.?\d*)"E/;
    const dmsMatch = raw.match(dmsRegex);
    if (dmsMatch) {
        const lat = dmsToDecimal(parseFloat(dmsMatch[1]), parseFloat(dmsMatch[2]), parseFloat(dmsMatch[3]));
        const lng = dmsToDecimal(parseFloat(dmsMatch[4]), parseFloat(dmsMatch[5]), parseFloat(dmsMatch[6]));
        return { lat, lng };
    }

    return null;
}

function dmsToDecimal(degrees: number, minutes: number, seconds: number): number {
    return degrees + minutes / 60 + seconds / 3600;
}
