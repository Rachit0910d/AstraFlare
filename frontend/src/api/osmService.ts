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

const BACKEND_BASE = '';

/**
 * Fetch OpenStreetMap verified industrial assets near active NASA FIRMS fire hotspots
 */
export async function fetchOsmIndustriesNearHotspots(bbox: string, maxDistanceKm: number = 50.0): Promise<OSMIndustry[]> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/osm/industries?bbox=${encodeURIComponent(bbox)}&maxDistanceKm=${maxDistanceKm}`);
    if (res.ok) {
      const data = await res.json();
      return data.industries || [];
    }
  } catch (err) {
    console.warn('Error fetching OSM industries near hotspots:', err);
  }
  return [];
}
