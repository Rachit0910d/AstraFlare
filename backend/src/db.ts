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

    // 3. Create global countries directory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS countries (
        code VARCHAR(3) PRIMARY KEY,
        code_2 VARCHAR(2) NOT NULL,
        name VARCHAR(100) NOT NULL,
        continent VARCHAR(50) NOT NULL,
        capital VARCHAR(100),
        min_lat DOUBLE PRECISION NOT NULL,
        max_lat DOUBLE PRECISION NOT NULL,
        min_lng DOUBLE PRECISION NOT NULL,
        max_lng DOUBLE PRECISION NOT NULL,
        center_lat DOUBLE PRECISION NOT NULL,
        center_lng DOUBLE PRECISION NOT NULL,
        zoom INT DEFAULT 5,
        population BIGINT,
        area_sq_km BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_countries_continent ON countries (continent);
      CREATE INDEX IF NOT EXISTS idx_countries_bounds ON countries (min_lat, max_lat, min_lng, max_lng);
      CREATE INDEX IF NOT EXISTS idx_countries_name ON countries (name);
    `);

    // 4. Create infrastructure_nodes table for critical assets & facilities
    await client.query(`
      CREATE TABLE IF NOT EXISTS infrastructure_nodes (
        id SERIAL PRIMARY KEY,
        country_code VARCHAR(3) REFERENCES countries(code) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        sector VARCHAR(100) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        critical_materials TEXT[] DEFAULT ARRAY[]::TEXT[],
        default_action VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_facility_location UNIQUE (country_code, name, latitude, longitude)
      );

      CREATE INDEX IF NOT EXISTS idx_infra_country ON infrastructure_nodes (country_code);
      CREATE INDEX IF NOT EXISTS idx_infra_coords ON infrastructure_nodes (latitude, longitude);
    `);

    // 5. Seed countries into database if empty
    const countryCountRes = await client.query('SELECT COUNT(*) as count FROM countries;');
    if (parseInt(countryCountRes.rows[0].count) === 0) {
      console.log('🌱 Seeding global countries into PostgreSQL...');
      const { COUNTRIES_DATA } = await import('./data/countriesData.js');
      for (const c of COUNTRIES_DATA) {
        await client.query(`
          INSERT INTO countries (
            code, code_2, name, continent, capital,
            min_lat, max_lat, min_lng, max_lng,
            center_lat, center_lng, zoom, population, area_sq_km
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (code) DO NOTHING;
        `, [
          c.code, c.code_2, c.name, c.continent, c.capital,
          c.min_lat, c.max_lat, c.min_lng, c.max_lng,
          c.center_lat, c.center_lng, c.zoom, c.population, c.area_sq_km
        ]);
      }
      console.log(`✅ Seeded ${COUNTRIES_DATA.length} global countries into PostgreSQL`);
    }

    // 6. Seed/Sync infrastructure nodes into database
    console.log('🌱 Syncing critical infrastructure facilities into PostgreSQL...');
    const { INFRASTRUCTURE_SEED_DATA } = await import('./data/infrastructureData.js');
    for (const inf of INFRASTRUCTURE_SEED_DATA) {
      await client.query(`
        INSERT INTO infrastructure_nodes (
          country_code, name, sector, latitude, longitude,
          critical_materials, default_action
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (country_code, name, latitude, longitude) DO UPDATE
        SET sector = EXCLUDED.sector,
            critical_materials = EXCLUDED.critical_materials,
            default_action = EXCLUDED.default_action;
      `, [
        inf.country_code, inf.name, inf.sector, inf.latitude, inf.longitude,
        inf.critical_materials, inf.default_action
      ]);
    }
    console.log(`✅ Synced ${INFRASTRUCTURE_SEED_DATA.length} industrial complexes into PostgreSQL`);

    console.log('✅ PostgreSQL database schema verified (thermal_anomalies, prediction_analyses, countries & infrastructure_nodes)');
  } finally {
    client.release();
  }
}
