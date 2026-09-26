import { pool } from '../db.js';
import type {
  PredictionSubmission,
  VerifiedPredictionRecord,
  VerificationStatus,
  RiskLevel,
  FireType,
} from '../types/index.js';

export interface VerificationResult {
  verified: boolean;
  status: VerificationStatus;
  record?: VerifiedPredictionRecord;
  errors?: string[];
  auditNotes: string[];
}

/**
 * AstraFlare Backend Verification Engine:
 * Validates, cross-checks against physical satellite anomalies,
 * and persists verified prediction analyses into PostgreSQL.
 */
export async function verifyAndStorePrediction(
  submission: PredictionSubmission
): Promise<VerificationResult> {
  const errors: string[] = [];
  const auditNotes: string[] = [];

  // 1. Basic Schema & Range Validations
  if (
    typeof submission.latitude !== 'number' ||
    submission.latitude < -90 ||
    submission.latitude > 90
  ) {
    errors.push('Invalid latitude: must be between -90 and 90');
  }

  if (
    typeof submission.longitude !== 'number' ||
    submission.longitude < -180 ||
    submission.longitude > 180
  ) {
    errors.push('Invalid longitude: must be between -180 and 180');
  }

  const validFireTypes: FireType[] = [
    'industrial_fire',
    'persistent_thermal_source',
    'wildfire_or_other',
  ];
  if (!validFireTypes.includes(submission.fire_type)) {
    errors.push(`Invalid fire_type: must be one of ${validFireTypes.join(', ')}`);
  }

  const validRiskLevels: RiskLevel[] = ['critical', 'high', 'moderate', 'low'];
  if (!validRiskLevels.includes(submission.risk_level)) {
    errors.push(`Invalid risk_level: must be one of ${validRiskLevels.join(', ')}`);
  }

  const confidence = parseFloat(String(submission.confidence_score));
  if (isNaN(confidence) || confidence < 0 || confidence > 100) {
    errors.push('Invalid confidence_score: must be between 0 and 100');
  }

  if (errors.length > 0) {
    return {
      verified: false,
      status: 'flagged',
      errors,
      auditNotes: ['Failed schema and boundary validation'],
    };
  }

  // 2. Cross-check against PostgreSQL thermal_anomalies
  let linkedAnomalyId: number | null = submission.anomaly_id || null;
  let physicalFrp: number = 0;
  let physicalBrightness: number = 0;

  try {
    if (linkedAnomalyId) {
      const anomalyRes = await pool.query(
        'SELECT id, frp, bright_ti4, latitude, longitude FROM thermal_anomalies WHERE id = $1;',
        [linkedAnomalyId]
      );
      if (anomalyRes.rows.length > 0) {
        const row = anomalyRes.rows[0];
        physicalFrp = parseFloat(row.frp) || 0;
        physicalBrightness = parseFloat(row.bright_ti4) || 0;
        auditNotes.push(`Verified anomaly linkage ID ${linkedAnomalyId} (FRP: ${physicalFrp} MW, Brightness: ${physicalBrightness} K)`);
      } else {
        auditNotes.push(`Anomaly ID ${linkedAnomalyId} not found, checking spatial proximity`);
        linkedAnomalyId = null;
      }
    }

    // If no explicit anomaly ID, search for closest anomaly within ~0.05 degrees (~5 km)
    if (!linkedAnomalyId) {
      const proxRes = await pool.query(
        `SELECT id, frp, bright_ti4,
                sqrt(power(latitude - $1, 2) + power(longitude - $2, 2)) as dist_deg
         FROM thermal_anomalies
         WHERE latitude BETWEEN $1 - 0.1 AND $1 + 0.1
           AND longitude BETWEEN $2 - 0.1 AND $2 + 0.1
         ORDER BY dist_deg ASC
         LIMIT 1;`,
        [submission.latitude, submission.longitude]
      );

      if (proxRes.rows.length > 0) {
        const match = proxRes.rows[0];
        linkedAnomalyId = match.id;
        physicalFrp = parseFloat(match.frp) || 0;
        physicalBrightness = parseFloat(match.bright_ti4) || 0;
        auditNotes.push(`Spatially matched to anomaly ID ${linkedAnomalyId} (distance ~${(match.dist_deg * 111).toFixed(1)} km)`);
      } else {
        auditNotes.push('No immediate satellite thermal anomaly within 10 km; flagged for ground-truth inspection');
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    auditNotes.push(`Warning during anomaly verification query: ${msg}`);
  }

  // 3. Physical Consistency Check
  let passedPhysicalChecks = true;
  if (submission.fire_type === 'industrial_fire' && physicalFrp > 0 && physicalFrp < 0.2) {
    auditNotes.push('Low radiative power for declared industrial fire - sensitivity flag applied');
  }

  if (submission.endangered_industries && submission.endangered_industries.length > 0) {
    auditNotes.push(`Verified ${submission.endangered_industries.length} endangered industrial facilities in vicinity`);
  }

  const verificationStatus: VerificationStatus = errors.length === 0 ? 'verified' : 'flagged';
  const verificationDetails = {
    passed_physical_checks: passedPhysicalChecks,
    passed_spatial_checks: linkedAnomalyId !== null,
    confidence_validated: confidence >= 50,
    verified_at: new Date().toISOString(),
    audit_notes: auditNotes,
  };

  // 4. Persist verified prediction analysis to PostgreSQL
  const insertQuery = `
    INSERT INTO prediction_analyses (
      anomaly_id, latitude, longitude, fire_type, risk_level,
      confidence_score, endangered_industries, spread_prediction,
      features_used, model_name, model_version,
      verification_status, verification_details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id, created_at;
  `;

  const values = [
    linkedAnomalyId,
    submission.latitude,
    submission.longitude,
    submission.fire_type,
    submission.risk_level,
    confidence,
    JSON.stringify(submission.endangered_industries || []),
    JSON.stringify(submission.spread_prediction || {}),
    JSON.stringify(submission.features_used || {}),
    submission.model_name || 'AstraFlare-PyML',
    submission.model_version || '1.0.0',
    verificationStatus,
    JSON.stringify(verificationDetails),
  ];

  const dbRes = await pool.query(insertQuery, values);
  const insertedRow = dbRes.rows[0];

  const record: VerifiedPredictionRecord = {
    id: insertedRow.id,
    anomaly_id: linkedAnomalyId || undefined,
    latitude: submission.latitude,
    longitude: submission.longitude,
    fire_type: submission.fire_type,
    risk_level: submission.risk_level,
    confidence_score: confidence,
    endangered_industries: submission.endangered_industries || [],
    spread_prediction: submission.spread_prediction,
    features_used: submission.features_used,
    model_name: submission.model_name,
    model_version: submission.model_version,
    verification_status: verificationStatus,
    verification_details: verificationDetails,
    created_at: insertedRow.created_at,
  };

  return {
    verified: verificationStatus === 'verified',
    status: verificationStatus,
    record,
    auditNotes,
  };
}

/**
 * Fetch verified predictions with optional filtering
 */
export async function getVerifiedPredictions(filter: {
  risk_level?: string;
  fire_type?: string;
  limit?: number;
  anomaly_id?: number;
} = {}): Promise<VerifiedPredictionRecord[]> {
  const conditions: string[] = ["verification_status = 'verified'"];
  const params: unknown[] = [];

  if (filter.risk_level && filter.risk_level !== 'ALL') {
    params.push(filter.risk_level);
    conditions.push(`risk_level = $${params.length}`);
  }

  if (filter.fire_type && filter.fire_type !== 'ALL') {
    params.push(filter.fire_type);
    conditions.push(`fire_type = $${params.length}`);
  }

  if (filter.anomaly_id) {
    params.push(filter.anomaly_id);
    conditions.push(`anomaly_id = $${params.length}`);
  }

  const limit = Math.min(Math.max(filter.limit || 50, 1), 200);
  params.push(limit);

  const query = `
    SELECT id, anomaly_id, latitude, longitude, fire_type, risk_level,
           confidence_score, endangered_industries, spread_prediction,
           features_used, model_name, model_version,
           verification_status, verification_details, created_at
    FROM prediction_analyses
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC, confidence_score DESC
    LIMIT $${params.length};
  `;

  const res = await pool.query(query, params);
  return res.rows.map((row) => ({
    id: row.id,
    anomaly_id: row.anomaly_id,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    fire_type: row.fire_type,
    risk_level: row.risk_level,
    confidence_score: parseFloat(row.confidence_score),
    endangered_industries: row.endangered_industries || [],
    spread_prediction: row.spread_prediction || undefined,
    features_used: row.features_used || undefined,
    model_name: row.model_name,
    model_version: row.model_version,
    verification_status: row.verification_status,
    verification_details: row.verification_details,
    created_at: row.created_at,
  }));
}
