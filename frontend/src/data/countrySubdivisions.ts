export interface CountrySubdivision {
  id: string;
  name: string;
  countryCode: string;
  type: 'State' | 'Province' | 'Territory' | 'Region' | 'City' | 'National' | 'Country';
  center: [number, number]; // [lat, lng]
  zoom: number;
  bbox: { w: number; s: number; e: number; n: number; str: string };
  districtsOrCounties?: number;
  capital?: string;
}

function makeBbox(lat: number, lng: number, zoom: number): { w: number; s: number; e: number; n: number; str: string } {
  const spanLat = zoom >= 11 ? 0.35 : zoom >= 10 ? 0.65 : zoom >= 8 ? 1.5 : zoom >= 7 ? 2.5 : 4.0;
  const spanLng = spanLat * 1.2;
  const s = Math.max(-85, Number((lat - spanLat).toFixed(4)));
  const n = Math.min(85, Number((lat + spanLat).toFixed(4)));
  const w = Math.max(-180, Number((lng - spanLng).toFixed(4)));
  const e = Math.min(180, Number((lng + spanLng).toFixed(4)));
  return { w, s, e, n, str: `${w},${s},${e},${n}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-COMPILED COMPREHENSIVE SUBDIVISIONS (STATES & CITIES) FOR MAJOR COUNTRIES
// ─────────────────────────────────────────────────────────────────────────────
const SUBDIVISIONS_BY_COUNTRY: Record<string, CountrySubdivision[]> = {
  // ─── INDIA (IND) ──────────────────────────────────────────────────────────
  IND: [
    { id: 'IND-ALL', name: 'All India (National)', countryCode: 'IND', type: 'National', center: [22.8, 82.5], zoom: 5, bbox: { w: 68.0, s: 6.5, e: 98.0, n: 37.5, str: '68,6.5,98,37.5' }, districtsOrCounties: 780 },
    { id: 'IND-AP', name: 'Andhra Pradesh', countryCode: 'IND', type: 'State', center: [15.9129, 79.74], zoom: 7, bbox: makeBbox(15.9129, 79.74, 7), districtsOrCounties: 26, capital: 'Amaravati' },
    { id: 'IND-AR', name: 'Arunachal Pradesh', countryCode: 'IND', type: 'State', center: [28.218, 94.7278], zoom: 7, bbox: makeBbox(28.218, 94.7278, 7), districtsOrCounties: 26, capital: 'Itanagar' },
    { id: 'IND-AS', name: 'Assam', countryCode: 'IND', type: 'State', center: [26.2006, 92.9376], zoom: 7, bbox: makeBbox(26.2006, 92.9376, 7), districtsOrCounties: 35, capital: 'Dispur' },
    { id: 'IND-BR', name: 'Bihar', countryCode: 'IND', type: 'State', center: [25.0961, 85.3131], zoom: 7, bbox: makeBbox(25.0961, 85.3131, 7), districtsOrCounties: 38, capital: 'Patna' },
    { id: 'IND-CG', name: 'Chhattisgarh', countryCode: 'IND', type: 'State', center: [21.2787, 81.8661], zoom: 7, bbox: makeBbox(21.2787, 81.8661, 7), districtsOrCounties: 33, capital: 'Raipur' },
    { id: 'IND-GA', name: 'Goa', countryCode: 'IND', type: 'State', center: [15.2993, 74.124], zoom: 9, bbox: makeBbox(15.2993, 74.124, 9), districtsOrCounties: 2, capital: 'Panaji' },
    { id: 'IND-GJ', name: 'Gujarat', countryCode: 'IND', type: 'State', center: [22.2587, 71.1924], zoom: 7, bbox: makeBbox(22.2587, 71.1924, 7), districtsOrCounties: 33, capital: 'Gandhinagar' },
    { id: 'IND-HR', name: 'Haryana', countryCode: 'IND', type: 'State', center: [29.0588, 76.0856], zoom: 7, bbox: makeBbox(29.0588, 76.0856, 7), districtsOrCounties: 22, capital: 'Chandigarh' },
    { id: 'IND-HP', name: 'Himachal Pradesh', countryCode: 'IND', type: 'State', center: [31.1048, 77.1734], zoom: 7, bbox: makeBbox(31.1048, 77.1734, 7), districtsOrCounties: 12, capital: 'Shimla' },
    { id: 'IND-JH', name: 'Jharkhand', countryCode: 'IND', type: 'State', center: [23.6102, 85.2799], zoom: 7, bbox: makeBbox(23.6102, 85.2799, 7), districtsOrCounties: 24, capital: 'Ranchi' },
    { id: 'IND-KA', name: 'Karnataka', countryCode: 'IND', type: 'State', center: [15.3173, 75.7139], zoom: 7, bbox: makeBbox(15.3173, 75.7139, 7), districtsOrCounties: 31, capital: 'Bengaluru' },
    { id: 'IND-KL', name: 'Kerala', countryCode: 'IND', type: 'State', center: [10.8505, 76.2711], zoom: 7, bbox: makeBbox(10.8505, 76.2711, 7), districtsOrCounties: 14, capital: 'Thiruvananthapuram' },
    { id: 'IND-MP', name: 'Madhya Pradesh', countryCode: 'IND', type: 'State', center: [22.9734, 78.6569], zoom: 7, bbox: makeBbox(22.9734, 78.6569, 7), districtsOrCounties: 55, capital: 'Bhopal' },
    { id: 'IND-MH', name: 'Maharashtra', countryCode: 'IND', type: 'State', center: [19.7515, 75.7139], zoom: 7, bbox: makeBbox(19.7515, 75.7139, 7), districtsOrCounties: 36, capital: 'Mumbai' },
    { id: 'IND-MN', name: 'Manipur', countryCode: 'IND', type: 'State', center: [24.6637, 93.9063], zoom: 8, bbox: makeBbox(24.6637, 93.9063, 8), districtsOrCounties: 16, capital: 'Imphal' },
    { id: 'IND-ML', name: 'Meghalaya', countryCode: 'IND', type: 'State', center: [25.467, 91.3662], zoom: 8, bbox: makeBbox(25.467, 91.3662, 8), districtsOrCounties: 12, capital: 'Shillong' },
    { id: 'IND-MZ', name: 'Mizoram', countryCode: 'IND', type: 'State', center: [23.1645, 92.9376], zoom: 8, bbox: makeBbox(23.1645, 92.9376, 8), districtsOrCounties: 11, capital: 'Aizawl' },
    { id: 'IND-NL', name: 'Nagaland', countryCode: 'IND', type: 'State', center: [26.1584, 94.5624], zoom: 8, bbox: makeBbox(26.1584, 94.5624, 8), districtsOrCounties: 16, capital: 'Kohima' },
    { id: 'IND-OD', name: 'Odisha', countryCode: 'IND', type: 'State', center: [20.9517, 85.0985], zoom: 7, bbox: makeBbox(20.9517, 85.0985, 7), districtsOrCounties: 30, capital: 'Bhubaneswar' },
    { id: 'IND-PB', name: 'Punjab', countryCode: 'IND', type: 'State', center: [31.1471, 75.3412], zoom: 7, bbox: makeBbox(31.1471, 75.3412, 7), districtsOrCounties: 23, capital: 'Chandigarh' },
    { id: 'IND-RJ', name: 'Rajasthan', countryCode: 'IND', type: 'State', center: [27.0238, 74.2179], zoom: 6, bbox: makeBbox(27.0238, 74.2179, 6), districtsOrCounties: 50, capital: 'Jaipur' },
    { id: 'IND-SK', name: 'Sikkim', countryCode: 'IND', type: 'State', center: [27.533, 88.5122], zoom: 8, bbox: makeBbox(27.533, 88.5122, 8), districtsOrCounties: 6, capital: 'Gangtok' },
    { id: 'IND-TN', name: 'Tamil Nadu', countryCode: 'IND', type: 'State', center: [11.1271, 78.6569], zoom: 7, bbox: makeBbox(11.1271, 78.6569, 7), districtsOrCounties: 38, capital: 'Chennai' },
    { id: 'IND-TS', name: 'Telangana', countryCode: 'IND', type: 'State', center: [18.1124, 79.0193], zoom: 7, bbox: makeBbox(18.1124, 79.0193, 7), districtsOrCounties: 33, capital: 'Hyderabad' },
    { id: 'IND-TR', name: 'Tripura', countryCode: 'IND', type: 'State', center: [23.9408, 91.9882], zoom: 8, bbox: makeBbox(23.9408, 91.9882, 8), districtsOrCounties: 8, capital: 'Agartala' },
    { id: 'IND-UP', name: 'Uttar Pradesh', countryCode: 'IND', type: 'State', center: [26.8467, 80.9462], zoom: 7, bbox: makeBbox(26.8467, 80.9462, 7), districtsOrCounties: 75, capital: 'Lucknow' },
    { id: 'IND-UK', name: 'Uttarakhand', countryCode: 'IND', type: 'State', center: [30.0668, 79.0193], zoom: 7, bbox: makeBbox(30.0668, 79.0193, 7), districtsOrCounties: 13, capital: 'Dehradun' },
    { id: 'IND-WB', name: 'West Bengal', countryCode: 'IND', type: 'State', center: [22.9868, 87.855], zoom: 7, bbox: makeBbox(22.9868, 87.855, 7), districtsOrCounties: 23, capital: 'Kolkata' },
    { id: 'IND-DL', name: 'Delhi (NCT)', countryCode: 'IND', type: 'City', center: [28.7041, 77.1025], zoom: 10, bbox: makeBbox(28.7041, 77.1025, 10), districtsOrCounties: 11, capital: 'New Delhi' },
    { id: 'IND-JK', name: 'Jammu & Kashmir', countryCode: 'IND', type: 'Territory', center: [33.7782, 76.5762], zoom: 7, bbox: makeBbox(33.7782, 76.5762, 7), districtsOrCounties: 20, capital: 'Srinagar' },
    { id: 'IND-LA', name: 'Ladakh', countryCode: 'IND', type: 'Territory', center: [34.1526, 77.5771], zoom: 7, bbox: makeBbox(34.1526, 77.5771, 7), districtsOrCounties: 2, capital: 'Leh' },
  ],

  // ─── UNITED STATES (USA) ──────────────────────────────────────────────────
  USA: [
    { id: 'USA-ALL', name: 'All United States (National)', countryCode: 'USA', type: 'National', center: [37.09, -95.71], zoom: 4, bbox: { w: -125.0, s: 24.5, e: -66.9, n: 49.5, str: '-125,24.5,-66.9,49.5' }, districtsOrCounties: 3143 },
    { id: 'USA-CA', name: 'California', countryCode: 'USA', type: 'State', center: [36.7783, -119.4179], zoom: 6, bbox: makeBbox(36.7783, -119.4179, 6), districtsOrCounties: 58, capital: 'Sacramento' },
    { id: 'USA-TX', name: 'Texas', countryCode: 'USA', type: 'State', center: [31.9686, -99.9018], zoom: 6, bbox: makeBbox(31.9686, -99.9018, 6), districtsOrCounties: 254, capital: 'Austin' },
    { id: 'USA-FL', name: 'Florida', countryCode: 'USA', type: 'State', center: [27.6648, -81.5158], zoom: 6, bbox: makeBbox(27.6648, -81.5158, 6), districtsOrCounties: 67, capital: 'Tallahassee' },
    { id: 'USA-OR', name: 'Oregon', countryCode: 'USA', type: 'State', center: [43.8041, -120.5542], zoom: 6, bbox: makeBbox(43.8041, -120.5542, 6), districtsOrCounties: 36, capital: 'Salem' },
    { id: 'USA-WA', name: 'Washington', countryCode: 'USA', type: 'State', center: [47.7511, -120.7401], zoom: 6, bbox: makeBbox(47.7511, -120.7401, 6), districtsOrCounties: 39, capital: 'Olympia' },
    { id: 'USA-AZ', name: 'Arizona', countryCode: 'USA', type: 'State', center: [34.0489, -111.0937], zoom: 6, bbox: makeBbox(34.0489, -111.0937, 6), districtsOrCounties: 15, capital: 'Phoenix' },
    { id: 'USA-CO', name: 'Colorado', countryCode: 'USA', type: 'State', center: [39.5501, -105.7821], zoom: 6, bbox: makeBbox(39.5501, -105.7821, 6), districtsOrCounties: 64, capital: 'Denver' },
    { id: 'USA-ID', name: 'Idaho', countryCode: 'USA', type: 'State', center: [44.0682, -114.742], zoom: 6, bbox: makeBbox(44.0682, -114.742, 6), districtsOrCounties: 44, capital: 'Boise' },
    { id: 'USA-MT', name: 'Montana', countryCode: 'USA', type: 'State', center: [46.8797, -110.3626], zoom: 6, bbox: makeBbox(46.8797, -110.3626, 6), districtsOrCounties: 56, capital: 'Helena' },
    { id: 'USA-NM', name: 'New Mexico', countryCode: 'USA', type: 'State', center: [34.5199, -105.8701], zoom: 6, bbox: makeBbox(34.5199, -105.8701, 6), districtsOrCounties: 33, capital: 'Santa Fe' },
    { id: 'USA-NV', name: 'Nevada', countryCode: 'USA', type: 'State', center: [38.8026, -116.4194], zoom: 6, bbox: makeBbox(38.8026, -116.4194, 6), districtsOrCounties: 17, capital: 'Carson City' },
    { id: 'USA-UT', name: 'Utah', countryCode: 'USA', type: 'State', center: [39.321, -111.0937], zoom: 6, bbox: makeBbox(39.321, -111.0937, 6), districtsOrCounties: 29, capital: 'Salt Lake City' },
    { id: 'USA-WY', name: 'Wyoming', countryCode: 'USA', type: 'State', center: [43.0759, -107.2903], zoom: 6, bbox: makeBbox(43.0759, -107.2903, 6), districtsOrCounties: 23, capital: 'Cheyenne' },
    { id: 'USA-AK', name: 'Alaska', countryCode: 'USA', type: 'State', center: [64.2008, -149.4937], zoom: 5, bbox: makeBbox(64.2008, -149.4937, 5), districtsOrCounties: 29, capital: 'Juneau' },
    { id: 'USA-NY', name: 'New York', countryCode: 'USA', type: 'State', center: [40.7128, -74.006], zoom: 7, bbox: makeBbox(40.7128, -74.006, 7), districtsOrCounties: 62, capital: 'Albany' },
    { id: 'USA-LA-CITY', name: 'Los Angeles Metro', countryCode: 'USA', type: 'City', center: [34.0522, -118.2437], zoom: 9, bbox: makeBbox(34.0522, -118.2437, 9), capital: 'Los Angeles' },
    { id: 'USA-SF-BAY', name: 'San Francisco Bay Area', countryCode: 'USA', type: 'City', center: [37.7749, -122.4194], zoom: 9, bbox: makeBbox(37.7749, -122.4194, 9), capital: 'San Francisco' },
    { id: 'USA-HOU-CITY', name: 'Houston Metro Corridor', countryCode: 'USA', type: 'City', center: [29.7604, -95.3698], zoom: 9, bbox: makeBbox(29.7604, -95.3698, 9), capital: 'Houston' },
  ],

  // ─── AUSTRALIA (AUS) ──────────────────────────────────────────────────────
  AUS: [
    { id: 'AUS-ALL', name: 'All Australia (National)', countryCode: 'AUS', type: 'National', center: [-25.27, 133.77], zoom: 4, bbox: { w: 113.0, s: -43.8, e: 154.0, n: -10.0, str: '113,-43.8,154,-10' }, districtsOrCounties: 8 },
    { id: 'AUS-NSW', name: 'New South Wales', countryCode: 'AUS', type: 'State', center: [-31.84, 145.61], zoom: 6, bbox: makeBbox(-31.84, 145.61, 6), districtsOrCounties: 128, capital: 'Sydney' },
    { id: 'AUS-VIC', name: 'Victoria', countryCode: 'AUS', type: 'State', center: [-37.02, 144.96], zoom: 7, bbox: makeBbox(-37.02, 144.96, 7), districtsOrCounties: 79, capital: 'Melbourne' },
    { id: 'AUS-QLD', name: 'Queensland', countryCode: 'AUS', type: 'State', center: [-20.91, 142.7], zoom: 5, bbox: makeBbox(-20.91, 142.7, 5), districtsOrCounties: 77, capital: 'Brisbane' },
    { id: 'AUS-WA', name: 'Western Australia', countryCode: 'AUS', type: 'State', center: [-25.04, 117.79], zoom: 5, bbox: makeBbox(-25.04, 117.79, 5), districtsOrCounties: 137, capital: 'Perth' },
    { id: 'AUS-SA', name: 'South Australia', countryCode: 'AUS', type: 'State', center: [-30.0, 136.2], zoom: 6, bbox: makeBbox(-30.0, 136.2, 6), districtsOrCounties: 68, capital: 'Adelaide' },
    { id: 'AUS-TAS', name: 'Tasmania', countryCode: 'AUS', type: 'State', center: [-42.04, 146.8], zoom: 7, bbox: makeBbox(-42.04, 146.8, 7), districtsOrCounties: 29, capital: 'Hobart' },
    { id: 'AUS-NT', name: 'Northern Territory', countryCode: 'AUS', type: 'Territory', center: [-19.49, 132.55], zoom: 5, bbox: makeBbox(-19.49, 132.55, 5), districtsOrCounties: 17, capital: 'Darwin' },
    { id: 'AUS-ACT', name: 'Australian Capital Territory', countryCode: 'AUS', type: 'Territory', center: [-35.28, 149.13], zoom: 10, bbox: makeBbox(-35.28, 149.13, 10), districtsOrCounties: 1, capital: 'Canberra' },
    { id: 'AUS-SYD', name: 'Sydney Greater Region', countryCode: 'AUS', type: 'City', center: [-33.8688, 151.2093], zoom: 9, bbox: makeBbox(-33.8688, 151.2093, 9), capital: 'Sydney' },
    { id: 'AUS-MEL', name: 'Melbourne Metropolitan', countryCode: 'AUS', type: 'City', center: [-37.8136, 144.9631], zoom: 9, bbox: makeBbox(-37.8136, 144.9631, 9), capital: 'Melbourne' },
  ],

  // ─── CANADA (CAN) ─────────────────────────────────────────────────────────
  CAN: [
    { id: 'CAN-ALL', name: 'All Canada (National)', countryCode: 'CAN', type: 'National', center: [56.13, -106.34], zoom: 4, bbox: { w: -141.0, s: 41.6, e: -52.6, n: 83.0, str: '-141,41.6,-52.6,83' }, districtsOrCounties: 13 },
    { id: 'CAN-BC', name: 'British Columbia', countryCode: 'CAN', type: 'Province', center: [53.72, -127.64], zoom: 5, bbox: makeBbox(53.72, -127.64, 5), districtsOrCounties: 29, capital: 'Victoria' },
    { id: 'CAN-AB', name: 'Alberta', countryCode: 'CAN', type: 'Province', center: [53.93, -116.57], zoom: 5, bbox: makeBbox(53.93, -116.57, 5), districtsOrCounties: 68, capital: 'Edmonton' },
    { id: 'CAN-ON', name: 'Ontario', countryCode: 'CAN', type: 'Province', center: [51.25, -85.32], zoom: 5, bbox: makeBbox(51.25, -85.32, 5), districtsOrCounties: 50, capital: 'Toronto' },
    { id: 'CAN-QC', name: 'Quebec', countryCode: 'CAN', type: 'Province', center: [52.93, -73.54], zoom: 5, bbox: makeBbox(52.93, -73.54, 5), districtsOrCounties: 104, capital: 'Quebec City' },
    { id: 'CAN-SK', name: 'Saskatchewan', countryCode: 'CAN', type: 'Province', center: [52.93, -106.45], zoom: 5, bbox: makeBbox(52.93, -106.45, 5), districtsOrCounties: 296, capital: 'Regina' },
    { id: 'CAN-MB', name: 'Manitoba', countryCode: 'CAN', type: 'Province', center: [53.76, -98.81], zoom: 5, bbox: makeBbox(53.76, -98.81, 5), districtsOrCounties: 137, capital: 'Winnipeg' },
    { id: 'CAN-NT', name: 'Northwest Territories', countryCode: 'CAN', type: 'Territory', center: [64.82, -124.84], zoom: 4, bbox: makeBbox(64.82, -124.84, 4), capital: 'Yellowknife' },
    { id: 'CAN-YT', name: 'Yukon', countryCode: 'CAN', type: 'Territory', center: [64.28, -135.0], zoom: 5, bbox: makeBbox(64.28, -135.0, 5), capital: 'Whitehorse' },
    { id: 'CAN-VAN', name: 'Vancouver Metro Area', countryCode: 'CAN', type: 'City', center: [49.2827, -123.1207], zoom: 9, bbox: makeBbox(49.2827, -123.1207, 9), capital: 'Vancouver' },
    { id: 'CAN-CAL', name: 'Calgary Wildfire Foothills', countryCode: 'CAN', type: 'City', center: [51.0447, -114.0719], zoom: 9, bbox: makeBbox(51.0447, -114.0719, 9), capital: 'Calgary' },
  ],

  // ─── BRAZIL (BRA) ─────────────────────────────────────────────────────────
  BRA: [
    { id: 'BRA-ALL', name: 'All Brazil (National)', countryCode: 'BRA', type: 'National', center: [-14.23, -51.92], zoom: 4, bbox: { w: -74.0, s: -33.8, e: -34.8, n: 5.3, str: '-74,-33.8,-34.8,5.3' }, districtsOrCounties: 27 },
    { id: 'BRA-AM', name: 'Amazonas (Amazon Core)', countryCode: 'BRA', type: 'State', center: [-3.41, -65.85], zoom: 5, bbox: makeBbox(-3.41, -65.85, 5), districtsOrCounties: 62, capital: 'Manaus' },
    { id: 'BRA-MT', name: 'Mato Grosso (Cerrado/Pantanal)', countryCode: 'BRA', type: 'State', center: [-12.68, -55.42], zoom: 6, bbox: makeBbox(-12.68, -55.42, 6), districtsOrCounties: 141, capital: 'Cuiabá' },
    { id: 'BRA-PA', name: 'Pará', countryCode: 'BRA', type: 'State', center: [-3.79, -52.48], zoom: 5, bbox: makeBbox(-3.79, -52.48, 5), districtsOrCounties: 144, capital: 'Belém' },
    { id: 'BRA-SP', name: 'São Paulo', countryCode: 'BRA', type: 'State', center: [-23.55, -46.63], zoom: 7, bbox: makeBbox(-23.55, -46.63, 7), districtsOrCounties: 645, capital: 'São Paulo' },
    { id: 'BRA-MG', name: 'Minas Gerais', countryCode: 'BRA', type: 'State', center: [-18.51, -44.55], zoom: 6, bbox: makeBbox(-18.51, -44.55, 6), districtsOrCounties: 853, capital: 'Belo Horizonte' },
    { id: 'BRA-BA', name: 'Bahia', countryCode: 'BRA', type: 'State', center: [-12.97, -38.51], zoom: 6, bbox: makeBbox(-12.97, -38.51, 6), districtsOrCounties: 417, capital: 'Salvador' },
    { id: 'BRA-RO', name: 'Rondônia (Fire Arc)', countryCode: 'BRA', type: 'State', center: [-11.5, -63.58], zoom: 6, bbox: makeBbox(-11.5, -63.58, 6), districtsOrCounties: 52, capital: 'Porto Velho' },
    { id: 'BRA-AC', name: 'Acre (Western Amazon)', countryCode: 'BRA', type: 'State', center: [-9.02, -70.81], zoom: 6, bbox: makeBbox(-9.02, -70.81, 6), districtsOrCounties: 22, capital: 'Rio Branco' },
    { id: 'BRA-RJ', name: 'Rio de Janeiro', countryCode: 'BRA', type: 'City', center: [-22.9068, -43.1729], zoom: 9, bbox: makeBbox(-22.9068, -43.1729, 9), capital: 'Rio de Janeiro' },
  ],

  // ─── INDONESIA (IDN) ──────────────────────────────────────────────────────
  IDN: [
    { id: 'IDN-ALL', name: 'All Indonesia (National)', countryCode: 'IDN', type: 'National', center: [-0.78, 113.92], zoom: 5, bbox: { w: 95.0, s: -11.0, e: 141.0, n: 6.0, str: '95,-11,141,6' }, districtsOrCounties: 38 },
    { id: 'IDN-RI', name: 'Riau (Peatland Hotspots)', countryCode: 'IDN', type: 'Province', center: [0.5, 101.44], zoom: 7, bbox: makeBbox(0.5, 101.44, 7), districtsOrCounties: 12, capital: 'Pekanbaru' },
    { id: 'IDN-SS', name: 'South Sumatra (Sumsel)', countryCode: 'IDN', type: 'Province', center: [-3.31, 104.14], zoom: 7, bbox: makeBbox(-3.31, 104.14, 7), districtsOrCounties: 17, capital: 'Palembang' },
    { id: 'IDN-CK', name: 'Central Kalimantan (Borneo Peat)', countryCode: 'IDN', type: 'Province', center: [-1.68, 113.38], zoom: 7, bbox: makeBbox(-1.68, 113.38, 7), districtsOrCounties: 14, capital: 'Palangkaraya' },
    { id: 'IDN-WK', name: 'West Kalimantan', countryCode: 'IDN', type: 'Province', center: [-0.27, 111.47], zoom: 7, bbox: makeBbox(-0.27, 111.47, 7), districtsOrCounties: 14, capital: 'Pontianak' },
    { id: 'IDN-EK', name: 'East Kalimantan (IKN Nusantara)', countryCode: 'IDN', type: 'Province', center: [0.53, 116.41], zoom: 7, bbox: makeBbox(0.53, 116.41, 7), districtsOrCounties: 10, capital: 'Samarinda' },
    { id: 'IDN-JKT', name: 'Jakarta Capital Special Region', countryCode: 'IDN', type: 'City', center: [-6.2088, 106.8456], zoom: 10, bbox: makeBbox(-6.2088, 106.8456, 10), capital: 'Jakarta' },
    { id: 'IDN-EJ', name: 'East Java & Mt. Bromo Region', countryCode: 'IDN', type: 'Province', center: [-7.53, 112.23], zoom: 7, bbox: makeBbox(-7.53, 112.23, 7), districtsOrCounties: 38, capital: 'Surabaya' },
  ],

  // ─── CHINA (CHN) ──────────────────────────────────────────────────────────
  CHN: [
    { id: 'CHN-ALL', name: 'All China (National)', countryCode: 'CHN', type: 'National', center: [35.86, 104.19], zoom: 4, bbox: { w: 73.5, s: 18.0, e: 135.0, n: 53.5, str: '73.5,18,135,53.5' }, districtsOrCounties: 34 },
    { id: 'CHN-SC', name: 'Sichuan (Himalayan Forest)', countryCode: 'CHN', type: 'Province', center: [30.65, 104.06], zoom: 6, bbox: makeBbox(30.65, 104.06, 6), districtsOrCounties: 21, capital: 'Chengdu' },
    { id: 'CHN-YN', name: 'Yunnan (Southwest Forest Belt)', countryCode: 'CHN', type: 'Province', center: [25.04, 102.71], zoom: 6, bbox: makeBbox(25.04, 102.71, 6), districtsOrCounties: 16, capital: 'Kunming' },
    { id: 'CHN-GD', name: 'Guangdong (Pearl River Delta)', countryCode: 'CHN', type: 'Province', center: [23.12, 113.26], zoom: 7, bbox: makeBbox(23.12, 113.26, 7), districtsOrCounties: 21, capital: 'Guangzhou' },
    { id: 'CHN-HL', name: 'Heilongjiang (Greater Khingan)', countryCode: 'CHN', type: 'Province', center: [45.75, 126.65], zoom: 5, bbox: makeBbox(45.75, 126.65, 5), districtsOrCounties: 13, capital: 'Harbin' },
    { id: 'CHN-NM', name: 'Inner Mongolia Grasslands', countryCode: 'CHN', type: 'Region', center: [40.84, 111.75], zoom: 5, bbox: makeBbox(40.84, 111.75, 5), districtsOrCounties: 12, capital: 'Hohhot' },
    { id: 'CHN-BJ', name: 'Beijing Capital Region', countryCode: 'CHN', type: 'City', center: [39.9042, 116.4074], zoom: 9, bbox: makeBbox(39.9042, 116.4074, 9), capital: 'Beijing' },
    { id: 'CHN-SH', name: 'Shanghai Industrial Hub', countryCode: 'CHN', type: 'City', center: [31.2304, 121.4737], zoom: 9, bbox: makeBbox(31.2304, 121.4737, 9), capital: 'Shanghai' },
  ],

  // ─── SPAIN (ESP) ──────────────────────────────────────────────────────────
  ESP: [
    { id: 'ESP-ALL', name: 'All Spain (National)', countryCode: 'ESP', type: 'National', center: [40.46, -3.74], zoom: 6, bbox: { w: -9.3, s: 36.0, e: 3.3, n: 43.8, str: '-9.3,36,3.3,43.8' }, districtsOrCounties: 17 },
    { id: 'ESP-AN', name: 'Andalusia', countryCode: 'ESP', type: 'Region', center: [37.38, -5.98], zoom: 7, bbox: makeBbox(37.38, -5.98, 7), capital: 'Seville' },
    { id: 'ESP-CT', name: 'Catalonia', countryCode: 'ESP', type: 'Region', center: [41.38, 2.17], zoom: 7, bbox: makeBbox(41.38, 2.17, 7), capital: 'Barcelona' },
    { id: 'ESP-GA', name: 'Galicia (Atlantic Wildfire Zone)', countryCode: 'ESP', type: 'Region', center: [42.57, -8.13], zoom: 7, bbox: makeBbox(42.57, -8.13, 7), capital: 'Santiago de Compostela' },
    { id: 'ESP-CL', name: 'Castile and León', countryCode: 'ESP', type: 'Region', center: [41.65, -4.72], zoom: 7, bbox: makeBbox(41.65, -4.72, 7), capital: 'Valladolid' },
    { id: 'ESP-VC', name: 'Valencian Community', countryCode: 'ESP', type: 'Region', center: [39.46, -0.37], zoom: 7, bbox: makeBbox(39.46, -0.37, 7), capital: 'Valencia' },
    { id: 'ESP-MAD', name: 'Madrid Capital Metro', countryCode: 'ESP', type: 'City', center: [40.4168, -3.7038], zoom: 9, bbox: makeBbox(40.4168, -3.7038, 9), capital: 'Madrid' },
  ],

  // ─── FRANCE (FRA) ─────────────────────────────────────────────────────────
  FRA: [
    { id: 'FRA-ALL', name: 'All France (National)', countryCode: 'FRA', type: 'National', center: [46.22, 2.21], zoom: 6, bbox: { w: -5.1, s: 41.3, e: 9.6, n: 51.1, str: '-5.1,41.3,9.6,51.1' }, districtsOrCounties: 18 },
    { id: 'FRA-PACA', name: 'Provence-Alpes-Côte d\'Azur (Mediterranean)', countryCode: 'FRA', type: 'Region', center: [43.93, 6.06], zoom: 7, bbox: makeBbox(43.93, 6.06, 7), capital: 'Marseille' },
    { id: 'FRA-OCC', name: 'Occitanie', countryCode: 'FRA', type: 'Region', center: [43.60, 2.25], zoom: 7, bbox: makeBbox(43.60, 2.25, 7), capital: 'Toulouse' },
    { id: 'FRA-NAQ', name: 'Nouvelle-Aquitaine (Landes Forest)', countryCode: 'FRA', type: 'Region', center: [44.83, -0.57], zoom: 7, bbox: makeBbox(44.83, -0.57, 7), capital: 'Bordeaux' },
    { id: 'FRA-COR', name: 'Corsica (Island Wildfire Risk)', countryCode: 'FRA', type: 'Region', center: [42.03, 9.01], zoom: 8, bbox: makeBbox(42.03, 9.01, 8), capital: 'Ajaccio' },
    { id: 'FRA-IDF', name: 'Île-de-France (Paris Metro)', countryCode: 'FRA', type: 'City', center: [48.8566, 2.3522], zoom: 9, bbox: makeBbox(48.8566, 2.3522, 9), capital: 'Paris' },
  ],

  // ─── GERMANY (DEU) ────────────────────────────────────────────────────────
  DEU: [
    { id: 'DEU-ALL', name: 'All Germany (National)', countryCode: 'DEU', type: 'National', center: [51.16, 10.45], zoom: 6, bbox: { w: 5.8, s: 47.2, e: 15.0, n: 55.0, str: '5.8,47.2,15,55' }, districtsOrCounties: 16 },
    { id: 'DEU-BB', name: 'Brandenburg (Pine Forest Belt)', countryCode: 'DEU', type: 'State', center: [52.41, 12.53], zoom: 7, bbox: makeBbox(52.41, 12.53, 7), capital: 'Potsdam' },
    { id: 'DEU-BY', name: 'Bavaria', countryCode: 'DEU', type: 'State', center: [48.79, 11.49], zoom: 7, bbox: makeBbox(48.79, 11.49, 7), capital: 'Munich' },
    { id: 'DEU-SN', name: 'Saxony (Saxon Switzerland Risk)', countryCode: 'DEU', type: 'State', center: [51.05, 13.73], zoom: 7, bbox: makeBbox(51.05, 13.73, 7), capital: 'Dresden' },
    { id: 'DEU-NRW', name: 'North Rhine-Westphalia (Ruhr Basin)', countryCode: 'DEU', type: 'State', center: [51.43, 6.76], zoom: 7, bbox: makeBbox(51.43, 6.76, 7), capital: 'Düsseldorf' },
    { id: 'DEU-BER', name: 'Berlin Capital Metropolitan', countryCode: 'DEU', type: 'City', center: [52.52, 13.405], zoom: 9, bbox: makeBbox(52.52, 13.405, 9), capital: 'Berlin' },
  ],

  // ─── UNITED KINGDOM (GBR) ─────────────────────────────────────────────────
  GBR: [
    { id: 'GBR-ALL', name: 'All United Kingdom (National)', countryCode: 'GBR', type: 'National', center: [55.37, -3.43], zoom: 6, bbox: { w: -8.6, s: 49.9, e: 1.8, n: 58.7, str: '-8.6,49.9,1.8,58.7' }, districtsOrCounties: 4 },
    { id: 'GBR-ENG', name: 'England (Heath & Moorland)', countryCode: 'GBR', type: 'Country', center: [52.35, -1.17], zoom: 6, bbox: makeBbox(52.35, -1.17, 6), capital: 'London' },
    { id: 'GBR-SCT', name: 'Scotland (Highlands Peat & Gorse)', countryCode: 'GBR', type: 'Country', center: [56.49, -4.2], zoom: 6, bbox: makeBbox(56.49, -4.2, 6), capital: 'Edinburgh' },
    { id: 'GBR-WLS', name: 'Wales', countryCode: 'GBR', type: 'Country', center: [52.13, -3.78], zoom: 7, bbox: makeBbox(52.13, -3.78, 7), capital: 'Cardiff' },
    { id: 'GBR-LON', name: 'Greater London Metropolitan', countryCode: 'GBR', type: 'City', center: [51.5074, -0.1278], zoom: 9, bbox: makeBbox(51.5074, -0.1278, 9), capital: 'London' },
  ],
};

/**
 * Returns list of subdivisions (States, Provinces, Regions, Cities) for any country.
 * If pre-compiled data exists, returns it; otherwise dynamically generates cardinal regions & capital.
 */
export function getSubdivisionsForCountry(
  countryCode: string,
  countryName?: string,
  countryCenter?: [number, number],
  countryZoom: number = 5,
  countryBbox?: string
): CountrySubdivision[] {
  const code = (countryCode || '').toUpperCase().trim();
  if (SUBDIVISIONS_BY_COUNTRY[code]) {
    return SUBDIVISIONS_BY_COUNTRY[code];
  }

  // Fallback: generate high-value subdivisions dynamically for any country in the world
  const lat = countryCenter ? countryCenter[0] : 20.0;
  const lng = countryCenter ? countryCenter[1] : 0.0;
  const name = countryName || countryCode;

  let defaultBbox = makeBbox(lat, lng, countryZoom);
  if (countryBbox && countryBbox.includes(',')) {
    const parts = countryBbox.split(',').map(Number);
    if (parts.length === 4 && !parts.some(isNaN)) {
      defaultBbox = { w: parts[0], s: parts[1], e: parts[2], n: parts[3], str: countryBbox };
    }
  }

  const offset = countryZoom <= 4 ? 2.5 : countryZoom <= 6 ? 1.4 : 0.8;

  return [
    {
      id: `${code}-ALL`,
      name: `All ${name} (National)`,
      countryCode: code,
      type: 'National',
      center: [lat, lng],
      zoom: countryZoom,
      bbox: defaultBbox,
    },
    {
      id: `${code}-NORTH`,
      name: `${name} Northern Region`,
      countryCode: code,
      type: 'Region',
      center: [lat + offset, lng],
      zoom: countryZoom + 1,
      bbox: makeBbox(lat + offset, lng, countryZoom + 1),
    },
    {
      id: `${code}-SOUTH`,
      name: `${name} Southern Region`,
      countryCode: code,
      type: 'Region',
      center: [lat - offset, lng],
      zoom: countryZoom + 1,
      bbox: makeBbox(lat - offset, lng, countryZoom + 1),
    },
    {
      id: `${code}-EAST`,
      name: `${name} Eastern Region`,
      countryCode: code,
      type: 'Region',
      center: [lat, lng + offset * 1.2],
      zoom: countryZoom + 1,
      bbox: makeBbox(lat, lng + offset * 1.2, countryZoom + 1),
    },
    {
      id: `${code}-WEST`,
      name: `${name} Western Region`,
      countryCode: code,
      type: 'Region',
      center: [lat, lng - offset * 1.2],
      zoom: countryZoom + 1,
      bbox: makeBbox(lat, lng - offset * 1.2, countryZoom + 1),
    },
    {
      id: `${code}-CAPITAL`,
      name: `${name} Capital Metropolitan`,
      countryCode: code,
      type: 'City',
      center: [lat, lng],
      zoom: Math.min(10, countryZoom + 3),
      bbox: makeBbox(lat, lng, Math.min(10, countryZoom + 3)),
    },
  ];
}
