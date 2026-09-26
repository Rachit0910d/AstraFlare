"""
AstraFlare Python ML Microservice
---------------------------------
Accepts thermal anomaly observations, runs machine learning models
for fire classification, danger level, confidence score, and endangered
industrial infrastructure, and submits predictions to the AstraFlare
Backend Verification Engine for database storage.
"""

import os
import sys
import requests
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

from model import predictor

app = FastAPI(
    title="AstraFlare ML Prediction Service",
    description="Machine learning inference service for industrial fire hazard classification",
    version="2.1.0",
)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")


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
    prior_detection_count: Optional[int] = 1


class BatchAnomaliesInput(BaseModel):
    anomalies: List[AnomalyInput]


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "AstraFlare-ML-Service",
        "model_version": predictor.model_version,
    }


@app.post("/predict")
def predict_single(data: AnomalyInput):
    """Run ML prediction on an anomaly without submitting to database."""
    pred = predictor.predict(
        lat=data.latitude,
        lng=data.longitude,
        frp=data.frp or 0.0,
        brightness=data.brightness or 300.0,
        satellite=data.satellite or "VIIRS",
        instrument=data.instrument or "VIIRS",
        confidence_raw=data.confidence_raw or "nominal",
        daynight=data.daynight or "D",
        prior_detection_count=data.prior_detection_count or 1,
    )
    if data.anomaly_id:
        pred["anomaly_id"] = data.anomaly_id
    return {"success": True, "prediction": pred}


@app.post("/predict-and-submit")
def predict_and_submit(data: AnomalyInput):
    """
    Run ML prediction and submit to AstraFlare Backend Verification Engine.
    The backend verifies schema, consistency, and commits to PostgreSQL.
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
        prior_detection_count=data.prior_detection_count or 1,
    )
    if data.anomaly_id:
        pred["anomaly_id"] = data.anomaly_id

    # Post to backend verification endpoint
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
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with backend verification engine: {str(e)}",
        )


@app.post("/sync-active-anomalies")
def sync_active_anomalies(limit: int = 50, day_range: int = 1):
    """
    Pulls recent thermal anomalies from backend PostgreSQL/NASA FIRMS,
    runs the ML prediction model on each, and submits them to the backend
    verification engine in batch.
    """
    try:
        # 1. Fetch anomalies from backend
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

        # 2. Run ML inference on all features
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

        # 3. Submit batch to backend verification engine
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
    # If called with argument 'sync', run one-off batch sync
    if len(sys.argv) > 1 and sys.argv[1] == "sync":
        print("🔄 Running one-off ML prediction & verification sync...")
        res = sync_active_anomalies(limit=60, day_range=1)
        print("✅ Sync complete:", res)
    else:
        port = int(os.getenv("PORT", 8001))
        print(f"🚀 Starting AstraFlare ML FastAPI microservice on port {port}...")
        uvicorn.run(app, host="0.0.0.0", port=port)
