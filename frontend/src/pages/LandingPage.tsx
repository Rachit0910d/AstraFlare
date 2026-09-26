import { useState } from 'react';
import {
  ArrowRight,
  Broadcast,
  Brain,
  ChartBar,
  Clock,
  Fire,
  Globe,
  MapPin,
  PlayCircle,
  Crosshair,
  Stack,
  X,
  ShieldCheck,
} from '@phosphor-icons/react';
import Header from '../components/Header';

// ─── Satellite image (ESRI World Imagery – no API key required) ───────────────
const SATELLITE_IMG =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export' +
  '?bbox=60%2C6%2C100%2C38&bboxSR=4326&size=760%2C570&imageSR=102100' +
  '&format=jpg&transparent=false&f=image';


const FEATURES = [
  {
    Icon: Broadcast,
    title: 'Real-time\nSatellite Data',
    sub: 'NASA FIRMS\nVIIRS / MODIS',
  },
  {
    Icon: Brain,
    title: 'AI-Powered\nClassification',
    sub: 'Industrial, Forest,\nAgricultural Fires',
  },
  {
    Icon: MapPin,
    title: 'GIS\nIntegration',
    sub: 'OpenStreetMap\n& Geospatial Layers',
  },
  {
    Icon: ChartBar,
    title: 'Actionable\nInsights',
    sub: 'Alerts, Risk Analysis\n& Reports',
  },
];

// ─── Side stat cards ──────────────────────────────────────────────────────────
const SIDE_STATS = [
  { Icon: Fire, value: '1,248', label: 'Active Fire Detections' },
  { Icon: Stack, value: '87', label: 'High Risk Areas' },
  { Icon: Crosshair, value: '95.6%', label: 'AI Classification Accuracy' },
  { Icon: Clock, value: 'Near Real-time', label: 'Data Updates' },
];

// ─── Stats strip ─────────────────────────────────────────────────────────────
const STATS_STRIP = [
  { img: "https://i.pinimg.com/1200x/28/28/a6/2828a69b7cb5660012632d7c37ccdb93.jpg", label: 'Global Coverage', value: '24/7', sub: 'Monitoring' },
  { img: "https://cdn-icons-png.flaticon.com/512/5882/5882873.png", label: 'Faster Response', value: 'Safer', sub: 'Communities' },
  { img: "https://static.thenounproject.com/png/1731722-200.png", label: 'Data Driven', value: 'A Cleaner', sub: 'Tomorrow' },
  { img: "https://cdn-icons-png.magnific.com/256/18366/18366281.png?semt=ais_white_label", label: 'Trusted by', value: 'Researchers, Governments', sub: '& Communities' },
];

// ─── Partners ─────────────────────────────────────────────────────────────────
const PARTNERS = [
  {
    logo: 'https://i.pinimg.com/1200x/c2/1f/53/c21f5355b233033b24a7f5db63708197.jpg',
    bg: '#0b3d91',
    name: 'NASA FIRMS',
    desc: 'Fire Information for Resource Management System',
  },
  {
    logo: 'https://i.pinimg.com/736x/0d/58/49/0d584925704e562ebe21a29a0730098e.jpg',
    bg: '#5eaa5e',
    name: 'OpenStreetMap',
    desc: 'Open Geospatial Data',
  },
  {
    logo: null,
    bg: '#dbeafe',
    name: 'A Safer Earth',
    desc: 'Through Open Data',
  },
];

interface LandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ════════════════════════ NAVBAR ════════════════════════ */}
      <Header activePage="Home" onNavigate={onNavigate} />

      {/* ════════════════════════ HERO ═════════════════════════ */}
      <section className="px-8 pt-10 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

        {/* ── Left copy ── */}
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.24em] uppercase text-gray-400 mb-5">
            Satellite Intelligence for a Safer Tomorrow
          </p>

          <h1 className="text-7xl font-black leading-[1.1] tracking-tight text-gray-900">
            Detect. Understand.
          </h1>
          <h1 className="text-6xl font-black leading-[1.1] tracking-tight text-orange-500 mt-1 mb-5">
            Prevent.
          </h1>

          <p className="text-[14.5px] leading-[1.75] text-gray-500 mb-8">
            AstraFlare uses NASA FIRMS satellite data, AI, and GIS to detect, classify, and
            monitor fires and persistent thermal sources in near real-time, helping build a
            safer and more resilient world.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-11">
            <button
              onClick={() => onNavigate && onNavigate('Live Map')}
              className="flex items-center gap-2 h-[46px] px-6 bg-orange-500 hover:bg-orange-600 text-white text-[13.5px] font-semibold rounded-[10px] transition-all shadow-md hover:shadow-lg group"
            >
              Explore Live Map
              <ArrowRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setShowDemoModal(true)}
              className="flex items-center gap-2.5 h-[46px] px-5 border-2 border-gray-200 hover:border-gray-300 text-gray-700 text-[13.5px] font-semibold rounded-[10px] transition-all hover:bg-gray-50 cursor-pointer"
            >
              <span className="w-[26px] h-[26px] bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                <PlayCircle size={16} weight="fill" className="text-white" />
              </span>
              Watch Demo
            </button>
          </div>

          {/* Feature icon grid */}
          <div className="grid lg:grid-cols-4 gap-5 xs:grid-cols-2 pt-8 border-t border-gray-100">
            {FEATURES.map(({ Icon, title, sub }) => (
              <div key={title} className="flex flex-col gap-2.5">
                <div className="w-[44px] h-[44px] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Icon size={46} weight="regular" className="text-gray-500" />
                </div>
                <p className="text-[20px] font-semibold text-gray-800 leading-snug whitespace-pre-line">{title}</p>
                <p className="text-[13px] text-gray-400 leading-snug whitespace-pre-line">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: map + side stats ── */}
        <div className="flex gap-3 ">

          {/* Satellite map */}
          <div className="relative flex  rounded-2xl overflow-hidden shadow-xl border border-gray-200">
            <img
              src={SATELLITE_IMG}
              alt="Satellite view of active fire detections across India (VIIRS)"
              className="w-full h-full  object-cover block"
              style={{ aspectRatio: '7/10' }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
                const parent = el.parentElement!;
                parent.style.background =
                  'linear-gradient(160deg, #1c2b1c 0%, #0e1a0e 50%, #090f1a 100%)';
              }}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5 pointer-events-none" />

            {/* Live badge */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-[4px] shrink-0 animate-pulse" />
                <div>
                  <p className="text-[12px] font-semibold text-gray-800 leading-none mb-[3px]">Live Satellite Feed</p>
                  <p className="text-[10.5px] text-gray-400 leading-none">NASA FIRMS (VIIRS / MODIS)</p>
                  <p className="text-[10.5px] text-gray-400 leading-none mt-[2px]">Last updated: 2 min ago</p>
                </div>
              </div>
            </div>

            {/* Bottom caption */}
            <p className="absolute bottom-2.5 left-3 text-white text-[10.5px] font-medium drop-shadow-md">
              Satellite view of active fire detections across India (VIIRS)
            </p>
          </div>

          {/* Side stats column */}
          <div className="flex flex-col gap-2.5 shrink-0 w-[195px]">

            {/* "Real Fires" card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-md px-4 py-3.5">
              <p className="text-sm font-bold text-gray-900 leading-snug">
                Real Fires. Real Action.<br />A Safer Tomorrow.
              </p>
              <div className="mt-2 w-8 h-[2.5px] bg-orange-500 rounded-full" />
            </div>

            {/* Stat items */}
            <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-md px-4 py-3 flex flex-col justify-around gap-1">
              {SIDE_STATS.map(({ Icon, value, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon size={44} weight="duotone" className={`shrink-0`} />
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 leading-tight">{value}</p>
                    <p className="text-[10.5px] text-gray-400 leading-tight">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════ STATS STRIP ════════════════════ */}
      <div className="border-t border-b border-gray-100 bg-gray-50/60">
        <div className="px-8">
          <div className="grid lg:grid-cols-4 divide-x divide-gray-200">
            {STATS_STRIP.map(({ img, label, value, sub }) => (
              <div key={label} className="flex items-center gap-4 py-5 px-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0">
                  <img src={img} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-[14px] font-bold text-gray-900 leading-tight">{value}</p>
                  <p className="text-[13px] text-gray-500 leading-tight">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════ DATA PARTNERS ═══════════════════ */}
      <section className="px-8 py-9">
        <div className="lg:flex flex-col items-center gap-8">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-gray-400 shrink-0 whitespace-nowrap">
            Our Data Partners
          </p>
          <div className="lg:flex lg:flex-1  gap-4">
            {PARTNERS.map(({ logo, bg, name, desc }) => (
              <div
                key={name}
                className="flex items-center gap-3 flex-1 border border-gray-100 rounded-xl px-4 py-3 hover:shadow-md transition-shadow bg-white cursor-pointer"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: bg }}
                >
                  {logo ? (
                    <img src={logo} alt={name} className="w-full h-full object-contain" />
                  ) : (
                    <Globe size={44} weight="regular" className="text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-800">{name}</p>
                  <p className="text-[11px] text-gray-400 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-gray-100 py-5 text-center">
        <p className="text-[11.5px] text-gray-400">
          © {new Date().getFullYear()} AstraFlare · Satellite Intelligence for a Safer Tomorrow
        </p>
      </footer>

      {/* ════════════════════ DEMO MODAL ════════════════════ */}
      {showDemoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                <span className="font-bold text-gray-900 text-base">AstraFlare Interactive Demo & Pipeline</span>
                <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">v2.4 Live</span>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Simulation visual banner */}
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
                <img
                  src={SATELLITE_IMG}
                  alt="AstraFlare Satellite Detection Engine"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Simulated Radar / Hotspot Overlay */}
                <div className="relative z-10 flex flex-col items-center text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(249,115,22,0.5)]">
                    <Fire size={28} weight="fill" className="text-orange-400 animate-bounce" />
                  </div>
                  <h3 className="text-white text-lg font-bold">Autonomous Satellite Telemetry & Fire Detection</h3>
                  <p className="text-slate-300 text-xs mt-1 max-w-md">
                    NASA FIRMS VIIRS (375m) & MODIS (1km) sensors stream active thermal anomalies directly into PostgreSQL EPSG:3857 planar coordinates.
                  </p>
                </div>

                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AI Model Active: Random Forest + XGBoost Ensemble (95.6% acc)
                </div>
              </div>

              {/* 3 Steps Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Broadcast size={18} className="text-orange-500" />
                    <span className="text-xs font-bold text-gray-800">1. Real-Time Ingest</span>
                  </div>
                  <p className="text-[11.5px] text-gray-500 leading-relaxed">
                    Automated cron syncs with NASA FIRMS open API and parses brightness temperature & FRP.
                  </p>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Brain size={18} className="text-indigo-500" />
                    <span className="text-xs font-bold text-gray-800">2. Spread Risk AI</span>
                  </div>
                  <p className="text-[11.5px] text-gray-500 leading-relaxed">
                    Analyzes wind speed, humidity, and vegetation indices to simulate 24h spread contours.
                  </p>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <span className="text-xs font-bold text-gray-800">3. Buffer Alerts</span>
                  </div>
                  <p className="text-[11.5px] text-gray-500 leading-relaxed">
                    Identifies vulnerable settlements & industries within a 5km radius for rapid evacuation.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  if (onNavigate) onNavigate('Live Map');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Launch Live Satellite Map
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
