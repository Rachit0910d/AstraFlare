import { useState, useMemo } from 'react';
import {
  Fire,
  CheckCircle,
  Clock,
  MapPin,
  Compass,
  Broadcast,
  Article,
  Copy,
  Check,
  MagnifyingGlass,
  Gauge,
  TrendUp,
  ShieldCheck,
  Buildings,
  PaperPlaneRight,
  Calculator,
  XCircle,
} from '@phosphor-icons/react';
import Header from '../components/Header';
import { classifyAnomaly } from '../utils/classification';

interface AlertProps {
  onNavigate?: (page: string, incident?: any) => void;
}

export type AlertPriority = 'Critical' | 'Elevated' | 'Advisory';
export type AlertStatus = 'Unreviewed' | 'Under Review' | 'Acknowledged' | 'Resolved';

export interface AnalystAlertItem {
  id: string;
  title: string;
  location: string;
  state: string;
  coords: [number, number];
  coordsStr: string;
  priority: AlertPriority;
  status: AlertStatus;
  timeAgo: string;
  detectedAt: string;
  detectedUtc: string;
  satellite: string;
  instrument: string;
  orbitPass: string;
  frp: number; // MW
  brightnessTempK: number; // Kelvin
  brightnessTempC: number; // Celsius
  confidencePct: number;
  groundResolution: string;
  estimatedAreaHa: number;
  persistenceHistory: string;
  landCover: string;
  proximityAssets: string;
  operationalSummary: string;
  // Raw classification hint for the canonical engine
  classificationHint?: string;
  nearbyAuthority?: {
    name: string;
    distance: string;
    channel: string;
    jurisdiction: string;
    etaEstimate: string;
    recommendedUnits: string;
    projectedSpread: string;
  };
  reportState?: 'Draft' | 'Sent' | 'Cancelled';
  reportSentAt?: string;
}

const INITIAL_ANALYST_ALERTS: AnalystAlertItem[] = [
  {
    id: 'ALT-2025-0912',
    title: 'Dibrugarh Forest Fringe Thermal Anomaly',
    location: 'Dibrugarh, Assam',
    state: 'Assam',
    coords: [27.4728, 95.0089],
    coordsStr: '27.4728° N, 95.0089° E',
    priority: 'Critical',
    status: 'Unreviewed',
    timeAgo: '14m ago',
    detectedAt: 'Today, 10:18 AM IST',
    detectedUtc: '04:48:00 UTC',
    satellite: 'Suomi-NPP',
    instrument: 'VIIRS (375m)',
    orbitPass: 'Ascending (Daytime) • Orbit #67841',
    frp: 312.4,
    brightnessTempK: 348.2,
    brightnessTempC: 75.1,
    confidencePct: 88,
    groundResolution: '375m at nadir',
    estimatedAreaHa: 4200,
    persistenceHistory: 'Active expanding thermal front (3 consecutive sensor hits in 3h)',
    landCover: 'Subtropical Moist Broadleaf Mixed Forest',
    proximityAssets: 'Dehing Patkai Reserve fringe (3.4 km), NH-37 transport corridor (6.1 km)',
    operationalSummary:
      'Multiple contiguous pixel anomalies detected in forest buffer. Radiative emission increased by 42% since prior orbital pass. High spread velocity probable under prevailing easterly breeze.',
    classificationHint: 'NATURAL_WILDLAND_FIRE',
    nearbyAuthority: {
      name: 'Assam State Disaster Management Authority (ASDMA) - Dibrugarh & Divisional Forest Office',
      distance: '3.4 km from hotspot',
      channel: 'Emergency Operations Center (EOC) Direct Gateway',
      jurisdiction: 'Upper Assam Forest & Wildlife Conservation Circle',
      etaEstimate: '~18 mins emergency mobilization',
      recommendedUnits: '4 Wildfire Rapid Tenders + 1 Recon Drone Squad',
      projectedSpread: '1.8 km/h northeastward under 14 km/h prevailing wind',
    },
    reportState: 'Draft',
  },
  {
    id: 'ALT-2025-0911',
    title: 'Jharia Coal Basin Stationary Heat Source',
    location: 'Dhanbad, Jharkhand',
    state: 'Jharkhand',
    coords: [23.7512, 86.4172],
    coordsStr: '23.7512° N, 86.4172° E',
    priority: 'Elevated',
    status: 'Under Review',
    timeAgo: '42m ago',
    detectedAt: 'Today, 09:50 AM IST',
    detectedUtc: '04:20:00 UTC',
    satellite: 'NOAA-20',
    instrument: 'VIIRS (375m)',
    orbitPass: 'Ascending (Daytime) • Orbit #38912',
    frp: 142.6,
    brightnessTempK: 328.4,
    brightnessTempC: 55.3,
    confidencePct: 93,
    groundResolution: '375m at nadir',
    estimatedAreaHa: 850,
    persistenceHistory: 'Stationary thermal signature logged across >12 consecutive satellite orbits',
    landCover: 'Open-Cast Mining / Industrial Excavation Basin',
    proximityAssets: 'BCCL Pit Sector 4 (<400 m), Dhanbad-Chandrapura Rail Line (1.2 km)',
    operationalSummary:
      'Persistent subsurface thermal venting co-located with active coal extraction seam. Radiative power exhibits low variance over 72-hour observation window.',
    classificationHint: 'PERSISTENT_INDUSTRIAL_HEAT',
    nearbyAuthority: {
      name: 'Directorate General of Mines Safety (DGMS) & Dhanbad District Fire Control',
      distance: '1.2 km from hotspot',
      channel: 'Industrial Mining Incident Dispatch Network',
      jurisdiction: 'BCCL Coal Mining Safety Zone 2',
      etaEstimate: '~12 mins rapid response',
      recommendedUnits: '2 Industrial Smouldering Foam Units + Mining Safety Squad',
      projectedSpread: 'Stationary subsurface containment within pit sector',
    },
    reportState: 'Draft',
  },
  {
    id: 'ALT-2025-0910',
    title: 'Kaziranga Southern Buffer Wildland Detection',
    location: 'Golaghat, Assam',
    state: 'Assam',
    coords: [26.5824, 93.1711],
    coordsStr: '26.5824° N, 93.1711° E',
    priority: 'Critical',
    status: 'Unreviewed',
    timeAgo: '1h 05m ago',
    detectedAt: 'Today, 09:27 AM IST',
    detectedUtc: '03:57:00 UTC',
    satellite: 'Suomi-NPP',
    instrument: 'VIIRS (375m)',
    orbitPass: 'Ascending (Daytime) • Orbit #67840',
    frp: 285.0,
    brightnessTempK: 344.1,
    brightnessTempC: 71.0,
    confidencePct: 91,
    groundResolution: '375m at nadir',
    estimatedAreaHa: 3100,
    persistenceHistory: 'Rapid thermal onset (zero prior detections within 7 days)',
    landCover: 'Semi-evergreen Riverine Grassland & Woodland',
    proximityAssets: 'National Park Wildlife Corridor Block 2 (1.1 km), Eco-sensitive Zone',
    operationalSummary:
      'Sudden high-temperature cluster located near national park boundary. Smoke plume detected in companion optical imagery. Urgent ground ranger verification recommended.',
    classificationHint: 'NATURAL_WILDLAND_FIRE',
    nearbyAuthority: {
      name: 'Kaziranga National Park Command & Golaghat District Administration',
      distance: '1.1 km from hotspot',
      channel: 'Wildlife Protection & Forest Ranger Frequency',
      jurisdiction: 'Eastern Assam Wildlife Division',
      etaEstimate: '~22 mins riverine ranger deployment',
      recommendedUnits: '3 Eco-Sensitive Buffer Patrol Units + Aerial Thermal Drone',
      projectedSpread: '2.1 km/h expansion across grassland corridor',
    },
    reportState: 'Draft',
  },
  {
    id: 'ALT-2025-0909',
    title: 'Korba Thermal Energy Belt Flare',
    location: 'Korba, Chhattisgarh',
    state: 'Chhattisgarh',
    coords: [22.3595, 82.7501],
    coordsStr: '22.3595° N, 82.7501° E',
    priority: 'Elevated',
    status: 'Acknowledged',
    timeAgo: '1h 48m ago',
    detectedAt: 'Today, 08:44 AM IST',
    detectedUtc: '03:14:00 UTC',
    satellite: 'Terra',
    instrument: 'MODIS (1km)',
    orbitPass: 'Descending • Orbit #12401',
    frp: 98.2,
    brightnessTempK: 322.0,
    brightnessTempC: 48.9,
    confidencePct: 84,
    groundResolution: '1km nominal at nadir',
    estimatedAreaHa: 120,
    persistenceHistory: 'Recurring thermal point source matching refinery & super-thermal stack cycle',
    landCover: 'Heavy Industrial / Thermal Power Plant Complex',
    proximityAssets: 'NTPC Super Thermal Power Station (adjacent), Hasdeo River intake (1.8 km)',
    operationalSummary:
      'High localized emission consistent with planned industrial exhaust stack venting. No uncontrolled perimeter spread observed in peripheral 500m buffer.',
    classificationHint: 'LIKELY_INDUSTRIAL_INCIDENT',
    nearbyAuthority: {
      name: 'Korba Industrial Safety Directorate & NTPC Emergency Command',
      distance: '0.8 km from hotspot',
      channel: 'Super Thermal Plant Direct Telemetry Link',
      jurisdiction: 'Chhattisgarh State Industrial Safety Circle',
      etaEstimate: '~8 mins on-site industrial response',
      recommendedUnits: '1 High-Pressure Industrial Flare Suppression Unit',
      projectedSpread: 'Controlled point flare venting within perimeter bund',
    },
    reportState: 'Draft',
  },
  {
    id: 'ALT-2025-0908',
    title: 'Tinsukia Rural Agricultural Clearing',
    location: 'Tinsukia, Assam',
    state: 'Assam',
    coords: [27.4922, 95.3468],
    coordsStr: '27.4922° N, 95.3468° E',
    priority: 'Advisory',
    status: 'Resolved',
    timeAgo: '2h 15m ago',
    detectedAt: 'Today, 08:17 AM IST',
    detectedUtc: '02:47:00 UTC',
    satellite: 'NOAA-20',
    instrument: 'VIIRS (375m)',
    orbitPass: 'Ascending • Orbit #38910',
    frp: 46.5,
    brightnessTempK: 314.8,
    brightnessTempC: 41.7,
    confidencePct: 74,
    groundResolution: '375m at nadir',
    estimatedAreaHa: 450,
    persistenceHistory: 'Transient seasonal burning; common post-harvest cycle',
    landCover: 'Cultivated Agricultural Plot / Paddy Fallow',
    proximityAssets: 'Rural Settlement Fringe (1.4 km), District Canal (600 m)',
    operationalSummary:
      'Low radiative intensity thermal anomaly consistent with stubble / field residue burning. Rapid thermal dissipation confirmed on subsequent orbital sweep.',
    classificationHint: 'POSSIBLE_AGRICULTURAL_BURNING',
    nearbyAuthority: {
      name: 'Tinsukia District Civil Defense & Agricultural Revenue Circle',
      distance: '2.6 km from hotspot',
      channel: 'District Administrative Radio Network',
      jurisdiction: 'Tinsukia Rural Agricultural Monitoring Unit',
      etaEstimate: '~15 mins rural fire squad',
      recommendedUnits: '1 Rural Water Tender + Agricultural Extension Officer',
      projectedSpread: '0.4 km/h low-intensity stubble smouldering',
    },
    reportState: 'Draft',
  },
  {
    id: 'ALT-2025-0907',
    title: 'Singrauli Open-Cast Industrial Extraction',
    location: 'Singrauli, Madhya Pradesh',
    state: 'Madhya Pradesh',
    coords: [24.1997, 82.6644],
    coordsStr: '24.1997° N, 82.6644° E',
    priority: 'Elevated',
    status: 'Acknowledged',
    timeAgo: '3h 30m ago',
    detectedAt: 'Today, 07:02 AM IST',
    detectedUtc: '01:32:00 UTC',
    satellite: 'Suomi-NPP',
    instrument: 'VIIRS (375m)',
    orbitPass: 'Descending • Orbit #67838',
    frp: 168.0,
    brightnessTempK: 331.2,
    brightnessTempC: 58.1,
    confidencePct: 94,
    groundResolution: '375m at nadir',
    estimatedAreaHa: 980,
    persistenceHistory: 'Stationary multi-month thermal footprint in open-cut mining sector',
    landCover: 'Heavy Mineral Extraction / Power Complex',
    proximityAssets: 'NCL Northern Coalfields Pit (adjacent), Rihand Reservoir (3.8 km)',
    operationalSummary:
      'Continuous thermal radiation characteristic of industrial smouldering overburden and processing boilers. Risk to wildland vegetative ecosystems assessed as Low.',
    classificationHint: 'PERSISTENT_INDUSTRIAL_HEAT',
    nearbyAuthority: {
      name: 'Singrauli District Emergency Control & MP Pollution Control Board',
      distance: '2.1 km from hotspot',
      channel: 'State Environmental Emergency Hotline',
      jurisdiction: 'Northern Coalfields Environmental Compliance Zone',
      etaEstimate: '~14 mins industrial patrol',
      recommendedUnits: '2 Heavy Dust & Smoulder Suppression Water Bowsers',
      projectedSpread: 'Localised pit overburden smoulder with low spread risk',
    },
    reportState: 'Draft',
  },
];

export default function Alert({ onNavigate }: AlertProps) {
  const [alerts, setAlerts] = useState<AnalystAlertItem[]>(INITIAL_ANALYST_ALERTS);
  const [selectedAlertId, setSelectedAlertId] = useState<string>('ALT-2025-0912');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [classificationFilter, setClassificationFilter] = useState<string>('All');
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showEstimateMap, setShowEstimateMap] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Transmit SITREP to the jurisdictional authority nearby the hotspot
  const handleSendReport = () => {
    if (!selectedAlert) return;
    const authName = selectedAlert.nearbyAuthority?.name || 'Local District Emergency Authority';
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === selectedAlert.id
          ? {
              ...a,
              reportState: 'Sent',
              reportSentAt: `Today, ${nowStr}`,
              status: a.status === 'Unreviewed' ? 'Under Review' : a.status,
            }
          : a
      )
    );
    showToast(`Official SITREP successfully transmitted to ${authName}`);
  };

  // Toggle/compute authority impact and response resource estimation
  const handleEstimate = () => {
    if (!selectedAlert) return;
    const nextState = !showEstimateMap[selectedAlert.id];
    setShowEstimateMap((prev) => ({
      ...prev,
      [selectedAlert.id]: nextState,
    }));
    if (nextState) {
      showToast('Impact and resource mobilization estimate calculated.');
    }
  };

  // Cancel or retract the dispatched report to the nearby authority
  const handleCancelReport = () => {
    if (!selectedAlert) return;
    const authName = selectedAlert.nearbyAuthority?.name || 'Local District Emergency Authority';
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === selectedAlert.id
          ? {
              ...a,
              reportState: 'Cancelled',
            }
          : a
      )
    );
    showToast(`Report dispatch to ${authName} cancelled.`);
  };

  // Resolve currently selected alert
  const selectedAlert = useMemo(() => {
    return alerts.find((a) => a.id === selectedAlertId) || alerts[0];
  }, [alerts, selectedAlertId]);

  // Unified canonical classification for the active alert
  const classifiedCurrent = useMemo(() => {
    if (!selectedAlert) return null;
    return classifyAnomaly({
      lat: selectedAlert.coords[0],
      lng: selectedAlert.coords[1],
      frp: selectedAlert.frp,
      brightness: selectedAlert.brightnessTempK,
      classification: selectedAlert.classificationHint,
      category: selectedAlert.classificationHint,
      model_score_uncalibrated: selectedAlert.confidencePct,
    });
  }, [selectedAlert]);

  // Filter alerts according to search, priority, status, and classification
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          alert.title.toLowerCase().includes(q) ||
          alert.location.toLowerCase().includes(q) ||
          alert.id.toLowerCase().includes(q) ||
          alert.satellite.toLowerCase().includes(q) ||
          alert.coordsStr.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Priority match
      if (priorityFilter !== 'All' && alert.priority !== priorityFilter) {
        return false;
      }

      // Status match
      if (statusFilter !== 'All' && alert.status !== statusFilter) {
        return false;
      }

      // Classification match
      if (classificationFilter !== 'All') {
        const c = classifyAnomaly({
          lat: alert.coords[0],
          lng: alert.coords[1],
          frp: alert.frp,
          brightness: alert.brightnessTempK,
          classification: alert.classificationHint,
        });
        if (c.category !== classificationFilter && c.code !== classificationFilter) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, searchQuery, priorityFilter, statusFilter, classificationFilter]);

  // Overall Statistics for Analyst Dashboard
  const stats = useMemo(() => {
    const criticalCount = alerts.filter((a) => a.priority === 'Critical').length;
    const elevatedCount = alerts.filter((a) => a.priority === 'Elevated').length;
    const unreviewedCount = alerts.filter((a) => a.status === 'Unreviewed').length;
    const avgConfidence = Math.round(
      alerts.reduce((acc, a) => acc + a.confidencePct, 0) / (alerts.length || 1)
    );
    return { criticalCount, elevatedCount, unreviewedCount, avgConfidence };
  }, [alerts]);

  // Copy coordinates to clipboard
  const handleCopyCoords = () => {
    if (!selectedAlert) return;
    const text = `${selectedAlert.coords[0].toFixed(4)}, ${selectedAlert.coords[1].toFixed(4)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    showToast(`Coordinates copied: ${text}`);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Change status of the selected alert
  const handleUpdateStatus = (newStatus: AlertStatus) => {
    if (!selectedAlert) return;
    setAlerts((prev) =>
      prev.map((a) => (a.id === selectedAlert.id ? { ...a, status: newStatus } : a))
    );
    showToast(`Status updated to: ${newStatus}`);
  };

  // Mark all unreviewed alerts as Acknowledged
  const handleMarkAllAcknowledged = () => {
    setAlerts((prev) =>
      prev.map((a) => (a.status === 'Unreviewed' ? { ...a, status: 'Acknowledged' } : a))
    );
    showToast('All active alerts marked as Acknowledged.');
  };

  // Generate Incident payload for cross-page navigation
  const buildIncidentPayload = (alert: AnalystAlertItem) => {
    return {
      id: alert.id,
      lat: alert.coords[0],
      lng: alert.coords[1],
      location: alert.location,
      coordinates: alert.coordsStr,
      instrument: alert.instrument,
      satellite: alert.satellite,
      frp: alert.frp,
      brightness: alert.brightnessTempK,
      confidence: `${alert.confidencePct}%`,
      confidenceScore: alert.confidencePct,
      time: alert.detectedAt,
      date: alert.detectedAt.split(',')[0] || 'Today',
      classification: alert.classificationHint,
      category: classifiedCurrent?.category || 'Wildfire',
      incidentType: alert.title,
      description: alert.operationalSummary,
    };
  };

  // Navigate with incident context
  const handleInspectOnMap = () => {
    if (!selectedAlert || !onNavigate) return;
    onNavigate('Live Map', buildIncidentPayload(selectedAlert));
  };

  const handlePredictiveAnalysis = () => {
    if (!selectedAlert || !onNavigate) return;
    onNavigate('Predictive Analysis', buildIncidentPayload(selectedAlert));
  };

  const handleGenerateReport = () => {
    if (!selectedAlert || !onNavigate) return;
    onNavigate('Report', buildIncidentPayload(selectedAlert));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* ─── Global Navbar ─── */}
      <Header activePage="Alert" onNavigate={onNavigate} />

      {/* ─── Notification Toast ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5 border border-gray-700 animate-in fade-in slide-in-from-bottom-2 text-[13px] font-medium">
          <CheckCircle size={17} weight="fill" className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── Main Content Container ─── */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 max-w-[1600px] w-full mx-auto flex flex-col gap-5">
        {/* ══════════════ 1. ANALYST TOP HEADER & STATS ══════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[23px] font-bold text-gray-900 tracking-tight leading-none">
                Incident Alerts &amp; Telemetry
              </h1>
              {stats.unreviewedCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold bg-red-50 text-red-600 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>{stats.unreviewedCount} Unreviewed</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle size={13} weight="fill" />
                  <span>All Alerts Reviewed</span>
                </span>
              )}
            </div>
            <p className="text-[13px] text-gray-500 mt-1 font-medium">
              Live orbital detections, radiometric telemetry, and verification queue
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-white border border-gray-200/90 rounded-lg px-3 py-1.5 shadow-2xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[11.5px] text-gray-500 font-medium">Critical:</span>
              <span className="text-[12px] font-bold text-gray-900">{stats.criticalCount}</span>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-lg px-3 py-1.5 shadow-2xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11.5px] text-gray-500 font-medium">Elevated:</span>
              <span className="text-[12px] font-bold text-gray-900">{stats.elevatedCount}</span>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-lg px-3 py-1.5 shadow-2xs flex items-center gap-2">
              <Gauge size={14} className="text-gray-400" />
              <span className="text-[11.5px] text-gray-500 font-medium">Mean Conf:</span>
              <span className="text-[12px] font-bold text-gray-900">{stats.avgConfidence}%</span>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-lg px-3 py-1.5 shadow-2xs flex items-center gap-2">
              <Broadcast size={14} className="text-orange-500" />
              <span className="text-[11.5px] text-gray-500 font-medium">Sensor:</span>
              <span className="text-[12px] font-bold text-gray-900">VIIRS S-NPP (Active)</span>
            </div>

            <button
              onClick={handleMarkAllAcknowledged}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200/90 rounded-lg text-[12px] font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check size={13} weight="bold" />
              <span>Mark All Reviewed</span>
            </button>
          </div>
        </div>

        {/* ══════════════ 2. ANALYST FILTER & SEARCH TOOLBAR ══════════════ */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alert ID, district, coords (e.g. Dibrugarh, ALT-2025)..."
              className="w-full pl-9 pr-3 py-1.5 text-[12.5px] bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500 focus:bg-white text-gray-900 placeholder-gray-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Chips & Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200/70 text-[11.5px]">
              {(['All', 'Critical', 'Elevated', 'Advisory'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    priorityFilter === p
                      ? 'bg-white text-gray-900 font-bold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-[12px] font-medium bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Unreviewed">Unreviewed</option>
              <option value="Under Review">Under Review</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>

            {/* Classification Filter */}
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="px-2.5 py-1 text-[12px] font-medium bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="All">Classification: All</option>
              <option value="Wildfire">Wildfire</option>
              <option value="Persistent Heat">Persistent Heat</option>
              <option value="Industrial Fire">Industrial Fire</option>
              <option value="Agricultural Burn">Agricultural Burn</option>
            </select>

            {(searchQuery || priorityFilter !== 'All' || statusFilter !== 'All' || classificationFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('All');
                  setStatusFilter('All');
                  setClassificationFilter('All');
                }}
                className="text-[11.5px] text-orange-600 hover:text-orange-700 font-medium px-2 py-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ══════════════ 3. MASTER-DETAIL ANALYST WORKSPACE ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ────────────────── LEFT COLUMN: TRIAGE QUEUE (5 Cols) ────────────────── */}
          <div className="lg:col-span-5 bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800">
                <Article size={15} weight="bold" className="text-gray-500" />
                <span className="text-[13px] font-bold">Detection Queue</span>
                <span className="text-[11px] font-semibold text-gray-400">
                  ({filteredAlerts.length} incidents)
                </span>
              </div>
              <span className="text-[11px] text-gray-400">Sorted by recency</span>
            </div>

            {/* List Feed */}
            <div className="divide-y divide-gray-100 max-h-[740px] overflow-y-auto">
              {filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-[13px]">
                  No thermal alerts matching the selected filters.
                </div>
              ) : (
                filteredAlerts.map((item) => {
                  const isSelected = item.id === selectedAlert?.id;
                  const itemClassification = classifyAnomaly({
                    lat: item.coords[0],
                    lng: item.coords[1],
                    frp: item.frp,
                    brightness: item.brightnessTempK,
                    classification: item.classificationHint,
                  });

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAlertId(item.id)}
                      className={`p-3.5 transition-all cursor-pointer border-l-3 ${
                        isSelected
                          ? 'bg-orange-50/30 border-orange-500 shadow-2xs'
                          : 'border-transparent hover:bg-gray-50/70'
                      }`}
                    >
                      {/* Top Row: Priority + ID + Time */}
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                              item.priority === 'Critical'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : item.priority === 'Elevated'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span className="font-mono text-gray-400 text-[11px]">{item.id}</span>
                        </div>

                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock size={12} />
                          <span>{item.timeAgo}</span>
                        </div>
                      </div>

                      {/* Title & Location */}
                      <div className="mt-1.5">
                        <h3 className="text-[13.5px] font-bold text-gray-900 leading-snug line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-[11.5px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} weight="fill" className="text-gray-400 shrink-0" />
                          <span>{item.location}</span>
                        </p>
                      </div>

                      {/* Telemetry Chips & Classification */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-semibold flex items-center gap-1">
                          <Fire size={11} className="text-orange-500" weight="fill" />
                          <span>{item.frp.toFixed(0)} MW</span>
                        </span>

                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-semibold">
                          {item.brightnessTempC.toFixed(0)}°C
                        </span>

                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-semibold">
                          {item.confidencePct}% conf
                        </span>

                        <span
                          className={`ml-auto px-2 py-0.5 rounded text-[10.5px] font-semibold border ${itemClassification.badgeBg} ${itemClassification.badgeColor}`}
                        >
                          {itemClassification.shortLabel}
                        </span>
                      </div>

                      {/* Status Indicator */}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 pt-1.5 border-t border-gray-100/60">
                        <span>{item.satellite} • {item.instrument}</span>
                        <div className="flex items-center gap-1.5">
                          {item.reportState === 'Sent' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Report Sent
                            </span>
                          )}
                          <span
                            className={`font-semibold ${
                              item.status === 'Unreviewed'
                                ? 'text-red-500'
                                : item.status === 'Under Review'
                                ? 'text-amber-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ────────────────── RIGHT COLUMN: ANALYST TELEMETRY DOSSIER (7 Cols) ────────────────── */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {selectedAlert && classifiedCurrent ? (
              <div className="bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden flex flex-col">
                {/* Dossier Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11.5px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                        {selectedAlert.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase ${
                          selectedAlert.priority === 'Critical'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : selectedAlert.priority === 'Elevated'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {selectedAlert.priority}
                      </span>
                      <span className="text-[12px] text-gray-400 font-medium">
                        {selectedAlert.detectedAt}
                      </span>
                    </div>

                    <h2 className="text-[17px] font-bold text-gray-900 mt-1">
                      {selectedAlert.title}
                    </h2>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11.5px] text-gray-400 font-medium">Triage:</span>
                    <select
                      value={selectedAlert.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as AlertStatus)}
                      className="px-2.5 py-1 text-[12px] font-bold rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs focus:outline-hidden cursor-pointer"
                    >
                      <option value="Unreviewed">Unreviewed</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Acknowledged">Acknowledged</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {/* Dossier Content Body */}
                <div className="p-5 flex flex-col gap-4">
                  {/* 1. Radiometric Telemetry Matrix */}
                  <div>
                    <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Gauge size={14} className="text-gray-500" />
                      <span>Satellite Telemetry &amp; Radiometry</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {/* Metric: FRP */}
                      <div className="bg-gray-50/80 border border-gray-200/70 rounded-lg p-2.5">
                        <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                          <Fire size={12} className="text-orange-500" weight="fill" />
                          <span>Fire Radiative Power</span>
                        </p>
                        <p className="text-[16px] font-bold text-gray-900 mt-0.5">
                          {selectedAlert.frp.toFixed(1)} <span className="text-[12px] font-medium text-gray-500">MW</span>
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">Total thermal energy</span>
                      </div>

                      {/* Metric: Brightness Temp */}
                      <div className="bg-gray-50/80 border border-gray-200/70 rounded-lg p-2.5">
                        <p className="text-[11px] text-gray-500 font-medium">Brightness Temp</p>
                        <p className="text-[16px] font-bold text-gray-900 mt-0.5">
                          {selectedAlert.brightnessTempC.toFixed(1)} <span className="text-[12px] font-medium text-gray-500">°C</span>
                          <span className="text-[11.5px] font-normal text-gray-400 ml-1.5">({selectedAlert.brightnessTempK} K)</span>
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">VIIRS Channel I4</span>
                      </div>

                      {/* Metric: Confidence */}
                      <div className="bg-gray-50/80 border border-gray-200/70 rounded-lg p-2.5">
                        <p className="text-[11px] text-gray-500 font-medium">Algorithmic Confidence</p>
                        <p className="text-[16px] font-bold text-orange-600 mt-0.5">
                          {selectedAlert.confidencePct}%
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">High quality threshold</span>
                      </div>

                      {/* Metric: Platform */}
                      <div className="bg-gray-50/80 border border-gray-200/70 rounded-lg p-2.5">
                        <p className="text-[11px] text-gray-500 font-medium">Satellite Platform</p>
                        <p className="text-[13.5px] font-bold text-gray-900 mt-0.5">
                          {selectedAlert.satellite}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{selectedAlert.instrument}</span>
                      </div>

                      {/* Metric: Ground Resolution */}
                      <div className="bg-gray-50/80 border border-gray-200/70 rounded-lg p-2.5">
                        <p className="text-[11px] text-gray-500 font-medium">Pixel Resolution</p>
                        <p className="text-[13.5px] font-bold text-gray-900 mt-0.5">
                          {selectedAlert.groundResolution}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">Est. Area: {selectedAlert.estimatedAreaHa} ha</span>
                      </div>

                      {/* Metric: Pass Time */}
                      <div className="bg-gray-50/80 border border-gray-200/70 rounded-lg p-2.5">
                        <p className="text-[11px] text-gray-500 font-medium">Orbital Pass</p>
                        <p className="text-[12.5px] font-bold text-gray-900 mt-0.5 truncate">
                          {selectedAlert.detectedUtc}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block truncate">{selectedAlert.orbitPass}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Geolocation & Spatial Metadata */}
                  <div className="bg-gray-50/60 border border-gray-200/70 rounded-lg p-3.5 flex flex-col gap-2.5 text-[12px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} weight="fill" className="text-orange-500 shrink-0" />
                        <span className="font-bold text-gray-900">{selectedAlert.location}</span>
                        <span className="text-gray-400 font-mono text-[11.5px]">({selectedAlert.coordsStr})</span>
                      </div>

                      <button
                        onClick={handleCopyCoords}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-[11px] font-semibold text-gray-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        {copiedCoords ? (
                          <>
                            <Check size={12} weight="bold" className="text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Coords</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-200/60 text-[11.5px]">
                      <div>
                        <span className="text-gray-400 font-medium">Land Cover / Biome:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedAlert.landCover}</p>
                      </div>

                      <div>
                        <span className="text-gray-400 font-medium">Vulnerable Proximities:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedAlert.proximityAssets}</p>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-gray-400 font-medium">Temporal Persistence:</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{selectedAlert.persistenceHistory}</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. AI Model Classification Card */}
                  <div className="border border-gray-200/80 rounded-lg p-3.5 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} weight="fill" className="text-orange-500" />
                        <span className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">
                          AstraFlare Classification Engine
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${classifiedCurrent.badgeBg} ${classifiedCurrent.badgeColor}`}
                      >
                        {classifiedCurrent.label}
                      </span>
                    </div>

                    <p className="text-[12px] text-gray-600 leading-relaxed">
                      {classifiedCurrent.decisionRationale}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>Operational Risk Tier: <strong className="text-gray-800">{classifiedCurrent.operationalRiskTier}</strong></span>
                      <span>Anomaly Category: <strong className="text-gray-800">{classifiedCurrent.category}</strong></span>
                    </div>
                  </div>

                  {/* 4. Operational Summary */}
                  <div>
                    <h3 className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Analyst Context &amp; Notes
                    </h3>
                    <p className="text-[12.5px] text-gray-700 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-gray-200/60">
                      {selectedAlert.operationalSummary}
                    </p>
                  </div>

                  {/* 5. Jurisdictional Authority & Hotspot Dispatch */}
                  <div className="border border-gray-200/90 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Buildings size={18} weight="duotone" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
                              Nearby Jurisdictional Authority
                            </span>
                            <span className="text-[11px] font-semibold text-gray-500">
                              {selectedAlert.nearbyAuthority?.distance}
                            </span>
                          </div>
                          <h4 className="text-[13.5px] font-bold text-gray-950 mt-1">
                            {selectedAlert.nearbyAuthority?.name}
                          </h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Channel: {selectedAlert.nearbyAuthority?.channel} • {selectedAlert.nearbyAuthority?.jurisdiction}
                          </p>
                        </div>
                      </div>

                      {/* Dispatch Status Pill */}
                      <div className="self-start sm:self-auto shrink-0">
                        {selectedAlert.reportState === 'Sent' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={13} weight="fill" />
                            <span>Report Sent ({selectedAlert.reportSentAt || 'Transmitted'})</span>
                          </span>
                        ) : selectedAlert.reportState === 'Cancelled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            <XCircle size={13} weight="fill" className="text-slate-500" />
                            <span>Report Cancelled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock size={12} />
                            <span>Pending Dispatch</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Authority Impact & Resource Estimation Drawer */}
                    {showEstimateMap[selectedAlert.id] && (
                      <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200 space-y-2 animate-in fade-in duration-150 text-[11.5px]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                          <span className="font-bold text-gray-800 flex items-center gap-1.5">
                            <Calculator size={14} className="text-orange-600" weight="bold" />
                            Hotspot Authority Impact &amp; Resource Mobilization Estimate
                          </span>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Calibrated
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          <div className="bg-white p-2.5 rounded-md border border-gray-200/80 shadow-2xs">
                            <span className="text-gray-400 block text-[10.5px]">Emergency Response Arrival</span>
                            <p className="font-bold text-gray-900 mt-0.5">{selectedAlert.nearbyAuthority?.etaEstimate}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-gray-200/80 shadow-2xs">
                            <span className="text-gray-400 block text-[10.5px]">Recommended Suppression Units</span>
                            <p className="font-bold text-gray-900 mt-0.5">{selectedAlert.nearbyAuthority?.recommendedUnits}</p>
                          </div>
                          <div className="bg-white p-2.5 rounded-md border border-gray-200/80 shadow-2xs">
                            <span className="text-gray-400 block text-[10.5px]">Perimeter Spread Projection</span>
                            <p className="font-bold text-gray-900 mt-0.5">{selectedAlert.nearbyAuthority?.projectedSpread}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons: Send Report, Estimate, Cancel Report */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Send Report */}
                        <button
                          onClick={handleSendReport}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[12px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Transmit verified situational report to the nearby jurisdictional authority"
                        >
                          <PaperPlaneRight size={14} weight="bold" />
                          <span>Send Report</span>
                        </button>

                        {/* 2. Estimate */}
                        <button
                          onClick={handleEstimate}
                          className={`px-3.5 py-2 border text-[12px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                            showEstimateMap[selectedAlert.id]
                              ? 'bg-orange-50 border-orange-300 text-orange-700'
                              : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                          title="Compute arrival time, resource mobilization, and perimeter spread estimate"
                        >
                          <Calculator size={14} weight="bold" />
                          <span>Estimate</span>
                        </button>

                        {/* 3. Cancel Report */}
                        <button
                          onClick={handleCancelReport}
                          className="px-3.5 py-2 bg-white hover:bg-red-50 hover:text-red-600 border border-gray-200 text-gray-600 text-[12px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Cancel or recall the situational report dispatch"
                        >
                          <XCircle size={14} weight="bold" />
                          <span>Cancel Report</span>
                        </button>
                      </div>

                      <span className="text-[11px] text-gray-400 font-medium ml-auto">
                        Transmits direct encrypted telemetry payload to nearest authority
                      </span>
                    </div>
                  </div>

                  {/* 6. Primary Action Dock */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleInspectOnMap}
                        className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Compass size={14} weight="bold" />
                        <span>Inspect on Live GIS Map</span>
                      </button>

                      <button
                        onClick={handlePredictiveAnalysis}
                        className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-[12px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <TrendUp size={14} className="text-orange-500" weight="bold" />
                        <span>Run Predictive Analysis</span>
                      </button>
                    </div>

                    <button
                      onClick={handleGenerateReport}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-[12px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                    >
                      <Article size={14} weight="bold" />
                      <span>Generate Incident Report</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
