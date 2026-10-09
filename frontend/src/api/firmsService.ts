export interface ThermalAnomalyProperties {
  latitude: number;
  longitude: number;
  // 2D Planar Projected Coordinates (EPSG:3857 Web Mercator in meters)
  x?: number;
  y?: number;
  crs?: string;
  projected_coords?: [number, number];
  brightness: number;
  bright_ti4?: number;
  bright_ti5?: number;
  scan?: number;
  track?: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  version?: string;
  frp: number;
  daynight: string;
  intensity: 'high' | 'medium' | 'low';
  state?: string;
  source?: string;
}

/**
 * Convert 3D Geographic WGS84 coordinates (lat, lng in degrees, EPSG:4326)
 * to 2D Flat Planar Projected Coordinates (X, Y in meters, EPSG:3857 Web Mercator)
 * for use on flat maps.
 */
export function latLngToWebMercator(lat: number, lng: number): { x: number; y: number; crs: 'EPSG:3857' } {
  const R = 6378137.0; // WGS84 Earth semi-major axis in meters
  // Clip latitude between -85.05112878 and 85.05112878 to avoid infinity at poles
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

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: ThermalAnomalyProperties;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata?: {
    total: number;
    bbox?: string;
    queryTime?: string;
  };
}

const NASA_FIRMS_KEY = (import.meta as any).env?.VITE_NASA_FIRMS_KEY || '';
const BACKEND_BASE = ''; // uses relative path with Vite proxy or full URL

export const REGION_BOUNDS: Record<string, { name: string; bbox: string; center: [number, number]; zoom: number }> = {
  ALL_INDIA: {
    name: 'India (National)',
    bbox: '68,6,98,38',
    center: [22.8, 82.5],
    zoom: 5,
  },
  WORLD: {
    name: 'Global / Worldwide',
    bbox: 'world',
    center: [20, 0],
    zoom: 2,
  },
  NORTH_AMERICA: {
    name: 'North America',
    bbox: '-130,20,-60,55',
    center: [40, -100],
    zoom: 4,
  },
  EUROPE: {
    name: 'Europe & Mediterranean',
    bbox: '-12,34,42,65',
    center: [48, 15],
    zoom: 4,
  },
  AUSTRALIA: {
    name: 'Australia',
    bbox: '110,-45,155,-10',
    center: [-25, 133],
    zoom: 4,
  },
  SOUTHEAST_ASIA: {
    name: 'Southeast Asia',
    bbox: '95,-10,140,25',
    center: [8, 115],
    zoom: 5,
  },
  SOUTH_AMERICA: {
    name: 'South America (Amazon)',
    bbox: '-85,-56,-34,13',
    center: [-15, -60],
    zoom: 4,
  },
  AFRICA: {
    name: 'Africa (Sub-Saharan)',
    bbox: '-20,-35,55,38',
    center: [2, 22],
    zoom: 4,
  },
  EAST_ASIA: {
    name: 'East Asia',
    bbox: '73,18,145,54',
    center: [35, 105],
    zoom: 4,
  },
};

import demoEventsData from '../data/demonstration100Events.json';

function getFallbackGeoJSON(bbox: string = '68,6,98,38'): GeoJSONFeatureCollection {
  const events = ((demoEventsData as any).events || []) as any[];
  const features: GeoJSONFeature[] = events.map((evt: any) => {
    const lat = evt.latitude;
    const lng = evt.longitude;
    const planar = latLngToWebMercator(lat, lng);
    const frp = evt.max_frp || 0;
    const brightness = evt.max_brightness || 320;
    const intensity = frp >= 15 || brightness >= 345 ? 'high' : frp >= 5 || brightness >= 325 ? 'medium' : 'low';
    return {
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
        brightness,
        bright_ti4: brightness,
        bright_ti5: brightness - 15,
        scan: 1.0,
        track: 1.0,
        acq_date: evt.event_start.slice(0, 10),
        acq_time: evt.event_start.slice(11, 16),
        satellite: 'VIIRS Suomi-NPP',
        instrument: 'VIIRS',
        confidence: 'nominal',
        frp,
        daynight: 'D',
        intensity,
        source: 'HISTORICAL_DEMONSTRATION_ARCHIVE',
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      total: features.length,
      bbox,
      queryTime: new Date().toISOString(),
    },
  };
}

/**
 * Fetch thermal anomalies as GeoJSON from PostgreSQL backend,
 * with automatic fallback to NASA FIRMS direct API and authentic historical demonstration events.
 */
export async function fetchAnomaliesGeoJSON({
  bbox = '68,6,98,38',
  dayRange = 1,
  source = 'ALL',
}: {
  bbox?: string;
  dayRange?: number;
  source?: string;
}): Promise<GeoJSONFeatureCollection> {
  try {
    const url = `${BACKEND_BASE}/api/anomalies/geojson?bbox=${encodeURIComponent(bbox)}&dayRange=${dayRange}&source=${encodeURIComponent(source)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data: GeoJSONFeatureCollection = await response.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend unavailable, trying direct NASA FIRMS or demonstration archive:', err);
  }

  // Fallback 1: Direct NASA FIRMS fetch if API key is configured
  if (NASA_FIRMS_KEY) {
    try {
      const direct = await fetchDirectFromNasaFirms(bbox, dayRange, source);
      if (direct && direct.features && direct.features.length > 0) {
        return direct;
      }
    } catch (e) {
      console.warn('Direct NASA FIRMS fetch failed:', e);
    }
  }

  // Fallback 2: Authentic historical demonstration archive (100 events)
  return getFallbackGeoJSON(bbox);
}

/**
 * Direct client-side fetch from NASA FIRMS API (CORS enabled)
 */
async function fetchDirectFromNasaFirms(
  bbox: string,
  dayRange: number = 1,
  source: string = 'ALL'
): Promise<GeoJSONFeatureCollection> {
  const boundedRange = Math.min(Math.max(dayRange, 1), 5);
  const sourcesToQuery: string[] = [];

  if (source === 'VIIRS' || source === 'ALL') {
    sourcesToQuery.push('VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT');
  }
  if (source === 'MODIS' || source === 'ALL') {
    sourcesToQuery.push('MODIS_NRT');
  }

  const allFeatures: GeoJSONFeature[] = [];

  for (const src of sourcesToQuery) {
    try {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_FIRMS_KEY}/${src}/${bbox}/${boundedRange}`;
      const res = await fetch(url);
      const csv = await res.text();
      if (!csv || csv.startsWith('Invalid') || csv.startsWith('Error')) continue;

      const lines = csv.trim().split('\n');
      if (lines.length < 2) continue;

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(',');
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx] ? vals[idx].trim() : '';
        });

        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);
        if (isNaN(lat) || isNaN(lng)) continue;

        const brightness = parseFloat(row.bright_ti4 || row.brightness || '0');
        const frp = parseFloat(row.frp || '0');
        const intensity = frp >= 15 || brightness >= 345 ? 'high' : frp >= 5 || brightness >= 325 ? 'medium' : 'low';
        const planar = latLngToWebMercator(lat, lng);

        allFeatures.push({
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
            brightness,
            bright_ti4: brightness,
            bright_ti5: parseFloat(row.bright_ti5 || row.bright_t31 || '0'),
            scan: parseFloat(row.scan || '0'),
            track: parseFloat(row.track || '0'),
            acq_date: row.acq_date,
            acq_time: row.acq_time,
            satellite: row.satellite || (src.includes('VIIRS') ? 'Suomi NPP' : 'Terra/Aqua'),
            instrument: row.instrument || (src.includes('VIIRS') ? 'VIIRS' : 'MODIS'),
            confidence: row.confidence || 'nominal',
            frp,
            daynight: row.daynight || 'D',
            intensity,
            source: src,
          },
        });
      }
    } catch (e) {
      console.error(`Direct NASA FIRMS fetch error for ${src}:`, e);
    }
  }

  return {
    type: 'FeatureCollection',
    features: allFeatures,
    metadata: {
      total: allFeatures.length,
      bbox,
      queryTime: new Date().toISOString(),
    },
  };
}

/**
 * Trigger immediate ingestion into PostgreSQL backend
 */
export async function triggerIngestion(bbox = '68,6,98,38', dayRange = 1): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bbox, dayRange }),
    });
    const data = await res.json();
    return {
      success: data.success,
      message: data.message,
      count: data.details?.insertedOrUpdated || 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

export interface AnomalyStats {
  total_detections: number;
  high_intensity: number;
  medium_intensity: number;
  low_intensity: number;
  total_frp_mw: number;
  avg_brightness_k: number;
  latest_acquisition?: string;
}

/**
 * Fetch real-time aggregate statistics from PostgreSQL backend
 */
export async function fetchAnomalyStats(bbox?: string): Promise<AnomalyStats | null> {
  try {
    const url = bbox ? `${BACKEND_BASE}/api/anomalies/stats?bbox=${encodeURIComponent(bbox)}` : `${BACKEND_BASE}/api/anomalies/stats`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        return {
          total_detections: parseInt(data.total_detections || '0'),
          high_intensity: parseInt(data.high_intensity || '0'),
          medium_intensity: parseInt(data.medium_intensity || '0'),
          low_intensity: parseInt(data.low_intensity || '0'),
          total_frp_mw: parseFloat(data.total_frp_mw || '0'),
          avg_brightness_k: parseFloat(data.avg_brightness_k || '0'),
          latest_acquisition: data.latest_acquisition,
        };
      }
    } catch (err) {
      console.warn('Could not fetch anomaly stats, falling back to demonstration archive stats:', err);
    }

  const events = ((demoEventsData as any).events || []) as any[];
  const high = events.filter((e) => e.max_frp >= 15).length;
  const med = events.filter((e) => e.max_frp >= 5 && e.max_frp < 15).length;
  const low = events.filter((e) => e.max_frp < 5).length;
  const totalFrp = events.reduce((acc, e) => acc + (e.max_frp || 0), 0);
  const avgBright = events.reduce((acc, e) => acc + (e.max_brightness || 320), 0) / (events.length || 1);

  return {
    total_detections: events.length,
    high_intensity: high,
    medium_intensity: med,
    low_intensity: low,
    total_frp_mw: Math.round(totalFrp * 10) / 10,
    avg_brightness_k: Math.round(avgBright * 10) / 10,
    latest_acquisition: events[0]?.event_start || '2025-03-21',
  };
}

/**
 * Check backend and DB status
 */
export async function checkBackendStatus(): Promise<{ connected: boolean; totalInDb: number }> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return { connected: !!data.dbConnected, totalInDb: data.totalAnomaliesInDb || 0 };
    }
  } catch {
    // Backend offline
  }
  return { connected: false, totalInDb: 0 };
}

/**
 * Export current GeoJSON features to CSV and trigger browser download
 */
export function downloadAnomaliesCsv(
  features: GeoJSONFeature[],
  filename = 'nasa_firms_thermal_anomalies.csv',
  onError?: (msg: string) => void
) {
  if (features.length === 0) {
    const msg = 'No thermal anomaly data available to export for current view.';
    if (onError) {
      onError(msg);
    } else if (typeof window !== 'undefined') {
      alert(msg);
    }
    return;
  }

  const headers = [
    'latitude',
    'longitude',
    'x_planar_epsg3857',
    'y_planar_epsg3857',
    'crs',
    'brightness',
    'frp',
    'intensity',
    'satellite',
    'instrument',
    'confidence',
    'acq_date',
    'acq_time',
    'daynight',
    'source',
  ];

  const rows = features.map((f) => {
    const p = f.properties;
    const xVal = p.x !== undefined ? p.x : latLngToWebMercator(p.latitude, p.longitude).x;
    const yVal = p.y !== undefined ? p.y : latLngToWebMercator(p.latitude, p.longitude).y;
    return [
      p.latitude,
      p.longitude,
      xVal,
      yVal,
      `"${p.crs || 'EPSG:3857'}"`,
      p.brightness,
      p.frp,
      p.intensity,
      `"${p.satellite}"`,
      `"${p.instrument}"`,
      `"${p.confidence}"`,
      p.acq_date,
      p.acq_time,
      p.daynight,
      `"${p.source || ''}"`,
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
