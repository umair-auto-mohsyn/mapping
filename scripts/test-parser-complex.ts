import { extractCoordinates } from "../src/lib/coordinate-parser";

const examples = [
    `H# 41, 5th Commercial Street, DHA 4, Karachi\nhttps://maps.app.goo.gl/AbhmBeL4r4x8sfua8?g_st=aw\n24.822255, 67.060573`,
    `Teachers Street, Kumharan Wali Gali, Near Madina Super Store, Lodhran\n29.5339° N, 71.6324° E`,
    `Apt513, Royal Mall residences, Sector A Bahria enclave, Islamabad\nhttps://maps.app.goo.gl/ZpCA2qwFRmD8qPoo6\n33.68904119541159, 73.21441042599692\n\nN334121.33 , E731255.01`,
    `House 81, Block L, Naval Anchorage, Islamabad (33.566667, 73.201197)`,
    `SDH 349, Street 27, Falcon Complex, Lahore\n31.4909, 74.3207`,
    `House #7, Street #8, Block A, Naval Anchorage, Islamabad\nN333402.12 , E731127.12`,
    `Phase 2 Commercial Area, Defence Housing Authority, Karachi, 75500, Pakistan\n24°49'55.7"N 67°04'12.9"E`,
    `Apt 59-A, Street 17, Askari IV, Rashid Minhas Road\n24.9006° N, 67.1164° E`,
    `79 G Johar Town Lahore \n31.476536, 74.283624`,
    `28 Link Allaudin Road Lahore Cantt\n(31.527620447977057, 74.37230559577391)`,
    `Flat 104, KA6, Karimabad Colony, FB Area, Karachi\n24.921534, 67.057995`,
    `Florida homes apartments 0-21 2nd floor 33rd B St DHA phase 5\n24.7972° N, 67.0412° E`,
    `House -202, street 33, sector A, askari 11 lahore\n31°27'28.3"N 74°26'11.2"E`,
    `Mother's Address: Flat # 14 , G1, Rehman Garden Bhatta Chownk Lhr\nCoordinates: 31°29'13.2"N 74°24'31.5"E`,
    `689, 2nd floor, Block 10, Liaquatabad, Karachi\n24°54'30.8"N 67°03'04.8"E\n24.908546, 67.051340`,
    `39/1 Khyaban-e-Rahat, DHA Phase 6, Karachi\n24.797569, 67.059000`,
    `Address: A-126, Block 3, Gulistan e Jauhar, Karachi\n24.926356, 67.130133`,
    `Building A-1, Flat 1004, 10th Floor, Rafi Premier Residence, University Road, Scheme 33, Karachi\n24.940674031055135, 67.16334792393671`,
    `House no 277 Block B Punjab Society Defence Road Lahore\n31.45222° N, 74.37444° E`,
    `House # 3, Street # 6B, Sector # H, Bahria Enclave, Islamabad\n33°41'10.6"N 73°14'47.3"E\nN334110.89 , E731446.69`,
    `278E, E Block, EME Sector, DHA, Thokar Niaz Baig, Lahore\n31.455° N, 74.225° E`,
    `House no C 17/G1, Block 5, Gulshan e Iqbal, Karachi\n24.9207° N, 67.0922° E`,
    `House No. 4, Street No. 9, Sector A, DHA 1, Islamabad\nN333227.26 , E730606.02`,
    `House # 15- II, Neelam Block, Allama Iqbal Town, Lahore\n31.5217° N, 74.2993° E`,
    `House No. 32, Street No. 8, F11/1, Islamabad\n33.6780381580715, 72.98233236213052`,
    `House no 276 street no 78 F-11/1 Islamabad\n N334040.35 , E725928.28`,
    `Address: House 1359, Street # 47, Sector M, Phase 8, Bahria Town\nN332900.46 , E730432.81`,
    `House no C-46 Shamsi Society near Agha khan lab Warless gate near Airport Karachi. (2nd Floor)\n24°52'58.9"N 67°10'07.2"E\n24.883015, 67.168670`,
    `Flat Number 7, Shamnaz Apartments, B-4, Bath Island, Karachi\n24°49′50″ N, 67°1′43″ E.`,
    `K.Z. Farm, X346+JW6, Brohi Hotel, M-9, near Chand Bangla Gul Goth Chakkar, Sector 15-A/1 Sector 15 A 1 Buffer Zone, Karachi, 75300, Pakistan\n24.956539, 67.062291`,
    `Address: House number 33A, Street number 9, Adjacent to Amin Furniture, Near Bibi Pak Daman Shrine\n31.56438° N, 74.33979° E`,
    `A 152 Askari 5 Kalma Chowk\n31.4975° N, 74.3852° E\nSecond Address:   131 SD askari 5 gulberg 3 lahore \n31.505355° N, 74.34995° E`,
    `S-66, Iqbal Lane 2, DHA Phase 8, Karachi\n24.7732° N, 67.0762° E\nhttps://www.google.com/maps?q=24.7730415,67.0931647&z=17&hl=en`,
    `H17 ,St 28 , F8/1 , Islamabad\n33.7091187603711, 73.03298829825913`,
    `30 House number Street No. 2, Sarwar Colony, Lahore, Pakistan\n31.531449, 74.375702`,
    `Parents' Address: 23/1 Khayaban-e-Shaheen, Phase 5, DHA, Karachi  24°48'51.5"N 67°02'41.9"E\nMother-in-law's Address/Parveen's: 96 Khayaban-e-Shahbaz, Phase 6, DHA Karachi\n24°48'13.7"N+67°03'24.7"E`,
    `House No 39D, Block D, Main Double Road, Media Town\n33°33'34.1"N 73°07'49.1"E`,
    `Address: House number 123, J Block, Lane 5, Phase 5, DHA, Lahore\nLocation: https://maps.google.com/?q=31.458986,74.416679`,
    `Address: 149-B Askari V Gulberg III Lahore\n31.5054° N, 74.3500° E`,
    `Address: 387 GG DHA phase 4, Lahore\nLocation: https://maps.google.com/?q=31.456081,74.386269`,
    `E8 Block 17 Gulshan e Iqbal Karachi 75300\n 24.915° N, 67.105° E`,
    `Address: 76/1 Khayaban-e-Bahria, Phase V, DHA Karachi\n24°48'22.2"N 67°03'14.2"E\nhttps://www.google.com/maps/place/24%C2%B0...`,
    `House # 621, Block A(Extension), State Life Housing (Lake City Meadows), Lahore\n31°26'35.7"N 74°23'31.3"E`,
    `59/II, 22nd lane, Phase 7, Defence, Off Khayaban-e-Badban, Karachi\ngoogle.com/maps?q=24.8274189,67.0721527&z=17&hl=en`,
    `House no. 455 Street 16,\nChaklala Scheme 3, Rawalpindi\n33.58108417924742, 73.09246908963539`,
    `168 Ahmed Block, New Garden Town, Lahore.\n31°30'23.0"N 74°19'14.2"E`,
    `house 228, street 9 G block, sector 2, DHA 11 Rahbar \n97PF+MQR Lahore, Pakistan\n31°23'12.2"N 74°16'27.8"E`
];

let successCount = 0;
let failCount = 0;

examples.forEach((addr, i) => {
    const coords = extractCoordinates(addr);
    if (coords) {
        successCount++;
        console.log(`[PASS ${i + 1}] Lat: ${coords.lat}, Lng: ${coords.lng} | ${addr.split('\\n')[0].substring(0, 50)}...`);
    } else {
        failCount++;
        console.log(`[FAIL ${i + 1}] Could not parse:\n${addr}\n---`);
    }
});

console.log(`\nResults: ${successCount} PASSED, ${failCount} FAILED out of ${examples.length} total.`);
