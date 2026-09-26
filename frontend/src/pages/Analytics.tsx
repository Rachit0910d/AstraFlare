import React, { useState, useRef } from 'react';
import {
  Fire,
  Factory,
  Clock,
  Crosshair,
  ChartLineUp,
  DownloadSimple,
  Lightbulb,
  ArrowRight,
  Info,
  ArrowsLeftRight,
  Sparkle,
  Tree,
  Plant,
  Question,
  CheckCircle,
  Buildings,
  Globe,
  MapPin,
  CaretDown,
  Database,
} from '@phosphor-icons/react';
import Header from '../components/Header';
import {
  fetchPredictionStats,
  type PredictionStats,
} from '../api/predictionService';

interface AnalyticsProps {
  onNavigate?: (page: string) => void;
}

// ─── Incidents Data Demonstrating Industrial vs Persistent vs Biomass Fires ───
interface Incident {
  id: string;
  name: string;
  location: string;
  state: string;
  coordinates: string;
  timestamp: string;
  predictedType: 'Industrial Site Fire' | 'Persistent Thermal Source' | 'Agricultural Fire' | 'Forest Fire';
  confidence: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  severityColor: string;
  frp: string;
  burntArea: string;
  temperature: string;
  detectionSource: string;
  spreadDirection: string;
  osmLandUse: string;
  nsaWorldCover: string;
  ndviDelta: string;
  persistenceIndex: number;
  classes: {
    name: string;
    percentage: number;
    icon: React.ElementType;
    color: string;
  }[];
  explanationTitle: string;
  reasons: string[];
  spectralBefore: string;
  spectralAfter: string;
  beforeImg: string;
  afterImg: string;
  aiInsight: string;
}

const INCIDENTS: Incident[] = [
  {
    id: 'IND-01',
    name: 'Petrochemical Refining Complex & Flare Stack',
    location: 'Jamnagar Petrochemical Corridor',
    state: 'Gujarat',
    coordinates: '22.4707° N, 70.0577° E',
    timestamp: '9 Sep 2025, 10:18 AM',
    predictedType: 'Industrial Site Fire',
    confidence: 94,
    severity: 'High',
    severityColor: 'text-red-600 bg-red-50 border-red-200',
    frp: '184.2 MW',
    burntArea: '14.5 hectares',
    temperature: '~ 742 K (469 °C)',
    detectionSource: 'NASA FIRMS (VIIRS I4/I5 375m)',
    spreadDirection: 'Stationary (Confined to Industrial Plot)',
    osmLandUse: 'landuse=industrial (Refinery & Storage)',
    nsaWorldCover: 'Built-up / Heavy Industry (Class 50)',
    ndviDelta: '-0.02 (No biomass impact)',
    persistenceIndex: 0.94,
    classes: [
      { name: 'Industrial Site Fire', percentage: 94, icon: Factory, color: 'bg-red-500 text-red-500' },
      { name: 'Persistent Thermal Source', percentage: 4, icon: Sparkle, color: 'bg-amber-500 text-amber-500' },
      { name: 'Agricultural Fire', percentage: 1, icon: Plant, color: 'bg-emerald-500 text-emerald-500' },
      { name: 'Forest / Wildfire', percentage: 1, icon: Tree, color: 'bg-blue-500 text-blue-500' },
    ],
    explanationTitle: 'Why Industrial Site Fire?',
    reasons: [
      'Spatial intersection with OpenStreetMap verified boundary: Reliance Jamnagar Refinery plot (OSM ID: 39482110).',
      'NSA/ESA WorldCover 10m confirms surface as Class 50 (Built-up / Concrete / Industrial structures).',
      'NASA FIRMS VIIRS indicates concentrated Fire Radiative Power of 184.2 MW with zero radial perimeter expansion.',
      'Vegetation index (NDVI) difference is negligible (-0.02), ruling out crop or wild forest biomass burning.',
      'High thermal recurrence (Persistence Index 0.94) across 365-day historical archive indicates controlled flare / industrial operations.',
    ],
    spectralBefore: 'M 20 160 Q 70 150 110 120 T 170 80 T 230 60 T 310 90 T 390 120 T 450 140',
    spectralAfter: 'M 20 155 Q 70 140 110 110 T 170 65 T 230 40 T 310 30 T 390 55 T 450 90',
    beforeImg: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
    afterImg: 'https://images.unsplash.com/photo-1542382257-80dedb725088?auto=format&fit=crop&w=800&q=80',
    aiInsight:
      'The thermal emission matches an active Industrial Facility / Controlled Flare Stack within verified OSM industrial zoning. Zero wild canopy or agricultural residue involvement detected. Continual compliance telemetry recommended.',
  },
  {
    id: 'IND-02',
    name: 'Integrated Steel Smelter & Blast Furnace Unit',
    location: 'Bhilai Steel Corridor',
    state: 'Chhattisgarh',
    coordinates: '21.1938° N, 81.3874° E',
    timestamp: '9 Sep 2025, 09:45 AM',
    predictedType: 'Persistent Thermal Source',
    confidence: 96,
    severity: 'Medium',
    severityColor: 'text-amber-600 bg-amber-50 border-amber-200',
    frp: '210.5 MW',
    burntArea: '4.2 hectares (Furnace Roof)',
    temperature: '~ 810 K (537 °C)',
    detectionSource: 'NASA FIRMS (MODIS + VIIRS 7-Day)',
    spreadDirection: 'Zero Spread (Permanent Smelting Furnace)',
    osmLandUse: 'man_made=works (Steel Smelter)',
    nsaWorldCover: 'Industrial Complex (Class 50)',
    ndviDelta: '0.00 (Pure industrial roof)',
    persistenceIndex: 0.99,
    classes: [
      { name: 'Persistent Thermal Source', percentage: 96, icon: Sparkle, color: 'bg-amber-500 text-amber-500' },
      { name: 'Industrial Site Fire', percentage: 3, icon: Factory, color: 'bg-red-500 text-red-500' },
      { name: 'Other / Unknown', percentage: 1, icon: Question, color: 'bg-gray-400 text-gray-400' },
    ],
    explanationTitle: 'Why Persistent Thermal Source?',
    reasons: [
      'Multi-year FIRMS database matches persistent anomaly for 312 out of 365 satellite overpasses at these coordinates.',
      'OpenStreetMap confirms heavy metallurgy boundary (SAIL Bhilai Steel Plant furnace shop).',
      'Extremely high brightness temperature (> 800 K) with steady radiance without smoke canopy growth.',
      'NSA WorldCover marks 100% man-made impervious surface with zero vegetative index.',
      'Classified as non-emergency operational thermal hotspot; alerts suppressed to prevent false alarms.',
    ],
    spectralBefore: 'M 20 150 Q 80 145 130 115 T 200 80 T 260 70 T 320 85 T 400 115 T 450 135',
    spectralAfter: 'M 20 140 Q 80 130 130 95 T 200 60 T 260 30 T 320 25 T 400 45 T 450 75',
    beforeImg: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    afterImg: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
    aiInsight:
      'Persistent thermal signature verified as legitimate metallurgical furnace heat emission. No uncontrolled fire detected. Model has filtered out this location from emergency response dispatch queues.',
  },
  {
    id: 'IND-03',
    name: 'Post-Harvest Crop Residue Stubble Burning',
    location: 'Sangrur Agricultural Belt',
    state: 'Punjab',
    coordinates: '30.2458° N, 75.8421° E',
    timestamp: '9 Sep 2025, 08:30 AM',
    predictedType: 'Agricultural Fire',
    confidence: 93,
    severity: 'High',
    severityColor: 'text-red-600 bg-red-50 border-red-200',
    frp: '95.4 MW',
    burntArea: '142 hectares',
    temperature: '~ 620 K (347 °C)',
    detectionSource: 'NASA FIRMS (VIIRS 375m)',
    spreadDirection: 'North-East along wind gradient (18 km/h)',
    osmLandUse: 'landuse=farmland (Paddy Crop Fields)',
    nsaWorldCover: 'Cropland (Class 40)',
    ndviDelta: '-0.46 (Substantial crop biomass drop)',
    persistenceIndex: 0.12,
    classes: [
      { name: 'Agricultural Fire', percentage: 93, icon: Plant, color: 'bg-emerald-500 text-emerald-500' },
      { name: 'Forest / Wildfire', percentage: 4, icon: Tree, color: 'bg-blue-500 text-blue-500' },
      { name: 'Industrial Fire', percentage: 2, icon: Factory, color: 'bg-red-500 text-red-500' },
      { name: 'Persistent Thermal', percentage: 1, icon: Sparkle, color: 'bg-amber-500 text-amber-500' },
    ],
    explanationTitle: 'Why Agricultural Fire?',
    reasons: [
      'NSA/ESA WorldCover 10m verifies 100% Cropland coverage (Class 40).',
      'OpenStreetMap confirms absence of any industrial facilities or urban zoning within a 7 km radius.',
      'Significant pre- and post-fire NDVI drop from 0.62 to 0.16 confirms open-field vegetation destruction.',
      'Low multi-temporal persistence score (0.12) fits seasonal post-harvest stubble clearance pattern.',
      'Moderate FRP with widespread linear thermal tracks following field plot borders.',
    ],
    spectralBefore: 'M 20 170 Q 70 160 120 140 T 180 90 T 240 50 T 320 80 T 400 130 T 450 160',
    spectralAfter: 'M 20 165 Q 70 150 120 130 T 180 110 T 240 95 T 320 85 T 400 100 T 450 120',
    beforeImg: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    afterImg: 'https://images.unsplash.com/photo-1498429089284-41f8cf3ffd39?auto=format&fit=crop&w=800&q=80',
    aiInsight:
      'Field-level stubble fire with active linear progression towards neighboring farmlands. High particulate matter (PM2.5/PM10) dispersion detected along wind trajectory.',
  },
  {
    id: 'IND-04',
    name: 'Dense Deciduous Biosphere Reserve Canopy Fire',
    location: 'Similipal Biosphere Reserve',
    state: 'Odisha',
    coordinates: '21.8542° N, 86.3421° E',
    timestamp: '9 Sep 2025, 07:15 AM',
    predictedType: 'Forest Fire',
    confidence: 91,
    severity: 'Critical',
    severityColor: 'text-red-700 bg-red-100 border-red-300',
    frp: '312.0 MW',
    burntArea: '480 hectares',
    temperature: '~ 780 K (507 °C)',
    detectionSource: 'NASA FIRMS (VIIRS + MODIS Combined)',
    spreadDirection: 'South-East along ridge topography',
    osmLandUse: 'boundary=national_park / natural=wood',
    nsaWorldCover: 'Tree Cover (Class 10 - Dense Forest)',
    ndviDelta: '-0.58 (Massive forest canopy loss)',
    persistenceIndex: 0.05,
    classes: [
      { name: 'Forest Fire', percentage: 91, icon: Tree, color: 'bg-emerald-600 text-emerald-600' },
      { name: 'Other Biomass Fire', percentage: 5, icon: Plant, color: 'bg-amber-500 text-amber-500' },
      { name: 'Industrial Fire', percentage: 2, icon: Factory, color: 'bg-red-500 text-red-500' },
      { name: 'Persistent Thermal', percentage: 2, icon: Sparkle, color: 'bg-blue-500 text-blue-500' },
    ],
    explanationTitle: 'Why Forest / Wildfire?',
    reasons: [
      'NSA WorldCover 10m maps territory as Class 10 (Protected Evergreen & Deciduous Forest Cover).',
      'OpenStreetMap identifies area strictly inside National Park / Tiger Reserve wilderness.',
      'Extremely high FRP (> 300 MW) indicating high crown fuel load combustion.',
      'Massive NDVI plummet from 0.78 to 0.20 over 48 hours.',
      'Rapid radial wildfire propagation driven by forest slope and wind drafts.',
    ],
    spectralBefore: 'M 20 180 Q 70 170 120 150 T 180 80 T 240 40 T 310 70 T 390 120 T 450 150',
    spectralAfter: 'M 20 160 Q 70 145 120 120 T 180 110 T 240 100 T 310 75 T 390 60 T 450 85',
    beforeImg: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    afterImg: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
    aiInsight:
      'High-velocity wild canopy fire advancing through dense forest terrain. Immediate forest department ground intervention and airborne retardant deployment recommended.',
  },
];

export default function Analytics({ onNavigate }: AnalyticsProps) {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('IND-01');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 to 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Live PostgreSQL verified prediction statistics
  const [predStats, setPredStats] = useState<PredictionStats | null>(null);

  React.useEffect(() => {
    fetchPredictionStats()
      .then((stats) => setPredStats(stats))
      .catch((err) => console.warn('Failed to load prediction stats:', err));
  }, []);

  const incident = INCIDENTS.find((inc) => inc.id === selectedIncidentId) || INCIDENTS[0];

  // Mouse & Touch events for interactive Before/After comparison slider
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleSliderMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) handleSliderMove(e.touches[0].clientX);
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-[#f8fafc] text-gray-900 font-sans select-none"
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* ═══════════════════════ UNIFIED HEADER ═══════════════════════ */}
      <Header activePage="Analytics" onNavigate={onNavigate} />

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <main className="flex-1 px-8 py-5 flex flex-col gap-5 max-w-[1700px] w-full mx-auto">
        {/* ─── Top Header & Incident Switcher Bar ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
                Fire Analysis
              </h1>
              {predStats && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[11px] font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Database size={13} weight="fill" className="text-emerald-600" />
                  <span>{predStats.totalPredictions} Verified DB Predictions ({predStats.avgConfidence}% Avg Conf)</span>
                </div>
              )}
            </div>
            <p className="text-[13px] text-gray-500 mt-1.5 font-medium">
              AI-powered classification distinguishing industrial facility fires, persistent thermal anomalies, and biomass fires
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Incident Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 h-[38px] px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-800 shadow-2xs transition-colors cursor-pointer"
              >
                <Factory size={16} className="text-orange-500" weight="fill" />
                <span className="font-bold max-w-[200px] truncate">{incident.name}</span>
                <span className="text-[11px] text-gray-400 font-normal">({incident.state})</span>
                <CaretDown size={13} weight="bold" className="text-gray-400" />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-[380px] bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in">
                    <div className="px-3.5 pb-2 border-b border-gray-100">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Select Incident Case Study
                      </p>
                    </div>
                  <div className="divide-y divide-gray-50 max-h-[340px] overflow-y-auto">
                    {INCIDENTS.map((inc) => (
                      <button
                        key={inc.id}
                        onClick={() => {
                          setSelectedIncidentId(inc.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-[12.5px] hover:bg-orange-50/70 transition-colors flex items-start gap-2.5 ${
                          selectedIncidentId === inc.id ? 'bg-orange-50/50 font-bold' : ''
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {inc.predictedType === 'Industrial Site Fire' ? (
                            <Factory size={16} className="text-red-500" weight="fill" />
                          ) : inc.predictedType === 'Persistent Thermal Source' ? (
                            <Sparkle size={16} className="text-amber-500" weight="fill" />
                          ) : inc.predictedType === 'Agricultural Fire' ? (
                            <Plant size={16} className="text-emerald-500" weight="fill" />
                          ) : (
                            <Tree size={16} className="text-emerald-600" weight="fill" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate leading-tight">{inc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                            <span className="truncate">{inc.location}</span>
                            <span>•</span>
                            <span className="text-orange-600 font-semibold">{inc.predictedType}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

            {/* Date Time Badge */}
            <div className="hidden sm:flex items-center gap-2 h-[38px] px-3.5 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-gray-600 shadow-2xs">
              <Clock size={15} className="text-gray-400" />
              <span>Tue, 9 Sep 2025 10:24 AM (IST)</span>
            </div>

            
          </div>
        </div>

        {/* ─── Top 4 Metric KPI Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Classification Confidence */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Crosshair size={26} weight="bold" />
            </div>
            <div className="min-w-0">
              <p className="text-[26px] font-black text-gray-900 leading-none">
                {incident.confidence}%
              </p>
              <p className="text-[12px] font-semibold text-gray-500 mt-1">
                Classification Confidence
              </p>
            </div>
          </div>

          {/* Card 2: Predicted Type */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Factory size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[20px] font-black text-gray-900 leading-tight truncate">
                {incident.predictedType}
              </p>
              <p className="text-[12px] font-semibold text-gray-500 mt-0.5">
                Predicted Type
              </p>
            </div>
          </div>

          {/* Card 3: Severity Level */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Fire size={26} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[24px] font-black text-gray-900 leading-none">
                {incident.severity}
              </p>
              <p className="text-[12px] font-semibold text-gray-500 mt-1">
                Severity Level
              </p>
            </div>
          </div>

          {/* Card 4: Detection Time */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Clock size={26} weight="bold" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-black text-gray-900 leading-tight">
                {incident.timestamp}
              </p>
              <p className="text-[12px] font-semibold text-gray-500 mt-0.5">
                Detection Time
              </p>
            </div>
          </div>
        </div>

        {/* ─── Middle 3-Column Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ══════════ LEFT (5 Cols): SATELLITE IMAGE ANALYSIS WITH SLIDER ══════════ */}
          <div className="lg:col-span-5 bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900">
                <ArrowsLeftRight size={17} weight="bold" className="text-orange-500" />
                <span className="text-[13.5px] font-bold">Satellite Image Analysis</span>
              </div>
              <span className="text-[11px] font-semibold text-gray-400">
                Sentinel-2 &amp; VIIRS Overlay
              </span>
            </div>

            {/* Interactive Before/After Split Viewport */}
            <div
              ref={sliderContainerRef}
              onMouseDown={handleMouseDown}
              onTouchMove={handleTouchMove}
              className="relative flex-1 min-h-[320px] bg-slate-900 overflow-hidden cursor-ew-resize group select-none"
            >
              {/* Layer 1: AFTER FIRE (Thermal Infrared Anomaly) */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${incident.afterImg})` }}
              >
                {/* Thermal Anomaly Glow Simulation */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/60 via-red-900/40 to-transparent mix-blend-color-dodge" />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* Layer 2: BEFORE FIRE (True Color Baseline), clipped to slider position */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${incident.beforeImg})`,
                  clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-black/10" />
              </div>

              {/* Floating Labels */}
              {/* True Color (Before) Tag on the left */}
              <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-sm border border-white/20 rounded-md px-2.5 py-1 text-[11px] font-bold text-white shadow-md pointer-events-none">
                <p>True Color (Baseline)</p>
                <p className="text-[9.5px] text-gray-300 font-normal">8 Sep 2025 • High Res</p>
              </div>

              {/* Thermal (After) Tag on the right */}
              <div className="absolute top-3 right-3 z-10 bg-red-950/80 backdrop-blur-sm border border-red-400/40 rounded-md px-2.5 py-1 text-[11px] font-bold text-red-200 shadow-md pointer-events-none text-right">
                <p>Thermal Anomaly</p>
                <p className="text-[9.5px] text-red-300 font-normal">9 Sep 2025 • FIRMS VIIRS</p>
              </div>

              {/* Center Site Pin Indicator */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-black/80 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1.5 pointer-events-none shadow-lg">
                <MapPin size={13} weight="fill" className="text-orange-400" />
                <span>{incident.location}</span>
              </div>

              {/* Scale Indicator */}
              <div className="absolute bottom-3 left-3 z-10 text-[11px] font-semibold text-white/90 drop-shadow flex items-center gap-1.5 pointer-events-none">
                <span className="w-10 h-[2px] bg-white inline-block shadow-sm" />
                <span>2 km</span>
              </div>

              {/* OSM Boundary Indicator Tag */}
              <div className="absolute bottom-3 right-3 z-10 bg-blue-900/80 backdrop-blur-sm border border-blue-400/30 rounded px-2 py-0.5 text-[10px] font-semibold text-blue-200 pointer-events-none">
                OSM Industrial Overlay: Active
              </div>

              {/* Draggable Vertical Divider Handle */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] z-20 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white text-gray-800 rounded-full shadow-xl flex items-center justify-center border border-gray-200 pointer-events-auto cursor-ew-resize hover:scale-110 transition-transform">
                  <ArrowsLeftRight size={14} weight="bold" />
                </div>
              </div>
            </div>

            {/* Slider Explanation helper */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11.5px] text-gray-500 font-medium">
              <span>Drag slider to compare baseline satellite view vs thermal infrared anomaly</span>
              <span className="text-orange-600 font-semibold">{sliderPosition}% Split</span>
            </div>
          </div>

          {/* ══════════ CENTER (4 Cols): AI CLASSIFICATION RESULTS ══════════ */}
          <div className="lg:col-span-4 bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-gray-100">
                <div className="w-6 h-6 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkle size={15} weight="fill" />
                </div>
                <h3 className="text-[14px] font-bold text-gray-900">
                  AI Classification Results
                </h3>
              </div>

              {/* Probability Bars */}
              <div className="space-y-3 mb-4">
                {incident.classes.map((cls, idx) => {
                  const Icon = cls.icon;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <div className="flex items-center gap-2 text-gray-800 font-semibold">
                          <Icon size={16} weight="fill" className={cls.color.split(' ')[1]} />
                          <span>{cls.name}</span>
                        </div>
                        <span className="font-extrabold text-gray-900 text-[13px]">
                          {cls.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${cls.color.split(' ')[0]}`}
                          style={{ width: `${cls.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explainability Card: "Why This Class?" */}
              <div className="bg-[#fffbeb] border border-amber-200/80 rounded-xl p-3.5 mt-2">
                <div className="flex items-center gap-1.5 text-amber-900 mb-2">
                  <Lightbulb size={16} weight="fill" className="text-amber-600" />
                  <span className="text-[12.5px] font-bold">{incident.explanationTitle}</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-amber-950/85 leading-tight">
                  {incident.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>Model: AstraDeep-v2.4 Multimodal</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle size={13} weight="fill" /> Verified
              </span>
            </div>
          </div>

          {/* ══════════ RIGHT (3 Cols): FIRE CHARACTERISTICS ══════════ */}
          <div className="lg:col-span-3 bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-gray-100">
                <ChartLineUp size={16} weight="bold" className="text-gray-700" />
                <h3 className="text-[14px] font-bold text-gray-900">
                  Fire Characteristics
                </h3>
              </div>

              <div className="space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Fire Radiative Power (FRP)</span>
                  <span className="font-bold text-gray-900">{incident.frp}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Burnt Footprint (Est.)</span>
                  <span className="font-bold text-gray-900">{incident.burntArea}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Temperature (Hotspot)</span>
                  <span className="font-bold text-red-600">{incident.temperature}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Detection Source</span>
                  <span className="font-bold text-gray-800 text-right">{incident.detectionSource}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Spread Vector</span>
                  <span className="font-semibold text-gray-800 text-right truncate max-w-[150px]">
                    {incident.spreadDirection}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-50">
                  <span className="text-gray-500">OSM Land Use</span>
                  <span className="font-mono text-[11px] font-semibold text-blue-600 text-right truncate max-w-[150px]">
                    {incident.osmLandUse}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-50">
                  <span className="text-gray-500">NSA WorldCover</span>
                  <span className="font-semibold text-gray-800 text-right truncate max-w-[150px]">
                    {incident.nsaWorldCover}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">NDVI Biomass Delta</span>
                  <span className="font-bold text-emerald-700">{incident.ndviDelta}</span>
                </div>
              </div>
            </div>

            {/* Persistence Index Gauge */}
            <div className="mt-4 pt-3 border-t border-gray-100 bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[11.5px] font-semibold text-gray-700 mb-1">
                <span>Thermal Persistence Index</span>
                <span className="text-orange-600 font-extrabold">{incident.persistenceIndex * 100}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${incident.persistenceIndex * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Measured from 365-day NASA FIRMS historical recurrence
              </p>
            </div>
          </div>
        </div>

        {/* ─── Lower 3-Column Grid: Spectral Analysis, NDVI, Supporting Data ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ══════════ LEFT (4 Cols): SPECTRAL ANALYSIS CHART ══════════ */}
          <div className="lg:col-span-4 bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ChartLineUp size={16} weight="bold" className="text-blue-600" />
                  <h3 className="text-[13.5px] font-bold text-gray-900">
                    Spectral Analysis
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2 h-2 rounded-full bg-blue-600" /> Before Event
                  </span>
                  <span className="flex items-center gap-1.5 text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Thermal Anomaly
                  </span>
                </div>
              </div>

              {/* Spectral Reflectance Curve (SVG) */}
              <div className="relative pt-1 pb-1">
                <svg viewBox="0 0 470 190" className="w-full h-[155px] overflow-visible">
                  {/* Grid lines */}
                  {[35, 75, 115, 155].map((yVal, i) => (
                    <line
                      key={i}
                      x1="30"
                      y1={yVal}
                      x2="460"
                      y2={yVal}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Y Axis Labels (Reflectance) */}
                  <text x="5" y="40" fontSize="10" fill="#94a3b8">0.8</text>
                  <text x="5" y="80" fontSize="10" fill="#94a3b8">0.6</text>
                  <text x="5" y="120" fontSize="10" fill="#94a3b8">0.4</text>
                  <text x="5" y="158" fontSize="10" fill="#94a3b8">0.2</text>
                  <text x="12" y="178" fontSize="10" fill="#94a3b8">0.0</text>

                  {/* Blue curve: Before Fire baseline */}
                  <path
                    d={incident.spectralBefore}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.2"
                  />

                  {/* Red curve: After Fire thermal emission */}
                  <path
                    d={incident.spectralAfter}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.2"
                  />

                  {/* X Axis Points (Wavelength µm) */}
                  {[
                    { label: '0.5', x: 40 },
                    { label: '1.0', x: 130 },
                    { label: '1.5', x: 220 },
                    { label: '2.0', x: 330 },
                    { label: '2.5', x: 430 },
                  ].map((p, idx) => (
                    <text
                      key={idx}
                      x={p.x}
                      y="185"
                      fontSize="10"
                      fill="#94a3b8"
                      textAnchor="middle"
                    >
                      {p.label}
                    </text>
                  ))}
                </svg>

                <div className="text-center text-[10.5px] text-gray-400 font-medium mt-1">
                  Wavelength (µm) • Characteristic SWIR / TIR thermal elevation
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mt-2 bg-gray-50 p-2 rounded">
              High SWIR (1.6 - 2.2 µm) infrared radiation verifies heat emission directly on industrial surfaces without vegetation smoke scattering.
            </p>
          </div>

          {/* ══════════ CENTER (4 Cols): NDVI CHANGE / WORLDCOVER ══════════ */}
          <div className="lg:col-span-4 bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Plant size={16} weight="bold" className="text-emerald-600" />
                  <h3 className="text-[13.5px] font-bold text-gray-900">
                    NDVI &amp; Land Cover Integrity
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-gray-400">NSA WorldCover</span>
              </div>

              {/* Side-by-side comparative NDVI raster mockups */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Before Fire */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold text-gray-600 mb-1.5">
                    Before Event
                  </span>
                  <div className="relative w-full h-[120px] rounded-lg overflow-hidden border border-gray-200 shadow-2xs bg-emerald-700/80 flex items-center justify-center p-2">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-lime-800 opacity-90" />
                    <span className="relative text-[11px] font-bold text-white drop-shadow">
                      Stable NDVI
                    </span>
                    {/* Scale bar */}
                    <div className="absolute right-1 top-1 bottom-1 w-2 rounded bg-gradient-to-b from-emerald-500 via-yellow-400 to-red-500" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 font-semibold">NDVI: 0.64</span>
                </div>

                {/* After Fire */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold text-gray-600 mb-1.5">
                    After Event
                  </span>
                  <div className="relative w-full h-[120px] rounded-lg overflow-hidden border border-gray-200 shadow-2xs bg-slate-800 flex items-center justify-center p-2">
                    {/* Simulated burn / thermal spot */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-amber-700 to-red-700" />
                    <div className="absolute w-8 h-8 rounded-full bg-red-500/80 blur-xs animate-pulse" />
                    <span className="relative text-[11px] font-bold text-white drop-shadow">
                      Thermal Core
                    </span>
                    {/* Scale bar */}
                    <div className="absolute right-1 top-1 bottom-1 w-2 rounded bg-gradient-to-b from-emerald-500 via-yellow-400 to-red-500" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 font-semibold">
                    Delta: {incident.ndviDelta}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-900">
              <span className="font-bold">Biomass Impact:</span> {incident.ndviDelta.includes('No') ? 'Negligible vegetation damage. Event confined to concrete/industrial footprint.' : 'Active vegetative loss detected across canopy.'}
            </div>
          </div>

          {/* ══════════ RIGHT (4 Cols): SUPPORTING DATA & SOURCES ══════════ */}
          <div className="lg:col-span-4 bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Globe size={16} weight="bold" className="text-gray-700" />
                  <h3 className="text-[13.5px] font-bold text-gray-900">
                    Supporting Data &amp; Feeds
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Live Synced
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'NASA FIRMS VIIRS Thermal Bands (375m)', icon: Fire, color: 'text-red-500' },
                  { name: 'MODIS Fire Radiative Anomaly (7-Day)', icon: Sparkle, color: 'text-amber-500' },
                  { name: 'NSA / ESA WorldCover (10m Land Cover)', icon: Globe, color: 'text-blue-500' },
                  { name: 'OpenStreetMap (OSM) Industrial Polygons', icon: Buildings, color: 'text-purple-500' },
                  { name: 'Sentinel-2 SWIR Reflectance Indices', icon: ChartLineUp, color: 'text-emerald-500' },
                  { name: 'ECMWF Atmospheric Dispersion Data', icon: Info, color: 'text-gray-500' },
                ].map((feed, idx) => {
                  const Icon = feed.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11.5px] p-1.5 hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 text-gray-700 min-w-0">
                        <Icon size={14} weight="fill" className={`shrink-0 ${feed.color}`} />
                        <span className="truncate font-medium">{feed.name}</span>
                      </div>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-orange-600 font-semibold shrink-0 cursor-pointer transition-colors">
                        <DownloadSimple size={13} weight="bold" />
                        <span>Data</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 pt-2 text-[10.5px] text-gray-400 border-t border-gray-100 flex items-center justify-between">
              <span>Updated automatically every 15 min</span>
              <span className="font-semibold text-gray-600">GeoJSON &amp; NetCDF4</span>
            </div>
          </div>
        </div>

        {/* ─── Bottom AI Insights & Action Banner ─── */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Lightbulb size={20} weight="fill" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">
                AI Classification Insights &amp; Operational Verdict
              </p>
              <p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed max-w-4xl">
                {incident.aiInsight}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => onNavigate && onNavigate('Live Map')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              <MapPin size={15} weight="fill" />
              <span>Locate on Live Map</span>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('Predictive Analysis')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-5 bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <span>View Risk Prediction</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}