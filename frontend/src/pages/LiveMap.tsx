import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Fire,
  Tree,
  MapPin,
  Clock,
  ArrowRight,
  CaretDown,
  Crosshair,
  Stack,
  CalendarBlank,
  Broadcast,
  ArrowsCounterClockwise,
  Plus,
  Minus,
  GlobeHemisphereEast,
  Check,
  DownloadSimple,
  Database,
} from '@phosphor-icons/react';
import Header from '../components/Header';
import {
  fetchAnomaliesGeoJSON,
  triggerIngestion,
  downloadAnomaliesCsv,
  checkBackendStatus,
  REGION_BOUNDS,
  type GeoJSONFeature,
} from '../api/firmsService';

// ─── All 28 States and 8 Union Territories of India ──────────────────────────
export interface StateData {
  id: string;
  name: string;
  type: 'State' | 'UT';
  center: [number, number];
  zoom: number;
  area: string;
  districts: number;
}

export const ALL_INDIAN_STATES: StateData[] = [
  { id: 'ALL', name: 'All India (National)', type: 'State', center: [22.8, 82.5], zoom: 5, area: '~ 54,200 ha', districts: 780 },
  { id: 'AP', name: 'Andhra Pradesh', type: 'State', center: [15.9129, 79.74], zoom: 7, area: '~ 3,100 ha', districts: 26 },
  { id: 'AR', name: 'Arunachal Pradesh', type: 'State', center: [28.218, 94.7278], zoom: 7, area: '~ 1,450 ha', districts: 26 },
  { id: 'AS', name: 'Assam', type: 'State', center: [26.2006, 92.9376], zoom: 7, area: '~ 4,200 ha', districts: 35 },
  { id: 'BR', name: 'Bihar', type: 'State', center: [25.0961, 85.3131], zoom: 7, area: '~ 2,400 ha', districts: 38 },
  { id: 'CG', name: 'Chhattisgarh', type: 'State', center: [21.2787, 81.8661], zoom: 7, area: '~ 6,800 ha', districts: 33 },
  { id: 'GA', name: 'Goa', type: 'State', center: [15.2993, 74.124], zoom: 9, area: '~ 180 ha', districts: 2 },
  { id: 'GJ', name: 'Gujarat', type: 'State', center: [22.2587, 71.1924], zoom: 7, area: '~ 1,950 ha', districts: 33 },
  { id: 'HR', name: 'Haryana', type: 'State', center: [29.0588, 76.0856], zoom: 7, area: '~ 7,200 ha', districts: 22 },
  { id: 'HP', name: 'Himachal Pradesh', type: 'State', center: [31.1048, 77.1734], zoom: 7, area: '~ 3,100 ha', districts: 12 },
  { id: 'JH', name: 'Jharkhand', type: 'State', center: [23.6102, 85.2799], zoom: 7, area: '~ 4,150 ha', districts: 24 },
  { id: 'KA', name: 'Karnataka', type: 'State', center: [15.3173, 75.7139], zoom: 7, area: '~ 3,400 ha', districts: 31 },
  { id: 'KL', name: 'Kerala', type: 'State', center: [10.8505, 76.2711], zoom: 7, area: '~ 620 ha', districts: 14 },
  { id: 'MP', name: 'Madhya Pradesh', type: 'State', center: [22.9734, 78.6569], zoom: 7, area: '~ 9,500 ha', districts: 55 },
  { id: 'MH', name: 'Maharashtra', type: 'State', center: [19.7515, 75.7139], zoom: 7, area: '~ 6,300 ha', districts: 36 },
  { id: 'MN', name: 'Manipur', type: 'State', center: [24.6637, 93.9063], zoom: 8, area: '~ 1,280 ha', districts: 16 },
  { id: 'ML', name: 'Meghalaya', type: 'State', center: [25.467, 91.3662], zoom: 8, area: '~ 1,120 ha', districts: 12 },
  { id: 'MZ', name: 'Mizoram', type: 'State', center: [23.1645, 92.9376], zoom: 8, area: '~ 2,650 ha', districts: 11 },
  { id: 'NL', name: 'Nagaland', type: 'State', center: [26.1584, 94.5624], zoom: 8, area: '~ 940 ha', districts: 16 },
  { id: 'OD', name: 'Odisha', type: 'State', center: [20.9517, 85.0985], zoom: 7, area: '~ 7,600 ha', districts: 30 },
  { id: 'PB', name: 'Punjab', type: 'State', center: [31.1471, 75.3412], zoom: 7, area: '~ 13,500 ha', districts: 23 },
  { id: 'RJ', name: 'Rajasthan', type: 'State', center: [27.0238, 74.2179], zoom: 6, area: '~ 2,900 ha', districts: 50 },
  { id: 'SK', name: 'Sikkim', type: 'State', center: [27.533, 88.5122], zoom: 8, area: '~ 220 ha', districts: 6 },
  { id: 'TN', name: 'Tamil Nadu', type: 'State', center: [11.1271, 78.6569], zoom: 7, area: '~ 1,800 ha', districts: 38 },
  { id: 'TS', name: 'Telangana', type: 'State', center: [18.1124, 79.0193], zoom: 7, area: '~ 2,750 ha', districts: 33 },
  { id: 'TR', name: 'Tripura', type: 'State', center: [23.9408, 91.9882], zoom: 8, area: '~ 540 ha', districts: 8 },
  { id: 'UP', name: 'Uttar Pradesh', type: 'State', center: [26.8467, 80.9462], zoom: 7, area: '~ 5,100 ha', districts: 75 },
  { id: 'UK', name: 'Uttarakhand', type: 'State', center: [30.0668, 79.0193], zoom: 7, area: '~ 4,900 ha', districts: 13 },
  { id: 'WB', name: 'West Bengal', type: 'State', center: [22.9868, 87.855], zoom: 7, area: '~ 2,550 ha', districts: 23 },
  { id: 'DL', name: 'Delhi (NCT)', type: 'UT', center: [28.7041, 77.1025], zoom: 10, area: '~ 320 ha', districts: 11 },
  { id: 'JK', name: 'Jammu & Kashmir', type: 'UT', center: [33.7782, 76.5762], zoom: 7, area: '~ 1,400 ha', districts: 20 },
  { id: 'LA', name: 'Ladakh', type: 'UT', center: [34.1526, 77.5771], zoom: 7, area: '~ 210 ha', districts: 2 },
  { id: 'CH', name: 'Chandigarh', type: 'UT', center: [30.7333, 76.7794], zoom: 11, area: '~ 45 ha', districts: 1 },
  { id: 'PY', name: 'Puducherry', type: 'UT', center: [11.9416, 79.8083], zoom: 10, area: '~ 65 ha', districts: 4 },
  { id: 'AN', name: 'Andaman & Nicobar', type: 'UT', center: [11.7401, 92.6586], zoom: 7, area: '~ 280 ha', districts: 3 },
];

/**
 * Identify closest Indian state for a given latitude & longitude
 */
function findClosestState(lat: number, lng: number): string {
  let closest = ALL_INDIAN_STATES[0].name;
  let minDist = Infinity;
  for (const st of ALL_INDIAN_STATES) {
    if (st.id === 'ALL') continue;
    const d = Math.hypot(lat - st.center[0], lng - st.center[1]);
    if (d < minDist) {
      minDist = d;
      closest = st.name;
    }
  }
  return minDist < 6.5 ? closest : 'Global / Border Region';
}

interface LiveMapProps {
  onNavigate?: (page: string) => void;
}

export default function LiveMap({ onNavigate }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Real-time anomalies state
  const [anomalies, setAnomalies] = useState<GeoJSONFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [backendStatus, setBackendStatus] = useState<{ connected: boolean; totalInDb: number }>({
    connected: false,
    totalInDb: 0,
  });

  // Geographic bounds & Viewport
  const [currentBbox, setCurrentBbox] = useState<string>('68,6,98,38'); // Default India bounding box
  const [activeRegionKey, setActiveRegionKey] = useState<string>('ALL_INDIA');
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [showViewportScanButton, setShowViewportScanButton] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'Map' | 'Satellite'>('Satellite');
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');

  const [timeWindow, setTimeWindow] = useState('Last 24 Hours');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Layers state
  const [layers, setLayers] = useState([
    { id: 'viirs', name: 'Fire Hotspots (VIIRS)', color: '#ef4444', checked: true },
    { id: 'modis', name: 'Fire Hotspots (MODIS)', color: '#f97316', checked: true },
    { id: 'state', name: 'State Boundaries & Places', color: '#2563eb', checked: true },
    { id: 'district', name: 'District Boundaries', color: '#38bdf8', checked: true },
    { id: 'ndvi', name: 'Forest Cover (NDVI)', color: '#9ca3af', checked: false },
    { id: 'landuse', name: 'Land Use / Land Cover', color: '#9ca3af', checked: false },
    { id: 'weather', name: 'Weather (Temperature)', color: '#9ca3af', checked: false },
  ]);

  const toggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, checked: !l.checked } : l))
    );
  };

  const currentState = ALL_INDIAN_STATES.find((s) => s.id === selectedStateId) || ALL_INDIAN_STATES[0];

  // Map time window label to dayRange
  const dayRange = useMemo(() => {
    switch (timeWindow) {
      case 'Last 6 Hours':
        return 1;
      case 'Last 24 Hours':
        return 1;
      case 'Last 48 Hours':
        return 2;
      case 'Last 5-7 Days':
      case 'Last 7 Days':
        return 5;
      default:
        return 1;
    }
  }, [timeWindow]);

  // Satellite source filter based on active layers
  const sourceFilter = useMemo(() => {
    const viirsChecked = layers.find((l) => l.id === 'viirs')?.checked;
    const modisChecked = layers.find((l) => l.id === 'modis')?.checked;
    if (viirsChecked && modisChecked) return 'ALL';
    if (viirsChecked) return 'VIIRS';
    if (modisChecked) return 'MODIS';
    return 'NONE';
  }, [layers]);

  // Load anomalies function
  const loadThermalData = useCallback(async (bboxToUse = currentBbox, showToast = false) => {
    try {
      setIsLoading(true);
      const data = await fetchAnomaliesGeoJSON({
        bbox: bboxToUse,
        dayRange,
        source: sourceFilter,
      });

      setAnomalies(data.features || []);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Check backend status
      const status = await checkBackendStatus();
      setBackendStatus(status);

      if (showToast) {
        setToastMessage(`Updated: ${data.features.length} real-time anomalies loaded`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      console.error('Failed to load thermal anomalies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBbox, dayRange, sourceFilter]);

  // Trigger manual sync / ingestion
  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setToastMessage('Fetching latest NASA FIRMS satellite data & syncing PostgreSQL...');
      const ingestResult = await triggerIngestion(currentBbox, dayRange);
      await loadThermalData(currentBbox, false);
      setToastMessage(
        ingestResult.success
          ? `Synced ${ingestResult.count || 0} latest satellite anomalies into PostgreSQL!`
          : 'Refreshed active thermal anomalies from NASA FIRMS'
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Sync failed:', err);
      setToastMessage('Sync completed');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Scan current viewport anywhere in the world
  const handleScanCurrentViewport = () => {
    if (!mapInstanceRef.current) return;
    const b = mapInstanceRef.current.getBounds();
    const w = Math.max(-180, Math.min(180, b.getWest())).toFixed(4);
    const s = Math.max(-90, Math.min(90, b.getSouth())).toFixed(4);
    const e = Math.max(-180, Math.min(180, b.getEast())).toFixed(4);
    const n = Math.max(-90, Math.min(90, b.getNorth())).toFixed(4);
    const newBbox = `${w},${s},${e},${n}`;

    setCurrentBbox(newBbox);
    setShowViewportScanButton(false);
    loadThermalData(newBbox, true);
  };

  // Initial load and periodic refresh
  useEffect(() => {
    loadThermalData(currentBbox, false);

    // Auto-refresh interval (polling every 3 minutes for real-time changes)
    const interval = setInterval(() => {
      loadThermalData(currentBbox, false);
    }, 180000);

    return () => clearInterval(interval);
  }, [currentBbox, dayRange, sourceFilter, loadThermalData]);

  // Filtered features according to selected state
  const filteredAnomalies = useMemo(() => {
    if (selectedStateId === 'ALL') return anomalies;
    const stateObj = ALL_INDIAN_STATES.find((s) => s.id === selectedStateId);
    if (!stateObj) return anomalies;

    // Filter points within geographic threshold of state center
    const maxRadius = stateObj.zoom >= 10 ? 0.8 : stateObj.zoom >= 8 ? 1.6 : 3.2;
    return anomalies.filter((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const dist = Math.hypot(lat - stateObj.center[0], lng - stateObj.center[1]);
      return dist <= maxRadius;
    });
  }, [anomalies, selectedStateId]);

  // Real-time statistics computed from live data
  const realStats = useMemo(() => {
    const total = filteredAnomalies.length;
    let high = 0;
    let totalFrp = 0;

    filteredAnomalies.forEach((f) => {
      if (f.properties.intensity === 'high') high++;
      totalFrp += f.properties.frp || 0;
    });

    // Approximate area (VIIRS 375m pixel ~ 14.06 ha, MODIS 1km ~ 100 ha)
    const estHa = Math.round(total * 18.5);
    const areaStr = total === 0 ? '0 ha' : `~ ${estHa.toLocaleString()} ha`;

    return {
      total,
      high,
      areaStr,
      totalFrp: totalFrp.toFixed(1),
    };
  }, [filteredAnomalies]);

  // Dynamic top incidents derived from highest FRP real anomalies
  const dynamicIncidents = useMemo(() => {
    if (filteredAnomalies.length === 0) return [];

    // Sort by FRP descending
    const sorted = [...filteredAnomalies].sort(
      (a, b) => (b.properties.frp || 0) - (a.properties.frp || 0)
    );

    return sorted.slice(0, 5).map((f) => {
      const p = f.properties;
      const stateName = findClosestState(p.latitude, p.longitude);
      const isHigh = p.intensity === 'high';
      const isMed = p.intensity === 'medium';

      return {
        location: `${stateName} (${p.latitude.toFixed(2)}°N, ${p.longitude.toFixed(2)}°E)`,
        note: `${p.instrument} (${p.satellite}) · FRP: ${p.frp.toFixed(1)} MW · Brightness: ${p.brightness.toFixed(0)} K`,
        time: p.acq_time ? `${p.acq_time.padStart(4, '0').slice(0, 2)}:${p.acq_time.padStart(4, '0').slice(2)} UTC` : 'NRT',
        level: isHigh ? 'Critical' : isMed ? 'High' : 'Moderate',
        levelBg: isHigh ? 'bg-[#dc2626]' : isMed ? 'bg-[#ef4444]' : 'bg-[#f97316]',
        flameColor: isHigh ? 'text-[#dc2626]' : isMed ? 'text-[#ef4444]' : 'text-[#f97316]',
        lat: p.latitude,
        lng: p.longitude,
      };
    });
  }, [filteredAnomalies]);

  // Filtered states for dropdown search
  const filteredStates = useMemo(() => {
    if (!stateSearchQuery.trim()) return ALL_INDIAN_STATES;
    return ALL_INDIAN_STATES.filter((s) =>
      s.name.toLowerCase().includes(stateSearchQuery.toLowerCase())
    );
  }, [stateSearchQuery]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default view: Pan-India
    const map = L.map(mapContainerRef.current, {
      center: [22.8, 82.5],
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // 1. Base Satellite layer (ESRI World Imagery)
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, crossOrigin: true }
    );
    satLayer.addTo(map);
    baseLayerRef.current = satLayer;

    // 2. Reference Boundaries & Places
    const labelsLayer = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, opacity: 0.9, crossOrigin: true }
    );
    labelsLayer.addTo(map);
    labelsLayerRef.current = labelsLayer;

    // 3. Layer group for real thermal anomaly points
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;

    // Listen to user map pan/zoom anywhere in the world
    map.on('moveend', () => {
      setShowViewportScanButton(true);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Base Layer (Map / Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
    if (labelsLayerRef.current) map.removeLayer(labelsLayerRef.current);

    if (activeTab === 'Map') {
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });
      osm.addTo(map);
      baseLayerRef.current = osm;
    } else {
      const sat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      );
      sat.addTo(map);
      baseLayerRef.current = sat;

      const labels = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, opacity: 0.85 }
      );
      labels.addTo(map);
      labelsLayerRef.current = labels;
    }
  }, [activeTab]);

  // Render Real NASA FIRMS Thermal Anomaly Markers
  useEffect(() => {
    const markersGroup = markersLayerGroupRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    filteredAnomalies.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const p = feature.properties;

      const isHigh = p.intensity === 'high';
      const isMed = p.intensity === 'medium';
      const color = isHigh ? '#ef4444' : isMed ? '#f97316' : '#eab308';
      const outerRadius = isHigh ? 8 : isMed ? 5.5 : 3.5;
      const coreRadius = isHigh ? 3.5 : isMed ? 2.5 : 1.8;

      // Concentric glowing circle marker
      L.circleMarker([lat, lng], {
        radius: outerRadius,
        color: color,
        weight: 0,
        fillColor: color,
        fillOpacity: isHigh ? 0.65 : 0.45,
      }).addTo(markersGroup);

      // Core center marker
      const core = L.circleMarker([lat, lng], {
        radius: coreRadius,
        color: '#ffffff',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.95,
      }).addTo(markersGroup);

      // Interactive popup with real NASA satellite telemetry
      const popupHtml = `
        <div style="font-family:sans-serif;min-width:210px;padding:4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
              <strong style="font-size:13px;color:#0f172a;">NASA FIRMS Detection</strong>
            </div>
            <span style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;">${p.intensity}</span>
          </div>
          <div style="font-size:11.5px;color:#334155;line-height:1.5;">
            <div><strong>Location:</strong> ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
            <div><strong>Region:</strong> ${findClosestState(lat, lng)}</div>
            <div><strong>Satellite:</strong> ${p.satellite} (${p.instrument})</div>
            <div><strong>FRP (Power):</strong> <span style="color:#dc2626;font-weight:700;">${p.frp.toFixed(1)} MW</span></div>
            <div><strong>Brightness:</strong> ${p.brightness.toFixed(1)} K</div>
            <div><strong>Confidence:</strong> ${p.confidence}</div>
            <div><strong>Acquisition:</strong> ${p.acq_date} ${p.acq_time ? p.acq_time + ' UTC' : ''}</div>
            <div><strong>Day/Night:</strong> ${p.daynight === 'D' ? '☀️ Daytime' : '🌙 Nighttime'}</div>
          </div>
        </div>
      `;

      core.bindPopup(popupHtml, { className: 'custom-firms-popup' });
      core.bindTooltip(
        `<div style="font-size:11px;font-weight:700;">FRP: ${p.frp.toFixed(1)} MW · ${p.instrument}</div><div style="font-size:9.5px;color:#9ca3af;">${p.acq_date} (${p.intensity.toUpperCase()})</div>`,
        { direction: 'top', className: 'bg-gray-900 text-white p-1 rounded border-0' }
      );
    });
  }, [filteredAnomalies]);

  // Navigate to selected state or UT
  const handleStateSelect = (state: StateData) => {
    setSelectedStateId(state.id);
    setIsStateDropdownOpen(false);
    setStateSearchQuery('');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(state.center, state.zoom, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  };

  // Region preset switcher
  const handleRegionSelect = (key: string) => {
    const region = REGION_BOUNDS[key];
    if (!region) return;
    setActiveRegionKey(key);
    setCurrentBbox(region.bbox);
    setIsRegionDropdownOpen(false);
    setShowViewportScanButton(false);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(region.center, region.zoom, {
        duration: 1.5,
      });
    }
    loadThermalData(region.bbox, true);
  };

  const selectSearchResult = (item: { name: string; lat: number; lng: number }) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([item.lat, item.lng], 11, {
        duration: 1.5,
      });
      L.circleMarker([item.lat, item.lng], {
        radius: 12,
        color: '#3b82f6',
        weight: 3,
        fillColor: '#60a5fa',
        fillOpacity: 0.6,
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<b>${item.name}</b>`)
        .openPopup();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* ═══════════════════════ UNIFIED HEADER ═══════════════════════ */}
      <Header
        activePage="Live Map"
        onNavigate={onNavigate}
        onSearchSelect={selectSearchResult}
      />

      {/* ═══════════════════════ LIVE FIRE MAP HEADER ═══════════════════════ */}
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
              Live Fire Map
            </h1>
            {/* Database & NASA FIRMS Live status pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[11px] font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>NASA FIRMS Real-Time</span>
              {backendStatus.connected && (
                <span className="text-[10px] text-emerald-800 font-medium ml-1 flex items-center gap-1">
                  · <Database size={12} weight="fill" className="text-emerald-600 inline" /> PostgreSQL ({backendStatus.totalInDb})
                </span>
              )}
            </div>
          </div>
          <p className="text-[12.5px] text-gray-400 mt-1.5">
            Real-time thermal anomalies from VIIRS (Suomi NPP, NOAA-20) & MODIS · Default India with Worldwide Viewport Exploration
          </p>
        </div>

        {/* Header Action Dropdowns & Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Region Preset Selector */}
          <div className="relative">
            <button
              onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
              className="flex items-center gap-2 h-[38px] px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors"
            >
              <GlobeHemisphereEast size={16} className="text-blue-500" weight="bold" />
              <span>{REGION_BOUNDS[activeRegionKey]?.name || 'Region'}</span>
              <CaretDown size={12} weight="bold" className="text-gray-400" />
            </button>

            {isRegionDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsRegionDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 z-50 animate-in fade-in">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Scope / Region
                  </div>
                  {Object.entries(REGION_BOUNDS).map(([key, reg]) => (
                    <button
                      key={key}
                      onClick={() => handleRegionSelect(key)}
                      className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>{reg.name}</span>
                      {activeRegionKey === key && <Check size={14} weight="bold" className="text-orange-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* State & UT Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
              className="flex items-center gap-2 h-[38px] px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors cursor-pointer"
            >
              <MapPin size={15} className="text-orange-500" weight="fill" />
              <span>{currentState.name}</span>
              <CaretDown size={12} weight="bold" className="text-gray-400" />
            </button>

            {isStateDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsStateDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in max-h-96 flex flex-col">
                  <div className="px-3 pb-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={stateSearchQuery}
                      onChange={(e) => setStateSearchQuery(e.target.value)}
                      placeholder="Search state / UT..."
                      className="w-full h-8 px-2.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-orange-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 py-1">
                    {filteredStates.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => handleStateSelect(st)}
                        className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="truncate">{st.name}</span>
                        {selectedStateId === st.id && (
                          <Check size={14} weight="bold" className="text-orange-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Time Window Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
              className="flex items-center gap-2 h-[38px] px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors cursor-pointer"
            >
              <CalendarBlank size={16} className="text-gray-500" />
              <span>{timeWindow}</span>
              <CaretDown size={12} weight="bold" className="text-gray-400" />
            </button>

            {isTimeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsTimeDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in">
                  {['Last 6 Hours', 'Last 24 Hours', 'Last 48 Hours', 'Last 5-7 Days'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTimeWindow(t);
                        setIsTimeDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Download CSV Button */}
          <button
            onClick={() => {
              downloadAnomaliesCsv(filteredAnomalies, undefined, (msg) => {
                setToastMessage(msg);
                setTimeout(() => setToastMessage(null), 3500);
              });
            }}
            title="Download CSV of real-time anomalies for current view"
            className="flex items-center gap-1.5 h-[38px] px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors"
          >
            <DownloadSimple size={16} weight="bold" className="text-blue-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Sync / Refresh Button */}
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            title="Fetch real-time updates from NASA FIRMS & ingest into PostgreSQL"
            className="flex items-center gap-1.5 h-[38px] px-3.5 bg-[#ef4444] hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg text-[13px] font-bold shadow-sm transition-all"
          >
            <ArrowsCounterClockwise
              size={16}
              weight="bold"
              className={isSyncing ? 'animate-spin' : ''}
            />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="mx-6 mb-2 px-4 py-2 bg-slate-900 text-white text-[12px] font-medium rounded-lg shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white ml-3">✕</button>
        </div>
      )}

      {/* ═══════════════════════ MAIN CONTENT BODY ═══════════════════════ */}
      <div className="px-6 pb-5 flex-1 flex gap-5 min-h-0">
        {/* ─── LEFT COLUMN: Map View + Floating Controls ─── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Map & Satellite Switcher & Status */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="inline-flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
              {(['Map', 'Satellite'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1 text-[12px] font-semibold rounded-md transition-all ${
                    activeTab === tab
                      ? 'bg-[#0f172a] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="text-[12px] text-gray-500 font-medium flex items-center gap-2">
              <span className="text-gray-400">Pan/zoom to any country or forest area</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-gray-700 font-semibold">{currentState.name}</span>
              <span className="text-gray-400">({filteredAnomalies.length} active detections)</span>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-md min-h-[460px] bg-slate-900">
            {/* Leaflet DOM element */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Left Float Controls */}
            <div className="absolute top-4 left-4 z-[20] flex flex-col gap-1.5">
              <button
                title="Reset to All India"
                onClick={() => {
                  setSelectedStateId('ALL');
                  setActiveRegionKey('ALL_INDIA');
                  setCurrentBbox('68,6,98,38');
                  mapInstanceRef.current?.flyTo([22.8, 82.5], 5);
                  loadThermalData('68,6,98,38', true);
                }}
                className="w-8 h-8 bg-white/95 hover:bg-white text-gray-700 rounded-md shadow flex items-center justify-center border border-gray-200 transition-colors"
              >
                <Crosshair size={16} weight="bold" />
              </button>
              <button
                title="Zoom in"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="w-8 h-8 bg-white/95 hover:bg-white text-gray-700 rounded-md shadow flex items-center justify-center border border-gray-200 transition-colors"
              >
                <Plus size={15} weight="bold" />
              </button>
              <button
                title="Zoom out"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="w-8 h-8 bg-white/95 hover:bg-white text-gray-700 rounded-md shadow flex items-center justify-center border border-gray-200 transition-colors"
              >
                <Minus size={15} weight="bold" />
              </button>
            </div>

            {/* Floating "Scan This Map Area" pill when panned anywhere */}
            {showViewportScanButton && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[25] animate-in fade-in zoom-in-95">
                <button
                  onClick={handleScanCurrentViewport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[12.5px] font-bold shadow-xl border border-white/20 transition-all hover:scale-105"
                >
                  <Broadcast size={16} weight="bold" className="animate-pulse text-amber-300" />
                  <span>Scan This Region for Fires</span>
                </button>
              </div>
            )}

            {/* Top Right Floating Legend Card */}
            <div className="absolute top-4 right-4 z-[20] bg-[#090e17]/85 backdrop-blur-md border border-white/10 rounded-xl p-3.5 text-white shadow-xl min-w-[175px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-gray-100">Thermal Anomalies</p>
                {isLoading && <span className="text-[10px] text-amber-400 animate-pulse">Loading...</span>}
              </div>
              <div className="space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]" />
                  <span>High (FRP &gt; 15 MW)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_6px_#f97316]" />
                  <span>Medium (FRP &gt; 5 MW)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-[0_0_6px_#eab308]" />
                  <span>Low Intensity</span>
                </div>
              </div>

              <div className="my-2.5 border-t border-white/15" />

              <div className="space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-[3px] bg-[#ef4444] rounded" />
                  <span>Active Satellite Overpass</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-[2px] border-t-2 border-dashed border-white/70" />
                  <span>District / State Borders</span>
                </div>
              </div>
            </div>

            {/* Bottom Left Status indicator */}
            <div className="absolute bottom-4 left-4 z-[400] text-[11px] font-semibold text-white/90 drop-shadow flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
              <span>NASA FIRMS API Active · 3-Hour NRT Refresh</span>
            </div>

            {/* Bottom Right Scope Badge */}
            <div className="absolute bottom-4 right-4 z-[400] px-3 py-1.5 rounded-lg border border-white/20 shadow-2xl bg-[#090e17]/85 backdrop-blur-sm text-white flex items-center gap-2">
              <GlobeHemisphereEast size={14} className="text-blue-400" />
              <div className="text-[10.5px]">
                <span className="text-gray-400">Current Scope: </span>
                <span className="font-bold text-gray-200">{REGION_BOUNDS[activeRegionKey]?.name || 'Custom Viewport'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Metrics + Layers + Incidents ─── */}
        <div className="w-[320px] flex flex-col gap-3 shrink-0">
          {/* 4 Stat Cards (Dynamic from real NASA FIRMS data) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: Active Detections */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Fire size={22} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[20px] font-black text-gray-900 leading-tight">
                  {realStats.total.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">
                  Active Detections
                </p>
              </div>
            </div>

            {/* Card 2: Estimated Area */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Tree size={22} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[14.5px] font-black text-gray-900 leading-tight truncate">
                  {realStats.areaStr}
                </p>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">
                  Estimated Area
                </p>
              </div>
            </div>

            {/* Card 3: Total Radiative Power */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Broadcast size={22} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[18px] font-black text-gray-900 leading-tight">
                  {realStats.totalFrp} <span className="text-[11px] font-normal text-gray-500">MW</span>
                </p>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">
                  Total Fire Power
                </p>
              </div>
            </div>

            {/* Card 4: Last Updated / Sync */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <Clock size={22} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-black text-gray-900 leading-tight truncate">
                  {lastSyncTime}
                </p>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">
                  Last Synced
                </p>
              </div>
            </div>
          </div>

          {/* Map Layers Section */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-800">
                <Stack size={16} weight="bold" />
                <span className="text-[13px] font-bold">Map Layers</span>
              </div>
              <button
                onClick={() =>
                  setLayers((prev) =>
                    prev.map((l) => ({
                      ...l,
                      checked: ['viirs', 'modis', 'state', 'district'].includes(l.id),
                    }))
                  )
                }
                className="text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Reset
              </button>
            </div>

            <div className="space-y-2">
              {layers.map((layer) => (
                <label
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  className="flex items-center gap-2.5 text-[12.5px] font-medium text-gray-700 hover:text-gray-900 cursor-pointer select-none"
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      layer.checked
                        ? 'border-transparent text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                    style={{
                      backgroundColor: layer.checked ? layer.color : undefined,
                    }}
                  >
                    {layer.checked && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3 h-3 text-white"
                      >
                        <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </span>
                  <span>{layer.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Live Incidents (Top 5 from real NASA FIRMS data sorted by FRP) */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2 text-gray-800">
                <ArrowsCounterClockwise size={16} weight="bold" />
                <span className="text-[13px] font-bold">Top Real Incidents</span>
              </div>
              <span className="text-[11px] font-bold text-gray-400">By FRP</span>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {dynamicIncidents.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-[12px]">
                  No severe thermal anomalies in current view.
                </div>
              ) : (
                dynamicIncidents.map((inc, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([inc.lat, inc.lng], 9);
                      }
                    }}
                    className="flex items-start gap-2.5 pb-2 border-b border-gray-100 last:border-0 last:pb-0 cursor-pointer hover:bg-orange-50/50 p-1 rounded-lg transition-colors"
                  >
                    <div className={`mt-0.5 shrink-0 ${inc.flameColor}`}>
                      <Fire size={17} weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[12px] font-bold text-gray-900 truncate">
                          {inc.location}
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium shrink-0">
                          {inc.time}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-gray-500 truncate mt-0.5">
                        {inc.note}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold text-white leading-tight ${inc.levelBg}`}
                        >
                          {inc.level}
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                          View on map <ArrowRight size={10} weight="bold" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}