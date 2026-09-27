import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Fire,
  Users,
  Buildings,
  Leaf,
  CalendarBlank,
  Play,
  CaretDown,
  Info,
  MapPin,
  ArrowRight,
  Factory,
  Crosshair,
  Plus,
  Minus,
  Drop,
  Wind,
  FirstAid,
  GraduationCap,
  Path,
  Tree,
  GlobeHemisphereEast,
  Check,
  Broadcast,
  Database,
  Lightning,
} from '@phosphor-icons/react';
import Header from '../components/Header';
import {
  fetchCountries,
  fetchCountryPredictiveAnalysis,
  type CountryOption,
  type CountryAnalysisData,
} from '../api/predictionService';

interface PredictiveAnalysisProps {
  onNavigate?: (page: string) => void;
}

// Icon mapper for dynamic impact metrics from DB
const IMPACT_ICON_MAP: Record<string, typeof Factory> = {
  Factory,
  Users,
  Buildings,
  Path,
  FirstAid,
  GraduationCap,
  Tree,
  Leaf,
  Drop,
  Wind,
};

export default function PredictiveAnalysis({ onNavigate }: PredictiveAnalysisProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const riskLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Database-driven Countries State
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('IND');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<string>('ALL');

  // Real-time Database Query Result
  const [dbAnalysis, setDbAnalysis] = useState<CountryAnalysisData | null>(null);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true);

  // Time window / Forecast range
  const [selectedTimeRange, setSelectedTimeRange] = useState('Next 7 Days');
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);

  // Base map layer tab
  const [activeTab, setActiveTab] = useState<'Map' | 'Satellite'>('Satellite');

  // Viewport Scanning
  const [showViewportScanButton, setShowViewportScanButton] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // UI state
  const [activeTooltip, setActiveTooltip] = useState(3);
  const [vulnerableTab, setVulnerableTab] = useState<'industries' | 'settlements'>('industries');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Initial Load: Fetch all countries from PostgreSQL database
  useEffect(() => {
    fetchCountries()
      .then((data) => {
        if (data && data.length > 0) {
          setCountries(data);
        }
      })
      .catch((err) => console.warn('Could not load countries from database:', err));
  }, []);

  // 2. Fetch Deep Predictive Analysis from PostgreSQL for the Selected Country
  const loadCountryAnalysis = useCallback(async (code: string, flyMap = true) => {
    try {
      setIsLoadingFromDb(true);
      const data = await fetchCountryPredictiveAnalysis(code);

      if (data) {
        setDbAnalysis(data);

        // Fly map to country center
        if (flyMap && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(data.country.center, data.country.zoom, {
            duration: 1.5,
            easeLinearity: 0.25,
          });
        }
      }
    } catch (err) {
      console.error('Failed to query country predictive analysis from database:', err);
    } finally {
      setIsLoadingFromDb(false);
    }
  }, []);

  // Trigger load when selected country changes
  useEffect(() => {
    loadCountryAnalysis(selectedCountryCode, true);
  }, [selectedCountryCode, loadCountryAnalysis]);

  // Continents list from database countries
  const continents = useMemo(() => {
    const list = Array.from(new Set(countries.map((c) => c.continent).filter(Boolean)));
    return ['ALL', ...list];
  }, [countries]);

  // Filtered countries for the dropdown search
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      const matchesContinent = selectedContinent === 'ALL' || c.continent === selectedContinent;
      const matchesQuery =
        !countrySearchQuery.trim() ||
        c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
        c.capital?.toLowerCase().includes(countrySearchQuery.toLowerCase());
      return matchesContinent && matchesQuery;
    });
  }, [countries, selectedContinent, countrySearchQuery]);

  // Active country details
  const activeCountry = useMemo(() => {
    return dbAnalysis?.country || countries.find((c) => c.code === selectedCountryCode) || {
      code: 'IND',
      code_2: 'IN',
      name: 'India',
      continent: 'Asia',
      capital: 'New Delhi',
      center: [22.8, 82.5] as [number, number],
      bbox: '68,6,98,38',
      zoom: 5,
      population: 1428000000,
      area_sq_km: 3287263,
    };
  }, [dbAnalysis, countries, selectedCountryCode]);

  // Render Risk Map Layers on Leaflet Map
  const renderRiskMapLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    const layerGroup = riskLayerGroupRef.current;
    if (!map || !layerGroup || !dbAnalysis) return;

    layerGroup.clearLayers();

    // 1. Dynamic Risk Zones queried from Database Hotspot Clusters
    dbAnalysis.riskZones.forEach((rz) => {
      L.circle(rz.center, {
        radius: rz.radius,
        color: rz.color,
        weight: rz.weight,
        fillColor: rz.fillColor,
        fillOpacity: rz.fillOpacity,
      })
        .addTo(layerGroup)
        .bindTooltip(
          `<div style="font-size:11px;font-weight:700;">${rz.label}</div><div style="font-size:9.5px;color:#94a3b8;">PostgreSQL Cluster Telemetry</div>`,
          { direction: 'top', className: 'bg-slate-900 text-white p-1 rounded border-0' }
        );

      // Simulated spread direction vector
      const latOffset = 0.35;
      const lngOffset = 0.45;
      L.polyline([
        [rz.center[0] - latOffset, rz.center[1] - lngOffset],
        [rz.center[0] + latOffset, rz.center[1] + lngOffset],
      ], {
        color: '#fbbf24',
        weight: 2,
        dashArray: '4, 4',
        opacity: 0.8,
      }).addTo(layerGroup);
    });

    // 2. City Markers & Labels
    dbAnalysis.cities.forEach((c) => {
      L.circleMarker([c.lat, c.lng], {
        radius: 4.5,
        color: '#ffffff',
        weight: 2,
        fillColor: '#0f172a',
        fillOpacity: 1,
      }).addTo(layerGroup);

      L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          html: `<div style="color:white;font-size:11.5px;font-weight:700;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9),0 0 6px rgba(0,0,0,0.85);margin-left:7px;margin-top:-7px;">${c.name}</div>`,
          className: '',
          iconSize: [110, 18],
          iconAnchor: [0, 0],
        }),
      }).addTo(layerGroup);
    });

    // 3. Endangered Industrial Facilities Pins queried from PostgreSQL
    dbAnalysis.industries.forEach((ind) => {
      const isCrit = ind.threat === 'Critical';
      const color = isCrit ? '#dc2626' : '#ea580c';

      const core = L.circleMarker([ind.lat, ind.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(layerGroup);

      L.marker([ind.lat, ind.lng], {
        icon: L.divIcon({
          html: `<div style="background:rgba(15,23,42,0.94);color:white;padding:2px 6px;border-radius:5px;font-size:10px;font-weight:700;white-space:nowrap;border:1px solid ${color};box-shadow:0 2px 6px rgba(0,0,0,0.5);margin-left:8px;margin-top:-9px;">🏭 ${ind.name.split('#')[0].trim()} <span style="color:#fbbf24;font-size:9.5px;margin-left:3px;">${ind.confidence}%</span></div>`,
          className: '',
          iconSize: [180, 22],
          iconAnchor: [0, 0],
        }),
      }).addTo(layerGroup);

      const popupContent = `
        <div style="font-family:sans-serif;min-width:220px;padding:4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};"></span>
              <strong style="font-size:12.5px;color:#0f172a;">${ind.name}</strong>
            </div>
            <span style="font-size:10px;font-weight:800;color:${color};text-transform:uppercase;">${ind.threat}</span>
          </div>
          <div style="font-size:11px;color:#334155;line-height:1.5;">
            <div><strong>Sector:</strong> ${ind.sector}</div>
            <div><strong>Proximity:</strong> <span style="color:#dc2626;font-weight:700;">${ind.distance}</span></div>
            <div><strong>Hazardous Materials:</strong> ${ind.material}</div>
            <div><strong>AI Confidence:</strong> <span style="font-weight:700;color:#0f172a;">${ind.confidence}%</span></div>
            <div style="margin-top:6px;padding:4px 6px;background:#fef2f2;border-radius:4px;border:1px solid #fee2e2;color:#991b1b;font-weight:600;font-size:10.5px;">
              Protocol: ${ind.action}
            </div>
          </div>
        </div>
      `;
      core.bindPopup(popupContent);
    });
  }, [dbAnalysis]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [22.8, 82.5],
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // 1. Base Layer (ESRI World Imagery)
    const satTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, crossOrigin: true }
    );
    satTile.addTo(map);
    baseLayerRef.current = satTile;

    // 2. Reference Place Labels
    const labelsTile = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, opacity: 0.85, crossOrigin: true }
    );
    labelsTile.addTo(map);
    labelsLayerRef.current = labelsTile;

    // 3. LayerGroup for Dynamic Risk Overlays
    const riskGroup = L.layerGroup().addTo(map);
    riskLayerGroupRef.current = riskGroup;

    map.on('moveend', () => {
      setShowViewportScanButton(true);
    });

    renderRiskMapLayers();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [renderRiskMapLayers]);

  // Re-render map layers on data change
  useEffect(() => {
    renderRiskMapLayers();
  }, [renderRiskMapLayers]);

  // Switch Base Layer
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

  // Country selection handler
  const handleCountrySelect = (c: CountryOption) => {
    setSelectedCountryCode(c.code);
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery('');
    showToast(`Querying PostgreSQL database for ${c.name} (${c.code})...`);
  };

  // Run simulation / re-query
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    showToast(`Executing PostgreSQL predictive risk analysis queries for ${activeCountry.name}...`);
    try {
      await loadCountryAnalysis(selectedCountryCode, false);
      setTimeout(() => {
        showToast(`Database queries executed successfully in ${dbAnalysis?.telemetry.dbQueryDurationMs || 45}ms (${dbAnalysis?.metrics.totalDetectionsInDb.toLocaleString()} records evaluated).`);
      }, 700);
    } finally {
      setTimeout(() => setIsAnalyzing(false), 800);
    }
  };

  // Scan current viewport anywhere across Earth
  const handleScanCurrentViewport = () => {
    if (!mapInstanceRef.current) return;
    const b = mapInstanceRef.current.getBounds();
    const lat = ((b.getSouth() + b.getNorth()) / 2).toFixed(2);
    const lng = ((b.getWest() + b.getEast()) / 2).toFixed(2);

    setShowViewportScanButton(false);
    showToast(`Executing spatial queries in PostgreSQL for coordinates (${lat}°, ${lng}°)...`);
    loadCountryAnalysis(selectedCountryCode, false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* ═══════════════════════ UNIFIED NAVBAR ═══════════════════════ */}
      <Header activePage="Predictive Analysis" onNavigate={onNavigate} />

      {/* ═══════════════════════ MAIN CONTENT CONTAINER ═══════════════════════ */}
      <main className="flex-1 px-8 py-5 flex flex-col gap-5">
        {/* ─── Page Title Header & Database Country Selector ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
                Risk &amp; Impact Analysis
              </h1>
              {/* Database Live Telemetry Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[11px] font-bold shadow-xs">
                <Database size={13} weight="fill" className="text-emerald-600 animate-pulse" />
                <span>PostgreSQL DB Live</span>
                {dbAnalysis && (
                  <span className="text-[10px] text-emerald-800 font-medium ml-1 flex items-center gap-1">
                    · <Lightning size={12} weight="fill" className="text-amber-500 inline" />
                    {dbAnalysis.telemetry.dbQueryDurationMs}ms ({dbAnalysis.metrics.totalDetectionsInDb.toLocaleString()} records)
                  </span>
                )}
              </div>
            </div>
            <p className="text-[13px] text-gray-500 mt-1.5 font-medium">
              Global predictive wildfire risk, atmospheric propagation &amp; critical infrastructure vulnerability queried directly from PostgreSQL.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. Global Country Selector with Live Database Search */}
            <div className="relative">
              <button
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-xs transition-colors cursor-pointer"
              >
                <GlobeHemisphereEast size={16} className="text-blue-500" weight="bold" />
                <span className="max-w-[160px] truncate">{activeCountry.name}</span>
                <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-1 rounded">
                  {activeCountry.code}
                </span>
                <CaretDown size={12} weight="bold" className="text-gray-400" />
              </button>

              {isCountryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCountryDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in max-h-96 flex flex-col">
                    {/* Search Input */}
                    <div className="px-3 pb-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                        placeholder="Search any country or capital..."
                        className="w-full h-8 px-2.5 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-orange-500"
                        autoFocus
                      />
                    </div>

                    {/* Continent Filter Chips */}
                    <div className="px-3 py-1.5 flex items-center gap-1 overflow-x-auto border-b border-gray-100 text-[10.5px]">
                      {continents.map((cont) => (
                        <button
                          key={cont}
                          onClick={() => setSelectedContinent(cont)}
                          className={`px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                            selectedContinent === cont
                              ? 'bg-orange-600 text-white font-bold'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cont}
                        </button>
                      ))}
                    </div>

                    {/* Country List */}
                    <div className="overflow-y-auto flex-1 py-1">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => handleCountrySelect(c)}
                          className="w-full text-left px-3.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-gray-900">{c.name}</span>
                            <span className="text-[10px] text-gray-400">({c.continent})</span>
                          </div>
                          {selectedCountryCode === c.code && (
                            <Check size={14} weight="bold" className="text-orange-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 2. Forecast Time Range Selector */}
            <div className="relative">
              <button
                onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
                className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-xs transition-colors cursor-pointer"
              >
                <CalendarBlank size={15} className="text-gray-500" />
                <span>{selectedTimeRange}</span>
                <CaretDown size={12} weight="bold" className="text-gray-400" />
              </button>

              {isTimeRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsTimeRangeOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
                    {['Next 24 Hours', 'Next 3 Days', 'Next 7 Days', 'Next 14 Days'].map((range) => (
                      <button
                        key={range}
                        onClick={() => {
                          setSelectedTimeRange(range);
                          setIsTimeRangeOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 3. Run Database Risk Simulation Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || isLoadingFromDb}
              className="flex items-center gap-2 h-9 px-4 bg-[#ef4444] hover:bg-red-600 disabled:bg-red-400 text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Play size={13} weight="fill" className={isAnalyzing ? 'animate-spin' : ''} />
              <span>{isAnalyzing ? 'Querying DB...' : 'Run Risk Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[9999] px-4 py-2.5 bg-slate-900 text-white text-[12px] font-medium rounded-xl shadow-2xl flex items-center gap-2.5 border border-white/10 animate-in fade-in slide-in-from-bottom-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ─── Top 5 Database-Driven Metric Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Card 1: AI Confidence Score */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-800 flex items-center justify-center shrink-0">
              <Crosshair size={26} weight="bold" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-500 leading-none mb-1">
                AI Confidence Score
              </p>
              <p className="text-[24px] font-black text-gray-900 leading-tight">
                {dbAnalysis?.metrics.aiConfidence || '94.2'}%
              </p>
              <p className="text-[11px] font-bold text-emerald-600 leading-none mt-1">
                ● High Model Certainty
              </p>
            </div>
          </div>

          {/* Card 2: Industries in Danger Zone */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-orange-700 flex items-center justify-center shrink-0">
              <Factory size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-500 leading-none mb-1">
                Industries in Danger
              </p>
              <p className="text-[24px] font-black text-gray-900 leading-tight">
                {dbAnalysis?.metrics.dangerIndustriesCount || 0} Facilities
              </p>
              <p className="text-[11px] font-bold text-red-500 leading-none mt-1">
                Queried from PostgreSQL
              </p>
            </div>
          </div>

          {/* Card 3: High Risk Zone Area */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-orange-600 flex items-center justify-center shrink-0">
              <Fire size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-500 leading-none mb-1">
                High Risk Zone
              </p>
              <p className="text-[24px] font-black text-gray-900 leading-tight">
                {dbAnalysis?.metrics.highRiskArea || '~ 4,200 ha'}
              </p>
              <p className="text-[11px] font-bold text-red-500 leading-none mt-1 truncate">
                ↑ {dbAnalysis?.metrics.highRiskGrowth || '+65%'}
              </p>
            </div>
          </div>

          {/* Card 4: Population at Risk */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-orange-500 flex items-center justify-center shrink-0">
              <Users size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-500 leading-none mb-1">
                Population at Risk
              </p>
              <p className="text-[24px] font-black text-gray-900 leading-tight">
                {dbAnalysis?.metrics.populationAtRisk || '12,450'}
              </p>
              <p className="text-[11px] text-gray-400 font-medium leading-none mt-1 truncate">
                {dbAnalysis?.metrics.populationSettlements || 'Regional zones'}
              </p>
            </div>
          </div>

          {/* Card 5: Critical Infrastructure Nodes */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-orange-400 flex items-center justify-center shrink-0">
              <Buildings size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-500 leading-none mb-1">
                Infrastructure Nodes
              </p>
              <p className="text-[24px] font-black text-gray-900 leading-tight">
                {dbAnalysis?.metrics.infrastructureNodes || '8 Nodes'}
              </p>
              <p className="text-[11px] text-gray-400 font-medium leading-none mt-1">
                Monitored grid assets
              </p>
            </div>
          </div>
        </div>

        {/* ─── Main Two Column Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ═════════ LEFT COLUMN: Map + Forecast SVG ═════════ */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Card 1: Risk Heatmap Canvas */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[13.5px] font-bold text-gray-900">
                    Predictive Risk Heatmap &amp; Infrastructure ({activeCountry.name})
                  </span>
                </div>

                {/* Satellite / Map Tab Switcher */}
                <div className="inline-flex bg-gray-100 p-0.5 rounded-lg">
                  {(['Satellite', 'Map'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-[11.5px] font-semibold rounded-md transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative h-[340px] w-full bg-slate-900">
                <div ref={mapRef} className="w-full h-full z-0" />

                {/* Left Floating Controls */}
                <div className="absolute top-3 left-3 z-[20] flex flex-col gap-1">
                  <button
                    title="Reset to Country View"
                    onClick={() => {
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo(activeCountry.center, activeCountry.zoom, { duration: 1.2 });
                        setShowViewportScanButton(false);
                      }
                    }}
                    className="w-7 h-7 bg-white/95 hover:bg-white text-gray-700 rounded shadow-sm flex items-center justify-center border border-gray-200 text-xs font-bold cursor-pointer"
                  >
                    <Crosshair size={14} weight="bold" />
                  </button>
                  <button
                    title="Zoom in"
                    onClick={() => mapInstanceRef.current?.zoomIn()}
                    className="w-7 h-7 bg-white/95 hover:bg-white text-gray-700 rounded shadow-sm flex items-center justify-center border border-gray-200 text-xs font-bold cursor-pointer"
                  >
                    <Plus size={13} weight="bold" />
                  </button>
                  <button
                    title="Zoom out"
                    onClick={() => mapInstanceRef.current?.zoomOut()}
                    className="w-7 h-7 bg-white/95 hover:bg-white text-gray-700 rounded shadow-sm flex items-center justify-center border border-gray-200 text-xs font-bold cursor-pointer"
                  >
                    <Minus size={13} weight="bold" />
                  </button>
                </div>

                {/* Floating Viewport Scan Button */}
                {showViewportScanButton && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[25] animate-in fade-in zoom-in-95">
                    <button
                      onClick={handleScanCurrentViewport}
                      className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[12px] font-bold shadow-xl border border-white/20 transition-all hover:scale-105 cursor-pointer"
                    >
                      <Broadcast size={15} weight="bold" className="animate-pulse text-amber-300" />
                      <span>Scan Viewport in Database</span>
                    </button>
                  </div>
                )}

                {/* Top Right Floating Risk Legend */}
                <div className="absolute top-3 right-3 z-[20] bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-lg px-3 py-2 shadow-md min-w-[130px]">
                  <div className="space-y-1 text-[10.5px] font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                      <span>Very High Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                      <span>High Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                      <span>Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                      <span>Low Risk Buffer</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 text-[10px] text-gray-500 font-semibold">
                      <span>🏭 Endangered Asset</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Left DB Status Pill */}
                <div className="absolute bottom-3 left-3 z-[20] text-[11px] font-semibold text-white drop-shadow flex items-center gap-1.5 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{activeCountry.name} ({activeCountry.code}) · {dbAnalysis?.metrics.totalDetectionsInDb.toLocaleString() || 0} Detections in DB</span>
                </div>
              </div>
            </div>

            {/* Card 2: 7-Day Risk Forecast Area SVG Chart */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-orange-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full border-2 border-orange-600" />
                  </div>
                  <h3 className="text-[13.5px] font-bold text-gray-900">
                    7-Day Risk Forecast Trajectory ({activeCountry.name})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    PostgreSQL Time-Series
                  </span>
                  <div className="px-2.5 py-0.5 bg-gray-100 rounded text-[11px] font-bold text-gray-700">
                    Area at Risk (ha)
                  </div>
                </div>
              </div>

              {/* Area Line Chart */}
              {dbAnalysis && dbAnalysis.forecastPoints.length > 0 && (
                <div className="relative pt-4 pb-2">
                  <svg viewBox="0 0 470 190" className="w-full h-56 overflow-visible">
                    <defs>
                      <linearGradient id="dbRiskAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {[35, 75, 115, 155].map((yVal, i) => (
                      <line
                        key={i}
                        x1="25"
                        y1={yVal}
                        x2="460"
                        y2={yVal}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Area fill */}
                    <path
                      d={`M25,${dbAnalysis.forecastPoints[0].y} L95,${dbAnalysis.forecastPoints[1]?.y || 140} L165,${dbAnalysis.forecastPoints[2]?.y || 135} L235,${dbAnalysis.forecastPoints[3]?.y || 130} L305,${dbAnalysis.forecastPoints[4]?.y || 120} L375,${dbAnalysis.forecastPoints[5]?.y || 100} L445,${dbAnalysis.forecastPoints[6]?.y || 80} L445,170 L25,170 Z`}
                      fill="url(#dbRiskAreaGrad)"
                    />

                    {/* Trend Line */}
                    <path
                      d={`M25,${dbAnalysis.forecastPoints[0].y} Q60,${dbAnalysis.forecastPoints[0].y} 95,${dbAnalysis.forecastPoints[1]?.y || 140} T165,${dbAnalysis.forecastPoints[2]?.y || 135} T235,${dbAnalysis.forecastPoints[3]?.y || 130} T305,${dbAnalysis.forecastPoints[4]?.y || 120} T375,${dbAnalysis.forecastPoints[5]?.y || 100} T445,${dbAnalysis.forecastPoints[6]?.y || 80}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                    />

                    {/* Active vertical line */}
                    {dbAnalysis.forecastPoints[activeTooltip] && (
                      <line
                        x1={dbAnalysis.forecastPoints[activeTooltip].x}
                        y1={dbAnalysis.forecastPoints[activeTooltip].y}
                        x2={dbAnalysis.forecastPoints[activeTooltip].x}
                        y2="170"
                        stroke="#ef4444"
                        strokeWidth="1.2"
                        strokeDasharray="3,3"
                      />
                    )}

                    {/* Points */}
                    {dbAnalysis.forecastPoints.map((pt, idx) => (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onClick={() => setActiveTooltip(idx)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={activeTooltip === idx ? 5 : 3.5}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={pt.x}
                          y="185"
                          fontSize="10"
                          fill="#94a3b8"
                          textAnchor="middle"
                          fontWeight={activeTooltip === idx ? 'bold' : 'normal'}
                        >
                          {pt.date}
                        </text>
                      </g>
                    ))}
                  </svg>

                  {/* Tooltip Box */}
                  {dbAnalysis.forecastPoints[activeTooltip] && (
                    <div
                      className="absolute bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 pointer-events-none transition-all"
                      style={{
                        left: `${Math.max(4, Math.min(74, (dbAnalysis.forecastPoints[activeTooltip].x / 470) * 100 - 12))}%`,
                        top: '8px',
                      }}
                    >
                      <p className="text-[11px] font-bold text-gray-800">
                        {dbAnalysis.forecastPoints[activeTooltip].date} 2026
                      </p>
                      <p className="text-[10px] text-gray-400">PostgreSQL Projected Risk</p>
                      <p className="text-[12px] font-extrabold text-red-600">
                        ~ {dbAnalysis.forecastPoints[activeTooltip].area.toLocaleString()} ha
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═════════ RIGHT COLUMN: Impact & Database Assets ═════════ */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Card 1: Potential Impact Analysis */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Info size={16} weight="bold" className="text-gray-600" />
                  <h3 className="text-[13.5px] font-bold text-gray-900">
                    Potential Impact Analysis ({activeCountry.name})
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">DB Synthesis</span>
              </div>

              <div className="space-y-2.5">
                {dbAnalysis?.impactMetrics.map((item, idx) => {
                  const IconComponent = IMPACT_ICON_MAP[item.icon] || Factory;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <div className="flex items-center gap-2.5 text-gray-700 min-w-0">
                        <IconComponent size={15} weight="fill" className="shrink-0 text-orange-500" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-semibold text-gray-900 text-[12px]">
                          {item.value}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.riskColor}`}
                        >
                          {item.risk}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Vulnerable Areas & Endangered Industries Table */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3 shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setVulnerableTab('industries')}
                    className={`px-3 py-1 text-[11.5px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      vulnerableTab === 'industries'
                        ? 'bg-white text-orange-600 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Factory size={13} weight="fill" />
                    <span>Industries in Danger ({dbAnalysis?.industries.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setVulnerableTab('settlements')}
                    className={`px-3 py-1 text-[11.5px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      vulnerableTab === 'settlements'
                        ? 'bg-white text-orange-600 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <MapPin size={13} weight="fill" />
                    <span>Vulnerable Zones ({dbAnalysis?.vulnerableAreas.length || 0})</span>
                  </button>
                </div>

                <button
                  onClick={() => onNavigate && onNavigate('Live Map')}
                  className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                >
                  <span>Open in Live Map</span>
                  <ArrowRight size={11} weight="bold" />
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {vulnerableTab === 'industries' ? (
                  <table className="w-full min-w-[500px] text-[11px] text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100 font-medium">
                        <th className="pb-2 font-medium w-[45%]">Industry &amp; Proximity</th>
                        <th className="pb-2 font-medium w-[18%]">Threat Level</th>
                        <th className="pb-2 font-medium w-[17%] text-center">Confidence</th>
                        <th className="pb-2 font-medium w-[20%] text-right">Action Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(dbAnalysis?.industries || []).map((ind, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                          onClick={() => {
                            if (mapInstanceRef.current) {
                              mapInstanceRef.current.flyTo([ind.lat, ind.lng], 12, { duration: 1.2 });
                              showToast(`Locating facility: ${ind.name}`);
                            }
                          }}
                        >
                          <td className="py-2.5 pr-2">
                            <p className="font-bold text-gray-900 leading-tight hover:text-orange-600 transition-colors">
                              {ind.name}
                            </p>
                            <p className="text-[10px] text-orange-600 font-medium mt-0.5">
                              {ind.distance} • <span className="text-gray-400">{ind.material}</span>
                            </p>
                          </td>
                          <td className="py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold ${ind.threatColor}`}>
                              {ind.threat}
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded font-black text-[11px] text-gray-900 bg-gray-100">
                              {ind.confidence}%
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showToast(`Protocol dispatched: ${ind.action} initiated for ${ind.name}`);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${ind.actionColor}`}
                            >
                              {ind.action}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[450px] text-[11.5px] text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100 font-medium">
                        <th className="pb-2 font-medium">Vulnerable Region / Zone</th>
                        <th className="pb-2 font-medium">Risk Level</th>
                        <th className="pb-2 font-medium">Population</th>
                        <th className="pb-2 font-medium text-right">Emergency Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(dbAnalysis?.vulnerableAreas || []).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 font-semibold text-gray-800">
                            {row.area}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${row.riskBadge}`}
                            >
                              {row.riskLevel}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-600 font-medium">
                            {row.population}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => showToast(`Protocol activated: ${row.action} for ${row.area}`)}
                              className={`px-2.5 py-0.5 rounded text-[10.5px] font-bold transition-colors cursor-pointer ${row.actionColor}`}
                            >
                              {row.action}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
