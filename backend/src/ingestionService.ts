import axios from 'axios';
import { pool } from './db.js';
import dotenv from 'dotenv';
import type { AnomalyRecord, IngestionResult } from './types/index.js';

dotenv.config();

const MAP_KEY = process.env.NASA_FIRMS_MAP_KEY || '1e51e282dc430a8f9651fd6c652dfc50';
const BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

export const SUPPORTED_SOURCES = [
  'VIIRS_SNPP_NRT',
  'VIIRS_NOAA20_NRT',
  'MODIS_NRT',
];

/**
 * Determine intensity level based on FRP (MW) and brightness temperature (Kelvin)
 */
export function calculateIntensity(frp: number | string, brightness: number | string): 'high' | 'medium' | 'low' {
  const f = parseFloat(String(frp)) || 0;
  const b = parseFloat(String(brightness)) || 0;
  if (f >= 15 || b >= 345) return 'high';
  if (f >= 5 || b >= 325) return 'medium';
  return 'low';
}

/**
 * Convert 3D Geographic WGS84 (lat, lng in degrees, EPSG:4326)
 * to 2D Planar Projected Coordinates (X, Y in meters, EPSG:3857 Web Mercator)
 */
export function latLngToWebMercator(lat: number, lng: number): { x: number; y: number; crs: 'EPSG:3857' } {
  const R = 6378137.0; // WGS84 Earth semi-major axis in meters
  const clippedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const x = R * (lng * Math.PI / 180.0);
  const y = R * Math.log(Math.tan((Math.PI / 4.0) + (clippedLat * Math.PI / 360.0)));
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    crs: 'EPSG:3857',
  };
}

/**
 * Convert 2D Planar Projected Coordinates (X, Y in meters, EPSG:3857)
 * back to 3D Geographic WGS84 (lat, lng in degrees, EPSG:4326)
 */
export function webMercatorToLatLng(x: number, y: number): { lat: number; lng: number } {
  const R = 6378137.0;
  const lng = (x / R) * (180.0 / Math.PI);
  const lat = (2.0 * Math.atan(Math.exp(y / R)) - (Math.PI / 2.0)) * (180.0 / Math.PI);
  return {
    lat: Math.round(lat * 1000000) / 1000000,
    lng: Math.round(lng * 1000000) / 1000000,
  };
}

/**
 * Parse CSV string from NASA FIRMS into structured objects and GeoJSON features
 */
export function parseFirmsCsv(csvText: string, instrumentName: string): AnomalyRecord[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const records: AnomalyRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',');
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ? values[idx].trim() : '';
    });

    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;

    // Convert to 2D Planar coordinates
    const planar = latLngToWebMercator(lat, lng);

    const brightness = parseFloat(row.bright_ti4 || row.brightness || '0');
    const brightTi5 = parseFloat(row.bright_ti5 || row.bright_t31 || '0');
    const frp = parseFloat(row.frp || '0');
    const intensity = calculateIntensity(frp, brightness);

    const satellite = row.satellite || (instrumentName.includes('VIIRS') ? 'Suomi NPP' : 'Terra/Aqua');
    const instrument = row.instrument || (instrumentName.includes('VIIRS') ? 'VIIRS' : 'MODIS');

    const feature: AnomalyRecord['geojson'] = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      properties: {
        latitude: lat,
        longitude: lng,
        x: planar.x,
        y: planar.y,
        crs: planar.crs,
        projected_coords: [planar.x, planar.y],
        brightness: brightness,
        bright_ti4: brightness,
        bright_ti5: brightTi5,
        scan: parseFloat(row.scan || '0'),
        track: parseFloat(row.track || '0'),
        acq_date: row.acq_date,
        acq_time: row.acq_time,
        satellite: satellite,
        instrument: instrument,
        confidence: row.confidence || 'nominal',
        version: row.version || '',
        frp: frp,
        daynight: row.daynight || 'D',
        intensity: intensity,
        source: instrumentName,
      },
    };

    records.push({
      latitude: lat,
      longitude: lng,
      x: planar.x,
      y: planar.y,
      crs: planar.crs,
      bright_ti4: brightness,
      scan: parseFloat(row.scan || '0'),
      track: parseFloat(row.track || '0'),
      acq_date: row.acq_date,
      acq_time: row.acq_time,
      satellite: satellite,
      instrument: instrument,
      confidence: row.confidence || 'nominal',
      version: row.version || '',
      bright_ti5: brightTi5,
      frp: frp,
      daynight: row.daynight || 'D',
      intensity: intensity,
      geojson: feature,
    });
  }

  return records;
}

/**
 * Fetch and ingest active thermal anomalies for a bounding box and source
 */
export async function ingestFirmsData(
  bbox: string = '68,6,98,38',
  dayRange: number = 1,
  sources: string[] = SUPPORTED_SOURCES
): Promise<IngestionResult> {
  const boundedDayRange = Math.min(Math.max(parseInt(String(dayRange)) || 1, 1), 5);
  const client = await pool.connect();
  const results: IngestionResult = {
    totalFetched: 0,
    insertedOrUpdated: 0,
    sourcesChecked: [],
    errors: [],
  };

  try {
    for (const source of sources) {
      const url = `${BASE_URL}/${MAP_KEY}/${source}/${bbox}/${boundedDayRange}`;
      try {
        console.log(`📡 Ingesting from NASA FIRMS: ${source} (bbox: ${bbox}, days: ${boundedDayRange})`);
        const response = await axios.get<string>(url, {
          timeout: 15000,
          headers: { 'User-Agent': 'AstraFlare-NearRealTime/1.0' },
        });

        const csvData = response.data;
        if (typeof csvData === 'string' && (csvData.startsWith('Invalid') || csvData.startsWith('Error'))) {
          results.errors.push({ source, message: csvData.trim() });
          continue;
        }

        const records = parseFirmsCsv(csvData, source);
        results.totalFetched += records.length;
        results.sourcesChecked.push({ source, count: records.length });

        if (records.length === 0) continue;

        // Batch upsert into PostgreSQL with 2D planar coordinates (x, y, crs)
        for (const r of records) {
          const query = `
            INSERT INTO thermal_anomalies (
              latitude, longitude, x, y, crs, bright_ti4, scan, track,
              acq_date, acq_time, satellite, instrument, confidence,
              version, bright_ti5, frp, daynight, intensity, geojson
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (latitude, longitude, acq_date, acq_time, satellite)
            DO UPDATE SET
              x = EXCLUDED.x,
              y = EXCLUDED.y,
              crs = EXCLUDED.crs,
              frp = EXCLUDED.frp,
              intensity = EXCLUDED.intensity,
              geojson = EXCLUDED.geojson
            RETURNING id;
          `;

          const values = [
            r.latitude,
            r.longitude,
            r.x,
            r.y,
            r.crs,
            r.bright_ti4,
            r.scan,
            r.track,
            r.acq_date,
            r.acq_time,
            r.satellite,
            r.instrument,
            r.confidence,
            r.version,
            r.bright_ti5,
            r.frp,
            r.daynight,
            r.intensity,
            JSON.stringify(r.geojson),
          ];

          await client.query(query, values);
          results.insertedOrUpdated++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Ingestion failed for ${source}:`, msg);
        results.errors.push({ source, error: msg });
      }
    }
  } finally {
    client.release();
  }

  return results;
}
