import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { INFRASTRUCTURE_SEED_DATA } from '../data/infrastructureData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface OSMIndustry {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceKm: number;
  nearestHotspot: {
    lat: number;
    lng: number;
    frp: number;
    brightness: number;
    acq_date?: string;
  } | null;
  threatLevel: 'Critical' | 'High' | 'Moderate' | 'Elevated Watch' | 'Monitored / Safe';
  threatColor: string;
  action: string;
  osmUrl: string;
}

// In-memory cache for live OSM Nominatim queries to avoid hitting rate limits
const nominatimCache = new Map<string, { timestamp: number; data: Array<any> }>();

/**
 * Fetch OpenStreetMap industrial facilities & database infrastructure nodes,
 * and calculate proximity & threat status against active NASA FIRMS thermal anomalies.
 * Returns ALL industries in the requested bounding box.
 */
export async function getOsmIndustriesNearHotspots(bboxStr: string, maxDistanceKm: number = 50.0): Promise<OSMIndustry[]> {
  const parts = bboxStr.split(',').map((p) => parseFloat(p.trim()));
  let w = 68.0, s = 6.0, e = 98.0, n = 38.0;

  if (parts.length === 4 && !parts.some(isNaN)) {
    [w, s, e, n] = parts;
  }

  // 1. Query active thermal anomalies within bounding box (with slight buffer) from PostgreSQL
  let hotspots: Array<{ lat: number; lng: number; frp: number; brightness: number; acq_date?: string }> = [];
  try {
    const hotspotQuery = `
      SELECT latitude, longitude, frp, bright_ti4 as brightness, acq_date
      FROM thermal_anomalies
      WHERE latitude >= $1 - 0.7 AND latitude <= $2 + 0.7
        AND longitude >= $3 - 0.7 AND longitude <= $4 + 0.7
      ORDER BY frp DESC
      LIMIT 300;
    `;
    const hotspotRes = await pool.query(hotspotQuery, [s, n, w, e]);
    hotspots = hotspotRes.rows.map((r) => ({
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
      frp: parseFloat(r.frp) || 0,
      brightness: parseFloat(r.brightness) || 0,
      acq_date: r.acq_date ? String(r.acq_date) : undefined,
    }));
  } catch (dbErr) {
    console.warn('PostgreSQL query error for hotspots near OSM industries:', dbErr);
  }

  // Fallback to demonstration archive hotspots
  if (hotspots.length === 0) {
    const demoPath = path.resolve(__dirname, '../data/demonstration100Events.json');
    if (fs.existsSync(demoPath)) {
      try {
        const demoData = JSON.parse(fs.readFileSync(demoPath, 'utf-8'));
        if (Array.isArray(demoData.events)) {
          hotspots = demoData.events.map((evt: any) => ({
            lat: evt.latitude,
            lng: evt.longitude,
            frp: evt.max_frp,
            brightness: evt.max_brightness,
            acq_date: evt.event_start.slice(0, 10),
          }));
        }
      } catch (e) {
        console.warn('Could not read demo hotspots:', e);
      }
    }
  }

  // If no active hotspots exist in this region, return empty list (no industries near hotspots)
  if (hotspots.length === 0) {
    return [];
  }

  // 2. Fetch industrial facilities in this bounding box
  const candidateFacilities: Array<{
    name: string;
    category: string;
    lat: number;
    lng: number;
    action: string;
    osmId?: string;
  }> = [];

  // A. Query PostgreSQL infrastructure_nodes in this bounding box
  try {
    const dbInfraQuery = `
      SELECT name, sector, latitude, longitude, default_action
      FROM infrastructure_nodes
      WHERE latitude >= $1 AND latitude <= $2
        AND longitude >= $3 AND longitude <= $4;
    `;
    const dbInfraRes = await pool.query(dbInfraQuery, [s, n, w, e]);
    for (const r of dbInfraRes.rows) {
      candidateFacilities.push({
        name: r.name,
        category: r.sector,
        lat: parseFloat(r.latitude),
        lng: parseFloat(r.longitude),
        action: r.default_action || 'Activate Foam Deluge & Clear Perimeter',
      });
    }
  } catch (dbErr) {
    console.warn('Database infrastructure query note:', dbErr);
  }

  // Fallback to seeded sovereign industrial facilities if DB is empty or down
  if (candidateFacilities.length === 0) {
    for (const inf of INFRASTRUCTURE_SEED_DATA) {
      if (inf.latitude >= s - 1.5 && inf.latitude <= n + 1.5 && inf.longitude >= w - 1.5 && inf.longitude <= e + 1.5) {
        candidateFacilities.push({
          name: inf.name,
          category: inf.sector,
          lat: inf.latitude,
          lng: inf.longitude,
          action: inf.default_action,
        });
      }
    }
  }

  // B. Query OpenStreetMap Nominatim for live industrial facilities in the viewbox
  const cacheKey = `${w.toFixed(1)},${s.toFixed(1)},${e.toFixed(1)},${n.toFixed(1)}`;
  const cached = nominatimCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < 300000)) { // 5-minute cache
    candidateFacilities.push(...cached.data);
  } else {
    try {
      const clampedW = Math.max(-180, w).toFixed(2);
      const clampedS = Math.max(-85, s).toFixed(2);
      const clampedE = Math.min(180, e).toFixed(2);
      const clampedN = Math.min(85, n).toFixed(2);

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=industrial+area&format=json&bounded=1&viewbox=${clampedW},${clampedN},${clampedE},${clampedS}&limit=35`;
      const res = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'AstraFlare-DisasterMonitor/1.0 (contact: admin@astraflare.org)' },
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const osmResults = await res.json();
        const liveOsmItems: any[] = [];
        if (Array.isArray(osmResults)) {
          for (const item of osmResults) {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (isNaN(lat) || isNaN(lng)) continue;

            const rawName = item.name || item.display_name.split(',')[0];
            const name = rawName.length > 4 ? rawName : `${rawName} Industrial Zone`;

            const facilityItem = {
              name,
              category: item.type === 'suburb' ? 'Industrial Zone / Park' : item.type || 'Industrial Asset',
              lat,
              lng,
              action: 'Automated Foam Deluge & Perimeter Cooling',
              osmId: item.osm_id ? String(item.osm_id) : undefined,
            };
            candidateFacilities.push(facilityItem);
            liveOsmItems.push(facilityItem);
          }
        }
        nominatimCache.set(cacheKey, { timestamp: now, data: liveOsmItems });
      }
    } catch (osmErr) {
      console.warn('OSM Nominatim fetch note:', osmErr);
    }
  }

  // Deduplicate candidate facilities by coordinates / name
  const seen = new Set<string>();
  const uniqueFacilities = candidateFacilities.filter((f) => {
    const key = `${f.lat.toFixed(3)}_${f.lng.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 3. Process every single facility and compute its fire threat status
  // ONLY retain facilities located near an active fire hotspot (distance <= maxDistanceKm)
  const allMarkedIndustries: OSMIndustry[] = [];

  for (let i = 0; i < uniqueFacilities.length; i++) {
    const fac = uniqueFacilities[i];

    let nearestHotspot = hotspots[0];
    let minDistanceKm = Infinity;

    for (const h of hotspots) {
      const d = Math.hypot(fac.lat - h.lat, fac.lng - h.lng) * 111.0;
      if (d < minDistanceKm) {
        minDistanceKm = d;
        nearestHotspot = h;
      }
    }

    const dist = Math.round(minDistanceKm * 10) / 10;

    // Filter: strictly only show industries near active fire hotspots (<= maxDistanceKm)
    if (dist > maxDistanceKm) {
      continue;
    }

    let threatLevel: OSMIndustry['threatLevel'] = 'Elevated Watch';
    let threatColor = '#3b82f6'; // Blue
    let action = fac.action;

    if (dist <= 5.0) {
      threatLevel = 'Critical';
      threatColor = '#dc2626'; // Red
      action = 'IMMEDIATE: Deploy Automated Foam Deluge & Evacuate Non-Essential Personnel';
    } else if (dist <= 15.0) {
      threatLevel = 'High';
      threatColor = '#ea580c'; // Orange
      action = 'URGENT: Activate Water Curtain Deflectors & Fuel Cutoff Valves';
    } else if (dist <= 35.0) {
      threatLevel = 'Moderate';
      threatColor = '#eab308'; // Amber
      action = 'ALERT: Monitor Upwind Flare Buffers & Arm Perimeter Suppression Systems';
    } else {
      threatLevel = 'Elevated Watch';
      threatColor = '#3b82f6'; // Blue
      action = 'WATCH: Facility on Wildfire Perimeter Alert (< 50km from fire)';
    }

    allMarkedIndustries.push({
      id: `osm-ind-${i}-${Math.round(fac.lat * 100)}_${Math.round(fac.lng * 100)}`,
      name: fac.name,
      category: fac.category,
      lat: fac.lat,
      lng: fac.lng,
      distanceKm: dist,
      nearestHotspot: {
        lat: nearestHotspot.lat,
        lng: nearestHotspot.lng,
        frp: Math.round(nearestHotspot.frp * 10) / 10,
        brightness: Math.round(nearestHotspot.brightness * 10) / 10,
        acq_date: nearestHotspot.acq_date,
      },
      threatLevel,
      threatColor,
      action,
      osmUrl: fac.osmId
        ? `https://www.openstreetmap.org/node/${fac.osmId}`
        : `https://www.openstreetmap.org/?mlat=${fac.lat}&mlon=${fac.lng}#map=15/${fac.lat.toFixed(4)}/${fac.lng.toFixed(4)}`,
    });
  }

  // Sort: facilities with active fire proximity threats first, then by distance
  const threatOrder: Record<string, number> = {
    'Critical': 1,
    'High': 2,
    'Moderate': 3,
    'Elevated Watch': 4,
    'Monitored / Safe': 5,
  };

  allMarkedIndustries.sort((a, b) => {
    const orderDiff = (threatOrder[a.threatLevel] || 99) - (threatOrder[b.threatLevel] || 99);
    if (orderDiff !== 0) return orderDiff;
    if (a.distanceKm < 0) return 1;
    if (b.distanceKm < 0) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return allMarkedIndustries;
}
