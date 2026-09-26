export type FireType = 'industrial_fire' | 'persistent_thermal_source' | 'wildfire_or_other';
export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';
export type VerificationStatus = 'verified' | 'flagged' | 'pending';

export interface ThermalAnomalyProperties {
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  crs: string;
  projected_coords?: [number, number];
  brightness: number;
  bright_ti4?: number;
  bright_ti5?: number;
  scan?: number;
  track?: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  version?: string;
  frp: number;
  daynight: string;
  intensity: 'high' | 'medium' | 'low';
  source?: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: ThermalAnomalyProperties;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata?: {
    total: number;
    bbox?: string;
    queryTime?: string;
  };
}

export interface AnomalyRecord {
  id?: number;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  crs: string;
  bright_ti4: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  version: string;
  bright_ti5: number;
  frp: number;
  daynight: string;
  intensity: string;
  geojson: GeoJSONFeature;
}

export interface EndangeredIndustry {
  id?: string;
  name: string;
  type: string; // e.g. 'Petrochemical Refinery', 'Chemical Plant', 'Thermal Power Plant', 'Textile Factory'
  distance_meters: number;
  threat_level: RiskLevel;
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
  next_6h_risk: RiskLevel;
}

export interface PredictionSubmission {
  anomaly_id?: number;
  latitude: number;
  longitude: number;
  fire_type: FireType;
  risk_level: RiskLevel;
  confidence_score: number; // 0 to 100
  endangered_industries: EndangeredIndustry[];
  spread_prediction?: SpreadPrediction;
  features_used?: Record<string, unknown>;
  model_name?: string;
  model_version?: string;
}

export interface VerifiedPredictionRecord extends PredictionSubmission {
  id?: number;
  verification_status: VerificationStatus;
  verification_details: {
    passed_physical_checks: boolean;
    passed_spatial_checks: boolean;
    confidence_validated: boolean;
    verified_at: string;
    audit_notes: string[];
  };
  created_at?: string;
}

export interface IngestionResult {
  totalFetched: number;
  insertedOrUpdated: number;
  sourcesChecked: Array<{ source: string; count: number }>;
  errors: Array<{ source: string; error?: string; message?: string }>;
}
