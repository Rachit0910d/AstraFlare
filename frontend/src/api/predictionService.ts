export interface EndangeredIndustry {
  id?: string;
  name: string;
  type: string;
  distance_meters: number;
  threat_level: 'critical' | 'high' | 'moderate' | 'low';
  zone: 'direct_danger' | 'buffer_zone' | 'monitoring_zone';
  estimated_workers?: number;
  critical_materials?: string[];
  lat?: number;
  lng?: number;
}

export interface SpreadPrediction {
  rate_of_spread_kmh: number;
  predicted_direction_deg: number;
  threat_radius_meters: number;
  containment_probability: number;
  next_6h_risk: 'critical' | 'high' | 'moderate' | 'low';
}

export interface VerifiedPrediction {
  id: number;
  anomaly_id?: number;
  latitude: number;
  longitude: number;
  fire_type: 'industrial_fire' | 'persistent_thermal_source' | 'wildfire_or_other';
  risk_level: 'critical' | 'high' | 'moderate' | 'low';
  confidence_score: number;
  endangered_industries: EndangeredIndustry[];
  spread_prediction?: SpreadPrediction;
  features_used?: Record<string, unknown>;
  model_name?: string;
  model_version?: string;
  verification_status: 'verified' | 'flagged' | 'pending';
  verification_details?: {
    passed_physical_checks: boolean;
    passed_spatial_checks: boolean;
    confidence_validated: boolean;
    verified_at: string;
    audit_notes: string[];
  };
  created_at?: string;
}

export interface PredictionStats {
  totalPredictions: number;
  industrialFires: number;
  persistentSources: number;
  wildfires: number;
  criticalRisks: number;
  highRisks: number;
  moderateRisks: number;
  avgConfidence: number;
  totalEndangeredFacilities: number;
}

export interface CountryOption {
  code: string;
  code_2: string;
  name: string;
  continent: string;
  capital: string;
  center: [number, number];
  bbox: string;
  zoom: number;
  population: number;
  area_sq_km: number;
}

export interface CountryAnalysisData {
  country: CountryOption;
  metrics: {
    aiConfidence: string;
    dangerIndustriesCount: number;
    highRiskArea: string;
    highRiskGrowth: string;
    populationAtRisk: string;
    populationSettlements: string;
    infrastructureNodes: string;
    totalDetectionsInDb: number;
    highIntensityDetections: number;
    totalFrpMw: number;
    avgBrightnessK: number;
    latestAcquisition: string;
  };
  riskZones: Array<{
    center: [number, number];
    radius: number;
    color: string;
    fillColor: string;
    fillOpacity: number;
    weight: number;
    label: string;
  }>;
  cities: Array<{ name: string; lat: number; lng: number }>;
  industries: Array<{
    name: string;
    sector: string;
    distance: string;
    threat: string;
    threatColor: string;
    confidence: number;
    material: string;
    action: string;
    actionColor: string;
    lat: number;
    lng: number;
  }>;
  vulnerableAreas: Array<{
    area: string;
    riskLevel: string;
    riskBadge: string;
    population: string;
    action: string;
    actionColor: string;
  }>;
  impactMetrics: Array<{
    label: string;
    value: string;
    risk: string;
    riskColor: string;
    icon: string;
  }>;
  forecastPoints: Array<{
    date: string;
    area: number;
    x: number;
    y: number;
    active?: boolean;
  }>;
  telemetry: {
    dbQueryDurationMs: number;
    queriedAt: string;
    totalRecordsEvaluated: number;
    isDatabaseLive: boolean;
  };
}

const BACKEND_BASE = ''; // Uses relative path with Vite proxy

/**
 * Fetch all countries from the PostgreSQL database directory
 */
export async function fetchCountries(query?: string, continent?: string): Promise<CountryOption[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (continent && continent !== 'ALL') params.append('continent', continent);

    const res = await fetch(`${BACKEND_BASE}/api/countries?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.countries || [];
    }
  } catch (err) {
    console.warn('Backend countries endpoint unavailable:', err);
  }
  return [];
}

/**
 * Query real-time database predictive analysis for any country in the world
 */
export async function fetchCountryPredictiveAnalysis(code: string): Promise<CountryAnalysisData | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/countries/${encodeURIComponent(code)}/predictive-analysis`);
    if (res.ok) {
      const data = await res.json();
      return data.analysis || null;
    }
  } catch (err) {
    console.warn(`Backend predictive analysis query failed for country ${code}:`, err);
  }
  return null;
}

/**
 * Fetch verified ML predictions from PostgreSQL backend
 */
export async function fetchVerifiedPredictions(options: {
  risk_level?: string;
  fire_type?: string;
  limit?: number;
} = {}): Promise<VerifiedPrediction[]> {
  try {
    const params = new URLSearchParams();
    if (options.risk_level && options.risk_level !== 'ALL') params.append('risk_level', options.risk_level);
    if (options.fire_type && options.fire_type !== 'ALL') params.append('fire_type', options.fire_type);
    if (options.limit) params.append('limit', String(options.limit));

    const res = await fetch(`${BACKEND_BASE}/api/predictions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.predictions || [];
    }
  } catch (err) {
    console.warn('Backend prediction endpoint unavailable:', err);
  }
  return [];
}

/**
 * Fetch aggregate metrics of verified ML predictions
 */
export async function fetchPredictionStats(): Promise<PredictionStats | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/predictions/stats`);
    if (res.ok) {
      const data = await res.json();
      return data.stats || null;
    }
  } catch (err) {
    console.warn('Backend prediction stats endpoint unavailable:', err);
  }
  return null;
}

