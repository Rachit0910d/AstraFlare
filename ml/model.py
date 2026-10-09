"""
AstraFlare Machine Learning Engine (Python)
-------------------------------------------
Loads versioned scikit-learn model artifacts trained on physical event features.
Separates:
1. Classification (Estimated Source Category)
2. Model Score (Uncalibrated Probability)
3. Operational Risk Score (Independent multi-criteria priority)
4. Endangered Sovereign Industrial Facilities (Proximity Engine)
5. Review Status & Abstention
"""

import os
import json
import math
import joblib
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "model.joblib")
PREPROC_PATH = os.path.join(ARTIFACTS_DIR, "preprocessor.joblib")
META_PATH = os.path.join(ARTIFACTS_DIR, "model_metadata.json")
FACILITIES_PATH = os.path.join(os.path.dirname(__file__), "data/processed/phase1_clean_dataset/cleaned_industrial_sites_india.csv")

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two geographic coordinates in meters."""
    R = 6378137.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class FirePredictor:
    """
    Production-grade inference engine integrating:
    - Trained scikit-learn RandomForest model
    - Causal spatial/temporal feature preprocessor
    - Sovereign Indian industrial infrastructure proximity
    - Independent operational risk calculation
    """

    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.metadata = {}
        self.facilities: List[Dict[str, Any]] = []
        self._load_artifacts()
        self._load_facilities()

    def _load_artifacts(self):
        if os.path.exists(MODEL_PATH) and os.path.exists(PREPROC_PATH) and os.path.exists(META_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                self.preprocessor = joblib.load(PREPROC_PATH)
                with open(META_PATH, "r") as f:
                    self.metadata = json.load(f)
                self.model_version = self.metadata.get("model_version", "2.2.0")
                self.model_name = self.metadata.get("model_name", "AstraFlare-ThermalEventClassifier")
                self.feature_columns = self.metadata.get("feature_columns", [])
                self.classes = self.metadata.get("classes", [])
                self.model_loaded = True
            except Exception as e:
                print(f"⚠️ Error loading ML artifacts: {e}. Falling back to deterministic risk engine.")
                self.model_loaded = False
        else:
            print("⚠️ ML artifacts not found. Operating in fallback mode.")
            self.model_loaded = False
            self.model_version = "2.2.0-fallback"
            self.model_name = "AstraFlare-Deterministic-RiskEngine"
            self.feature_columns = []
            self.classes = []

    def _load_facilities(self):
        if os.path.exists(FACILITIES_PATH):
            try:
                df = pd.read_csv(FACILITIES_PATH)
                for _, r in df.iterrows():
                    self.facilities.append({
                        "name": str(r.get("name", "Industrial Facility")),
                        "category": str(r.get("facility_type", "industrial")),
                        "lat": float(r["latitude"]),
                        "lng": float(r["longitude"]),
                    })
            except Exception as e:
                print(f"⚠️ Error loading sovereign facilities: {e}")

    def compute_proximity(self, lat: float, lng: float) -> tuple[float, int, int, List[Dict[str, Any]], str]:
        """
        Calculates distance to all sovereign Indian industrial sites.
        Returns: min_distance_m, count_1km, count_5km, endangered_facilities_list, nearest_category
        """
        min_dist = float("inf")
        count_1km = 0
        count_5km = 0
        nearby_list = []
        nearest_cat = "general_industrial"

        for fac in self.facilities:
            dist = haversine_distance_meters(lat, lng, fac["lat"], fac["lng"])
            if dist < min_dist:
                min_dist = dist
                nearest_cat = fac["category"]

            if dist <= 1000:
                count_1km += 1
            if dist <= 5000:
                count_5km += 1

            if dist <= 12000:
                threat = "critical" if dist <= 2500 else "high" if dist <= 6000 else "moderate"
                zone = "direct_danger" if dist <= 2500 else "buffer_zone" if dist <= 6000 else "monitoring_zone"
                nearby_list.append({
                    "name": fac["name"],
                    "type": fac["category"],
                    "distance_meters": round(dist),
                    "threat_level": threat,
                    "zone": zone,
                    "lat": fac["lat"],
                    "lng": fac["lng"],
                })

        nearby_list.sort(key=lambda x: x["distance_meters"])
        return min_dist, count_1km, count_5km, nearby_list, nearest_cat

    def compute_operational_risk(self, frp: float, brightness: float, min_dist_m: float, duration_hrs: float) -> Dict[str, Any]:
        """
        Independent Operational Risk:
        Weighted score (0-100) combining proximity, thermal radiative power, and persistence.
        """
        if min_dist_m <= 2500:
            prox_score = 100.0
        elif min_dist_m <= 10000:
            prox_score = 85.0 - (min_dist_m - 2500) / 7500.0 * 25.0
        elif min_dist_m <= 30000:
            prox_score = 60.0 - (min_dist_m - 10000) / 20000.0 * 35.0
        elif min_dist_m <= 60000:
            prox_score = 25.0 - (min_dist_m - 30000) / 30000.0 * 20.0
        else:
            prox_score = max(0.0, 5.0 - (min_dist_m - 60000) / 40000.0 * 5.0)

        frp_score = min(100.0, (frp / 40.0) * 80.0 + max(0.0, (brightness - 310.0) / 40.0) * 20.0)
        persist_score = min(100.0, duration_hrs * 15.0 + 10.0)
        total_risk = round(0.45 * prox_score + 0.35 * frp_score + 0.20 * persist_score, 1)

        if total_risk >= 50.0 or (min_dist_m <= 5000 and frp >= 15.0):
            level = "critical"
        elif total_risk >= 35.0:
            level = "high"
        elif total_risk >= 20.0:
            level = "moderate"
        else:
            level = "low"

        return {
            "score": total_risk,
            "level": level,
            "proximity_threat": round(prox_score, 1),
            "thermal_intensity": round(frp_score, 1),
            "persistence": round(persist_score, 1),
        }

    def predict(
        self,
        lat: float,
        lng: float,
        frp: float = 0.0,
        brightness: float = 300.0,
        satellite: str = "VIIRS",
        instrument: str = "VIIRS",
        confidence_raw: str = "nominal",
        daynight: str = "D",
        duration_hours: float = 0.0,
        observation_count: int = 1,
        satellite_count: int = 1,
        spatial_extent_m: float = 0.0,
        land_cover_code: int = 40,
        historical_count_30d: int = 0,
        anomaly_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Runs ML inference and operational risk evaluation.
        """
        # 1. Proximity Engine
        min_dist_m, count_1km, count_5km, endangered, _ = self.compute_proximity(lat, lng)

        # 2. Operational Risk (Separated from model score)
        op_risk = self.compute_operational_risk(frp, brightness, min_dist_m, duration_hours)

        # 3. Model Inference if artifact is available
        classification = "UNKNOWN_REQUIRES_REVIEW"
        model_score = 0.5
        model_status = "active"

        if self.model_loaded and self.feature_columns:
            feat_dict = {
                "duration_hours": duration_hours,
                "observation_count": observation_count,
                "satellite_count": satellite_count,
                "spatial_extent_m": spatial_extent_m,
                "max_frp": frp,
                "mean_frp": frp,
                "std_frp": 0.0,
                "max_brightness": brightness,
                "mean_brightness": brightness,
                "confidence_high_ratio": 1.0 if str(confidence_raw).lower() in ("high", "h", "100") else 0.0,
                "centroid_lat": lat,
                "centroid_lon": lng,
                "industrial_distance_m": min_dist_m,
                "industrial_site_count_1km": count_1km,
                "industrial_site_count_5km": count_5km,
                "land_cover_code": land_cover_code,
                "historical_count_30d": historical_count_30d,
                "historical_mean_frp": 0.0,
                "frp_anomaly_zscore": 0.0,
            }
            # Maintain exact feature ordering
            feat_df = pd.DataFrame([feat_dict])[self.feature_columns].fillna(0.0)
            try:
                proc_X = self.preprocessor.transform(feat_df)
                pred_label = self.model.predict(proc_X)[0]
                proba_arr = self.model.predict_proba(proc_X)[0]
                classification = pred_label
                model_score = round(float(np.max(proba_arr)), 4)
            except Exception as e:
                print(f"⚠️ Inference failure: {e}")
                model_status = "inference_error_fallback"

        # 4. Map classification to backend schema
        if classification == "NATURAL_WILDLAND_FIRE":
            fire_type = "wildfire_or_other"
            fire_type_display = "Possible wildland fire — model estimate"
        elif classification == "POSSIBLE_AGRICULTURAL_BURNING":
            fire_type = "wildfire_or_other"
            fire_type_display = "Possible agricultural burning — model estimate"
        else:
            if min_dist_m <= 2500 and op_risk["level"] in ("critical", "high"):
                fire_type = "industrial_fire"
                fire_type_display = "Possible industrial-related thermal event — requires verification"
            else:
                fire_type = "wildfire_or_other"
                fire_type_display = "Unknown / insufficient evidence"

        # Determine review status
        is_review_needed = (classification == "UNKNOWN_REQUIRES_REVIEW") or (op_risk["level"] == "critical")
        review_status = "requires_review" if is_review_needed else "verified"

        # Rate of spread estimation
        rate_of_spread = round(max(0.2, min(5.0, (frp / 20.0) * 1.5 + (spatial_extent_m / 1000.0) * 0.5)), 2)

        return {
            "anomaly_id": anomaly_id,
            "latitude": lat,
            "longitude": lng,
            "fire_type": fire_type,
            "fire_type_display": fire_type_display,
            "risk_level": op_risk["level"],
            "confidence_score": round(model_score * 100.0, 2),  # uncalibrated score as percentage
            "model_score_uncalibrated": model_score,
            "operational_risk": op_risk,
            "review_status": review_status,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "model_status": model_status,
            "endangered_industries": endangered,
            "spread_prediction": {
                "rate_of_spread_kmh": rate_of_spread,
                "predicted_direction_deg": 45,
                "threat_radius_meters": round(min(5000.0, 500.0 + frp * 40.0)),
                "containment_probability": round(max(20.0, 95.0 - op_risk["score"] * 0.7), 1),
                "next_6h_risk": op_risk["level"],
            },
            "features_used": {
                "max_frp": frp,
                "max_brightness": brightness,
                "industrial_distance_m": round(min_dist_m, 1),
                "land_cover_code": land_cover_code,
                "historical_count_30d": historical_count_30d,
            },
            "scientific_note": "Model score is uncalibrated probability. Operational risk is calculated independently from multi-criteria physical and spatial indicators.",
        }


predictor = FirePredictor()
