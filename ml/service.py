"""
AstraFlare Python ML Microservice
---------------------------------
FastAPI microservice executing machine learning inference,
operational risk calculations, and pipeline synchronization.
"""

import os
import sys
import json
import requests
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from model import predictor

app = FastAPI(
    title="AstraFlare ML Prediction Service",
    description="Machine learning inference service with causal spatial features and independent operational risk prioritization",
    version=predictor.model_version,
)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5001")
DEMO_PATH = os.path.join(os.path.dirname(__file__), "data/processed/demonstration_100_events.json")


class AnomalyInput(BaseModel):
    anomaly_id: Optional[int] = None
    latitude: float
    longitude: float
    frp: Optional[float] = 0.0
    brightness: Optional[float] = 300.0
    satellite: Optional[str] = "VIIRS"
    instrument: Optional[str] = "VIIRS"
    confidence_raw: Optional[str] = "nominal"
    daynight: Optional[str] = "D"
    duration_hours: Optional[float] = 0.0
    observation_count: Optional[int] = 1
    satellite_count: Optional[int] = 1
    spatial_extent_m: Optional[float] = 0.0
    land_cover_code: Optional[int] = 40
    historical_count_30d: Optional[int] = 0


@app.get("/health")
def health_check():
    """
    Returns microservice health, loaded model metadata, and feature schema.
    """
    return {
        "status": "healthy",
        "service": "AstraFlare-ML-Service",
        "version": predictor.model_version,
        "model_name": predictor.model_name,
        "model_loaded": predictor.model_loaded,
        "classes": predictor.classes,
        "feature_count": len(predictor.feature_columns),
        "sovereign_facilities_loaded": len(predictor.facilities),
        "scientific_integrity": {
            "confidence_calibrated": False,
            "confidence_label": "Model score — uncalibrated",
            "ground_truth_limitation": "Industrial ground truth is scarce (N=6 in archive). Operational risk prioritizes hazards independently.",
        },
    }


@app.get("/demonstration-events")
def get_demonstration_events():
    """
    Serves the curated 100-event real historical demonstration dataset.
    """
    if os.path.exists(DEMO_PATH):
        with open(DEMO_PATH, "r") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Demonstration dataset not found")


@app.post("/predict")
def run_predict(data: AnomalyInput):
    """
    Direct ML inference without submitting to backend.
    """
    pred = predictor.predict(
        lat=data.latitude,
        lng=data.longitude,
        frp=data.frp or 0.0,
        brightness=data.brightness or 300.0,
        satellite=data.satellite or "VIIRS",
        instrument=data.instrument or "VIIRS",
        confidence_raw=data.confidence_raw or "nominal",
        daynight=data.daynight or "D",
        duration_hours=data.duration_hours or 0.0,
        observation_count=data.observation_count or 1,
        satellite_count=data.satellite_count or 1,
        spatial_extent_m=data.spatial_extent_m or 0.0,
        land_cover_code=data.land_cover_code or 40,
        historical_count_30d=data.historical_count_30d or 0,
        anomaly_id=data.anomaly_id,
    )
    return {"success": True, "prediction": pred}


@app.post("/predict-and-submit")
def predict_and_submit(data: AnomalyInput):
    """
    Run ML prediction and submit payload to AstraFlare Backend Verification Engine.
    """
    pred = predictor.predict(
        lat=data.latitude,
        lng=data.longitude,
        frp=data.frp or 0.0,
        brightness=data.brightness or 300.0,
        satellite=data.satellite or "VIIRS",
        instrument=data.instrument or "VIIRS",
        confidence_raw=data.confidence_raw or "nominal",
        daynight=data.daynight or "D",
        duration_hours=data.duration_hours or 0.0,
        observation_count=data.observation_count or 1,
        satellite_count=data.satellite_count or 1,
        spatial_extent_m=data.spatial_extent_m or 0.0,
        land_cover_code=data.land_cover_code or 40,
        historical_count_30d=data.historical_count_30d or 0,
        anomaly_id=data.anomaly_id,
    )

    try:
        backend_resp = requests.post(
            f"{BACKEND_URL}/api/predictions/submit",
            json=pred,
            timeout=10,
        )
        backend_data = backend_resp.json()
        return {
            "success": backend_resp.ok,
            "verification_response": backend_data,
            "prediction": pred,
        }
    except Exception as e:
        return {
            "success": False,
            "warning": f"Backend communication failed: {str(e)}",
            "prediction": pred,
        }


@app.post("/sync-active-anomalies")
def sync_active_anomalies(limit: int = 50, day_range: int = 1):
    """
    Syncs active anomalies from backend, runs ML inference, and commits verified records.
    """
    try:
        geojson_resp = requests.get(
            f"{BACKEND_URL}/api/anomalies/geojson?limit={limit}&dayRange={day_range}",
            timeout=15,
        )
        if not geojson_resp.ok:
            raise HTTPException(status_code=500, detail="Failed to fetch anomalies from backend")

        data = geojson_resp.json()
        features = data.get("features", [])

        if not features:
            return {"success": True, "message": "No active anomalies to process", "processed": 0}

        predictions = []
        for feat in features:
            coords = feat.get("geometry", {}).get("coordinates", [0, 0])
            props = feat.get("properties", {})
            lng, lat = coords[0], coords[1]

            pred = predictor.predict(
                lat=lat,
                lng=lng,
                frp=props.get("frp", 0.0),
                brightness=props.get("brightness", 300.0),
                satellite=props.get("satellite", "VIIRS"),
                instrument=props.get("instrument", "VIIRS"),
                confidence_raw=props.get("confidence", "nominal"),
                daynight=props.get("daynight", "D"),
            )
            predictions.append(pred)

        batch_resp = requests.post(
            f"{BACKEND_URL}/api/predictions/batch",
            json={"predictions": predictions},
            timeout=30,
        )
        batch_data = batch_resp.json()

        return {
            "success": True,
            "total_evaluated": len(predictions),
            "backend_verification": batch_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "sync":
        print("🔄 Running one-off ML prediction & verification sync...")
        res = sync_active_anomalies(limit=60, day_range=1)
        print("✅ Sync complete:", res)
    else:
        port = int(os.getenv("PORT", 8001))
        print(f"🚀 Starting AstraFlare ML FastAPI microservice on port {port}...")
        uvicorn.run(app, host="0.0.0.0", port=port)
