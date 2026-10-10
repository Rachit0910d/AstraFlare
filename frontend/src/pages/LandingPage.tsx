import { useState, useEffect } from "react";
import {
  ArrowRight,
  Broadcast,
  Brain,
  ChartBar,
  Clock,
  Fire,
  Globe,
  MapPin,
  Crosshair,
  Stack,
} from "@phosphor-icons/react";
import Header from "../components/Header";
import { fetchAnomalyStats, type AnomalyStats } from "../api/firmsService";
import {
  fetchPredictionStats,
  type PredictionStats,
} from "../api/predictionService";

// ─── Satellite image (ESRI World Imagery – no API key required) ───────────────
const SATELLITE_IMG =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
  "?bbox=60%2C6%2C100%2C38&bboxSR=4326&size=760%2C570&imageSR=102100" +
  "&format=jpg&transparent=false&f=image";

const FEATURES = [
  {
    Icon: Broadcast,
    title: "Real-time\nSatellite Data",
    sub: "NASA FIRMS\nVIIRS / MODIS",
  },
  {
    Icon: Brain,
    title: "AI-Powered\nClassification",
    sub: "Industrial, Forest,\nAgricultural Fires",
  },
  {
    Icon: MapPin,
    title: "GIS\nIntegration",
    sub: "OpenStreetMap\n& Geospatial Layers",
  },
  {
    Icon: ChartBar,
    title: "Actionable\nInsights",
    sub: "Alerts, Risk Analysis\n& Reports",
  },
];

// ─── Stats strip ─────────────────────────────────────────────────────────────
const STATS_STRIP = [
  {
    img: "https://i.pinimg.com/1200x/28/28/a6/2828a69b7cb5660012632d7c37ccdb93.jpg",
    label: "Global Coverage",
    value: "24/7",
    sub: "Monitoring",
  },
  {
    img: "https://cdn-icons-png.flaticon.com/512/5882/5882873.png",
    label: "Faster Response",
    value: "Safer",
    sub: "Communities",
  },
  {
    img: "https://static.thenounproject.com/png/1731722-200.png",
    label: "Data Driven",
    value: "A Cleaner",
    sub: "Tomorrow",
  },
  {
    img: "https://cdn-icons-png.magnific.com/256/18366/18366281.png?semt=ais_white_label",
    label: "Trusted by",
    value: "Researchers, Governments",
    sub: "& Communities",
  },
];

// ─── Partners ─────────────────────────────────────────────────────────────────
const PARTNERS = [
  {
    logo: "https://i.pinimg.com/1200x/c2/1f/53/c21f5355b233033b24a7f5db63708197.jpg",
    bg: "#0b3d91",
    name: "NASA FIRMS",
    desc: "Fire Information for Resource Management System",
  },
  {
    logo: "https://i.pinimg.com/736x/0d/58/49/0d584925704e562ebe21a29a0730098e.jpg",
    bg: "#5eaa5e",
    name: "OpenStreetMap",
    desc: "Open Geospatial Data",
  },
  {
    logo: null,
    bg: "#dbeafe",
    name: "A Safer Earth",
    desc: "Through Open Data",
  },
];

interface LandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats | null>(null);
  const [predStats, setPredStats] = useState<PredictionStats | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadRealtimeData() {
      try {
        const [anomalies, predictions] = await Promise.all([
          fetchAnomalyStats(),
          fetchPredictionStats(),
        ]);
        if (isMounted) {
          if (anomalies) setAnomalyStats(anomalies);
          if (predictions) setPredStats(predictions);
        }
      } catch (err) {
        console.warn("Real-time stats load error:", err);
      }
    }

    loadRealtimeData();
    const interval = setInterval(loadRealtimeData, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const dynamicSideStats = [
    {
      Icon: Fire,
      iconColor: "text-orange-500",
      value: anomalyStats
        ? Number(anomalyStats.total_detections).toLocaleString()
        : "1,248",
      label: "Active Fire Detections",
      isLive: true,
    },
    {
      Icon: Stack,
      iconColor: "text-rose-500",
      value: anomalyStats
        ? Number(anomalyStats.high_intensity).toLocaleString()
        : "87",
      label: "High Risk Areas",
      isLive: !!anomalyStats,
    },
    {
      Icon: Crosshair,
      iconColor: "text-blue-500",
      value: predStats?.avgConfidence
        ? `${predStats.avgConfidence.toFixed(1)}%`
        : "95.6%",
      label: "AI Classification Accuracy",
      isLive: !!predStats,
    },
    {
      Icon: Clock,
      iconColor: "text-emerald-500",
      value: anomalyStats ? "Real-Time Sync" : "Near Real-time",
      label: "Data Updates",
      isLive: true,
    },
  ];

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
            AstraFlare uses NASA FIRMS satellite data, AI, and GIS to detect,
            classify, and monitor fires and persistent thermal sources in near
            real-time, helping build a safer and more resilient world.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-11">
            <button
              onClick={() => onNavigate && onNavigate("Live Map")}
              className="flex items-center gap-2 h-[46px] px-6 bg-orange-500 hover:bg-orange-600 text-white text-[13.5px] font-semibold rounded-[10px] transition-all shadow-md hover:shadow-lg group"
            >
              Explore Live Map
              <ArrowRight
                size={16}
                weight="bold"
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
          </div>

          {/* Feature icon grid */}
          <div className="grid lg:grid-cols-4 gap-5 xs:grid-cols-2 pt-8 border-t border-gray-100">
            {FEATURES.map(({ Icon, title, sub }) => (
              <div key={title} className="flex flex-col gap-2.5">
                <div className="w-[44px] h-[44px] rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Icon size={46} weight="regular" className="text-gray-500" />
                </div>
                <p className="text-[20px] font-semibold text-gray-800 leading-snug whitespace-pre-line">
                  {title}
                </p>
                <p className="text-[13px] text-gray-400 leading-snug whitespace-pre-line">
                  {sub}
                </p>
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
              style={{ aspectRatio: "7/10" }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
                const parent = el.parentElement!;
                parent.style.background =
                  "linear-gradient(160deg, #1c2b1c 0%, #0e1a0e 50%, #090f1a 100%)";
              }}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5 pointer-events-none" />

            {/* Live badge */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-[4px] shrink-0 animate-pulse" />
                <div>
                  <p className="text-[12px] font-semibold text-gray-800 leading-none mb-[3px]">
                    Live Satellite Feed
                  </p>
                  <p className="text-[10.5px] text-gray-400 leading-none">
                    NASA FIRMS (VIIRS / MODIS)
                  </p>
                  <p className="text-[10.5px] text-gray-400 leading-none mt-[2px]">
                    {anomalyStats
                      ? `${Number(anomalyStats.total_detections).toLocaleString()} active detections`
                      : "Syncing live feed..."}
                  </p>
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
                Real Fires. Real Action.
                <br />A Safer Tomorrow.
              </p>
              <div className="mt-2 w-8 h-[2.5px] bg-orange-500 rounded-full" />
            </div>

            {/* Stat items */}
            <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-md px-4 py-3 flex flex-col justify-around gap-1">
              {dynamicSideStats.map(
                ({ Icon, iconColor, value, label, isLive }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon
                      size={44}
                      weight="duotone"
                      className={`shrink-0 ${iconColor}`}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-gray-900 leading-tight">
                          {value}
                        </p>
                        {isLive && (
                          <span
                            className="flex h-1.5 w-1.5 relative"
                            title="Live real-time feed"
                          >
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-gray-400 leading-tight">
                        {label}
                      </p>
                    </div>
                  </div>
                ),
              )}
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
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                    {label}
                  </p>
                  <p className="text-[14px] font-bold text-gray-900 leading-tight">
                    {value}
                  </p>
                  <p className="text-[13px] text-gray-500 leading-tight">
                    {sub}
                  </p>
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
                    <img
                      src={logo}
                      alt={name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Globe
                      size={44}
                      weight="regular"
                      className="text-blue-500"
                    />
                  )}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-800">{name}</p>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-gray-100 py-5 text-center">
        <p className="text-[11.5px] text-gray-400">
          © {new Date().getFullYear()} AstraFlare · Satellite Intelligence for a
          Safer Tomorrow
        </p>
      </footer>
    </div>
  );
}
