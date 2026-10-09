import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Fire,
  Tree,
  Clock,
  ArrowRight,
  CaretDown,
  CaretUp,
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
  Factory,
  ArrowSquareOut,
  Compass,
  Globe,
} from '@phosphor-icons/react';
import Header from '../components/Header';
import {
  fetchAnomaliesGeoJSON,
  triggerIngestion,
  downloadAnomaliesCsv,
  checkBackendStatus,
  type GeoJSONFeature,
} from '../api/firmsService';
import { fetchOsmIndustriesNearHotspots, type OSMIndustry } from '../api/osmService';
import { fetchCountries, type CountryOption } from '../api/predictionService';
import { getSubdivisionsForCountry, type CountrySubdivision } from '../data/countrySubdivisions';

/**
 * Identify closest subdivision (state / province / city) for a given coordinate
 */
function findClosestSubdivision(lat: number, lng: number, subdivisions: CountrySubdivision[]): string {
  if (!subdivisions || subdivisions.length === 0) return 'Regional Area';
  let closest = subdivisions[0]?.name || 'Regional Area';
  let minDist = Infinity;
  for (const st of subdivisions) {
    if (st.type === 'National') continue;
    const d = Math.hypot(lat - st.center[0], lng - st.center[1]);
    if (d < minDist) {
      minDist = d;
      closest = st.name;
    }
  }
  return minDist < 6.5 ? closest : subdivisions[0]?.name || 'Global Region';
}

interface LiveMapProps {
  onNavigate?: (page: string, incident?: any) => void;
  onSelectIncident?: (incident: any) => void;
}

export default function LiveMap({ onNavigate, onSelectIncident }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundaryMaskGroupRef = useRef<L.LayerGroup | null>(null);
  const osmLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const osmMarkerMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Real-time anomalies state
  const [anomalies, setAnomalies] = useState<GeoJSONFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [backendStatus, setBackendStatus] = useState<{ connected: boolean; totalInDb: number }>({
    connected: false,
    totalInDb: 0,
  });

  // OpenStreetMap (OSM) Industries near hotspots state
  // OpenStreetMap (OSM) Industries near hotspots state
  const [osmIndustries, setOsmIndustries] = useState<OSMIndustry[]>([]);
  const [isLoadingOsm, setIsLoadingOsm] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'incidents' | 'osm_industries'>('incidents');
  const [industryFilter, setIndustryFilter] = useState<'ALL' | 'THREAT' | 'SAFE'>('ALL');
  const [incidentSearchQuery, setIncidentSearchQuery] = useState('');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE'>('ALL');

  // Country selection state (database-backed from PostgreSQL)
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('IND');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<string>('ALL');

  // State / Province / City subdivision state
  const [selectedSubdivisionId, setSelectedSubdivisionId] = useState<string>('IND-ALL');
  const [isSubdivisionDropdownOpen, setIsSubdivisionDropdownOpen] = useState(false);
  const [subdivisionSearchQuery, setSubdivisionSearchQuery] = useState('');

  // Geographic bounds & Viewport
  const [currentBbox, setCurrentBbox] = useState<string>('68,6.5,98,37.5'); // Default India bounding box
  const [showViewportScanButton, setShowViewportScanButton] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'Map' | 'Satellite'>('Satellite');
  const [timeWindow, setTimeWindow] = useState('Last 24 Hours');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Layers state
  const [isLayersCollapsed, setIsLayersCollapsed] = useState(false);
  const [layers, setLayers] = useState([
    { id: 'osm_industries', name: 'OSM Industries (Near Hotspots)', color: '#ea580c', checked: true },
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

  // Fetch all countries on component mount
  useEffect(() => {
    fetchCountries()
      .then((data) => {
        if (data && data.length > 0) {
          setCountries(data);
        }
      })
      .catch((err) => console.warn('Could not load countries:', err));
  }, []);

  // Currently active Country object
  const currentCountry = useMemo(() => {
    return (
      countries.find((c) => c.code === selectedCountryCode) || {
        code: 'IND',
        code_2: 'IN',
        name: 'India',
        continent: 'Asia',
        capital: 'New Delhi',
        center: [22.8, 82.5] as [number, number],
        zoom: 5,
        bbox: '68,6.5,98,37.5',
        population: 1400000000,
        area_sq_km: 3287263,
      }
    );
  }, [countries, selectedCountryCode]);

  // List of states, provinces & cities for currently selected country
  const availableSubdivisions = useMemo(() => {
    return getSubdivisionsForCountry(
      currentCountry.code,
      currentCountry.name,
      currentCountry.center,
      currentCountry.zoom,
      currentCountry.bbox
    );
  }, [currentCountry]);

  // Currently active State / City subdivision object
  const currentSubdivision = useMemo(() => {
    return (
      availableSubdivisions.find((s) => s.id === selectedSubdivisionId) ||
      availableSubdivisions[0]
    );
  }, [availableSubdivisions, selectedSubdivisionId]);

  // Filtered subdivisions by user search query
  const filteredSubdivisions = useMemo(() => {
    if (!subdivisionSearchQuery.trim()) return availableSubdivisions;
    const q = subdivisionSearchQuery.toLowerCase();
    return availableSubdivisions.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q)
    );
  }, [availableSubdivisions, subdivisionSearchQuery]);

  // Filtered countries by continent & search query
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      const matchesContinent = selectedContinent === 'ALL' || c.continent === selectedContinent;
      const matchesSearch =
        !countrySearchQuery.trim() ||
        c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearchQuery.toLowerCase());
      return matchesContinent && matchesSearch;
    });
  }, [countries, selectedContinent, countrySearchQuery]);

  // Active Bounding Box coordinates parsed from currentSubdivision or currentBbox
  const activeBbox = useMemo(() => {
    if (currentSubdivision && currentSubdivision.bbox) {
      return currentSubdivision.bbox;
    }
    const parts = currentBbox.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 4 && !parts.some(isNaN)) {
      return { w: parts[0], s: parts[1], e: parts[2], n: parts[3], str: currentBbox };
    }
    return { w: 68.0, s: 6.5, e: 98.0, n: 37.5, str: currentBbox };
  }, [currentSubdivision, currentBbox]);

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

  // Load anomalies & OSM industrial facilities function
  const loadThermalData = useCallback(async (bboxToUse = currentBbox, showToast = false) => {
    try {
      setIsLoading(true);
      setIsLoadingOsm(true);
      const [anomaliesData, osmData] = await Promise.all([
        fetchAnomaliesGeoJSON({
          bbox: bboxToUse,
          dayRange,
          source: sourceFilter,
        }),
        fetchOsmIndustriesNearHotspots(bboxToUse),
      ]);

      setAnomalies(anomaliesData.features || []);
      setOsmIndustries(osmData);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Check backend status
      const status = await checkBackendStatus();
      setBackendStatus(status);

      if (showToast) {
        setToastMessage(`Loaded ${anomaliesData.features.length} thermal hotspots & ${osmData.length} OSM industrial facilities`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      console.error('Failed to load thermal anomalies or OSM data:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingOsm(false);
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

  // Filtered features according to selected state / subdivision & active boundary box
  const filteredAnomalies = useMemo(() => {
    let list = anomalies.filter((f) => {
      const [lng, lat] = f.geometry.coordinates;
      return (
        lat >= activeBbox.s &&
        lat <= activeBbox.n &&
        lng >= activeBbox.w &&
        lng <= activeBbox.e
      );
    });

    if (!currentSubdivision || currentSubdivision.type === 'National') return list;

    // Filter points within geographic bounds of selected subdivision
    const { w, s, e, n } = currentSubdivision.bbox;
    return list.filter((f) => {
      const [lng, lat] = f.geometry.coordinates;
      return lat >= s && lat <= n && lng >= w && lng <= e;
    });
  }, [anomalies, currentSubdivision, activeBbox]);

  // Real-time anomaly count per subdivision for the side list badges
  const anomalyCountBySubdivision = useMemo(() => {
    const counts: Record<string, number> = {};
    availableSubdivisions.forEach((sub) => {
      if (sub.type === 'National') {
        counts[sub.id] = anomalies.length;
        return;
      }
      const { w, s, e, n } = sub.bbox;
      const count = anomalies.filter((f) => {
        const [lng, lat] = f.geometry.coordinates;
        return lat >= s && lat <= n && lng >= w && lng <= e;
      }).length;
      counts[sub.id] = count;
    });
    return counts;
  }, [availableSubdivisions, anomalies]);

  // Filtered OSM industries strictly within boundary box AND near active fire hotspots (<= 50km)
  const filteredOsmIndustries = useMemo(() => {
    // If no fire anomalies are present at all in the active map, no industries are near hotspots
    if (filteredAnomalies.length === 0 && osmIndustries.length === 0) return [];

    return osmIndustries
      .filter((ind) => {
        // 1. Must be strictly within boundary box
        const inBbox =
          ind.lat >= activeBbox.s &&
          ind.lat <= activeBbox.n &&
          ind.lng >= activeBbox.w &&
          ind.lng <= activeBbox.e;
        if (!inBbox) return false;

        // 2. If filteredAnomalies exist, check if any active hotspot is within 50 km
        if (filteredAnomalies.length > 0) {
          let minDist = Infinity;
          for (const feat of filteredAnomalies) {
            const [hLng, hLat] = feat.geometry.coordinates;
            const dLat = (ind.lat - hLat) * 111.0;
            const dLng = (ind.lng - hLng) * 111.0 * Math.cos((ind.lat * Math.PI) / 180);
            const dist = Math.hypot(dLat, dLng);
            if (dist < minDist) minDist = dist;
          }
          return minDist <= 50.0;
        }

        // 3. Fallback to precalculated nearestHotspot & distance (<= 50km)
        return ind.nearestHotspot !== null && ind.distanceKm > 0 && ind.distanceKm <= 50.0;
      })
      .map((ind) => {
        // Dynamically compute exact distance & reference to the closest visible anomaly
        if (filteredAnomalies.length > 0) {
          let minDist = Infinity;
          let nearestFeat: any = null;
          for (const feat of filteredAnomalies) {
            const [hLng, hLat] = feat.geometry.coordinates;
            const dLat = (ind.lat - hLat) * 111.0;
            const dLng = (ind.lng - hLng) * 111.0 * Math.cos((ind.lat * Math.PI) / 180);
            const dist = Math.hypot(dLat, dLng);
            if (dist < minDist) {
              minDist = dist;
              nearestFeat = feat;
            }
          }
          if (nearestFeat && minDist <= 50.0) {
            const roundedDist = Math.round(minDist * 10) / 10;
            const [hLng, hLat] = nearestFeat.geometry.coordinates;
            let threatLevel: OSMIndustry['threatLevel'] = 'Elevated Watch';
            let threatColor = '#3b82f6';
            let action = ind.action;

            if (roundedDist <= 5.0) {
              threatLevel = 'Critical';
              threatColor = '#dc2626';
              action = 'IMMEDIATE: Deploy Automated Foam Deluge & Evacuate Non-Essential Personnel';
            } else if (roundedDist <= 15.0) {
              threatLevel = 'High';
              threatColor = '#ea580c';
              action = 'URGENT: Activate Water Curtain Deflectors & Fuel Cutoff Valves';
            } else if (roundedDist <= 35.0) {
              threatLevel = 'Moderate';
              threatColor = '#eab308';
              action = 'ALERT: Monitor Upwind Flare Buffers & Arm Perimeter Suppression Systems';
            }

            return {
              ...ind,
              distanceKm: roundedDist,
              nearestHotspot: {
                lat: hLat,
                lng: hLng,
                frp: nearestFeat.properties.frp || 0,
                brightness: nearestFeat.properties.brightness || 0,
                acq_date: nearestFeat.properties.acq_date,
              },
              threatLevel,
              threatColor,
              action,
            };
          }
        }
        return ind;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [osmIndustries, filteredAnomalies, activeBbox]);

  // Count of industries in immediate wildfire danger zone (< 35km)
  const atRiskOsmCount = useMemo(() => {
    return filteredOsmIndustries.filter(
      (ind) => ind.threatLevel === 'Critical' || ind.threatLevel === 'High' || ind.threatLevel === 'Moderate'
    ).length;
  }, [filteredOsmIndustries]);

  // Industries filtered by selected tab filter
  const displayedOsmIndustries = useMemo(() => {
    if (industryFilter === 'THREAT') {
      return filteredOsmIndustries.filter(
        (ind) => ind.threatLevel === 'Critical' || ind.threatLevel === 'High' || ind.threatLevel === 'Moderate'
      );
    }
    if (industryFilter === 'SAFE') {
      return filteredOsmIndustries.filter(
        (ind) => ind.threatLevel === 'Elevated Watch'
      );
    }
    return filteredOsmIndustries;
  }, [filteredOsmIndustries, industryFilter]);

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

  // All real incidents within the boundary box derived from filteredAnomalies
  const allIncidents = useMemo(() => {
    if (filteredAnomalies.length === 0) return [];

    const list = filteredAnomalies.map((f, idx) => {
      const p = f.properties;
      const stateName = p.state || findClosestSubdivision(p.latitude, p.longitude, availableSubdivisions);
      const isCritical = (p.frp && p.frp >= 20) || p.intensity === 'high';
      const isHigh = (p.frp && p.frp >= 10 && p.frp < 20) || p.intensity === 'medium';

      return {
        id: `inc-${idx}-${p.latitude}-${p.longitude}`,
        location: `${stateName}`,
        coordinates: `${p.latitude.toFixed(3)}°N, ${p.longitude.toFixed(3)}°E`,
        instrument: p.instrument || 'VIIRS',
        satellite: p.satellite || 'LEO',
        frp: p.frp || 0,
        brightness: p.brightness || 0,
        time: p.acq_time ? `${p.acq_time.padStart(4, '0').slice(0, 2)}:${p.acq_time.padStart(4, '0').slice(2)} UTC` : 'NRT',
        date: p.acq_date || 'Today',
        confidence: p.confidence || 'Nominal',
        daynight: p.daynight === 'D' ? 'Day' : 'Night',
        level: isCritical ? 'Critical' : isHigh ? 'High' : 'Moderate',
        levelBg: isCritical ? 'bg-[#dc2626]' : isHigh ? 'bg-[#ea580c]' : 'bg-[#eab308]',
        flameColor: isCritical ? 'text-[#dc2626]' : isHigh ? 'text-[#ea580c]' : 'text-[#eab308]',
        lat: p.latitude,
        lng: p.longitude,
      };
    });

    return list.sort((a, b) => b.frp - a.frp);
  }, [filteredAnomalies, availableSubdivisions]);

  // Filtered incidents by user search and severity filter
  const displayedIncidents = useMemo(() => {
    return allIncidents.filter((inc) => {
      if (incidentSeverityFilter === 'CRITICAL' && inc.level !== 'Critical') return false;
      if (incidentSeverityFilter === 'HIGH' && inc.level !== 'High') return false;
      if (incidentSeverityFilter === 'MODERATE' && inc.level !== 'Moderate') return false;

      if (incidentSearchQuery.trim()) {
        const q = incidentSearchQuery.toLowerCase();
        const matchesLoc = inc.location.toLowerCase().includes(q);
        const matchesCoords = inc.coordinates.toLowerCase().includes(q);
        const matchesInst = inc.instrument.toLowerCase().includes(q) || inc.satellite.toLowerCase().includes(q);
        const matchesLevel = inc.level.toLowerCase().includes(q);
        if (!matchesLoc && !matchesCoords && !matchesInst && !matchesLevel) return false;
      }
      return true;
    });
  }, [allIncidents, incidentSeverityFilter, incidentSearchQuery]);

  // Progressive batch rendering for silky smooth 60fps scrolling through all incidents
  const [visibleIncidentCount, setVisibleIncidentCount] = useState(60);

  // Reset pagination count whenever filters, query, or country changes
  useEffect(() => {
    setVisibleIncidentCount(60);
  }, [incidentSearchQuery, incidentSeverityFilter, selectedSubdivisionId, selectedCountryCode]);

  // Incidents currently mounted in DOM for fast rendering
  const incidentsToRender = useMemo(() => {
    return displayedIncidents.slice(0, visibleIncidentCount);
  }, [displayedIncidents, visibleIncidentCount]);

  // Seamless auto-load more incidents as user scrolls toward bottom
  const handleIncidentListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      setVisibleIncidentCount((prev) => {
        if (prev >= displayedIncidents.length) return prev;
        return Math.min(prev + 60, displayedIncidents.length);
      });
    }
  }, [displayedIncidents.length]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default view: Pan-India
    const map = L.map(mapContainerRef.current, {
      center: [22.8, 82.5],
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Dedicated high-priority pane for Fire Hotspots (zIndex 650 > markerPane 600)
    // Ensures hotspots are ALWAYS visible and clickable above industry markers
    if (!map.getPane('fireHotspotPane')) {
      const firePane = map.createPane('fireHotspotPane');
      firePane.style.zIndex = '650';
    }

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

    // 3. Layer group for real thermal anomaly points (placed in fireHotspotPane)
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;

    // ResizeObserver ensures Leaflet tiles always fill 100% of container without blank/white screens
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Listen to user map pan/zoom anywhere in the world
    map.on('moveend', () => {
      setShowViewportScanButton(true);
    });

    return () => {
      resizeObserver.disconnect();
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
      const outerRadius = isHigh ? 13 : isMed ? 9.5 : 7;
      const coreRadius = isHigh ? 6 : isMed ? 4.5 : 3.5;

      // 1. Concentric glowing outer halo on fireHotspotPane (elevated above industry markers)
      L.circleMarker([lat, lng], {
        pane: 'fireHotspotPane',
        radius: outerRadius,
        color: color,
        weight: 1.5,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: isHigh ? 0.45 : 0.35,
      }).addTo(markersGroup);

      // 2. High-contrast core center marker on fireHotspotPane
      const core = L.circleMarker([lat, lng], {
        pane: 'fireHotspotPane',
        radius: coreRadius,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1.0,
      }).addTo(markersGroup);

      const incObj = {
        id: `inc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        lat,
        lng,
        location: findClosestSubdivision(lat, lng, availableSubdivisions),
        coordinates: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
        instrument: p.instrument || 'VIIRS',
        satellite: p.satellite || 'Suomi NPP',
        frp: p.frp || 0,
        brightness: p.brightness || 0,
        level: p.intensity === 'high' ? 'Critical' : p.intensity === 'medium' ? 'High' : 'Moderate',
        time: p.acq_time ? `${p.acq_time} UTC` : 'NRT',
        date: p.acq_date || 'Today',
        confidence: p.confidence || 'Nominal',
        daynight: p.daynight === 'D' ? 'Day' : 'Night',
      };

      const btnId = `btn-map-analyze-${lat.toFixed(3)}-${lng.toFixed(3)}`;
      const popupHtml = `
        <div style="font-family:sans-serif;min-width:215px;padding:4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
              <strong style="font-size:13px;color:#0f172a;">NASA FIRMS Detection</strong>
            </div>
            <span style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;">${p.intensity}</span>
          </div>
          <div style="font-size:11.5px;color:#334155;line-height:1.5;">
            <div><strong>Location:</strong> ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
            <div><strong>Region:</strong> ${findClosestSubdivision(lat, lng, availableSubdivisions)}</div>
            <div><strong>Satellite:</strong> ${p.satellite} (${p.instrument})</div>
            <div><strong>FRP (Power):</strong> <span style="color:#dc2626;font-weight:700;">${p.frp.toFixed(1)} MW</span></div>
            <div><strong>Brightness:</strong> ${p.brightness.toFixed(1)} K</div>
            <div><strong>Confidence:</strong> ${p.confidence}</div>
            <div><strong>Acquisition:</strong> ${p.acq_date} ${p.acq_time ? p.acq_time + ' UTC' : ''}</div>
            <div><strong>Day/Night:</strong> ${p.daynight === 'D' ? '☀️ Daytime' : '🌙 Nighttime'}</div>
          </div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;">
            <button id="${btnId}" style="background:#ea580c;color:white;border:none;padding:5px 10px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
              <span>View Predictive Analysis →</span>
            </button>
          </div>
        </div>
      `;

      core.bindPopup(popupHtml, { className: 'custom-firms-popup' });
      core.on('popupopen', () => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.onclick = () => {
            try {
              sessionStorage.setItem('astraflare_selected_incident', JSON.stringify(incObj));
            } catch {}
            if (onSelectIncident) onSelectIncident(incObj);
            if (onNavigate) onNavigate('Predictive Analysis', incObj);
          };
        }
      });

      core.bindTooltip(
        `<div style="font-size:11px;font-weight:700;">FRP: ${p.frp.toFixed(1)} MW · ${p.instrument}</div><div style="font-size:9.5px;color:#9ca3af;">${p.acq_date} (${p.intensity.toUpperCase()})</div>`,
        { direction: 'top', className: 'bg-gray-900 text-white p-1 rounded border-0' }
      );
    });
  }, [filteredAnomalies]);

  // ─── BOUNDARY BOX ISOLATION & MASKING EFFECT ─────────────────────────────
  // Makes ONLY the area within the boundary box visible on the map, masking out the exterior
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!boundaryMaskGroupRef.current) {
      boundaryMaskGroupRef.current = L.layerGroup().addTo(map);
    }
    const maskGroup = boundaryMaskGroupRef.current;
    maskGroup.clearLayers();

    const { w, s, e, n } = activeBbox;

    // 1. Inverted Polygon Mask:
    // Outer polygon covers entire world, inner ring cuts out the active boundary box hole.
    // Everything outside the box is completely darkened/blacked out in deep slate (#020617, 94% opacity)
    const worldOuter: [number, number][] = [
      [-85.05, -180],
      [-85.05, 180],
      [85.05, 180],
      [85.05, -180],
    ];
    const holeInner: [number, number][] = [
      [s, w],
      [n, w],
      [n, e],
      [s, e],
    ];

    const maskPolygon = L.polygon([worldOuter, holeInner], {
      stroke: false,
      fillColor: '#020617',
      fillOpacity: 0.94,
      interactive: false,
    });
    maskPolygon.addTo(maskGroup);

    // 2. High-Tech Boundary Box Frame Outline
    const boxFrame = L.rectangle([[s, w], [n, e]], {
      color: '#f97316',
      weight: 2.5,
      dashArray: '8, 6',
      fill: false,
      interactive: false,
    });
    boxFrame.addTo(maskGroup);

    // 3. Coordinate Tag at NW corner
    const nwTag = L.divIcon({
      className: 'bbox-nw-tag',
      html: `
        <div style="background:#0f172a;color:#f97316;font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px;border:1.5px solid #f97316;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap;letter-spacing:0.4px;">
          ⛶ BOUNDARY BOX ACTIVE · [${w.toFixed(1)}°E, ${n.toFixed(1)}°N]
        </div>
      `,
      iconAnchor: [-4, -4],
    });
    L.marker([n, w], { icon: nwTag, interactive: false }).addTo(maskGroup);
  }, [activeBbox]);

  // ─── OPENSTREETMAP (OSM) MARKED INDUSTRIES EFFECT ────────────────────────
  // Marks industrial facilities in the map near any hotspot with proximity vectors
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!osmLayerGroupRef.current) {
      osmLayerGroupRef.current = L.layerGroup().addTo(map);
    }
    const osmGroup = osmLayerGroupRef.current;
    osmGroup.clearLayers();
    osmMarkerMapRef.current.clear();

    const isOsmLayerActive = layers.find((l) => l.id === 'osm_industries')?.checked;
    if (!isOsmLayerActive) return;

    filteredOsmIndustries.forEach((ind) => {
      // 1. Proximity dashed connector line from industry to closest fire hotspot (only if <= 50 km)
      if (ind.nearestHotspot && ind.distanceKm > 0 && ind.distanceKm <= 50.0) {
        const polyline = L.polyline(
          [
            [ind.lat, ind.lng],
            [ind.nearestHotspot.lat, ind.nearestHotspot.lng],
          ],
          {
            color: ind.threatColor,
            weight: 2,
            dashArray: '5, 5',
            opacity: 0.85,
          }
        );
        polyline.bindTooltip(
          `<div style="font-size:11px;font-weight:700;">⚠️ ${ind.name}</div><div style="font-size:10px;color:#9ca3af;">${ind.distanceKm} km from ${ind.nearestHotspot.frp} MW fire</div>`,
          { sticky: true, className: 'bg-slate-900 text-white p-1.5 rounded shadow' }
        );
        polyline.addTo(osmGroup);
      }

      // 2. High-visibility Industrial Marker with smart non-blocking offset
      const distLabel = ind.distanceKm > 0 ? `${ind.distanceKm}km` : 'Safe';
      
      // If close to a hotspot (<= 8km), offset the industry pin so it never covers the fire hotspot dot
      const isSuperClose = ind.distanceKm > 0 && ind.distanceKm <= 8.0;
      const anchorX = isSuperClose ? -10 : 15;
      const anchorY = isSuperClose ? 38 : 32;

      const iconHtml = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;pointer-events:auto;">
          <div style="
            width: 27px;
            height: 27px;
            border-radius: 7px;
            background: #090e17;
            border: 2px solid ${ind.threatColor};
            box-shadow: 0 0 10px ${ind.threatColor}aa, 0 3px 6px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13.5px;
            color: white;
            transition: transform 0.15s;
          ">
            🏭
          </div>
          <div style="
            margin-top: 1.5px;
            padding: 1px 4.5px;
            background: rgba(2, 6, 23, 0.92);
            border: 1px solid ${ind.threatColor};
            border-radius: 4px;
            color: #f8fafc;
            font-size: 8.5px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.6);
            letter-spacing: 0.1px;
            pointer-events: none;
          ">
            ${ind.name.length > 15 ? ind.name.slice(0, 13) + '..' : ind.name} · <span style="color:${ind.threatColor};">${distLabel}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'osm-industry-div-icon',
        html: iconHtml,
        iconSize: [80, 48],
        iconAnchor: [anchorX, anchorY],
        popupAnchor: [0, -25],
      });

      const marker = L.marker([ind.lat, ind.lng], { icon: customIcon }).addTo(osmGroup);
      osmMarkerMapRef.current.set(ind.id, marker);

      // 3. Interactive Popup with OSM Verification, Distance, and Fire Telemetry
      const isAtRisk = ind.distanceKm > 0 && ind.distanceKm <= 35.0;
      const popupHtml = `
        <div style="font-family:sans-serif;min-width:260px;max-width:320px;padding:6px;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:16px;">🏭</span>
              <div>
                <strong style="font-size:13px;color:#0f172a;display:block;line-height:1.2;">OSM Industrial Asset</strong>
                <span style="font-size:9.5px;color:#64748b;">OpenStreetMap Verified Facility</span>
              </div>
            </div>
            <span style="background:${ind.threatColor};color:white;font-size:9.5px;font-weight:800;padding:2.5px 7px;border-radius:5px;text-transform:uppercase;">
              ${ind.threatLevel}
            </span>
          </div>

          <div style="font-size:12px;color:#334155;line-height:1.5;">
            <div style="font-size:13.5px;font-weight:800;color:#0f172a;margin-bottom:2px;">${ind.name}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:8px;">
              <strong>Sector / Type:</strong> ${ind.category}
            </div>

            ${
              isAtRisk && ind.nearestHotspot
                ? `
                <div style="background:#fff1f2;border:1px solid #fecdd3;padding:8px;border-radius:8px;margin-bottom:8px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="color:#e11d48;font-weight:800;font-size:12px;">⚠️ Direct Hotspot Threat:</span>
                    <span style="color:#be123c;font-weight:800;font-size:12px;">${ind.distanceKm} km away</span>
                  </div>
                  <div style="font-size:10.5px;color:#881337;margin-top:3px;line-height:1.4;">
                    Satellite Fire Power: <strong>${ind.nearestHotspot.frp} MW</strong> · Brightness: <strong>${ind.nearestHotspot.brightness} K</strong><br/>
                    Coordinates: ${ind.nearestHotspot.lat.toFixed(4)}°N, ${ind.nearestHotspot.lng.toFixed(4)}°E
                  </div>
                </div>
              `
                : ind.nearestHotspot
                ? `
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:8px;border-radius:8px;margin-bottom:8px;">
                  <div style="color:#16a34a;font-weight:800;font-size:12px;">✅ Safe Distance from Active Fires</div>
                  <div style="font-size:10.5px;color:#15803d;margin-top:2px;">
                    Nearest Satellite Fire: <strong>${ind.distanceKm} km away</strong> (${ind.nearestHotspot.frp} MW)
                  </div>
                </div>
              `
                : `
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:8px;border-radius:8px;margin-bottom:8px;">
                  <div style="color:#16a34a;font-weight:800;font-size:12px;">✅ Perimeter Clear</div>
                  <div style="font-size:10.5px;color:#15803d;margin-top:2px;">
                    No active satellite fire hotspots detected in boundary box
                  </div>
                </div>
              `
            }

            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:7px;border-radius:6px;margin-bottom:8px;font-size:11px;">
              <strong style="color:#0f172a;">Mitigation Protocol:</strong>
              <div style="color:#475569;margin-top:2px;">${ind.action}</div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:6px;margin-top:4px;">
              <span style="font-size:10px;color:#94a3b8;">${ind.lat.toFixed(4)}°N, ${ind.lng.toFixed(4)}°E</span>
              <a href="${ind.osmUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;font-weight:700;font-size:11px;display:flex;align-items:center;gap:3px;">
                OpenStreetMap ↗
              </a>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'custom-osm-popup', maxWidth: 340 });
    });
  }, [filteredOsmIndustries, layers]);

  // Handle Country selection (switches country, flies map, and dynamically updates side list with states/cities)
  const handleCountrySelect = (c: CountryOption) => {
    setSelectedCountryCode(c.code);
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery('');

    const subs = getSubdivisionsForCountry(c.code, c.name, c.center, c.zoom, c.bbox);
    const nationalSub = subs[0];
    setSelectedSubdivisionId(nationalSub.id);
    setCurrentBbox(nationalSub.bbox.str);
    setShowViewportScanButton(false);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(c.center, c.zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }

    // Automatically highlight the incidents side list
    setActiveSideTab('incidents');
    loadThermalData(nationalSub.bbox.str, true);
  };

  // Handle Subdivision (State, Province, or City) selection
  const handleSubdivisionSelect = (sub: CountrySubdivision) => {
    setSelectedSubdivisionId(sub.id);
    setIsSubdivisionDropdownOpen(false);
    setSubdivisionSearchQuery('');
    setCurrentBbox(sub.bbox.str);
    setShowViewportScanButton(false);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(sub.center, sub.zoom, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
    loadThermalData(sub.bbox.str, true);
  };

  // Focus directly on an OSM industry
  const focusOnOsmIndustry = (ind: OSMIndustry) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([ind.lat, ind.lng], 13, { duration: 1.2 });
    const marker = osmMarkerMapRef.current.get(ind.id);
    if (marker) {
      setTimeout(() => marker.openPopup(), 600);
    }
  };

  // Focus directly on an incident hotspot in the boundary box
  const focusOnIncident = (inc: {
    id?: string;
    lat: number;
    lng: number;
    location: string;
    coordinates: string;
    instrument: string;
    satellite: string;
    frp: number;
    brightness: number;
    level: string;
    time: string;
    date: string;
    confidence: string;
    daynight?: string;
  }) => {
    try {
      sessionStorage.setItem('astraflare_selected_incident', JSON.stringify(inc));
    } catch {}
    if (onSelectIncident) {
      onSelectIncident(inc);
    }
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([inc.lat, inc.lng], 12, { duration: 1.2 });
    const popupHtml = `
      <div style="font-family:sans-serif;min-width:215px;padding:4px;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
          <strong style="font-size:13px;color:#dc2626;">🔥 Active Fire Hotspot</strong>
          <span style="font-size:10px;font-weight:700;background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:4px;">${inc.level}</span>
        </div>
        <div style="font-size:11px;color:#334155;line-height:1.5;">
          <div><strong>Location:</strong> ${inc.location}</div>
          <div><strong>Coordinates:</strong> ${inc.coordinates}</div>
          <div><strong>FRP (Fire Power):</strong> ${inc.frp.toFixed(1)} MW</div>
          <div><strong>Brightness:</strong> ${inc.brightness.toFixed(0)} K</div>
          <div><strong>Detected:</strong> ${inc.date} ${inc.time}</div>
          <div><strong>Satellite:</strong> ${inc.instrument} (${inc.satellite})</div>
          <div><strong>Confidence:</strong> ${inc.confidence}</div>
        </div>
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;">
          <button id="btn-predictive-popup" style="background:#ea580c;color:white;border:none;padding:5px 9px;border-radius:5px;font-size:10.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
            <span>Predictive Analysis →</span>
          </button>
        </div>
      </div>
    `;
    L.popup({ offset: [0, -6], className: 'custom-firms-popup' })
      .setLatLng([inc.lat, inc.lng])
      .setContent(popupHtml)
      .openOn(mapInstanceRef.current);

    setTimeout(() => {
      const btn = document.getElementById('btn-predictive-popup');
      if (btn) {
        btn.onclick = () => {
          if (onSelectIncident) onSelectIncident(inc);
          if (onNavigate) onNavigate('Predictive Analysis', inc);
        };
      }
    }, 50);
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafc] text-gray-900 font-sans">
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
         
        </div>

        {/* Header Action Dropdowns & Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Global Country Selector (Database-Backed 55 Countries) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsCountryDropdownOpen(!isCountryDropdownOpen);
                setIsSubdivisionDropdownOpen(false);
                setIsTimeDropdownOpen(false);
              }}
              className="flex items-center gap-2 h-9.5 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors cursor-pointer"
            >
              <Globe size={16} className="text-blue-600" weight="bold" />
              <span>{currentCountry.name}</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {currentCountry.code}
              </span>
              <CaretDown size={12} weight="bold" className="text-gray-400" />
            </button>

            {isCountryDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsCountryDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2.5 z-50 animate-in fade-in max-h-[460px] flex flex-col">
                  {/* Search input */}
                  <div className="px-3 pb-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={countrySearchQuery}
                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                      placeholder="Search 55+ countries..."
                      className="w-full h-8 px-2.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>

                  {/* Continent Tabs */}
                  <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 overflow-x-auto text-[11px] font-semibold text-gray-500 shrink-0">
                    {['ALL', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Africa'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedContinent(c)}
                        className={`px-2 py-0.5 rounded transition-all whitespace-nowrap cursor-pointer ${
                          selectedContinent === c
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c === 'ALL' ? 'All' : c}
                      </button>
                    ))}
                  </div>

                  {/* Countries list */}
                  <div className="overflow-y-auto flex-1 py-1 max-h-72">
                    {filteredCountries.length === 0 ? (
                      <div className="py-4 text-center text-[12px] text-gray-400">
                        No countries found
                      </div>
                    ) : (
                      filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => handleCountrySelect(c)}
                          className={`w-full text-left px-3.5 py-2 text-[12.5px] font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            selectedCountryCode === c.code
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10.5px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {c.code}
                            </span>
                            <span className="truncate">{c.name}</span>
                          </div>
                          {selectedCountryCode === c.code && (
                            <Check size={14} weight="bold" className="text-blue-600 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dynamic State / Province / City Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsSubdivisionDropdownOpen(!isSubdivisionDropdownOpen);
                setIsCountryDropdownOpen(false);
                setIsTimeDropdownOpen(false);
              }}
              className="flex items-center gap-2 h-9.5 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors cursor-pointer"
            >
              <Compass size={15} className="text-orange-500" weight="bold" />
              <span className="max-w-[130px] truncate">{currentSubdivision.name}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200/60 rounded">
                {currentSubdivision.type}
              </span>
              <CaretDown size={12} weight="bold" className="text-gray-400" />
            </button>

            {isSubdivisionDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSubdivisionDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in max-h-96 flex flex-col">
                  <div className="px-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      {currentCountry.name} Regions
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {availableSubdivisions.length} options
                    </span>
                  </div>
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={subdivisionSearchQuery}
                      onChange={(e) => setSubdivisionSearchQuery(e.target.value)}
                      placeholder={`Search state, province, or city in ${currentCountry.name}...`}
                      className="w-full h-8 px-2.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-orange-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 py-1 max-h-72">
                    {filteredSubdivisions.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSubdivisionSelect(sub)}
                        className={`w-full text-left px-3.5 py-2 text-[12.5px] font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          selectedSubdivisionId === sub.id
                            ? 'bg-orange-50 text-orange-700 font-bold'
                            : 'text-gray-700 hover:bg-orange-50/60 hover:text-orange-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{sub.name}</span>
                          <span className="text-[9.5px] px-1 py-0.5 rounded bg-gray-100 text-gray-500 font-normal shrink-0">
                            {sub.type}
                          </span>
                          {(anomalyCountBySubdivision[sub.id] || 0) > 0 && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-black bg-red-100 text-red-600 shrink-0">
                              {anomalyCountBySubdivision[sub.id]} {anomalyCountBySubdivision[sub.id] === 1 ? 'fire' : 'fires'}
                            </span>
                          )}
                        </div>
                        {selectedSubdivisionId === sub.id && (
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
              className="flex items-center gap-2 h-9.5 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 h-9.5 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-700 shadow-sm transition-colors"
          >
            <DownloadSimple size={16} weight="bold" className="text-blue-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Sync / Refresh Button */}
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            title="Fetch real-time updates from NASA FIRMS & ingest into PostgreSQL"
            className="flex items-center gap-1.5 h-9.5 px-3.5 bg-[#ef4444] hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg text-[13px] font-bold shadow-sm transition-all"
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
      <div className="px-6 pb-3 flex-1 flex gap-5 min-h-0 overflow-hidden">
        {/* ─── LEFT COLUMN: Map View + Floating Controls ─── */}
        <div className="flex-1 flex flex-col min-h-0 h-full">
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
              <span className="text-gray-700 font-semibold">
                {currentCountry.name} {currentSubdivision.type !== 'National' ? `· ${currentSubdivision.name}` : ''}
              </span>
              <span className="text-gray-400">({filteredAnomalies.length} active detections)</span>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative flex-1 h-full rounded-xl overflow-hidden border border-gray-200 shadow-md bg-slate-900">
            {/* Leaflet DOM element */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Left Float Controls */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
              <button
                title={`Reset View to Whole ${currentCountry.name}`}
                onClick={() => {
                  const national = availableSubdivisions[0];
                  if (national) {
                    handleSubdivisionSelect(national);
                  }
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
                  <span>Scan This Region for Fires & Industries</span>
                </button>
              </div>
            )}

            {/* Top Right Floating Legend Card */}
            <div className="absolute top-4 right-4 z-[20] bg-[#090e17]/85 backdrop-blur-md border border-white/10 rounded-xl p-3 text-white shadow-xl min-w-[185px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-gray-100">Map Legend</p>
                {isLoading && <span className="text-[10px] text-amber-400 animate-pulse">Loading...</span>}
              </div>
              <div className="space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]" />
                  <span>High Fire (FRP &gt; 15 MW)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_6px_#f97316]" />
                  <span>Medium (FRP &gt; 5 MW)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] shadow-[0_0_6px_#eab308]" />
                  <span>Low Intensity Hotspot</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <span className="text-[13px] leading-none">🏭</span>
                  <span className="text-orange-400 font-semibold">OSM Industry (&lt; 35km)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-[2px] border-t-2 border-dashed border-orange-400" />
                  <span className="text-gray-400">Proximity Vector</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-[2px] border-t-2 border-dashed border-[#f97316]" />
                  <span className="text-gray-400">Active Boundary Box</span>
                </div>
              </div>
            </div>

            {/* Bottom Left Status indicator */}
            <div className="absolute bottom-4 left-4 z-[400] text-[11px] font-semibold text-white/90 drop-shadow flex items-center gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
              <span>NASA FIRMS API Active · OSM Spatial Proximity Online</span>
              <span className="text-gray-400 font-mono text-[10px] flex items-center gap-1 ml-1">
                <Clock size={12} weight="bold" /> {lastSyncTime}
              </span>
            </div>

            {/* Bottom Right Scope Badge */}
            <div className="absolute bottom-4 right-4 z-[400] px-3 py-1.5 rounded-lg border border-white/20 shadow-2xl bg-[#090e17]/85 backdrop-blur-sm text-white flex items-center gap-2">
              <GlobeHemisphereEast size={14} className="text-blue-400" />
              <div className="text-[10.5px]">
                <span className="text-gray-400">Boundary Scope: </span>
                <span className="font-bold text-gray-200">
                  {currentCountry.name} {currentSubdivision.type !== 'National' ? `· ${currentSubdivision.name}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Metrics + Layers + Incidents / OSM Industries ─── */}
        <div className="w-[345px] flex flex-col gap-2.5 shrink-0 h-full min-h-0 overflow-hidden pr-0.5 pb-2">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {/* Card 1: Active Detections */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Fire size={20} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[17px] font-black text-gray-900 leading-tight">
                  {realStats.total.toLocaleString()}
                </p>
                <p className="text-[10.5px] text-gray-400 font-medium leading-tight">
                  Active Detections
                </p>
              </div>
            </div>

            {/* Card 2: Estimated Area */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Tree size={20} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-gray-900 leading-tight truncate">
                  {realStats.areaStr}
                </p>
                <p className="text-[10.5px] text-gray-400 font-medium leading-tight">
                  Estimated Area
                </p>
              </div>
            </div>

            {/* Card 3: Total Radiative Power */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Broadcast size={20} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[17px] font-black text-gray-900 leading-tight">
                  {realStats.totalFrp} <span className="text-[10px] font-normal text-gray-500">MW</span>
                </p>
                <p className="text-[10.5px] text-gray-400 font-medium leading-tight">
                  Total Fire Power
                </p>
              </div>
            </div>

            {/* Card 4: OSM Industries in View */}
            <div className="bg-white border border-orange-200/80 rounded-xl p-3 shadow-xs flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Factory size={20} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="text-[17px] font-black text-gray-900 leading-tight">
                  {filteredOsmIndustries.length}
                </p>
                <p className="text-[10px] text-gray-400 font-medium leading-tight truncate">
                  {atRiskOsmCount > 0 ? (
                    <span className="text-red-500 font-bold">{atRiskOsmCount} Near Fire</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Perimeter Clear</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Map Layers Section (Collapsible to save vertical space for Incidents list) */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs shrink-0">
            <div
              onClick={() => setIsLayersCollapsed(!isLayersCollapsed)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 text-gray-800">
                <Stack size={15} weight="bold" />
                <span className="text-[12.5px] font-bold">Map Layers</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 font-semibold rounded">
                  {layers.filter((l) => l.checked).length}/{layers.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayers((prev) =>
                      prev.map((l) => ({
                        ...l,
                        checked: ['osm_industries', 'viirs', 'modis', 'state', 'district'].includes(l.id),
                      }))
                    );
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors mr-1 cursor-pointer"
                >
                  Reset
                </button>
                <span className="text-gray-400 hover:text-gray-600">
                  {isLayersCollapsed ? <CaretDown size={13} weight="bold" /> : <CaretUp size={13} weight="bold" />}
                </span>
              </div>
            </div>

            {!isLayersCollapsed && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 animate-in fade-in duration-150">
                {layers.map((layer) => (
                  <label
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className="flex items-center gap-2 text-[11.5px] font-medium text-gray-700 hover:text-gray-900 cursor-pointer select-none truncate"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
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
                          className="w-2.5 h-2.5 text-white"
                        >
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{layer.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Active Incidents & Industrial Vulnerability Hub */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Professional 2-Tab Segmented Control */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl mb-3 shrink-0 gap-1 border border-slate-200/60 shadow-xs">
              <button
                onClick={() => setActiveSideTab('incidents')}
                className={`flex-1 py-1.5 px-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  activeSideTab === 'incidents'
                    ? 'bg-white text-red-600 shadow-xs border border-red-100/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title="All Active Thermal Incidents"
              >
                <Fire size={14} weight="fill" className={activeSideTab === 'incidents' ? 'text-red-500' : 'text-slate-400'} />
                <span className="truncate">Incidents</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeSideTab === 'incidents' ? 'bg-red-50 text-red-600 border border-red-200/60' : 'bg-slate-200 text-slate-700'
                }`}>
                  {allIncidents.length}
                </span>
              </button>

              <button
                onClick={() => setActiveSideTab('osm_industries')}
                className={`flex-1 py-1.5 px-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  activeSideTab === 'osm_industries'
                    ? 'bg-white text-blue-600 shadow-xs border border-blue-100/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title="Industrial Facilities Near Hotspots (<50km)"
              >
                <Factory size={14} weight="fill" className={activeSideTab === 'osm_industries' ? 'text-blue-500' : 'text-slate-400'} />
                <span className="truncate">Industries</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  atRiskOsmCount > 0
                    ? 'bg-red-500 text-white animate-pulse'
                    : activeSideTab === 'osm_industries'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {filteredOsmIndustries.length}
                </span>
              </button>
            </div>

            {/* Content for OSM Industries tab */}
            {activeSideTab === 'osm_industries' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Sub-filter pills for OSM Industries */}
                <div className="flex items-center gap-1 mb-2.5 pb-2 border-b border-gray-100 shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setIndustryFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      industryFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Near Fire ({filteredOsmIndustries.length})
                  </button>
                  <button
                    onClick={() => setIndustryFilter('THREAT')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      industryFilter === 'THREAT'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    High Threat &lt;35km ({atRiskOsmCount})
                  </button>
                  <button
                    onClick={() => setIndustryFilter('SAFE')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      industryFilter === 'SAFE'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    Buffer 35-50km ({filteredOsmIndustries.length - atRiskOsmCount})
                  </button>
                </div>

                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar">
                  {isLoadingOsm ? (
                    <div className="text-center py-10 text-gray-400 text-[12px] flex flex-col items-center gap-2">
                      <Factory size={24} className="animate-bounce text-orange-500" />
                      <span className="font-medium text-gray-600">Scanning for industries near active hotspots...</span>
                    </div>
                  ) : displayedOsmIndustries.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-[12px] px-3 flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <p className="font-bold text-gray-700 text-[13px]">All Industrial Perimeters Secure</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed max-w-[260px]">
                        No registered industrial facilities or refineries are within 50 km of active satellite fire anomalies in this region.
                      </p>
                    </div>
                  ) : (
                    displayedOsmIndustries.map((ind) => (
                      <div
                        key={ind.id}
                        onClick={() => focusOnOsmIndustry(ind)}
                        className="rounded-xl border border-gray-200/90 hover:border-blue-400 hover:shadow-xs p-3 transition-all cursor-pointer group bg-white hover:bg-blue-50/20 flex flex-col gap-2"
                        style={{ borderLeftWidth: '4px', borderLeftColor: ind.threatColor }}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[13px] shrink-0">🏭</span>
                            <span className="text-[12.5px] font-bold text-gray-900 group-hover:text-blue-600 truncate">
                              {ind.name}
                            </span>
                          </div>
                          <span
                            className="text-[9.5px] font-black px-2 py-0.5 rounded text-white shrink-0 shadow-2xs tracking-wide"
                            style={{ backgroundColor: ind.threatColor }}
                          >
                            {ind.threatLevel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 font-medium truncate">{ind.category}</span>
                          <span
                            className={`font-black shrink-0 ${
                              ind.distanceKm > 0 && ind.distanceKm <= 35.0 ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {ind.distanceKm > 0 ? `${ind.distanceKm} km to fire` : 'Perimeter Safe'}
                          </span>
                        </div>

                        {/* Automated Countermeasure Directive */}
                        {ind.action && (
                          <div className="text-[10px] text-gray-700 bg-gray-50 border border-gray-150 rounded-lg px-2.5 py-1.5 leading-snug font-medium">
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px] block mb-0.5">Directive:</span>
                            {ind.action}
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10.5px]">
                          <span className="text-gray-500 text-[10px]">
                            {ind.nearestHotspot ? (
                              <span>Fire FRP: <strong className="text-red-600 font-bold">{ind.nearestHotspot.frp} MW</strong></span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">Perimeter Secure</span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={ind.osmUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-blue-600 font-semibold flex items-center gap-0.5"
                            >
                              OSM <ArrowSquareOut size={10} />
                            </a>
                            <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              Locate <ArrowRight size={10} weight="bold" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Content for Incidents side list tab */}
            {activeSideTab === 'incidents' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Search & Header */}
                <div className="mb-2 pb-2 border-b border-gray-100 shrink-0">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={incidentSearchQuery}
                      onChange={(e) => setIncidentSearchQuery(e.target.value)}
                      placeholder={`Search ${allIncidents.length} active fire incidents...`}
                      className="w-full h-8 pl-8 pr-7 text-[11.5px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:bg-white transition-all font-medium"
                    />
                    <Fire size={14} className="absolute left-2.5 top-2 text-red-500" weight="fill" />
                    {incidentSearchQuery && (
                      <button
                        onClick={() => setIncidentSearchQuery('')}
                        className="absolute right-2.5 top-2 text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                    <button
                      onClick={() => setIncidentSeverityFilter('ALL')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                        incidentSeverityFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All ({allIncidents.length})
                    </button>
                    <button
                      onClick={() => setIncidentSeverityFilter('CRITICAL')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                        incidentSeverityFilter === 'CRITICAL'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      Critical ({allIncidents.filter((i) => i.level === 'Critical').length})
                    </button>
                    <button
                      onClick={() => setIncidentSeverityFilter('HIGH')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
                        incidentSeverityFilter === 'HIGH'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                      }`}
                    >
                      High ({allIncidents.filter((i) => i.level === 'High').length})
                    </button>
                  </div>
                </div>

                {/* List of all incidents within boundary box - smoothly scrollable */}
                <div
                  onScroll={handleIncidentListScroll}
                  className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar"
                >
                  {displayedIncidents.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-[12px] flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold">
                        🔥
                      </div>
                      <p className="font-bold text-gray-700 text-[13px]">No Active Incidents Detected</p>
                      <p className="text-[11px] text-gray-500 leading-relaxed max-w-[260px]">
                        {allIncidents.length === 0
                          ? 'Satellite telemetry shows zero thermal fire anomalies in this area.'
                          : 'No incidents match your active search query or filter.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {incidentsToRender.map((inc) => (
                        <div
                          key={inc.id}
                          onClick={() => {
                            try {
                              sessionStorage.setItem('astraflare_selected_incident', JSON.stringify(inc));
                            } catch {}
                            if (onSelectIncident) onSelectIncident(inc);
                            if (onNavigate) onNavigate('Predictive Analysis', inc);
                          }}
                          className="p-3 rounded-xl border border-gray-200/90 hover:border-orange-500 hover:bg-orange-50/20 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-1.5 group bg-white"
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: inc.level === 'Critical' ? '#dc2626' : inc.level === 'High' ? '#ea580c' : '#f59e0b',
                          }}
                          title="Click to view Predictive Analysis for this anomaly"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`shrink-0 ${inc.flameColor}`}>
                                <Fire size={15} weight="fill" />
                              </span>
                              <span className="font-bold text-[12.5px] text-gray-900 group-hover:text-orange-600 truncate">
                                {inc.location}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[9.5px] font-black text-white leading-tight shrink-0 shadow-2xs ${inc.levelBg}`}
                            >
                              {inc.level}
                            </span>
                          </div>

                          <div className="text-[10.5px] text-gray-600 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-gray-500 text-[10.5px] font-semibold">{inc.coordinates}</span>
                              <span className="font-black text-red-600 text-[11px] flex items-center gap-0.5">
                                <Fire size={12} weight="fill" className="text-red-500" />
                                {inc.frp.toFixed(1)} MW
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                              <span className="font-medium text-gray-500">{inc.instrument} · {inc.satellite}</span>
                              <span>{inc.date} {inc.time}</span>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10.5px]">
                            <span className="text-gray-500 text-[10px]">
                              Confidence: <strong className="text-gray-700 font-bold">{inc.confidence}</strong> · {inc.daynight}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  focusOnIncident(inc);
                                }}
                                className="text-gray-400 hover:text-gray-700 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                title="Preview on Live Map without leaving"
                              >
                                Locate <ArrowRight size={10} weight="bold" />
                              </button>
                              <span className="px-2 py-0.5 rounded bg-orange-600 group-hover:bg-orange-700 text-white font-bold text-[10px] flex items-center gap-1 transition-all shadow-2xs">
                                <span>Predictive Analysis</span>
                                <ArrowRight size={10} weight="bold" />
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {visibleIncidentCount < displayedIncidents.length ? (
                        <div className="py-2.5 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center flex flex-col items-center gap-1.5 shrink-0 my-1">
                          <span className="text-[11px] text-slate-500 font-medium">
                            Showing {visibleIncidentCount} of {displayedIncidents.length} incidents
                          </span>
                          <button
                            type="button"
                            onClick={() => setVisibleIncidentCount((prev) => Math.min(prev + 100, displayedIncidents.length))}
                            className="px-3 py-1 bg-white hover:bg-orange-50 border border-slate-300 hover:border-orange-300 text-orange-600 font-bold text-[11px] rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            Load Next 100 ({displayedIncidents.length - visibleIncidentCount} remaining)
                          </button>
                        </div>
                      ) : (
                        displayedIncidents.length > 30 && (
                          <div className="py-2 text-center text-[10.5px] text-slate-400 font-medium shrink-0">
                            ✓ All {displayedIncidents.length} active incidents loaded
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}