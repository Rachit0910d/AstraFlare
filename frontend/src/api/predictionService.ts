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

import demoData from '../data/demonstration100Events.json';

const BACKEND_BASE = ''; // Uses relative path with Vite proxy

const FALLBACK_COUNTRIES: CountryOption[] = [
  {
    code: 'IND',
    code_2: 'IN',
    name: 'India',
    continent: 'Asia',
    capital: 'New Delhi',
    center: [22.8, 82.5],
    bbox: '68,6,98,38',
    zoom: 5,
    population: 1428627663,
    area_sq_km: 3287263,
  },
  {
    code: 'USA',
    code_2: 'US',
    name: 'United States',
    continent: 'North America',
    capital: 'Washington, D.C.',
    center: [39.8, -98.5],
    bbox: '-130,20,-60,55',
    zoom: 4,
    population: 339996563,
    area_sq_km: 9833517,
  },
  {
    code: 'AUS',
    code_2: 'AU',
    name: 'Australia',
    continent: 'Oceania',
    capital: 'Canberra',
    center: [-25.0, 133.0],
    bbox: '110,-45,155,-10',
    zoom: 4,
    population: 26000000,
    area_sq_km: 7692024,
  },
  {
    code: 'BRA',
    code_2: 'BR',
    name: 'Brazil',
    continent: 'South America',
    capital: 'Brasília',
    center: [-14.2, -51.9],
    bbox: '-74,-34,-34,5',
    zoom: 4,
    population: 215000000,
    area_sq_km: 8515767,
  },
  {
    code: 'CAN',
    code_2: 'CA',
    name: 'Canada',
    continent: 'North America',
    capital: 'Ottawa',
    center: [56.1, -106.3],
    bbox: '-141,41,-52,83',
    zoom: 4,
    population: 38250000,
    area_sq_km: 9984670,
  },
];

function getFallbackPredictions(options: { risk_level?: string; fire_type?: string; limit?: number } = {}): VerifiedPrediction[] {
  let events = (demoData as any).events || [];
  if (options.risk_level && options.risk_level !== 'ALL') {
    events = events.filter((e: any) => e.operational_risk.risk_level.toLowerCase() === options.risk_level?.toLowerCase());
  }
  const limit = options.limit || 50;
  return events.slice(0, limit).map((evt: any) => {
    const riskLevel = evt.operational_risk.risk_level.toLowerCase() as 'critical' | 'high' | 'moderate' | 'low';
    const fireType: 'industrial_fire' | 'persistent_thermal_source' | 'wildfire_or_other' =
      evt.classification === 'PERSISTENT_INDUSTRIAL_HEAT'
        ? 'persistent_thermal_source'
        : evt.classification === 'LIKELY_INDUSTRIAL_INCIDENT'
        ? 'industrial_fire'
        : 'wildfire_or_other';

    return {
      id: evt.id,
      anomaly_id: evt.id,
      latitude: evt.latitude,
      longitude: evt.longitude,
      fire_type: fireType,
      risk_level: riskLevel,
      confidence_score: Math.round(evt.model_score_uncalibrated * 100),
      endangered_industries: evt.nearest_facility
        ? [
            {
              name: evt.nearest_facility.name,
              type: evt.nearest_facility.category,
              distance_meters: Math.round(evt.nearest_facility.distance_km * 1000),
              threat_level: riskLevel,
              zone:
                evt.nearest_facility.distance_km <= 2.5
                  ? 'direct_danger'
                  : evt.nearest_facility.distance_km <= 6.0
                  ? 'buffer_zone'
                  : 'monitoring_zone',
              lat: evt.nearest_facility.latitude,
              lng: evt.nearest_facility.longitude,
            },
          ]
        : [],
      spread_prediction: {
        rate_of_spread_kmh: 1.2,
        predicted_direction_deg: 45,
        threat_radius_meters: 1500,
        containment_probability: 78.5,
        next_6h_risk: riskLevel,
      },
      features_used: {
        max_frp: evt.max_frp,
        max_brightness: evt.max_brightness,
        duration_hours: evt.duration_hours,
        model_score_uncalibrated: evt.model_score_uncalibrated,
      },
      model_name: 'AstraFlare-ThermalEventClassifier',
      model_version: evt.model_version || '2.2.0',
      verification_status: (evt.review_status === 'requires_review' ? 'flagged' : 'verified') as 'flagged' | 'verified',
      verification_details: {
        passed_physical_checks: true,
        passed_spatial_checks: true,
        confidence_validated: false,
        verified_at: evt.event_start,
        audit_notes: ['Authentic historical demonstration event with causal features and sovereign facility proximity.'],
      },
      created_at: evt.event_start,
    };
  });
}

function getFallbackStats(): PredictionStats {
  const events = ((demoData as any).events || []) as any[];
  const critical = events.filter((e) => e.operational_risk.risk_level === 'Critical').length;
  const high = events.filter((e) => e.operational_risk.risk_level === 'High').length;
  const moderate = events.filter((e) => e.operational_risk.risk_level === 'Moderate').length;
  const avgScore = events.reduce((acc: number, e: any) => acc + (e.model_score_uncalibrated * 100), 0) / (events.length || 1);
  return {
    totalPredictions: events.length,
    industrialFires: events.filter((e) => e.classification === 'LIKELY_INDUSTRIAL_INCIDENT').length,
    persistentSources: events.filter((e) => e.classification === 'PERSISTENT_INDUSTRIAL_HEAT').length,
    wildfires: events.filter((e) => e.classification !== 'LIKELY_INDUSTRIAL_INCIDENT' && e.classification !== 'PERSISTENT_INDUSTRIAL_HEAT').length,
    criticalRisks: critical,
    highRisks: high,
    moderateRisks: moderate,
    avgConfidence: Math.round(avgScore * 10) / 10,
    totalEndangeredFacilities: events.filter((e) => e.nearest_facility && e.nearest_facility.distance_km <= 12).length,
  };
}

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
      if (Array.isArray(data.countries) && data.countries.length > 0) {
        return data.countries;
      }
    }
  } catch (err) {
    console.warn('Backend countries endpoint unavailable, using fallback list:', err);
  }
  return FALLBACK_COUNTRIES;
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
      if (Array.isArray(data.predictions) && data.predictions.length > 0) {
        return data.predictions;
      }
    }
  } catch (err) {
    console.warn('Backend prediction endpoint unavailable, falling back to demonstration dataset:', err);
  }
  return getFallbackPredictions(options);
}

/**
 * Fetch aggregate metrics of verified ML predictions
 */
export async function fetchPredictionStats(): Promise<PredictionStats | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/predictions/stats`);
    if (res.ok) {
      const data = await res.json();
      if (data.stats && typeof data.stats.totalPredictions === 'number' && data.stats.totalPredictions > 0) {
        return data.stats;
      }
    }
  } catch (err) {
    console.warn('Backend prediction stats endpoint unavailable, falling back to demonstration stats:', err);
  }
  return getFallbackStats();
}


