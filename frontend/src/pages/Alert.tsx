import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Fire,
  Warning,
  Planet,
  CheckCircle,
  Info,
  Sliders,
  Check,
  MapPin,
  Compass,
  ChartBar,
  Clock,
  Broadcast,
  Article,
  PaperPlaneTilt,
  Calculator,
  PencilSimple,
  X,
  Plus,
  Minus,
  Stack,
  ShieldWarning,
  EnvelopeSimple,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import Header from '../components/Header';

interface AlertProps {
  onNavigate?: (page: string) => void;
}

interface AlertItem {
  id: string;
  title: string;
  location: string;
  state: string;
  coords: [number, number];
  coordsStr: string;
  description: string;
  time: string;
  dateStr: string;
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority' | 'Informational';
  badgeType: 'High' | 'Medium' | 'Low' | 'Info';
  badgeColor: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  affectedArea: string;
  affectedAreaNum: number;
  confidenceScore: string;
  source: string;
  isRead: boolean;
  authorities: {
    id: string;
    name: string;
    agency: string;
    distance: string;
    phone: string;
    email: string;
    selected: boolean;
  }[];
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'alt-1',
    title: 'High Fire Activity Detected',
    location: 'Dibrugarh, Assam',
    state: 'Assam',
    coords: [27.4728, 95.0089],
    coordsStr: '27.4728° N, 95.0089° E',
    description:
      'Multiple fire hotspots detected in forest area. Rapid increase in fire activity observed in the last 3 hours. Possible cause: human activities (jhuming / land clearing).',
    time: '10:18 AM',
    dateStr: '9 Sep 2025, 10:18 AM',
    priority: 'High Priority',
    badgeType: 'High',
    badgeColor: 'bg-red-50 text-red-600 border border-red-200',
    icon: Fire,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    affectedArea: '~ 4,200 hectares',
    affectedAreaNum: 4200,
    confidenceScore: '87% (High)',
    source: 'NASA FIRMS (VIIRS)',
    isRead: false,
    authorities: [
      { id: 'auth-1', name: 'District Disaster Management Authority (DDMA)', agency: 'Emergency Management', distance: '6.4 km', phone: '+91 373 231 0122', email: 'ddma.dibrugarh@assam.gov.in', selected: true },
      { id: 'auth-2', name: 'Divisional Forest Office (DFO) Upper Assam', agency: 'Forestry & Wildfire Response', distance: '9.1 km', phone: '+91 373 232 4451', email: 'dfo.dibrugarh@assamforest.in', selected: true },
      { id: 'auth-3', name: 'State Fire & Emergency Services Station', agency: 'First Responders', distance: '4.8 km', phone: '101 / +91 373 232 0101', email: 'fire.station@dibrugarh.gov.in', selected: true },
      { id: 'auth-4', name: 'Superintendent of Police (Control Room)', agency: 'Law & Order / Evacuation', distance: '7.2 km', phone: '+91 373 232 0222', email: 'sp-dibrugarh@assampolice.gov.in', selected: false },
    ],
  },
  {
    id: 'alt-2',
    title: 'Increasing Fire Activity',
    location: 'Tinsukia, Assam',
    state: 'Assam',
    coords: [27.4922, 95.3468],
    coordsStr: '27.4922° N, 95.3468° E',
    description:
      'Fire activity increased by 65% in last 6 hours. High risk of spread to surrounding rural bamboo groves and reserve fringe.',
    time: '09:42 AM',
    dateStr: '9 Sep 2025, 09:42 AM',
    priority: 'Medium Priority',
    badgeType: 'Medium',
    badgeColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    icon: Fire,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    affectedArea: '~ 3,100 hectares',
    affectedAreaNum: 3100,
    confidenceScore: '76% (Moderate)',
    source: 'NASA FIRMS (VIIRS + MODIS)',
    isRead: false,
    authorities: [
      { id: 'auth-21', name: 'DDMA Tinsukia District', agency: 'Disaster Cell', distance: '5.2 km', phone: '+91 374 233 1155', email: 'ddma.tinsukia@assam.gov.in', selected: true },
      { id: 'auth-22', name: 'Margherita Forest Range Command', agency: 'Forestry Unit', distance: '14.0 km', phone: '+91 374 235 2200', email: 'forest.margherita@gov.in', selected: true },
    ],
  },
  {
    id: 'alt-3',
    title: 'High Risk Predicted',
    location: 'Sivasagar, Assam',
    state: 'Assam',
    coords: [26.9826, 94.6425],
    coordsStr: '26.9826° N, 94.6425° E',
    description:
      'AstraFlare AI model predicts high fire ignition risk in next 3 days due to elevated vapor pressure deficit and dry deciduous litter.',
    time: '08:15 AM',
    dateStr: '9 Sep 2025, 08:15 AM',
    priority: 'High Priority',
    badgeType: 'High',
    badgeColor: 'bg-red-50 text-red-600 border border-red-200',
    icon: Warning,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    affectedArea: '~ 1,950 hectares',
    affectedAreaNum: 1950,
    confidenceScore: '82% (AI Forecast)',
    source: 'AstraFlare Predictive Engine',
    isRead: false,
    authorities: [
      { id: 'auth-31', name: 'Sivasagar District Administration', agency: 'Collectorate', distance: '3.1 km', phone: '+91 377 222 2100', email: 'dc-sivasagar@assam.gov.in', selected: true },
    ],
  },
  {
    id: 'alt-4',
    title: 'New Satellite Data Available',
    location: 'Assam Region',
    state: 'Assam',
    coords: [26.2006, 92.9376],
    coordsStr: '26.2006° N, 92.9376° E',
    description:
      'Latest VIIRS day-pass overpass has been processed. 42 new hotspot coordinates ingested into central GIS layer.',
    time: '06:28 AM',
    dateStr: '9 Sep 2025, 06:28 AM',
    priority: 'Informational',
    badgeType: 'Info',
    badgeColor: 'bg-blue-50 text-blue-600 border border-blue-200',
    icon: Planet,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    affectedArea: 'Statewide Ingest',
    affectedAreaNum: 0,
    confidenceScore: '99% (Telemetry Ingest)',
    source: 'Suomi-NPP & NOAA-20 VIIRS',
    isRead: true,
    authorities: [],
  },
  {
    id: 'alt-5',
    title: 'Incident Contained',
    location: 'Karbi Anglong, Assam',
    state: 'Assam',
    coords: [26.1584, 93.3854],
    coordsStr: '26.1584° N, 93.3854° E',
    description:
      'Fire activity reduced drastically following local suppression efforts. Thermal perimeter successfully encircled.',
    time: 'Yesterday',
    dateStr: '8 Sep 2025, 04:10 PM',
    priority: 'Low Priority',
    badgeType: 'Low',
    badgeColor: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50',
    affectedArea: '~ 620 hectares',
    affectedAreaNum: 620,
    confidenceScore: '94% (Verified Contained)',
    source: 'Sentinel-2 SWIR + Ranger Confirmation',
    isRead: true,
    authorities: [],
  },
  {
    id: 'alt-6',
    title: 'Persistent Heat Source',
    location: 'Golaghat, Assam',
    state: 'Assam',
    coords: [26.5167, 93.9667],
    coordsStr: '26.5167° N, 93.9667° E',
    description:
      'Unusual thermal activity detected continuously for 48+ hours near industrial perimeter. Multi-temporal index flagged as refinery flare.',
    time: 'Yesterday',
    dateStr: '8 Sep 2025, 01:20 PM',
    priority: 'Medium Priority',
    badgeType: 'Medium',
    badgeColor: 'bg-amber-50 text-amber-600 border border-amber-200',
    icon: Fire,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    affectedArea: '12 hectares (Facility)',
    affectedAreaNum: 12,
    confidenceScore: '95% (Persistent Industrial)',
    source: 'NASA FIRMS 365-Day Archive',
    isRead: true,
    authorities: [
      { id: 'auth-61', name: 'Numaligarh Refinery Security & Fire Wing', agency: 'Industrial Safety', distance: '1.2 km', phone: '+91 377 626 5500', email: 'fire.safety@nrl.co.in', selected: true },
    ],
  },
  {
    id: 'alt-7',
    title: 'System Update',
    location: 'AstraFlare Platform',
    state: 'India',
    coords: [22.8, 82.5],
    coordsStr: 'National Telemetry Grid',
    description:
      'New AI model v2.4 for industrial flare distinction and predictive fire spread has been deployed to the live ingestion cluster.',
    time: '7 Sep 2025',
    dateStr: '7 Sep 2025, 12:00 PM',
    priority: 'Informational',
    badgeType: 'Info',
    badgeColor: 'bg-blue-50 text-blue-600 border border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    affectedArea: 'N/A',
    affectedAreaNum: 0,
    confidenceScore: '100%',
    source: 'AstraFlare Core Infrastructure',
    isRead: true,
    authorities: [],
  },
  {
    id: 'alt-8',
    title: 'Weather Alert',
    location: 'Assam Region',
    state: 'Assam',
    coords: [26.2006, 92.9376],
    coordsStr: 'Regional Atmospheric Cell',
    description:
      'High surface temperature (36.5°C) and low relative humidity (28%) conditions forecast across Brahmaputra valley over 48 hours.',
    time: '7 Sep 2025',
    dateStr: '7 Sep 2025, 08:30 AM',
    priority: 'High Priority',
    badgeType: 'High',
    badgeColor: 'bg-red-50 text-red-600 border border-red-200',
    icon: Warning,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    affectedArea: 'Valley-wide',
    affectedAreaNum: 0,
    confidenceScore: '90% (ECMWF Weather Model)',
    source: 'ECMWF & IMD Forecast Grid',
    isRead: true,
    authorities: [],
  },
];

export default function Alert({ onNavigate }: AlertProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [selectedAlertId, setSelectedAlertId] = useState<string>('alt-1');
  const [filterType, setFilterType] = useState<string>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);

  // Modal States for the 4 Requested Buttons
  const [isSendReportModalOpen, setIsSendReportModalOpen] = useState(false);
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [isEditReportModalOpen, setIsEditReportModalOpen] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Report form fields
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editPriority, setEditPriority] = useState<'High Priority' | 'Medium Priority' | 'Low Priority' | 'Informational'>('High Priority');

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];

  // Show a quick auto-dismiss toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    triggerToast('All notifications marked as read.');
  };

  // Toggle authority selection
  const handleToggleAuthority = (authId: string) => {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== selectedAlert.id) return a;
        return {
          ...a,
          authorities: a.authorities.map((auth) =>
            auth.id === authId ? { ...auth, selected: !auth.selected } : auth
          ),
        };
      })
    );
  };

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: selectedAlert.coords,
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Base Satellite Layer
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      ).addTo(map);

      // Place labels & boundaries
      L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, opacity: 0.85 }
      ).addTo(map);

      const markerGroup = L.layerGroup().addTo(map);
      markerGroupRef.current = markerGroup;
    } else {
      mapInstanceRef.current.setView(selectedAlert.coords, 11, { animate: true });
    }

    // Render hotspot rings and target markers
    if (markerGroupRef.current) {
      markerGroupRef.current.clearLayers();

      // Outer thermal anomaly cluster circles
      const offsets = [
        { lat: 0.015, lng: -0.012, radius: 2400, color: '#ef4444', opacity: 0.5 },
        { lat: -0.012, lng: 0.018, radius: 3200, color: '#f97316', opacity: 0.45 },
        { lat: 0.022, lng: 0.024, radius: 1800, color: '#eab308', opacity: 0.4 },
        { lat: -0.024, lng: -0.018, radius: 2000, color: '#f97316', opacity: 0.4 },
      ];

      offsets.forEach((o) => {
        L.circle([selectedAlert.coords[0] + o.lat, selectedAlert.coords[1] + o.lng], {
          radius: o.radius,
          color: o.color,
          weight: 1,
          fillColor: o.color,
          fillOpacity: o.opacity,
        }).addTo(markerGroupRef.current!);
      });

      // Central concentric bullseye ring on the epicenter
      L.circleMarker(selectedAlert.coords, {
        radius: 18,
        color: '#ffffff',
        weight: 3,
        fillColor: '#ef4444',
        fillOpacity: 0.85,
      }).addTo(markerGroupRef.current!);

      L.circleMarker(selectedAlert.coords, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 1,
      }).addTo(markerGroupRef.current!);

      // Site label banner
      L.marker(selectedAlert.coords, {
        icon: L.divIcon({
          html: `<div style="color:white;font-size:13px;font-weight:800;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.8);margin-left:22px;margin-top:-8px;">${selectedAlert.location}</div>`,
          className: '',
          iconSize: [120, 24],
          iconAnchor: [0, 0],
        }),
      }).addTo(markerGroupRef.current!);
    }
  }, [selectedAlert.coords]);

  // Clean up map
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    if (filterType === 'All') return true;
    if (filterType === 'Unread') return !a.isRead;
    return a.badgeType === filterType;
  });

  // Action 1: Send Report & Alert to Authorities
  const handleOpenSendReport = () => {
    setDispatchSuccess(false);
    setIsSendReportModalOpen(true);
  };

  const handleConfirmDispatch = () => {
    setDispatchSuccess(true);
    triggerToast(`Report & Priority Alert successfully dispatched to ${selectedAlert.authorities.filter(a => a.selected).length} authorities!`);
    setTimeout(() => {
      setIsSendReportModalOpen(false);
      setDispatchSuccess(false);
    }, 2000);
  };

  // Action 2: Run Damage & Resource Estimation
  const handleOpenEstimate = () => {
    setIsEstimateModalOpen(true);
  };

  // Action 3: Edit Report
  const handleOpenEditReport = () => {
    setEditTitle(selectedAlert.title);
    setEditDescription(selectedAlert.description);
    setEditArea(selectedAlert.affectedArea);
    setEditPriority(selectedAlert.priority);
    setIsEditReportModalOpen(true);
  };

  const handleSaveEditReport = () => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === selectedAlert.id
          ? {
              ...a,
              title: editTitle,
              description: editDescription,
              affectedArea: editArea,
              priority: editPriority,
            }
          : a
      )
    );
    setIsEditReportModalOpen(false);
    triggerToast('Report details updated successfully.');
  };

  // Action 4: Cancel
  const handleCancelAction = () => {
    setIsSendReportModalOpen(false);
    setIsEstimateModalOpen(false);
    setIsEditReportModalOpen(false);
    triggerToast('Action cancelled.');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* ═══════════════════════ UNIFIED NAVBAR ═══════════════════════ */}
      <Header activePage="Alert" onNavigate={onNavigate} />

      {/* ─── Notification Toast ─── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle size={18} weight="fill" className="text-emerald-400" />
          <span className="text-[13px] font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <main className="flex-1 px-8 py-5 flex flex-col gap-5 max-w-[1700px] w-full mx-auto">
        {/* ─── Top Header & Controls ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[26px] font-black text-gray-900 tracking-tight leading-none">
                Alert &amp; Notifications
              </h1>
              <span className="bg-red-50 border border-red-200 text-red-600 text-[11.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>3 Active Red Alerts</span>
              </span>
            </div>
            <p className="text-[13px] text-gray-400 mt-1.5 font-medium">
              Real-time alerts for fire incidents, risks, and critical updates
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Notification Settings Button */}
            <button
              onClick={() => triggerToast('Notification preferences: All channels enabled (SMS, Email, Push).')}
              className="flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-[13px] font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Sliders size={15} className="text-gray-500" />
              <span>Notification Settings</span>
            </button>

            {/* Mark All as Read Button */}
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 h-9 px-4 bg-[#ef4444] hover:bg-red-600 text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Check size={14} weight="bold" />
              <span>Mark All as Read</span>
            </button>
          </div>
        </div>

        {/* ─── Main Two Column Layout (Recent Alerts Left, Details & Map Right) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ══════════ LEFT COLUMN (5 COLS): RECENT ALERTS LIST ══════════ */}
          <div className="lg:col-span-5 bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            {/* Card Header with Filter */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900">
                <Article size={16} weight="bold" className="text-gray-600" />
                <span className="text-[14px] font-bold">Recent Alerts</span>
              </div>

              {/* Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-[12px] font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  <Sliders size={13} />
                  <span>Filter: {filterType}</span>
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-30 animate-in fade-in">
                    {['All', 'High', 'Medium', 'Low', 'Info', 'Unread'].map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setFilterType(f);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                          filterType === f ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Alerts List Container */}
            <div className="divide-y divide-gray-100 overflow-y-auto max-h-[720px]">
              {filteredAlerts.map((item) => {
                const Icon = item.icon;
                const isSelected = item.id === selectedAlert.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedAlertId(item.id);
                      setAlerts((prev) =>
                        prev.map((a) => (a.id === item.id ? { ...a, isRead: true } : a))
                      );
                    }}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-red-50/40 border-l-4 border-l-red-500'
                        : 'hover:bg-gray-50/70 border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Unread indicator */}
                    {!item.isRead && (
                      <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-red-500" />
                    )}

                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg} ${item.iconColor}`}
                    >
                      <Icon size={20} weight="fill" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-[13px] font-bold truncate leading-tight ${isSelected ? 'text-red-700' : 'text-gray-900'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10.5px] text-gray-400 font-medium shrink-0">
                          {item.time}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-gray-600 font-medium mt-0.5 truncate">
                        {item.location}
                      </p>

                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.badgeColor}`}>
                          {item.badgeType}
                        </span>
                        <span className="text-[10.5px] text-gray-400">
                          {item.source.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══════════ RIGHT COLUMN (7 COLS): MAP + DETAILED REPORT & AUTHORITIES ══════════ */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Card 1: Alert Location Map */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <MapPin size={16} weight="bold" className="text-gray-700" />
                  <span className="text-[14px] font-bold">Alert Location</span>
                </div>
                <div className="flex items-center gap-2 text-[11.5px] text-gray-500 font-medium">
                  <span>Target:</span>
                  <span className="font-bold text-gray-800">{selectedAlert.location}</span>
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative h-[270px] w-full bg-slate-900">
                <div ref={mapContainerRef} className="w-full h-full z-0" />

                {/* Left Floating Zoom Controls */}
                <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1">
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

                {/* Top Right Floating Legend Card */}
                <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-lg px-3 py-2 shadow-md min-w-[125px]">
                  <div className="space-y-1.5 text-[10.5px] font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                      <span>High Intensity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                      <span>Medium Intensity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                      <span>Low Intensity</span>
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

            {/* Card 2: Detailed Alert Information & Authority Dispatch */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-2xs flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedAlert.iconBg} ${selectedAlert.iconColor}`}>
                    {(() => {
                      const Icon = selectedAlert.icon;
                      return <Icon size={22} weight="fill" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[17px] font-black text-gray-900 leading-tight">
                        {selectedAlert.title}
                      </h3>
                      <span className="bg-red-50 text-red-600 border border-red-200 text-[10.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Fire size={12} weight="fill" />
                        <span>{selectedAlert.priority}</span>
                      </span>
                    </div>
                    <p className="text-[11.5px] text-gray-400 mt-0.5">
                      Coordinates: {selectedAlert.coordsStr}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-gray-400 font-medium">Detection Time</p>
                  <p className="text-[12.5px] font-black text-gray-800">{selectedAlert.dateStr}</p>
                </div>
              </div>

              {/* Grid of Key Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} weight="fill" className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 font-medium">Location:</span>
                    <p className="font-bold text-gray-900">{selectedAlert.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Compass size={16} weight="fill" className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 font-medium">Coordinates:</span>
                    <p className="font-bold text-gray-900 font-mono text-[11.5px]">{selectedAlert.coordsStr}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <ChartBar size={16} weight="bold" className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 font-medium">Affected Area (Est.):</span>
                    <p className="font-bold text-gray-900">{selectedAlert.affectedArea}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock size={16} weight="bold" className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 font-medium">Confidence Score:</span>
                    <p className="font-bold text-orange-600">{selectedAlert.confidenceScore}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <Broadcast size={16} weight="bold" className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 font-medium">Source:</span>
                    <p className="font-semibold text-gray-800">{selectedAlert.source}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <Article size={16} weight="bold" className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 font-medium">Description:</span>
                    <p className="text-gray-600 mt-0.5 leading-relaxed">{selectedAlert.description}</p>
                  </div>
                </div>
              </div>

              {/* ─── Nearby Authorities Section ─── */}
              <div className="mt-1 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 text-gray-800">
                    <ShieldWarning size={16} weight="fill" className="text-orange-500" />
                    <span className="text-[13px] font-bold">
                      Nearby Authorities ({selectedAlert.authorities.length} identified within 15 km)
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">
                    Select recipients for automated report packet
                  </span>
                </div>

                {selectedAlert.authorities.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAlert.authorities.map((auth) => (
                      <div
                        key={auth.id}
                        onClick={() => handleToggleAuthority(auth.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          auth.selected
                            ? 'bg-orange-50/50 border-orange-300 shadow-2xs'
                            : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={auth.selected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-orange-600 accent-orange-600 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-gray-900 truncate leading-tight">
                              {auth.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10.5px] text-gray-500 mt-0.5">
                              <span>{auth.agency}</span>
                              <span>•</span>
                              <span className="text-orange-600 font-semibold">{auth.distance} away</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 shrink-0">
                          <span className="hidden sm:inline font-mono">{auth.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-[12px] text-gray-500 text-center">
                    No immediate civic emergency agency within localized radius. Broadcast to state headquarters.
                  </div>
                )}
              </div>

              {/* ─── THE 4 USER REQUESTED BUTTONS ─── */}
              {/* "add 4 buttons: Send report, Estimate, Edit report, canel" */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2.5">
                {/* 1. Send Report Button */}
                <button
                  onClick={handleOpenSendReport}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 h-10 px-4 bg-[#ef4444] hover:bg-red-600 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <PaperPlaneTilt size={16} weight="fill" />
                  <span>Send Report</span>
                </button>

                {/* 2. Estimate Button */}
                <button
                  onClick={handleOpenEstimate}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 h-10 px-4 bg-white border border-blue-200 hover:border-blue-300 text-blue-600 hover:bg-blue-50/50 rounded-lg text-[13px] font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Calculator size={16} weight="bold" />
                  <span>Estimate</span>
                </button>

                {/* 3. Edit Report Button */}
                <button
                  onClick={handleOpenEditReport}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 h-10 px-4 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-[13px] font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <PencilSimple size={16} weight="bold" />
                  <span>Edit Report</span>
                </button>

                {/* 4. Cancel Button */}
                <button
                  onClick={handleCancelAction}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[13px] font-bold transition-colors cursor-pointer"
                >
                  <X size={15} weight="bold" />
                  <span>Cancel</span>
                </button>
              </div>

              {/* Extra Auxiliary Navigation Actions */}
              <div className="flex items-center justify-between text-[11.5px] pt-1">
                <button
                  onClick={() => onNavigate && onNavigate('Live Map')}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowSquareOut size={14} weight="bold" />
                  <span>View in Live Map</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('Predictive Analysis')}
                  className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Fire size={14} weight="fill" />
                  <span>Track Fire Spread Model</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Banner Bar ─── */}
        <div className="bg-[#fefce8] border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldWarning size={18} weight="fill" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">
                Early Alerts Save Lives
              </p>
              <p className="text-[12px] text-gray-600 mt-0.5">
                Our real-time monitoring and AI-powered alerts help authorities take quick action and prevent large-scale disasters.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('Report')}
            className="flex items-center gap-1 text-[12.5px] font-bold text-amber-900 hover:text-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-100/60 transition-colors shrink-0 cursor-pointer"
          >
            <span>Learn More</span>
            <ArrowSquareOut size={13} weight="bold" />
          </button>
        </div>
      </main>

      {/* ═══════════════════════ MODAL 1: SEND REPORT ═══════════════════════ */}
      {isSendReportModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            {!dispatchSuccess ? (
              <>
                <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                      <PaperPlaneTilt size={22} weight="fill" />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-black text-gray-900 leading-tight">
                        Dispatch Report to Authorities
                      </h3>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        Transmitting telemetry packet &amp; incident PDF
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setIsSendReportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                <div className="py-4 space-y-3.5 text-[12.5px]">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                    <p className="font-bold text-gray-800">{selectedAlert.title}</p>
                    <p className="text-gray-500 text-[11.5px]">{selectedAlert.location} • {selectedAlert.coordsStr}</p>
                    <p className="text-[11px] font-bold text-red-600">Affected Perimeter: {selectedAlert.affectedArea}</p>
                  </div>

                  <div>
                    <p className="font-bold text-gray-700 mb-1.5">
                      Selected Recipients ({selectedAlert.authorities.filter((a) => a.selected).length}):
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedAlert.authorities
                        .filter((a) => a.selected)
                        .map((auth) => (
                          <div key={auth.id} className="p-2 rounded-lg bg-orange-50/60 border border-orange-200/80 flex items-center justify-between text-[11.5px]">
                            <div>
                              <p className="font-bold text-gray-900">{auth.name}</p>
                              <p className="text-[10.5px] text-gray-500">{auth.email}</p>
                            </div>
                            <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                              SMS + Email + CAD
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-[11.5px] text-blue-900 flex items-start gap-2">
                    <EnvelopeSimple size={18} className="shrink-0 text-blue-600 mt-0.5" />
                    <p>
                      Automated packet includes: VIIRS hotspot geodata, Sentinel-2 SWIR scene, evacuation perimeter coordinates, and printable PDF report.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setIsSendReportModalOpen(false)}
                    className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDispatch}
                    className="h-9 px-5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[12.5px] font-bold shadow-sm"
                  >
                    Confirm &amp; Send Broadcast
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 animate-bounce">
                  <CheckCircle size={36} weight="fill" />
                </div>
                <h3 className="text-[18px] font-black text-gray-900">
                  Report Dispatched Successfully!
                </h3>
                <p className="text-[12.5px] text-gray-500 mt-1 max-w-sm">
                  Priority alert and PDF report packet sent to selected local disaster response units. Dispatch Tracking ID: <b>#AST-DISP-8921</b>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ MODAL 2: ESTIMATE (IMPACT & RESOURCES) ═══════════════════════ */}
      {isEstimateModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calculator size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-[17px] font-black text-gray-900 leading-tight">
                    Fire Impact &amp; Resource Estimate
                  </h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    Real-time AI projection based on current wind, topography, and fuel load
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEstimateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-[12.5px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50/60 p-3 rounded-xl border border-red-200/70">
                  <p className="text-[11px] text-gray-500 font-medium">Population at Risk</p>
                  <p className="text-[20px] font-black text-gray-900 mt-0.5">12,450</p>
                  <p className="text-[10.5px] text-red-600 font-semibold mt-0.5">Across 18 settlements</p>
                </div>

                <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200/70">
                  <p className="text-[11px] text-gray-500 font-medium">Carbon Loss (Est.)</p>
                  <p className="text-[20px] font-black text-gray-900 mt-0.5">~14,200 t</p>
                  <p className="text-[10.5px] text-orange-600 font-semibold mt-0.5">CO2 equivalent</p>
                </div>

                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/70">
                  <p className="text-[11px] text-gray-500 font-medium">Water Volume Required</p>
                  <p className="text-[20px] font-black text-gray-900 mt-0.5">450,000 L</p>
                  <p className="text-[10.5px] text-blue-600 font-semibold mt-0.5">3-day suppression cycle</p>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/70">
                  <p className="text-[11px] text-gray-500 font-medium">Firefighters Needed</p>
                  <p className="text-[20px] font-black text-gray-900 mt-0.5">85 Rangers</p>
                  <p className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">6 ground crew teams</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <p className="text-[12px] font-bold text-gray-800 mb-1">Recommended Response Directive:</p>
                <p className="text-[11.5px] text-gray-600 leading-relaxed">
                  Establish bulldozer firebreaks along the northern forest perimeter. Direct local water tenders to protect the 2 km buffer zone around Naharkatiya settlement.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsEstimateModalOpen(false)}
                className="h-9 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[12.5px] font-bold"
              >
                Close Estimate
              </button>
              <button
                onClick={() => {
                  setIsEstimateModalOpen(false);
                  handleOpenSendReport();
                }}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12.5px] font-bold"
              >
                Attach to Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ MODAL 3: EDIT REPORT ═══════════════════════ */}
      {isEditReportModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <PencilSimple size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="text-[17px] font-black text-gray-900 leading-tight">
                    Edit Incident Report
                  </h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    Modify analytical notes before transmitting to authorities
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEditReportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-[12.5px]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Report Heading / Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg text-[12.5px] focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Estimated Affected Area</label>
                <input
                  type="text"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg text-[12.5px] focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Incident Priority Classification</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as any)}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg text-[12.5px] focus:outline-none focus:border-orange-500 bg-white"
                >
                  <option value="High Priority">High Priority (Urgent)</option>
                  <option value="Medium Priority">Medium Priority (Moderate)</option>
                  <option value="Low Priority">Low Priority (Controlled)</option>
                  <option value="Informational">Informational Only</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Operational Description &amp; Directives</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:border-orange-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsEditReportModalOpen(false)}
                className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditReport}
                className="h-9 px-5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[12.5px] font-bold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
