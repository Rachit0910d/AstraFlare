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

const BACKEND_BASE = ''; // Uses relative path with Vite proxy

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
