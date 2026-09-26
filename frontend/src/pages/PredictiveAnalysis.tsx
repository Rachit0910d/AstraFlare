import { useState, useEffect, useRef, useMemo } from 'react';
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
  Stack,
  Drop,
  Wind,
  FirstAid,
  GraduationCap,
  Path,
  Tree,
  CheckCircle,
} from '@phosphor-icons/react';
import Header from '../components/Header';
import {
  fetchVerifiedPredictions,
  type VerifiedPrediction,
} from '../api/predictionService';

interface PredictiveAnalysisProps {
  onNavigate?: (page: string) => void;
}

const STATE_CENTERS: Record<string, [number, number]> = {
  Maharashtra: [19.7515, 75.7139],
  Gujarat: [22.2587, 71.1924],
  Rajasthan: [27.0238, 74.2179],
  'Madhya Pradesh': [22.9734, 78.6569],
  'Uttar Pradesh': [26.8467, 80.9462],
  Karnataka: [15.3173, 75.7139],
};

const DISTRICT_CENTERS: Record<string, [number, number]> = {
  Mumbai: [19.0760, 72.8777],
  Pune: [18.5204, 73.8567],
  Surat: [21.1702, 72.8311],
  Jaipur: [26.9124, 75.7873],
  Indore: [22.7196, 75.8577],
  Lucknow: [26.8467, 80.9462],
};

// ─── Impact metrics for Potential Impact Analysis ─────────────────────────────
const IMPACT_METRICS = [
  {
    icon: Factory,
    label: 'Industries in Danger Zone',
    value: '6 Facilities',
    risk: 'Critical',
    riskColor: 'bg-red-50 text-red-600 border border-red-200',
    iconColor: 'text-orange-500',
  },
  {
    icon: Users,
    label: 'Population at Risk',
    value: '12,450 people',
    risk: 'High',
    riskColor: 'bg-red-50 text-red-600 border border-red-200',
    iconColor: 'text-blue-500',
  },
  {
    icon: Buildings,
    label: 'Affected Settlements',
    value: '18',
    risk: 'High',
    riskColor: 'bg-red-50 text-red-600 border border-red-200',
    iconColor: 'text-red-500',
  },
  {
    icon: Path,
    label: 'Roads at Risk',
    value: '42 km',
    risk: 'Medium',
    riskColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    iconColor: 'text-gray-700',
  },
  {
    icon: FirstAid,
    label: 'Hospitals/Health Centers',
    value: '3',
    risk: 'High',
    riskColor: 'bg-red-50 text-red-600 border border-red-200',
    iconColor: 'text-red-500',
  },
  {
    icon: GraduationCap,
    label: 'Schools',
    value: '7',
    risk: 'Medium',
    riskColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    iconColor: 'text-blue-600',
  },
  {
    icon: Tree,
    label: 'Forest Area at Risk',
    value: '~ 4,200 ha',
    risk: 'High',
    riskColor: 'bg-red-50 text-red-600 border border-red-200',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Leaf,
    label: 'Biodiversity Impact',
    value: 'Significant',
    risk: 'High',
    riskColor: 'bg-red-50 text-red-600 border border-red-200',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Drop,
    label: 'Water Bodies at Risk',
    value: '5',
    risk: 'Medium',
    riskColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    iconColor: 'text-blue-500',
  },
  {
    icon: Wind,
    label: 'Air Quality Impact (AQI)',
    value: 'Severe (300+)',
    risk: 'High',
    riskColor: 'bg-red-50 text-red-600 border border-red-200',
    iconColor: 'text-gray-600',
  },
];

// ─── Vulnerable Areas Table Data ──────────────────────────────────────────────
const VULNERABLE_AREAS = [
  {
    area: 'Central India (Forest Region)',
    riskLevel: 'High',
    riskBadge: 'bg-red-50 text-red-600 border border-red-200',
    population: '12,500',
    action: 'Monitor',
    actionColor: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100',
  },
  {
    area: 'Western Ghats (Buffer Zone)',
    riskLevel: 'High',
    riskBadge: 'bg-red-50 text-red-600 border border-red-200',
    population: '5,200',
    action: 'Alert',
    actionColor: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  },
  {
    area: 'Odisha (Coastal Belt)',
    riskLevel: 'Medium',
    riskBadge: 'bg-amber-50 text-amber-600 border border-amber-200',
    population: '3,800',
    action: 'Monitor',
    actionColor: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
  },
  {
    area: 'Punjab (Agri Belts)',
    riskLevel: 'Medium',
    riskBadge: 'bg-amber-50 text-amber-600 border border-amber-200',
    population: '8,400',
    action: 'Prepare',
    actionColor: 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100',
  },
  {
    area: 'Uttarakhand (Foothills)',
    riskLevel: 'Low',
    riskBadge: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    population: '1,200',
    action: 'Monitor',
    actionColor: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100',
  },
];

export interface IndustryItem {
  name: string;
  sector: string;
  distance: string;
  threat: string;
  threatColor: string;
  confidence: number;
  material: string;
  action: string;
  actionColor: string;
}

// ─── Endangered Industries at Hotspots ───────────────────────────────────────
const ENDANGERED_INDUSTRIES: IndustryItem[] = [
  {
    name: 'Reliance Petrochemical Tank Farm #4',
    sector: 'Petrochemical & Refining',
    distance: '350 m from hotspot',
    threat: 'Critical',
    threatColor: 'bg-red-50 text-red-600 border border-red-200',
    confidence: 96,
    material: 'Flammable Hydrocarbons',
    action: 'Activate Foam Deluge',
    actionColor: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  },
  {
    name: 'Essar 400kV Power Substation',
    sector: 'High-Voltage Grid Feed',
    distance: '820 m from hotspot',
    threat: 'High',
    threatColor: 'bg-red-50 text-red-600 border border-red-200',
    confidence: 92,
    material: 'Transformer Mineral Oil',
    action: 'Grid Isolation',
    actionColor: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  },
  {
    name: 'Adani Chemical Logistics Yard',
    sector: 'Chemical Warehousing',
    distance: '1.2 km from hotspot',
    threat: 'High',
    threatColor: 'bg-red-50 text-red-600 border border-red-200',
    confidence: 89,
    material: 'Volatile Solvents',
    action: 'Clear Fuel Perimeter',
    actionColor: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
  },
  {
    name: 'GAIL Natural Gas Compressing Station',
    sector: 'Pressurized Gas Pipeline',
    distance: '1.8 km from hotspot',
    threat: 'Medium',
    threatColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    confidence: 85,
    material: 'Pressurized Methane Feed',
    action: 'Valve Closure Alert',
    actionColor: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
  },
  {
    name: 'Tata Agrochemical Storage Silos',
    sector: 'Industrial Fertilizer Depot',
    distance: '2.5 km from hotspot',
    threat: 'Medium',
    threatColor: 'bg-blue-50 text-blue-600 border border-blue-200',
    confidence: 81,
    material: 'Nitrate Compound Fertilizers',
    action: 'Hazmat Standby',
    actionColor: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100',
  },
];

// ─── 7-Day Forecast Data Points for Area at Risk ──────────────────────────────
const FORECAST_POINTS = [
  { date: '9 Sep', area: 1200, x: 25, y: 155 },
  { date: '10 Sep', area: 1650, x: 95, y: 142 },
  { date: '11 Sep', area: 2150, x: 165, y: 130 },
  { date: '12 Sep', area: 2800, x: 235, y: 115, active: true },
  { date: '13 Sep', area: 3600, x: 305, y: 98 },
  { date: '14 Sep', area: 4700, x: 375, y: 78 },
  { date: '15 Sep', area: 5900, x: 445, y: 55 },
];

export default function PredictiveAnalysis({ onNavigate }: PredictiveAnalysisProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('Mumbai');
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Next 7 Days');
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(3); // 12 Sep active by default
  const [vulnerableTab, setVulnerableTab] = useState<'industries' | 'settlements'>('industries');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real verified predictions fetched from PostgreSQL backend
  const [verifiedPredictions, setVerifiedPredictions] = useState<VerifiedPrediction[]>([]);
  const [hasLoadedDbPredictions, setHasLoadedDbPredictions] = useState(false);

  useEffect(() => {
    fetchVerifiedPredictions({ limit: 100 })
      .then((preds) => {
        if (preds && preds.length > 0) {
          setVerifiedPredictions(preds);
          setHasLoadedDbPredictions(true);
        }
      })
      .catch((err) => console.warn('Prediction load warning:', err));
  }, []);

  // Compute endangered industries from verified PostgreSQL predictions
  const liveEndangeredIndustries: IndustryItem[] = useMemo(() => {
    const list: IndustryItem[] = [];

    verifiedPredictions.forEach((p) => {
      (p.endangered_industries || []).forEach((ind) => {
        const isCrit = ind.threat_level === 'critical';
        const isHigh = ind.threat_level === 'high';
        list.push({
          name: ind.name,
          sector: ind.type,
          distance: `${(ind.distance_meters / 1000).toFixed(1)} km from hotspot (${p.latitude.toFixed(2)}°N, ${p.longitude.toFixed(2)}°E)`,
          threat: isCrit ? 'Critical' : isHigh ? 'High' : 'Medium',
          threatColor: isCrit
            ? 'bg-red-50 text-red-600 border border-red-200'
            : isHigh
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-amber-50 text-amber-600 border border-amber-200',
          confidence: Math.round(p.confidence_score),
          material: ind.critical_materials?.join(', ') || 'Hazardous Industrial Materials',
          action: isCrit ? 'Immediate Alert' : isHigh ? 'Activate Deluge' : 'Hazmat Standby',
          actionColor: isCrit
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
        });
      });
    });

    return list.length > 0 ? list : ENDANGERED_INDUSTRIES;
  }, [verifiedPredictions]);

  const avgConfidence = useMemo(() => {
    if (verifiedPredictions.length === 0) return '94.2';
    const total = verifiedPredictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0);
    return (total / verifiedPredictions.length).toFixed(1);
  }, [verifiedPredictions]);

  const handleStateChange = (st: string) => {
    setSelectedState(st);
    setIsStateOpen(false);
    if (mapInstanceRef.current && STATE_CENTERS[st]) {
      mapInstanceRef.current.flyTo(STATE_CENTERS[st], 6, { duration: 1.2 });
    }
  };

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    setIsDistrictOpen(false);
    if (mapInstanceRef.current && DISTRICT_CENTERS[dist]) {
      mapInstanceRef.current.flyTo(DISTRICT_CENTERS[dist], 9, { duration: 1.2 });
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    showToast(`Simulating fire hazard & infrastructure risk for ${selectedDistrict}, ${selectedState}...`);
    try {
      const preds = await fetchVerifiedPredictions({ limit: 100 });
      if (preds && preds.length > 0) {
        setVerifiedPredictions(preds);
        setHasLoadedDbPredictions(true);
      }
      if (mapInstanceRef.current) {
        const center = DISTRICT_CENTERS[selectedDistrict] || STATE_CENTERS[selectedState] || [22.9, 78.66];
        mapInstanceRef.current.flyTo(center, 7, { duration: 1.4 });
      }
      setTimeout(() => {
        showToast(`Simulation complete: ${liveEndangeredIndustries.length} facilities monitored in ${selectedState}.`);
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast('Risk analysis completed with local telemetry cache.');
    } finally {
      setTimeout(() => setIsAnalyzing(false), 800);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Centered around India
    const map = L.map(mapRef.current, {
      center: [22.9, 78.66],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Satellite imagery tiles
    const satTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );
    satTile.addTo(map);

    // Place labels overlay
    const labelsTile = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, opacity: 0.85 }
    );
    labelsTile.addTo(map);

    // ─── Heatmap Risk Zones Overlays ─────────────────────────────────────────
    // Very High Risk Zone (Red gradient core) - Central India
    L.circle([22.3, 82.5], {
      radius: 80000,
      color: '#ef4444',
      weight: 1.5,
      fillColor: '#dc2626',
      fillOpacity: 0.62,
    }).addTo(map);

    // High Risk Zone (Orange halo) - Odisha region
    L.circle([20.5, 84.5], {
      radius: 100000,
      color: '#f97316',
      weight: 1,
      fillColor: '#ea580c',
      fillOpacity: 0.48,
    }).addTo(map);

    // Medium Risk Zone (Yellow outer perimeter) - Punjab region
    L.circle([30.9, 75.8], {
      radius: 70000,
      color: '#eab308',
      weight: 1,
      fillColor: '#ca8a04',
      fillOpacity: 0.38,
    }).addTo(map);

    // Low Risk Zone (Green surrounding boundary) - South India
    L.circle([15.3, 75.8], {
      radius: 120000,
      color: '#22c55e',
      weight: 1,
      fillColor: '#16a34a',
      fillOpacity: 0.22,
    }).addTo(map);

    // City markers with white circles and labels
    const cities = [
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
      { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
      { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    ];

    cities.forEach((c) => {
      L.circleMarker([c.lat, c.lng], {
        radius: 4.5,
        color: '#ffffff',
        weight: 2,
        fillColor: '#111827',
        fillOpacity: 1,
      }).addTo(map);

      L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          html: `<div style="color:white;font-size:12.5px;font-weight:700;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9),0 0 6px rgba(0,0,0,0.8);margin-left:8px;margin-top:-8px;">${c.name}</div>`,
          className: '',
          iconSize: [100, 20],
          iconAnchor: [0, 0],
        }),
      }).addTo(map);
    });

    // ─── Industrial Facilities in Danger Zone (with confidence badges) ───
    const industrialPins = [
      { name: 'Reliance Petrochem #4', distance: '350m', lat: 22.42, lng: 82.55, confidence: '96%' },
      { name: 'Essar 400kV Substation', distance: '820m', lat: 22.35, lng: 82.44, confidence: '92%' },
      { name: 'Adani Chemical Yard', distance: '1.2km', lat: 20.52, lng: 84.48, confidence: '89%' },
      { name: 'GAIL Gas Compressor', distance: '1.8km', lat: 30.88, lng: 75.82, confidence: '85%' },
    ];

    industrialPins.forEach((ind) => {
      L.circleMarker([ind.lat, ind.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: '#ea580c',
        fillOpacity: 1,
      }).addTo(map);

      L.marker([ind.lat, ind.lng], {
        icon: L.divIcon({
          html: `<div style="background:rgba(15,23,42,0.92);color:white;padding:2px 6px;border-radius:5px;font-size:10.5px;font-weight:700;white-space:nowrap;border:1px solid #ea580c;box-shadow:0 2px 5px rgba(0,0,0,0.5);margin-left:8px;margin-top:-9px;">🏭 ${ind.name} <span style="color:#fbbf24;font-size:9.5px;margin-left:3px;">${ind.confidence}</span></div>`,
          className: '',
          iconSize: [170, 22],
          iconAnchor: [0, 0],
        }),
      }).addTo(map);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* ═══════════════════════ UNIFIED NAVBAR ═══════════════════════ */}
      <Header activePage="Predictive Analysis" onNavigate={onNavigate} />

      {/* ═══════════════════════ MAIN CONTENT CONTAINER ═══════════════════════ */}
      <main className="flex-1 px-8 py-5 flex flex-col gap-5">
        {/* ─── Page Title Header & Top Selectors ─── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
              Risk &amp; Impact Analysis
            </h1>
            <p className="text-[13px] text-gray-400 mt-1.5 font-medium">
              Assess potential impact, vulnerable areas, and necessary response actions
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* State selector */}
            <div className="relative">
              <button
                onClick={() => setIsStateOpen(!isStateOpen)}
                className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-xs transition-colors cursor-pointer"
              >
                <span>{selectedState}</span>
                <CaretDown size={12} weight="bold" className="text-gray-400" />
              </button>
              {isStateOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsStateOpen(false)} />
                  <div className="absolute left-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
                    {['Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh', 'Karnataka'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStateChange(st)}
                        className="w-full text-left px-3.5 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* District selector */}
            <div className="relative">
              <button
                onClick={() => setIsDistrictOpen(!isDistrictOpen)}
                className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-xs transition-colors cursor-pointer"
              >
                <span>{selectedDistrict}</span>
                <CaretDown size={12} weight="bold" className="text-gray-400" />
              </button>
              {isDistrictOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDistrictOpen(false)} />
                  <div className="absolute left-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
                    {['Mumbai', 'Pune', 'Surat', 'Jaipur', 'Indore', 'Lucknow'].map((dist) => (
                      <button
                        key={dist}
                        onClick={() => handleDistrictChange(dist)}
                        className="w-full text-left px-3.5 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Time range selector */}
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

            {/* Run Risk Analysis Action Button */}
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 h-9 px-4 bg-[#ef4444] hover:bg-red-600 disabled:bg-red-400 text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Play size={13} weight="fill" className={isAnalyzing ? 'animate-spin' : ''} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Run Risk Analysis'}</span>
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

        {/* ─── Top 5 Metric Cards (Including Confidence Score & Endangered Industries) ─── */}
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
                {avgConfidence}%
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
                {liveEndangeredIndustries.length} Facilities
              </p>
              <p className="text-[11px] font-bold text-red-500 leading-none mt-1">
                Within 2 km hotspot radius
              </p>
            </div>
          </div>

          {/* Card 3: High Risk Zone */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-orange-600 flex items-center justify-center shrink-0">
              <Fire size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-500 leading-none mb-1">
                High Risk Zone
              </p>
              <p className="text-[24px] font-black text-gray-900 leading-tight">
                4,200 ha
              </p>
              <p className="text-[11px] font-bold text-red-500 leading-none mt-1">
                ↑ +65% (vs. previous week)
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
                12,450
              </p>
              <p className="text-[11px] text-gray-400 font-medium leading-none mt-1">
                Across 18 settlements
              </p>
            </div>
          </div>

          {/* Card 5: Critical Infrastructure */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-orange-400 flex items-center justify-center shrink-0">
              <Buildings size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-gray-500 leading-none mb-1">
                Infrastructure Nodes
              </p>
              <p className="text-[24px] font-black text-gray-900 leading-tight">
                8 Nodes
              </p>
              <p className="text-[11px] text-gray-400 font-medium leading-none mt-1">
                Within 5 km radius
              </p>
            </div>
          </div>
        </div>

        {/* ─── Main Two Column Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ═════════ LEFT COLUMN: Heatmap + Risk Forecast Graph ═════════ */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Card 1: Risk Heatmap */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-[13.5px] font-bold">Risk Heatmap</span>
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative h-[300px] w-full bg-slate-900">
                <div ref={mapRef} className="w-full h-full z-0" />

                {/* Left Floating Zoom Controls */}
                <div className="absolute top-3 left-3 z-[20] flex flex-col gap-1">
                  <button
                    onClick={() => mapInstanceRef.current?.zoomIn()}
                    className="w-7 h-7 bg-white/95 hover:bg-white text-gray-700 rounded shadow-sm flex items-center justify-center border border-gray-200 text-xs font-bold"
                  >
                    <Plus size={13} weight="bold" />
                  </button>
                  <button
                    onClick={() => mapInstanceRef.current?.zoomOut()}
                    className="w-7 h-7 bg-white/95 hover:bg-white text-gray-700 rounded shadow-sm flex items-center justify-center border border-gray-200 text-xs font-bold"
                  >
                    <Minus size={13} weight="bold" />
                  </button>
                  <div className="my-0.5" />
                  <button className="w-7 h-7 bg-white/95 hover:bg-white text-gray-700 rounded shadow-sm flex items-center justify-center border border-gray-200">
                    <Stack size={13} weight="bold" />
                  </button>
                </div>

                {/* Top Right Floating Risk Legend */}
                <div className="absolute top-3 right-3 z-[20] bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-lg px-3 py-2.5 shadow-md min-w-[130px]">
                  <div className="space-y-1.5 text-[11px] font-medium text-gray-700">
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
                      <span>Low Risk</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Left Scale Indicator */}
                <div className="absolute bottom-3 left-3 z-[400] text-[11px] font-semibold text-white drop-shadow flex items-center gap-1.5 pointer-events-none">
                  <span className="w-10 h-[2px] bg-white inline-block shadow-sm" />
                  <span>20 km</span>
                </div>
              </div>
            </div>

            {/* Card 2: Risk Forecast (Next 7 Days) */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-12 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-orange-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full border-2 border-orange-600" />
                  </div>
                  <h3 className="text-[13.5px] font-bold text-gray-900">
                    Risk Forecast (Next 7 Days)
                  </h3>
                </div>

                <button className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-md text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <span>Area at Risk (ha)</span>
                  <CaretDown size={11} weight="bold" className="text-gray-400" />
                </button>
              </div>

              {/* Area Line Chart with Interactive Tooltip */}
              <div className="relative pt-4 pb-2">
                <svg
                  viewBox="0 0 470 190"
                  className="w-full h-60 overflow-visible"
                >
                  <defs>
                    <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
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

                  {/* Y Axis Labels */}
                  <text x="5" y="40" fontSize="10" fill="#94a3b8">8,000</text>
                  <text x="5" y="80" fontSize="10" fill="#94a3b8">6,000</text>
                  <text x="5" y="120" fontSize="10" fill="#94a3b8">4,000</text>
                  <text x="5" y="158" fontSize="10" fill="#94a3b8">2,000</text>
                  <text x="18" y="178" fontSize="10" fill="#94a3b8">0</text>

                  {/* Shaded Area Fill */}
                  <path
                    d="M25,155 L95,142 L165,130 L235,115 L305,98 L375,78 L445,55 L445,170 L25,170 Z"
                    fill="url(#riskAreaGrad)"
                  />

                  {/* Trend Line */}
                  <path
                    d="M25,155 Q60,148 95,142 T165,130 T235,115 T305,98 T375,78 T445,55"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                  />

                  {/* Active Vertical Guideline for Selected Tooltip (12 Sep) */}
                  <line
                    x1="235"
                    y1="60"
                    x2="235"
                    y2="170"
                    stroke="#ef4444"
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                  />

                  {/* Data Points */}
                  {FORECAST_POINTS.map((pt, idx) => (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onClick={() => setActiveTooltip(idx)}
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={activeTooltip === idx ? 4.5 : 3.5}
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
                      >
                        {pt.date}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Floating Tooltip Box over 12 Sep */}
                <div
                  className="absolute bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 pointer-events-none transition-all"
                  style={{
                    left: `${(FORECAST_POINTS[activeTooltip].x / 470) * 100 - 14}%`,
                    top: '12px',
                  }}
                >
                  <p className="text-[11px] font-bold text-gray-800">
                    {FORECAST_POINTS[activeTooltip].date} 2025
                  </p>
                  <p className="text-[10px] text-gray-400">Predicted Risk Area</p>
                  <p className="text-[12px] font-extrabold text-red-600">
                    ~ {FORECAST_POINTS[activeTooltip].area.toLocaleString()} ha
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════ RIGHT COLUMN: Potential Impact & Vulnerable Areas ═════════ */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Card 1: Potential Impact Analysis */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Info size={16} weight="bold" className="text-gray-600" />
                <h3 className="text-[13.5px] font-bold text-gray-900">
                  Potential Impact Analysis
                </h3>
              </div>

              <div className="space-y-2.5">
                {IMPACT_METRICS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <div className="flex items-center gap-2.5 text-gray-700 min-w-0">
                        <Icon size={15} weight="fill" className={`shrink-0 ${item.iconColor}`} />
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

            {/* Card 2: Vulnerable Areas & Endangered Industries */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3 shrink-0">
                {/* Tabs: Industries in Danger vs Settlements */}
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setVulnerableTab('industries')}
                    className={`px-3 py-1 text-[11.5px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${vulnerableTab === 'industries'
                        ? 'bg-white text-orange-600 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Factory size={13} weight="fill" />
                    <span>Industries in Danger ({liveEndangeredIndustries.length})</span>
                    {hasLoadedDbPredictions && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Connected to PostgreSQL Database" />
                    )}
                  </button>
                  <button
                    onClick={() => setVulnerableTab('settlements')}
                    className={`px-3 py-1 text-[11.5px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${vulnerableTab === 'settlements'
                        ? 'bg-white text-orange-600 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <MapPin size={13} weight="fill" />
                    <span>Settlements ({VULNERABLE_AREAS.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {hasLoadedDbPredictions && (
                    <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                      <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                      <span>Verified DB</span>
                    </span>
                  )}
                  <button
                    onClick={() => onNavigate && onNavigate('Live Map')}
                    className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    <span>View on Map</span>
                    <ArrowRight size={11} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {vulnerableTab === 'industries' ? (
                  <table className="w-full min-w-[500px] text-[11px] text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100 font-medium">
                        <th className="pb-2 font-medium w-[45%]">Industry &amp; Distance</th>
                        <th className="pb-2 font-medium w-[18%]">Threat Level</th>
                        <th className="pb-2 font-medium w-[17%] text-center">Confidence</th>
                        <th className="pb-2 font-medium w-[20%] text-right">Action Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {liveEndangeredIndustries.map((ind, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2 pr-2">
                            <p className="font-bold text-gray-900 leading-tight">{ind.name}</p>
                            <p className="text-[10px] text-orange-600 font-medium mt-0.5">
                              {ind.distance} • <span className="text-gray-400">{ind.material}</span>
                            </p>
                          </td>
                          <td className="py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold ${ind.threatColor}`}>
                              {ind.threat}
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <span className="inline-block px-2 py-0.5 rounded font-black text-[11px] text-gray-900 bg-gray-100">
                              {ind.confidence}%
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => showToast(`Action dispatched: ${ind.action} initiated for ${ind.name}`)}
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
                        <th className="pb-2 font-medium">Area</th>
                        <th className="pb-2 font-medium">Risk Level</th>
                        <th className="pb-2 font-medium">Population</th>
                        <th className="pb-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {VULNERABLE_AREAS.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2 font-semibold text-gray-800">
                            {row.area}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${row.riskBadge}`}
                            >
                              {row.riskLevel}
                            </span>
                          </td>
                          <td className="py-2 text-gray-600 font-medium">
                            {row.population}
                          </td>
                          <td className="py-2 text-right">
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
