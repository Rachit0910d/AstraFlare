import { useState } from 'react';
import {
  Fire,
  Tree,
  Warning,
  Planet,
  DownloadSimple,
  CalendarBlank,
  CaretDown,
  ArrowRight,
  ArrowLeft,
  ShareNetwork,
  FilePdf,
  FileX,
  FileArchive,
  CheckCircle,
  Sparkle,
  ChartBar,
  ShieldCheck,
  Plant,
  Printer,
  Check,
} from '@phosphor-icons/react';
import Header from '../components/Header';

interface ReportProps {
  onNavigate?: (page: string) => void;
}

// ─── Incidents Data ───────────────────────────────────────────────────────────
interface IncidentReport {
  id: string;
  reportId: string;
  title: string;
  location: string;
  districts: string;
  state: string;
  firstDetected: string;
  generatedOn: string;
  affectedArea: string;
  affectedAreaNum: number;
  maxConfidence: number;
  status: 'Active' | 'Monitoring' | 'Contained';
  statusColor: string;
  summary: string;
  districtsCount: number;
  increaseRate: string;
  detections: {
    time: string;
    sensor: string;
    frp: string;
    temp: string;
    coords: string;
    confidence: number;
  }[];
  landCover: {
    type: string;
    percentage: number;
    area: string;
    color: string;
  }[];
  actions: {
    title: string;
    desc: string;
    status: 'Completed' | 'In Progress' | 'Pending';
  }[];
}

const INCIDENTS_DATA: IncidentReport[] = [
  {
    id: 'inc-1',
    reportId: 'REP-2025-001',
    title: 'Assam Forest Fire Report',
    location: 'Dibrugarh',
    districts: 'Dibrugarh, Tinsukia and Sivasagar Districts',
    state: 'Assam',
    firstDetected: '9 Sep 2025, 10:18 AM',
    generatedOn: '9 Sep 2025, 11:42 AM',
    affectedArea: '4,200 ha',
    affectedAreaNum: 4200,
    maxConfidence: 87,
    status: 'Active',
    statusColor: 'bg-red-50 text-red-600 border border-red-200',
    summary:
      'Multiple fire hotspots detected across Dibrugarh, Tinsukia and Sivasagar districts. Estimated affected area is ~ 4,200 ha with high risk of further spread due to dry vegetation and human activities.',
    districtsCount: 3,
    increaseRate: '+65%',
    detections: [
      { time: '9 Sep, 10:18 AM', sensor: 'VIIRS (375m)', frp: '142.5 MW', temp: '685 K', coords: '27.47° N, 94.91° E', confidence: 87 },
      { time: '9 Sep, 09:42 AM', sensor: 'VIIRS (375m)', frp: '98.0 MW', temp: '640 K', coords: '27.49° N, 95.34° E', confidence: 82 },
      { time: '9 Sep, 06:28 AM', sensor: 'MODIS (1km)', frp: '74.2 MW', temp: '612 K', coords: '26.98° N, 94.64° E', confidence: 76 },
      { time: '8 Sep, 11:15 PM', sensor: 'VIIRS (375m)', frp: '52.1 MW', temp: '580 K', coords: '27.45° N, 94.92° E', confidence: 71 },
    ],
    landCover: [
      { type: 'Dense Tree Canopy (NSA WorldCover)', percentage: 58, area: '2,436 ha', color: 'bg-emerald-600' },
      { type: 'Shrubland & Buffer Zone', percentage: 24, area: '1,008 ha', color: 'bg-amber-500' },
      { type: 'Agricultural Fringe (OSM)', percentage: 12, area: '504 ha', color: 'bg-yellow-500' },
      { type: 'Settlement Perimeter', percentage: 6, area: '252 ha', color: 'bg-red-500' },
    ],
    actions: [
      { title: 'Airborne Water Drop Coordinates Dispatched', desc: 'State Disaster Response Force (SDRF) notified with GPS vector grid.', status: 'Completed' },
      { title: 'Evacuation Pre-alert for 3 Fringe Settlements', desc: 'Naharkatiya and Chabua perimeter alerted via civic siren telemetry.', status: 'In Progress' },
      { title: 'Continuous Sentinel-2 SWIR Overpass Tracking', desc: 'Next scheduled infrared scene ingest at 14:20 IST.', status: 'In Progress' },
    ],
  },
  {
    id: 'inc-2',
    reportId: 'REP-2025-002',
    title: 'Tinsukia Rural Fringe Hotspot Analysis',
    location: 'Tinsukia',
    districts: 'Tinsukia & Margherita Forest Belts',
    state: 'Assam',
    firstDetected: '9 Sep 2025, 09:42 AM',
    generatedOn: '9 Sep 2025, 11:15 AM',
    affectedArea: '3,100 ha',
    affectedAreaNum: 3100,
    maxConfidence: 72,
    status: 'Active',
    statusColor: 'bg-red-50 text-red-600 border border-red-200',
    summary:
      'Thermal anomalies spreading east along the Brahmaputra tributary forest belt. MODIS and VIIRS confirm moderate smoke canopy dispersion with high particulate concentration.',
    districtsCount: 2,
    increaseRate: '+48%',
    detections: [
      { time: '9 Sep, 09:42 AM', sensor: 'VIIRS (375m)', frp: '112.4 MW', temp: '645 K', coords: '27.52° N, 95.38° E', confidence: 72 },
      { time: '9 Sep, 06:10 AM', sensor: 'MODIS (1km)', frp: '68.0 MW', temp: '605 K', coords: '27.48° N, 95.31° E', confidence: 68 },
    ],
    landCover: [
      { type: 'Secondary Forest Cover', percentage: 65, area: '2,015 ha', color: 'bg-emerald-600' },
      { type: 'Grassland & Bamboo Groves', percentage: 25, area: '775 ha', color: 'bg-amber-500' },
      { type: 'Rural Farmland Fringe', percentage: 10, area: '310 ha', color: 'bg-yellow-500' },
    ],
    actions: [
      { title: 'Ground Firebreak Creation in Progress', desc: 'Forest department bulldozers clearing combustible brush lines.', status: 'In Progress' },
      { title: 'Health Advisory for Particulate Exposure', desc: 'AQI warnings broadcast to local administrative panchayats.', status: 'Completed' },
    ],
  },
  {
    id: 'inc-3',
    reportId: 'REP-2025-003',
    title: 'Korba Industrial & Coal Mining Thermal Anomaly',
    location: 'Korba',
    districts: 'Korba Energy Basin & Katghora',
    state: 'Chhattisgarh',
    firstDetected: '9 Sep 2025, 08:15 AM',
    generatedOn: '9 Sep 2025, 10:30 AM',
    affectedArea: '2,800 ha',
    affectedAreaNum: 2800,
    maxConfidence: 81,
    status: 'Monitoring',
    statusColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    summary:
      'Persistent industrial thermal emissions cross-referenced with open-cast coal storage piles. Moderate fire radiative power detected inside OSM industrial polygon.',
    districtsCount: 2,
    increaseRate: '+15%',
    detections: [
      { time: '9 Sep, 08:15 AM', sensor: 'VIIRS (375m)', frp: '185.0 MW', temp: '715 K', coords: '22.35° N, 82.68° E', confidence: 81 },
      { time: '8 Sep, 02:40 PM', sensor: 'VIIRS (375m)', frp: '160.2 MW', temp: '690 K', coords: '22.36° N, 82.70° E', confidence: 79 },
    ],
    landCover: [
      { type: 'Industrial Mining & Waste Dumps (OSM)', percentage: 70, area: '1,960 ha', color: 'bg-slate-700' },
      { type: 'Scrub & Bare Land', percentage: 20, area: '560 ha', color: 'bg-amber-600' },
      { type: 'Dry Deciduous Buffer', percentage: 10, area: '280 ha', color: 'bg-emerald-600' },
    ],
    actions: [
      { title: 'Automated Industrial Flare Filter Applied', desc: 'Classification model verified known thermal recurrence score of 0.96.', status: 'Completed' },
      { title: 'Thermal Camera Telemetry Ingestion', desc: 'Industrial facility on-site sensors linked to live dashboard.', status: 'In Progress' },
    ],
  },
  {
    id: 'inc-4',
    reportId: 'REP-2025-004',
    title: 'Sivasagar Historical Buffer Zone Containment',
    location: 'Sivasagar',
    districts: 'Sivasagar & Nazira Forest Range',
    state: 'Assam',
    firstDetected: '9 Sep 2025, 06:28 AM',
    generatedOn: '9 Sep 2025, 09:40 AM',
    affectedArea: '1,950 ha',
    affectedAreaNum: 1950,
    maxConfidence: 65,
    status: 'Contained',
    statusColor: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    summary:
      'Fire perimeter successfully contained after joint deployment of forest rangers and local civic defense. Residual thermal embers remain under continuous satellite surveillance.',
    districtsCount: 1,
    increaseRate: '-32%',
    detections: [
      { time: '9 Sep, 06:28 AM', sensor: 'MODIS (1km)', frp: '42.0 MW', temp: '540 K', coords: '26.98° N, 94.64° E', confidence: 65 },
    ],
    landCover: [
      { type: 'Regenerating Forest Cover', percentage: 80, area: '1,560 ha', color: 'bg-emerald-600' },
      { type: 'Tea Garden Fringe', percentage: 20, area: '390 ha', color: 'bg-lime-600' },
    ],
    actions: [
      { title: 'Containment Line Confirmed by Sentinel-2', desc: 'Zero thermal resurgence detected during 10:00 AM overpass.', status: 'Completed' },
      { title: 'Post-Fire Damage Assessment Report', desc: 'NDVI delta compilation initiated for state forestry ministry.', status: 'Completed' },
    ],
  },
  {
    id: 'inc-5',
    reportId: 'REP-2025-005',
    title: 'Singrauli Thermal Basin & Super Thermal Plant',
    location: 'Singrauli',
    districts: 'Singrauli & Waidhan Belt',
    state: 'Madhya Pradesh',
    firstDetected: '9 Sep 2025, 05:11 AM',
    generatedOn: '9 Sep 2025, 08:20 AM',
    affectedArea: '1,620 ha',
    affectedAreaNum: 1620,
    maxConfidence: 68,
    status: 'Monitoring',
    statusColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    summary:
      'Controlled power generation thermal discharge verified. AI classification filters persistent industrial heat emissions from rural biomass fire alerts.',
    districtsCount: 1,
    increaseRate: '+8%',
    detections: [
      { time: '9 Sep, 05:11 AM', sensor: 'VIIRS (375m)', frp: '155.4 MW', temp: '702 K', coords: '24.19° N, 82.66° E', confidence: 68 },
    ],
    landCover: [
      { type: 'Power Generation Complex (OSM)', percentage: 75, area: '1,215 ha', color: 'bg-slate-700' },
      { type: 'Reservoir Fringe', percentage: 25, area: '405 ha', color: 'bg-blue-600' },
    ],
    actions: [
      { title: 'Persistent Anomaly Flag Active', desc: 'No wildfire suppression units required.', status: 'Completed' },
    ],
  },
];

// ─── Downloadable Reports List ────────────────────────────────────────────────
const DOWNLOADABLE_REPORTS = [
  {
    id: 'dl-1',
    title: 'Fire Activity Report',
    format: 'PDF',
    size: '2.4 MB',
    icon: FilePdf,
    iconColor: 'bg-red-50 text-red-600 border border-red-200',
    btnText: 'Download',
    incidentId: 'inc-1',
  },
  {
    id: 'dl-2',
    title: 'Affected Area Report',
    format: 'XLSX',
    size: '1.1 MB',
    icon: FileX,
    iconColor: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    btnText: 'Download',
    incidentId: 'inc-2',
  },
  {
    id: 'dl-3',
    title: 'Risk Analysis Report',
    format: 'PDF',
    size: '1.8 MB',
    icon: FilePdf,
    iconColor: 'bg-blue-50 text-blue-600 border border-blue-200',
    btnText: 'Download',
    incidentId: 'inc-3',
  },
  {
    id: 'dl-4',
    title: 'Incident Maps & Geodata',
    format: 'ZIP',
    size: '12.6 MB',
    icon: FileArchive,
    iconColor: 'bg-purple-50 text-purple-600 border border-purple-200',
    btnText: 'Download',
    incidentId: 'inc-1',
  },
];

// ─── Trend Data for SVG Chart ─────────────────────────────────────────────────
const TREND_DATA = [
  { day: '1 Sep', viirs: 300, modis: 220, total: 520, x: 30 },
  { day: '2 Sep', viirs: 410, modis: 280, total: 690, x: 80 },
  { day: '3 Sep', viirs: 520, modis: 310, total: 830, x: 130 },
  { day: '4 Sep', viirs: 580, modis: 360, total: 940, x: 180 },
  { day: '5 Sep', viirs: 620, modis: 400, total: 1020, x: 230 },
  { day: '6 Sep', viirs: 820, modis: 540, total: 1360, x: 280 },
  { day: '7 Sep', viirs: 1010, modis: 580, total: 1590, x: 330 },
  { day: '8 Sep', viirs: 1180, modis: 620, total: 1800, x: 380 },
  { day: '9 Sep', viirs: 1040, modis: 510, total: 1550, x: 430 },
];

export default function Report({ onNavigate }: ReportProps) {
  // Navigation between Main Dashboard and Report Preview
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [dateRange] = useState('1 Sep 2025 – 9 Sep 2025');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(7); // 8 Sep selected by default
  const [copiedLink, setCopiedLink] = useState(false);

  // Handle opening a specific report preview
  const handleOpenReport = (incident: IncidentReport) => {
    setSelectedIncident(incident);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle returning back to reports list
  const handleBackToDashboard = () => {
    setSelectedIncident(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadExcel = () => {
    if (!selectedIncident) return;
    const rows = [
      ['Report ID', selectedIncident.reportId],
      ['Title', `"${selectedIncident.title}"`],
      ['Location', `"${selectedIncident.location}"`],
      ['Districts', `"${selectedIncident.districts}"`],
      ['State', `"${selectedIncident.state}"`],
      ['Affected Area', `"${selectedIncident.affectedArea}"`],
      ['Status', selectedIncident.status],
      ['Generated On', selectedIncident.generatedOn],
      [],
      ['Detection Time', 'Sensor', 'FRP', 'Temperature', 'Coordinates', 'Confidence %'],
      ...selectedIncident.detections.map((d) => [
        `"${d.time}"`,
        `"${d.sensor}"`,
        `"${d.frp}"`,
        `"${d.temp}"`,
        `"${d.coords}"`,
        d.confidence,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `${selectedIncident.reportId}_analysis.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* ═══════════════════════ UNIFIED HEADER ═══════════════════════ */}
      <Header activePage="Report" onNavigate={onNavigate} />

      {/* ═══════════════════════ MAIN CONTENT BODY ═══════════════════════ */}
      <main className="flex-1 px-8 py-5 flex flex-col gap-5 max-w-[1700px] w-full mx-auto">
        {selectedIncident ? (
          /* ═══════════════════════════════════════════════════════════════════════
             VIEW 2: REPORT PREVIEW / DETAILS PAGE (Matching Item 21 in Image 2)
             ═══════════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Top Back & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={15} weight="bold" />
                  <span>Back to Reports</span>
                </button>
                <div>
                  <h1 className="text-[24px] font-black text-gray-900 tracking-tight leading-none">
                    Report Preview
                  </h1>
                  <p className="text-[12.5px] text-gray-400 mt-1 font-medium">
                    Detailed analysis report for selected incident
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[12.5px] font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check size={14} weight="bold" className="text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <ShareNetwork size={15} weight="bold" />
                      <span>Share</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 h-9 px-4 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-[12.5px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <DownloadSimple size={15} weight="bold" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-1.5 h-9 px-4 bg-[#059669] hover:bg-emerald-700 text-white rounded-lg text-[12.5px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <DownloadSimple size={15} weight="bold" />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>

            {/* Document Paper Container */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-8 shadow-xs max-w-5xl mx-auto w-full flex flex-col gap-6">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b border-gray-100 gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 border border-orange-100 shadow-2xs">
                    <Fire size={26} weight="fill" />
                  </div>
                  <div>
                    <h2 className="text-[22px] font-black text-gray-900 tracking-tight">
                      {selectedIncident.title}
                    </h2>
                    <p className="text-[13px] text-gray-500 mt-0.5 font-medium">
                      {selectedIncident.districts}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${selectedIncident.statusColor}`}>
                        {selectedIncident.status}
                      </span>
                      <span className="text-[11.5px] text-gray-400 font-medium">
                        Region: {selectedIncident.state}, India
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right AstraFlare Brand Emblem */}
                <div className="flex items-center gap-2.5 text-right sm:text-right shrink-0">
                  <div className="leading-none">
                    <p className="text-[18px] font-black tracking-tight text-gray-900">
                      Astra <span className="text-orange-500">Flare</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      From Space to a Safer Earth
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm">
                    <Fire size={18} weight="fill" />
                  </div>
                </div>
              </div>

              {/* Metadata Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100 text-[12px]">
                <div>
                  <p className="text-gray-400 font-medium">Report ID</p>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedIncident.reportId}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Generated On</p>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedIncident.generatedOn}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Time Range</p>
                  <p className="font-bold text-gray-900 mt-0.5">1 Sep 2025 – 9 Sep 2025</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Data Sources</p>
                  <p className="font-bold text-orange-600 mt-0.5 truncate">NASA FIRMS, MODIS, OSM, WorldCover</p>
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div>
                <h3 className="text-[15px] font-black text-gray-900 mb-2.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>1. Executive Summary</span>
                </h3>
                <p className="text-[13px] text-gray-600 leading-relaxed font-normal">
                  {selectedIncident.summary} Satellite observations indicate elevated thermal radiative power and potential boundary expansion towards neighboring vegetative and rural parcels. Multi-spectral infrared telemetry has confirmed zero false alarm anomaly.
                </p>

                {/* 4 Summary Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">
                      <Fire size={18} weight="fill" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-gray-900 leading-none">
                        {selectedIncident.maxConfidence}%
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">Avg. Confidence</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Tree size={18} weight="fill" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-gray-900 leading-none">
                        {selectedIncident.affectedArea}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">Affected Area</p>
                    </div>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Plant size={18} weight="fill" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-gray-900 leading-none">
                        {selectedIncident.districtsCount}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">Major Districts</p>
                    </div>
                  </div>

                  <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                      <ChartBar size={18} weight="bold" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-gray-900 leading-none">
                        {selectedIncident.increaseRate}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">Spread (7 days)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Detection History Table */}
              <div>
                <h3 className="text-[15px] font-black text-gray-900 mb-2.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>2. Satellite Thermal Detections Log</span>
                </h3>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-[12px] text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3.5">Overpass Time</th>
                        <th className="py-2.5 px-3.5">Satellite Sensor</th>
                        <th className="py-2.5 px-3.5">FRP (Radiative Power)</th>
                        <th className="py-2.5 px-3.5">Brightness Temp</th>
                        <th className="py-2.5 px-3.5">Coordinates</th>
                        <th className="py-2.5 px-3.5 text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedIncident.detections.map((det, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-3.5 font-bold text-gray-800">{det.time}</td>
                          <td className="py-2.5 px-3.5 text-gray-600">{det.sensor}</td>
                          <td className="py-2.5 px-3.5 font-semibold text-orange-600">{det.frp}</td>
                          <td className="py-2.5 px-3.5 text-gray-700">{det.temp}</td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-gray-500">{det.coords}</td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-gray-900">{det.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Land Cover Impact Breakdown */}
              <div>
                <h3 className="text-[15px] font-black text-gray-900 mb-2.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>3. Geospatial &amp; Land Cover Distribution (NSA WorldCover &amp; OSM)</span>
                </h3>
                <div className="space-y-2.5 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                  {selectedIncident.landCover.map((lc, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-gray-800">{lc.type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{lc.area}</span>
                          <span className="font-bold text-gray-900 w-10 text-right">{lc.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${lc.color}`} style={{ width: `${lc.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Action Directives & Response Status */}
              <div>
                <h3 className="text-[15px] font-black text-gray-900 mb-2.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>4. Recommended Mitigation Actions &amp; Response Directives</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedIncident.actions.map((act, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Directive #{idx + 1}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${act.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {act.status}
                          </span>
                        </div>
                        <p className="text-[12.5px] font-bold text-gray-900 leading-snug">{act.title}</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-normal">{act.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Signature & Verification Footer */}
              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11.5px] text-gray-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
                  <span>Authenticated by AstraFlare Autonomous Satellite Telemetry Grid</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Authorized Signature: <b className="text-gray-700">AstraFlare AI v2.4</b></span>
                  <button onClick={() => window.print()} className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                    <Printer size={14} />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════════
             VIEW 1: MAIN REPORTS DASHBOARD (Matching Image 1)
             ═══════════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-5">
            {/* ─── Page Title Header & Top Selectors ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
                  Reports
                </h1>
                <p className="text-[13px] text-gray-400 mt-1.5 font-medium">
                  Insights, statistics, and downloadable reports for fire monitoring and risk analysis
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Date range picker */}
                <div className="relative">
                  <button
                    onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                    className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <CalendarBlank size={15} className="text-gray-500" />
                    <span>{dateRange}</span>
                    <CaretDown size={12} weight="bold" className="text-gray-400" />
                  </button>

                  {isDateDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDateDropdownOpen(false)} />
                      <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in">
                        {['1 Sep 2025 – 9 Sep 2025', 'Last 7 Days', 'Last 30 Days', 'Custom Range...'].map((range) => (
                          <button
                            key={range}
                            onClick={() => setIsDateDropdownOpen(false)}
                            className="w-full text-left px-3.5 py-2 text-[12px] font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Download Report Action Button */}
                <button
                  onClick={() => handleOpenReport(INCIDENTS_DATA[0])}
                  className="flex items-center gap-2 h-9 px-4 bg-[#2563eb] hover:bg-blue-700 text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <DownloadSimple size={15} weight="bold" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>

            {/* ─── Top 4 Metric KPI Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Detections */}
              <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Fire size={26} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-400 leading-none mb-1">
                    Total Detections
                  </p>
                  <p className="text-[24px] font-black text-gray-900 leading-tight">
                    8,742
                  </p>
                  <p className="text-[11px] font-bold text-emerald-600 leading-none mt-1">
                    ↑ +28% <span className="text-gray-400 font-normal">vs. previous period</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Total Affected Area */}
              <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Tree size={26} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-400 leading-none mb-1">
                    Total Affected Area
                  </p>
                  <p className="text-[24px] font-black text-gray-900 leading-tight">
                    36,850 ha
                  </p>
                  <p className="text-[11px] font-bold text-red-500 leading-none mt-1">
                    ↑ +42% <span className="text-gray-400 font-normal">vs. previous period</span>
                  </p>
                </div>
              </div>

              {/* Card 3: High Risk Incidents */}
              <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Warning size={26} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-400 leading-none mb-1">
                    High Risk Incidents
                  </p>
                  <p className="text-[24px] font-black text-gray-900 leading-tight">
                    58
                  </p>
                  <p className="text-[11px] font-bold text-red-500 leading-none mt-1">
                    ↑ +31% <span className="text-gray-400 font-normal">vs. previous period</span>
                  </p>
                </div>
              </div>

              {/* Card 4: Persistent Sources */}
              <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Planet size={26} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-400 leading-none mb-1">
                    Persistent Sources
                  </p>
                  <p className="text-[24px] font-black text-gray-900 leading-tight">
                    214
                  </p>
                  <p className="text-[11px] font-bold text-blue-600 leading-none mt-1">
                    ↑ +12% <span className="text-gray-400 font-normal">vs. previous period</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Middle Charts Row: Fire Activity Trend + Area Affected by State ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left (7 Cols): Fire Activity Trend */}
              <div className="lg:col-span-7 bg-white border border-gray-200/80 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ChartBar size={16} weight="bold" className="text-gray-700" />
                    <h3 className="text-[13.5px] font-bold text-gray-900">
                      Fire Activity Trend
                    </h3>
                  </div>

                  {/* Legend pills */}
                  <div className="flex items-center gap-3 text-[11.5px] font-semibold">
                    <span className="flex items-center gap-1.5 text-red-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> VIIRS
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> MODIS
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" /> Total
                    </span>
                  </div>
                </div>

                {/* Trend Chart (SVG) */}
                <div className="relative pt-2 pb-1">
                  <svg viewBox="0 0 460 190" className="w-full h-[180px] overflow-visible">
                    <defs>
                      <linearGradient id="blueTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                      </linearGradient>
                      <linearGradient id="redTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[35, 75, 115, 155].map((yVal, i) => (
                      <line
                        key={i}
                        x1="25"
                        y1={yVal}
                        x2="450"
                        y2={yVal}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Y Axis Labels */}
                    <text x="0" y="40" fontSize="9.5" fill="#94a3b8">2,000</text>
                    <text x="0" y="80" fontSize="9.5" fill="#94a3b8">1,500</text>
                    <text x="0" y="120" fontSize="9.5" fill="#94a3b8">1,000</text>
                    <text x="5" y="158" fontSize="9.5" fill="#94a3b8">500</text>
                    <text x="14" y="178" fontSize="9.5" fill="#94a3b8">0</text>

                    {/* Shaded Area Fills */}
                    <path
                      d="M 30 148 L 80 135 L 130 120 L 180 110 L 230 102 L 280 75 L 330 55 L 380 40 L 430 58 L 430 170 L 30 170 Z"
                      fill="url(#blueTrendGrad)"
                    />
                    <path
                      d="M 30 162 L 80 152 L 130 142 L 180 135 L 230 130 L 280 105 L 330 88 L 380 75 L 430 89 L 430 170 L 30 170 Z"
                      fill="url(#redTrendGrad)"
                    />

                    {/* MODIS line (Amber) */}
                    <path
                      d="M 30 166 Q 80 160 130 156 T 230 148 T 330 135 T 430 142"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />

                    {/* VIIRS line (Red) */}
                    <path
                      d="M 30 162 L 80 152 L 130 142 L 180 135 L 230 130 L 280 105 L 330 88 L 380 75 L 430 89"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                    />

                    {/* Total line (Blue) with points */}
                    <path
                      d="M 30 148 L 80 135 L 130 120 L 180 110 L 230 102 L 280 75 L 330 55 L 380 40 L 430 58"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                    />

                    {/* Data Points */}
                    {TREND_DATA.map((pt, idx) => (
                      <g key={idx} className="cursor-pointer" onClick={() => setActiveTooltip(idx)}>
                        {/* Interactive Dot on Total */}
                        <circle
                          cx={pt.x}
                          cy={pt.total === 1800 ? 40 : pt.total === 1590 ? 55 : pt.total === 1550 ? 58 : 148 - (pt.total - 520) * 0.08}
                          r={activeTooltip === idx ? 4.5 : 3}
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="1.8"
                        />
                        <text
                          x={pt.x}
                          y="185"
                          fontSize="9.5"
                          fill="#94a3b8"
                          textAnchor="middle"
                        >
                          {pt.day}
                        </text>
                      </g>
                    ))}
                  </svg>

                  {/* Active Tooltip Box */}
                  {activeTooltip !== null && (
                    <div
                      className="absolute bg-white rounded-lg px-2.5 py-1.5 shadow-md border border-gray-200 pointer-events-none transition-all text-center"
                      style={{
                        left: `${(TREND_DATA[activeTooltip].x / 460) * 100 - 8}%`,
                        top: '10px',
                      }}
                    >
                      <p className="text-[10px] font-bold text-gray-500">{TREND_DATA[activeTooltip].day} 2025</p>
                      <p className="text-[12px] font-black text-blue-600">
                        {TREND_DATA[activeTooltip].total.toLocaleString()} Detections
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 mt-2 text-center">
                  Daily thermal anomaly count aggregated from VIIRS (375m) &amp; MODIS (1km) sensors
                </p>
              </div>

              {/* Right (5 Cols): Area Affected by State */}
              <div className="lg:col-span-5 bg-white border border-gray-200/80 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ChartBar size={16} weight="bold" className="text-gray-700" />
                    <h3 className="text-[13.5px] font-bold text-gray-900">
                      Area Affected by State
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400">Area (ha)</span>
                </div>

                {/* Bar Chart Representation */}
                <div className="space-y-3 py-1">
                  {[
                    { state: 'Assam', area: '8,650 ha', percent: 86, color: 'bg-red-500' },
                    { state: 'Madhya Pradesh', area: '6,200 ha', percent: 62, color: 'bg-orange-500' },
                    { state: 'Chhattisgarh', area: '4,100 ha', percent: 41, color: 'bg-amber-500' },
                    { state: 'Odisha', area: '2,800 ha', percent: 28, color: 'bg-yellow-500' },
                    { state: 'Maharashtra', area: '2,100 ha', percent: 21, color: 'bg-blue-500' },
                    { state: 'Others (Pan-India)', area: '3,200 ha', percent: 32, color: 'bg-gray-400' },
                  ].map((bar, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="font-semibold text-gray-700">{bar.state}</span>
                        <span className="font-bold text-gray-900">{bar.area}</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                          style={{ width: `${bar.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Assam accounts for 35% of total impacted area</span>
                  <span className="text-orange-600 font-bold">Pan-India View</span>
                </div>
              </div>
            </div>

            {/* ─── Lower Section: Top Incidents Table & Report Insights ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left (8 Cols): Top Incidents Table */}
              <div className="lg:col-span-8 bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Fire size={16} weight="fill" className="text-gray-700" />
                      <h3 className="text-[13.5px] font-bold text-gray-900">
                        Top Incidents
                      </h3>
                    </div>
                    <span className="text-[11px] text-gray-400">Click any row to view full report</span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] text-left">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100 font-medium">
                          <th className="pb-2 font-medium">#</th>
                          <th className="pb-2 font-medium">Location</th>
                          <th className="pb-2 font-medium">State</th>
                          <th className="pb-2 font-medium">First Detected</th>
                          <th className="pb-2 font-medium">Affected Area (ha)</th>
                          <th className="pb-2 font-medium">Max Confidence</th>
                          <th className="pb-2 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {INCIDENTS_DATA.map((row, idx) => (
                          <tr
                            key={row.id}
                            onClick={() => handleOpenReport(row)}
                            className="hover:bg-orange-50/60 transition-colors cursor-pointer group"
                          >
                            <td className="py-2.5 font-bold text-gray-400">{idx + 1}</td>
                            <td className="py-2.5 font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                              {row.location}
                            </td>
                            <td className="py-2.5 text-gray-600 font-medium">{row.state}</td>
                            <td className="py-2.5 text-gray-500">{row.firstDetected}</td>
                            <td className="py-2.5 font-bold text-gray-800">{row.affectedAreaNum.toLocaleString()}</td>
                            <td className="py-2.5 font-semibold text-gray-700">{row.maxConfidence}%</td>
                            <td className="py-2.5 text-right">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold ${row.statusColor}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Showing top 5 high-impact fire incidents</span>
                  <span className="text-blue-600 font-bold">58 total incidents recorded</span>
                </div>
              </div>

              {/* Right (4 Cols): Report Insights */}
              <div className="lg:col-span-4 bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkle size={16} weight="fill" className="text-amber-500" />
                    <h3 className="text-[13.5px] font-bold text-gray-900">
                      Report Insights
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-red-50 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Fire size={13} weight="fill" />
                      </div>
                      <p className="text-[11.5px] text-gray-700 leading-snug">
                        <b className="text-gray-900">28% increase in fire detections</b> compared to the previous 7-day observation period.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Tree size={13} weight="fill" />
                      </div>
                      <p className="text-[11.5px] text-gray-700 leading-snug">
                        <b className="text-gray-900">Assam accounts for 35%</b> of the total national affected area across northeastern states.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Warning size={13} weight="fill" />
                      </div>
                      <p className="text-[11.5px] text-gray-700 leading-snug">
                        <b className="text-gray-900">High risk of spread</b> in Tinsukia and Dibrugarh districts due to unseasonally dry foliage.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Planet size={13} weight="fill" />
                      </div>
                      <p className="text-[11.5px] text-gray-700 leading-snug">
                        <b className="text-gray-900">214 persistent thermal sources</b> detected across industrial metallurgy and refinery clusters.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle size={13} weight="fill" />
                      </div>
                      <p className="text-[11.5px] text-gray-700 leading-snug">
                        <b className="text-gray-900">Early warnings helped reduce</b> potential loss of life in 3 major residential-fringe incidents.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Synthesized via AI Risk Engine</span>
                  <span className="text-emerald-600 font-bold">Live Synced</span>
                </div>
              </div>
            </div>

            {/* ─── Bottom Section: Downloadable Reports ─── */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <DownloadSimple size={16} weight="bold" className="text-gray-700" />
                  <h3 className="text-[13.5px] font-bold text-gray-900">
                    Downloadable Reports
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400">Click to preview document before export</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {DOWNLOADABLE_REPORTS.map((rep) => {
                  const Icon = rep.icon;
                  const targetIncident = INCIDENTS_DATA.find((i) => i.id === rep.incidentId) || INCIDENTS_DATA[0];
                  return (
                    <div
                      key={rep.id}
                      onClick={() => handleOpenReport(targetIncident)}
                      className="border border-gray-200 hover:border-orange-400 rounded-xl p-3.5 bg-gray-50/50 hover:bg-white transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${rep.iconColor}`}>
                          <Icon size={20} weight="bold" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                            {rep.title}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {rep.format} • {rep.size}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReport(targetIncident);
                        }}
                        className="mt-3 w-full py-1.5 bg-white group-hover:bg-orange-500 border border-gray-200 group-hover:border-transparent text-gray-700 group-hover:text-white rounded-lg text-[11.5px] font-bold transition-colors text-center"
                      >
                        Preview &amp; Download
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Bottom Banner Bar ─── */}
            <div className="bg-[#f0fdf4] border border-emerald-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Tree size={18} weight="fill" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">
                    Data for a Safer Tomorrow
                  </p>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    Together we can monitor, predict, and prevent wildfires using the power of satellite data and AI.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenReport(INCIDENTS_DATA[0])}
                className="flex items-center gap-2 h-9 px-4 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                <span>Generate Custom Report</span>
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
