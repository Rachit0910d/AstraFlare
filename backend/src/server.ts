import express, { Request, Response } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { initDb, pool } from './db.js';
import { ingestFirmsData, SUPPORTED_SOURCES } from './ingestionService.js';
import {
  verifyAndStorePrediction,
  getVerifiedPredictions,
} from './services/verificationService.js';
import { getCountryPredictiveAnalysis } from './services/countryPredictiveService.js';
import { getOsmIndustriesNearHotspots } from './services/osmIndustryService.js';
import type { PredictionSubmission } from './types/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const DEFAULT_BBOX = process.env.DEFAULT_BBOX || '68,6,98,38';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT COUNT(*) as total FROM thermal_anomalies;');
    const predRes = await pool.query('SELECT COUNT(*) as total FROM prediction_analyses WHERE verification_status = \'verified\';');
    res.json({
      status: 'ok',
      dbConnected: true,
      totalAnomaliesInDb: parseInt(dbRes.rows[0].total),
      totalVerifiedPredictions: parseInt(predRes.rows[0].total),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      status: 'error',
      dbConnected: false,
      error: msg,
    });
  }
});

/**
 * GET /api/anomalies/geojson
 * Returns standard GeoJSON FeatureCollection filtered by bbox, dayRange, source, limit
 */
app.get('/api/anomalies/geojson', async (req: Request, res: Response) => {
  try {
    const bbox = req.query.bbox as string | undefined;
    const source = req.query.source as string | undefined;
    const dayRange = parseInt(String(req.query.dayRange)) || 1;
    const limit = parseInt(String(req.query.limit)) || 3000;

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Filter by bounding box if provided (west,south,east,north)
    if (bbox && bbox !== 'world') {
      const parts = bbox.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [w, s, e, n] = parts;
        params.push(Math.min(w, e), Math.max(w, e), Math.min(s, n), Math.max(s, n));
        conditions.push(`longitude >= $${params.length - 3} AND longitude <= $${params.length - 2} AND latitude >= $${params.length - 1} AND latitude <= $${params.length}`);
      }
    }

    // Filter by day range (acq_date >= CURRENT_DATE - dayRange)
    const days = Math.min(Math.max(dayRange, 1), 7);
    params.push(days);
    conditions.push(`acq_date >= (CURRENT_DATE - ($${params.length}::int - 1))`);

    // Filter by satellite / instrument
    if (source && source !== 'ALL') {
      params.push(`%${source}%`);
      conditions.push(`(satellite ILIKE $${params.length} OR instrument ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Math.min(limit, 5000));
    const limitClause = `LIMIT $${params.length}`;

    const query = `
      SELECT geojson
      FROM thermal_anomalies
      ${whereClause}
      ORDER BY acq_date DESC, acq_time DESC, frp DESC
      ${limitClause};
    `;

    const dbRes = await pool.query(query, params);
    const features = dbRes.rows.map((r) => r.geojson);

    res.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        total: features.length,
        bbox: bbox || 'world',
        queryTime: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching GeoJSON:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/anomalies/stats
 * Real-time summary statistics
 */
app.get('/api/anomalies/stats', async (req: Request, res: Response) => {
  try {
    const bbox = req.query.bbox as string | undefined;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (bbox && bbox !== 'world') {
      const parts = bbox.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [w, s, e, n] = parts;
        params.push(Math.min(w, e), Math.max(w, e), Math.min(s, n), Math.max(s, n));
        conditions.push(`longitude >= $${params.length - 3} AND longitude <= $${params.length - 2} AND latitude >= $${params.length - 1} AND latitude <= $${params.length}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*) as total_detections,
        COUNT(CASE WHEN intensity = 'high' THEN 1 END) as high_intensity,
        COUNT(CASE WHEN intensity = 'medium' THEN 1 END) as medium_intensity,
        COUNT(CASE WHEN intensity = 'low' THEN 1 END) as low_intensity,
        COALESCE(ROUND(SUM(frp), 1), 0) as total_frp_mw,
        COALESCE(ROUND(AVG(bright_ti4), 1), 0) as avg_brightness_k,
        MAX(acq_date::text || ' ' || acq_time) as latest_acquisition
      FROM thermal_anomalies
      ${whereClause};
    `;

    const dbRes = await pool.query(query, params);
    res.json(dbRes.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching stats:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/ingest
 * Trigger manual or scheduled ingestion
 */
app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const bbox = req.body?.bbox || DEFAULT_BBOX;
    const dayRange = parseInt(req.body?.dayRange) || 1;
    const sources = req.body?.sources || SUPPORTED_SOURCES;

    console.log(`🚀 Manual ingestion triggered for bbox: ${bbox}, dayRange: ${dayRange}`);
    const results = await ingestFirmsData(bbox, dayRange, sources);

    res.json({
      success: true,
      message: `Ingested ${results.insertedOrUpdated} records into PostgreSQL`,
      details: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Ingestion error:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/anomalies/csv
 * Export anomalies as downloadable CSV
 */
app.get('/api/anomalies/csv', async (req: Request, res: Response) => {
  try {
    const bbox = req.query.bbox as string | undefined;
    const dayRange = parseInt(String(req.query.dayRange)) || 1;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (bbox && bbox !== 'world') {
      const parts = bbox.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [w, s, e, n] = parts;
        params.push(Math.min(w, e), Math.max(w, e), Math.min(s, n), Math.max(s, n));
        conditions.push(`longitude >= $${params.length - 3} AND longitude <= $${params.length - 2} AND latitude >= $${params.length - 1} AND latitude <= $${params.length}`);
      }
    }

    const days = Math.min(Math.max(dayRange, 1), 7);
    params.push(days);
    conditions.push(`acq_date >= (CURRENT_DATE - ($${params.length}::int - 1))`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        latitude, longitude, x, y, crs, bright_ti4 as brightness, scan, track,
        acq_date, acq_time, satellite, instrument, confidence, version,
        bright_ti5, frp, daynight, intensity
      FROM thermal_anomalies
      ${whereClause}
      ORDER BY acq_date DESC, acq_time DESC;
    `;

    const dbRes = await pool.query(query, params);
    const rows = dbRes.rows;

    if (rows.length === 0) {
      res.header('Content-Type', 'text/csv');
      res.attachment('thermal_anomalies.csv');
      return res.send('latitude,longitude,x,y,crs,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,intensity\n');
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvLines = rows.map((r) => Object.values(r).join(',')).join('\n');
    const fullCsv = `${headers}\n${csvLines}`;

    res.header('Content-Type', 'text/csv');
    res.attachment(`thermal_anomalies_${Date.now()}.csv`);
    return res.send(fullCsv);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL COUNTRIES DIRECTORY & PREDICTIVE DATABASE ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/countries
 * Returns all countries of the world from the PostgreSQL database directory,
 * with optional continent filter or text search.
 */
app.get('/api/countries', async (req: Request, res: Response) => {
  try {
    const continent = req.query.continent as string | undefined;
    const query = req.query.query as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (continent && continent !== 'ALL') {
      params.push(continent);
      conditions.push(`continent ILIKE $${params.length}`);
    }

    if (query && query.trim()) {
      params.push(`%${query.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR code ILIKE $${params.length} OR capital ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT code, code_2, name, continent, capital,
             center_lat, center_lng, min_lat, max_lat, min_lng, max_lng,
             zoom, population, area_sq_km
      FROM countries
      ${whereClause}
      ORDER BY CASE WHEN code = 'WLD' THEN 0 WHEN code = 'IND' THEN 1 ELSE 2 END, name ASC;
    `;

    const dbRes = await pool.query(sql, params);
    res.json({
      success: true,
      total: dbRes.rows.length,
      countries: dbRes.rows.map((r) => ({
        code: r.code,
        code_2: r.code_2,
        name: r.name,
        continent: r.continent,
        capital: r.capital,
        center: [parseFloat(r.center_lat), parseFloat(r.center_lng)],
        bbox: `${r.min_lng},${r.min_lat},${r.max_lng},${r.max_lat}`,
        zoom: parseInt(r.zoom) || 5,
        population: parseInt(r.population) || 0,
        area_sq_km: parseInt(r.area_sq_km) || 0,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching countries from database:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/countries/:code/predictive-analysis
 * Executes real-time SQL queries against PostgreSQL to compute:
 * - Thermal anomaly cluster metrics within country bounds
 * - Endangered infrastructure facilities and proximity to fires
 * - 7-day risk forecast trajectory aggregated from DB records
 * - Dynamic population impact and vulnerable zones
 */
app.get('/api/countries/:code/predictive-analysis', async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);
    const analysis = await getCountryPredictiveAnalysis(code);

    if (!analysis) {
      return res.status(404).json({ error: `Country '${code}' not found in database directory` });
    }

    res.json({
      success: true,
      country: code,
      analysis,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error computing country predictive analysis:', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/osm/industries
 * Queries OpenStreetMap & spatial database infrastructure to find industrial facilities
 * near active NASA FIRMS fire hotspots within the requested boundary box.
 */
app.get('/api/osm/industries', async (req: Request, res: Response) => {
  try {
    const bbox = (req.query.bbox as string) || DEFAULT_BBOX;
    const maxDist = req.query.maxDistanceKm ? parseFloat(req.query.maxDistanceKm as string) : 50.0;
    const industries = await getOsmIndustriesNearHotspots(bbox, maxDist);

    res.json({
      success: true,
      bbox,
      count: industries.length,
      source: 'OpenStreetMap (OSM) & PostgreSQL Spatial Engine',
      industries,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error querying OSM industries near hotspots:', msg);
    res.status(500).json({ error: msg });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ML PREDICTION & VERIFICATION API ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/predictions/submit
 * Receives ML predictions (from Python ML service), passes through backend
 * verification engine, and commits verified records to PostgreSQL database.
 */
app.post('/api/predictions/submit', async (req: Request, res: Response) => {
  try {
    const submission: PredictionSubmission = req.body;
    if (!submission || typeof submission !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing prediction submission body' });
    }

    const verificationResult = await verifyAndStorePrediction(submission);

    if (!verificationResult.verified) {
      return res.status(422).json({
        success: false,
        message: 'Prediction failed backend verification',
        status: verificationResult.status,
        errors: verificationResult.errors,
        auditNotes: verificationResult.auditNotes,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Prediction verified and stored in PostgreSQL database',
      status: verificationResult.status,
      record: verificationResult.record,
      auditNotes: verificationResult.auditNotes,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in prediction verification submission:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/predictions/batch
 * Submit multiple ML predictions in batch with automated backend verification
 */
app.post('/api/predictions/batch', async (req: Request, res: Response) => {
  try {
    const submissions: PredictionSubmission[] = req.body?.predictions;
    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({ success: false, error: 'Expected non-empty array under "predictions"' });
    }

    const results = [];
    for (const sub of submissions) {
      const resSingle = await verifyAndStorePrediction(sub);
      results.push(resSingle);
    }

    const verifiedCount = results.filter((r) => r.verified).length;
    res.status(201).json({
      success: true,
      totalSubmitted: submissions.length,
      verifiedCount,
      flaggedCount: submissions.length - verifiedCount,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Batch verification error:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/predictions
 * Returns verified prediction analyses for the frontend (Analytics / PredictiveAnalysis)
 */
app.get('/api/predictions', async (req: Request, res: Response) => {
  try {
    const risk_level = req.query.risk_level as string | undefined;
    const fire_type = req.query.fire_type as string | undefined;
    const limit = parseInt(String(req.query.limit)) || 50;
    const anomaly_id = req.query.anomaly_id ? parseInt(String(req.query.anomaly_id)) : undefined;

    const predictions = await getVerifiedPredictions({
      risk_level,
      fire_type,
      limit,
      anomaly_id,
    });

    res.json({
      success: true,
      total: predictions.length,
      predictions,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching verified predictions:', msg);
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/predictions/stats
 * Aggregate metrics from verified ML prediction analyses stored in database
 */
app.get('/api/predictions/stats', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN fire_type = 'industrial_fire' THEN 1 END) as industrial_fires,
        COUNT(CASE WHEN fire_type = 'persistent_thermal_source' THEN 1 END) as persistent_sources,
        COUNT(CASE WHEN fire_type = 'wildfire_or_other' THEN 1 END) as wildfires,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risks,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risks,
        COUNT(CASE WHEN risk_level = 'moderate' THEN 1 END) as moderate_risks,
        COALESCE(ROUND(AVG(confidence_score), 1), 0) as avg_confidence,
        SUM(jsonb_array_length(endangered_industries)) as total_endangered_facilities
      FROM prediction_analyses
      WHERE verification_status = 'verified';
    `;

    const dbRes = await pool.query(query);
    const row = dbRes.rows[0];

    res.json({
      success: true,
      stats: {
        totalPredictions: parseInt(row.total_predictions || '0'),
        industrialFires: parseInt(row.industrial_fires || '0'),
        persistentSources: parseInt(row.persistent_sources || '0'),
        wildfires: parseInt(row.wildfires || '0'),
        criticalRisks: parseInt(row.critical_risks || '0'),
        highRisks: parseInt(row.high_risks || '0'),
        moderateRisks: parseInt(row.moderate_risks || '0'),
        avgConfidence: parseFloat(row.avg_confidence || '0'),
        totalEndangeredFacilities: parseInt(row.total_endangered_facilities || '0'),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/predictions/:id
 * Fetch a single verified prediction by ID
 */
app.get('/api/predictions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid prediction ID' });

    const query = `
      SELECT *
      FROM prediction_analyses
      WHERE id = $1 AND verification_status = 'verified';
    `;
    const dbRes = await pool.query(query, [id]);
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction analysis not found or unverified' });
    }

    res.json({ success: true, prediction: dbRes.rows[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Start Server & Ingestion
async function startServer(): Promise<void> {
  try {
    await initDb();

    // Trigger initial ingestion for default India bounding box
    console.log('🔄 Running initial NASA FIRMS near real-time ingestion for India...');
    ingestFirmsData(DEFAULT_BBOX, 1)
      .then((res) => {
        console.log(`✅ Initial ingestion complete: ${res.insertedOrUpdated} records stored/updated`);
      })
      .catch((e: Error) => console.error('Initial ingestion note:', e.message));

    // Schedule ingestion every 3 hours (NASA FIRMS batch refresh cycle)
    const schedule = process.env.INGEST_CRON_SCHEDULE || '0 */3 * * *';
    cron.schedule(schedule, async () => {
      console.log('⏰ Scheduled 3-hour cron: Ingesting latest NASA FIRMS thermal anomaly data...');
      try {
        await ingestFirmsData(DEFAULT_BBOX, 1);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Scheduled cron error:', msg);
      }
    });

    const server = app.listen(PORT, () => {
      console.log(`🚀 AstraFlare Backend Server (TypeScript) running on port ${PORT}`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Another backend instance or process is running on this port.`);
        console.error(`💡 Tip: Run 'lsof -ti :${PORT} | xargs kill -9' to free it, or set PORT in backend/.env to another port.`);
      } else {
        console.error('Server listener error:', err);
      }
      process.exit(1);
    });
  } catch (err: unknown) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

startServer();
