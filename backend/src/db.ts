import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/astraflare_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    // Try enabling postgis if available
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      console.log('✅ PostGIS extension enabled');
    } catch {
      console.warn('⚠️ PostGIS extension not available, continuing with standard spatial coordinates');
    }

    // 1. Create thermal_anomalies table with 2D CRS planar coordinates
    await client.query(`
      CREATE TABLE IF NOT EXISTS thermal_anomalies (
        id SERIAL PRIMARY KEY,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        x DOUBLE PRECISION,
        y DOUBLE PRECISION,
        crs VARCHAR(20) DEFAULT 'EPSG:3857',
        bright_ti4 NUMERIC,
        scan NUMERIC,
        track NUMERIC,
        acq_date DATE NOT NULL,
        acq_time VARCHAR(10) NOT NULL,
        satellite VARCHAR(50) NOT NULL,
        instrument VARCHAR(50) NOT NULL,
        confidence VARCHAR(20),
        version VARCHAR(20),
        bright_ti5 NUMERIC,
        frp NUMERIC DEFAULT 0,
        daynight VARCHAR(5),
        intensity VARCHAR(20) DEFAULT 'medium',
        country_code VARCHAR(10) DEFAULT 'IND',
        geojson JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_anomaly UNIQUE (latitude, longitude, acq_date, acq_time, satellite)
      );

      CREATE INDEX IF NOT EXISTS idx_anomalies_acq_date ON thermal_anomalies (acq_date DESC);
      CREATE INDEX IF NOT EXISTS idx_anomalies_lat_lng ON thermal_anomalies (latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_anomalies_xy ON thermal_anomalies (x, y);
      CREATE INDEX IF NOT EXISTS idx_anomalies_satellite ON thermal_anomalies (satellite);
      CREATE INDEX IF NOT EXISTS idx_anomalies_instrument ON thermal_anomalies (instrument);
      CREATE INDEX IF NOT EXISTS idx_anomalies_intensity ON thermal_anomalies (intensity);
      CREATE INDEX IF NOT EXISTS idx_anomalies_geojson ON thermal_anomalies USING GIN (geojson);

      -- Ensure columns exist if table was already created
      ALTER TABLE thermal_anomalies ADD COLUMN IF NOT EXISTS x DOUBLE PRECISION;
      ALTER TABLE thermal_anomalies ADD COLUMN IF NOT EXISTS y DOUBLE PRECISION;
      ALTER TABLE thermal_anomalies ADD COLUMN IF NOT EXISTS crs VARCHAR(20) DEFAULT 'EPSG:3857';

      -- Backfill existing rows with projected planar coordinates
      UPDATE thermal_anomalies
      SET 
        x = 6378137.0 * radians(longitude),
        y = 6378137.0 * ln(tan(pi() / 4.0 + radians(LEAST(GREATEST(latitude, -85.05112878), 85.05112878)) / 2.0)),
        crs = 'EPSG:3857'
      WHERE x IS NULL OR y IS NULL;
    `);

    // 2. Create verified prediction_analyses table for ML results
    await client.query(`
      CREATE TABLE IF NOT EXISTS prediction_analyses (
        id SERIAL PRIMARY KEY,
        anomaly_id INT REFERENCES thermal_anomalies(id) ON DELETE SET NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        fire_type VARCHAR(50) NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        confidence_score NUMERIC(5, 2) NOT NULL,
        endangered_industries JSONB NOT NULL DEFAULT '[]'::jsonb,
        spread_prediction JSONB DEFAULT '{}'::jsonb,
        features_used JSONB DEFAULT '{}'::jsonb,
        model_name VARCHAR(100) DEFAULT 'AstraFlare-PyML',
        model_version VARCHAR(20) DEFAULT '1.0.0',
        verification_status VARCHAR(20) NOT NULL DEFAULT 'verified',
        verification_details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_predictions_anomaly ON prediction_analyses (anomaly_id);
      CREATE INDEX IF NOT EXISTS idx_predictions_risk ON prediction_analyses (risk_level);
      CREATE INDEX IF NOT EXISTS idx_predictions_status ON prediction_analyses (verification_status);
      CREATE INDEX IF NOT EXISTS idx_predictions_fire_type ON prediction_analyses (fire_type);
      CREATE INDEX IF NOT EXISTS idx_predictions_created ON prediction_analyses (created_at DESC);
    `);

    console.log('✅ PostgreSQL database schema verified (thermal_anomalies & prediction_analyses)');
  } finally {
    client.release();
  }
}
