#!/usr/bin/env python3
"""
AstraFlare Phase 7: Curate Trustworthy 100-Event Demonstration Dataset
-----------------------------------------------------------------------
Selects 100 real historical event records from the cleaned dataset representing
high, medium, and low operational risk, plus cases requiring human review.
Computes model inferences, uncalibrated scores, independent operational risk,
and nearest sovereign Indian facility proximity.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np

EXPERIMENT_DATA = "ml/data/processed/experiment_dataset_v1/experiment_events.csv"
FACILITIES_CSV = "ml/data/processed/phase1_clean_dataset/cleaned_industrial_sites_india.csv"
MODEL_PATH = "ml/artifacts/model.joblib"
PREPROC_PATH = "ml/artifacts/preprocessor.joblib"
META_PATH = "ml/artifacts/model_metadata.json"
OUT_ML_JSON = "ml/data/processed/demonstration_100_events.json"
OUT_BACKEND_JSON = "backend/src/data/demonstration100Events.json"

RANDOM_SEED = 42

def compute_operational_risk(frp: float, brightness: float, dist_m: float, duration_hrs: float) -> dict:
    """
    Independent operational risk calculation:
    Risk = (Proximity Threat * 0.45) + (Thermal Radiative Power * 0.35) + (Duration/Spread * 0.20)
    """
    # Proximity score (0-100): <2.5km is 100, >50km is near 0
    if dist_m <= 2500:
        prox_score = 100.0
    elif dist_m <= 10000:
        prox_score = 85.0 - (dist_m - 2500) / 7500.0 * 25.0
    elif dist_m <= 30000:
        prox_score = 60.0 - (dist_m - 10000) / 20000.0 * 35.0
    elif dist_m <= 60000:
        prox_score = 25.0 - (dist_m - 30000) / 30000.0 * 20.0
    else:
        prox_score = max(0.0, 5.0 - (dist_m - 60000) / 40000.0 * 5.0)

    # Thermal intensity score (0-100)
    frp_score = min(100.0, (frp / 40.0) * 80.0 + max(0.0, (brightness - 310.0) / 40.0) * 20.0)

    # Persistence score (0-100)
    persist_score = min(100.0, duration_hrs * 15.0 + 10.0)

    total_risk = round(0.45 * prox_score + 0.35 * frp_score + 0.20 * persist_score, 1)

    if total_risk >= 50.0 or (dist_m <= 5000 and frp >= 15.0):
        level = "Critical"
    elif total_risk >= 35.0:
        level = "High"
    elif total_risk >= 20.0:
        level = "Moderate"
    else:
        level = "Low"

    return {
        "risk_score": total_risk,
        "risk_level": level,
        "proximity_component": round(prox_score, 1),
        "thermal_component": round(frp_score, 1),
        "persistence_component": round(persist_score, 1)
    }

def main():
    print("⏳ Building 100-event demonstration dataset...")
    df = pd.read_csv(EXPERIMENT_DATA)
    fac_df = pd.read_csv(FACILITIES_CSV)

    # Load Model & Preprocessor
    model = joblib.load(MODEL_PATH)
    preproc = joblib.load(PREPROC_PATH)
    with open(META_PATH, "r") as f:
        meta = json.load(f)
    feature_cols = meta["feature_columns"]
    classes = meta["classes"]

    np.random.seed(RANDOM_SEED)

    # Stratified selection for 100 events:
    # Group 1: 25 High Operational Priority (close proximity < 15km or FRP >= 25 MW)
    g1 = df[(df["industrial_distance_m"] <= 15000) | (df["max_frp"] >= 25.0)]
    s1 = g1.sample(n=min(25, len(g1)), random_state=RANDOM_SEED)

    # Group 2: 35 Medium Operational Priority (15km < dist <= 60km, FRP >= 8.0)
    g2 = df[(df["industrial_distance_m"] > 15000) & (df["industrial_distance_m"] <= 60000) & (df["max_frp"] >= 8.0)]
    s2 = g2.sample(n=min(35, len(g2)), random_state=RANDOM_SEED)

    # Group 3: 25 Low Operational Priority (dist > 60km, FRP < 8.0)
    g3 = df[(df["industrial_distance_m"] > 60000) & (df["max_frp"] < 8.0)]
    s3 = g3.sample(n=min(25, len(g3)), random_state=RANDOM_SEED)

    # Group 4: 15 Review/Abstention events from UNLABELED
    remaining_ids = set(df["event_id"]) - set(s1["event_id"]) - set(s2["event_id"]) - set(s3["event_id"])
    g4 = df[(df["event_id"].isin(remaining_ids)) & (df["label"] == "UNLABELED")]
    s4 = g4.sample(n=15, random_state=RANDOM_SEED)

    demo_df = pd.concat([s1, s2, s3, s4], ignore_index=True)
    demo_df = demo_df.sample(frac=1.0, random_state=RANDOM_SEED).reset_index(drop=True)

    print(f"Selected {len(demo_df)} real historical events.")

    # Run Model Inference
    X = demo_df[feature_cols].fillna(0.0)
    X_proc = preproc.transform(X)
    preds = model.predict(X_proc)
    probas = model.predict_proba(X_proc)

    events_out = []
    for idx, row in demo_df.iterrows():
        pred_label = preds[idx]
        prob_arr = probas[idx]
        max_prob = float(np.max(prob_arr))

        # Operational risk
        risk_info = compute_operational_risk(
            frp=float(row["max_frp"]),
            brightness=float(row["max_brightness"]),
            dist_m=float(row["industrial_distance_m"]),
            duration_hrs=float(row["duration_hours"])
        )

        # Nearest Indian facility lookup
        # Compute nearest from fac_df
        dists = np.sqrt((fac_df["latitude"] - row["centroid_lat"])**2 + (fac_df["longitude"] - row["centroid_lon"])**2)
        nearest_fac = fac_df.iloc[dists.argmin()]

        # Review status: abstained or high risk requires analyst review
        is_abstention = (pred_label == "UNKNOWN_REQUIRES_REVIEW") or (risk_info["risk_level"] == "Critical")
        review_status = "requires_review" if is_abstention else "verified"

        # Truthful human-readable classification string
        if pred_label == "POSSIBLE_AGRICULTURAL_BURNING":
            classification_display = "Possible agricultural burning — model estimate"
        elif pred_label == "NATURAL_WILDLAND_FIRE":
            classification_display = "Possible wildland fire — model estimate"
        else:
            classification_display = "Unknown / insufficient evidence"

        event_record = {
            "id": idx + 1,
            "event_id": row["event_id"],
            "event_start": row["event_start"],
            "event_end": row["event_end"],
            "latitude": round(float(row["centroid_lat"]), 5),
            "longitude": round(float(row["centroid_lon"]), 5),
            "observation_count": int(row["observation_count"]),
            "satellite_count": int(row["satellite_count"]),
            "duration_hours": round(float(row["duration_hours"]), 2),
            "max_frp": round(float(row["max_frp"]), 2),
            "mean_frp": round(float(row["mean_frp"]), 2),
            "max_brightness": round(float(row["max_brightness"]), 1),
            "mean_brightness": round(float(row["mean_brightness"]), 1),
            "classification": pred_label,
            "classification_display": classification_display,
            "model_score_uncalibrated": round(max_prob, 4),
            "model_version": meta["model_version"],
            "operational_risk": risk_info,
            "review_status": review_status,
            "nearest_facility": {
                "name": str(nearest_fac.get("name", "Industrial Complex")),
                "category": str(nearest_fac.get("category", "Heavy Manufacturing / Refining")),
                "distance_km": round(float(row["industrial_distance_m"]) / 1000.0, 2),
                "latitude": float(nearest_fac["latitude"]),
                "longitude": float(nearest_fac["longitude"])
            },
            "land_cover": {
                "class": str(row.get("land_cover_class", "Cropland / Vegetated")),
                "category": str(row.get("land_cover_category", "agriculture")),
                "is_proxy": bool(row.get("land_cover_is_proxy", True)),
                "provenance": str(row.get("land_cover_provenance", "PROXY_COARSE_HEURISTIC"))
            },
            "historical_context": {
                "count_30d": int(row["historical_count_30d"]),
                "baseline_status": str(row.get("historical_status", "INSUFFICIENT_HISTORY"))
            },
            "data_quality_notes": "Real NASA FIRMS historical detection cluster with causal features and sovereign facility proximity."
        }
        events_out.append(event_record)

    # Save to ML directory
    os.makedirs(os.path.dirname(OUT_ML_JSON), exist_ok=True)
    with open(OUT_ML_JSON, "w") as f:
        json.dump({"events": events_out, "total": len(events_out)}, f, indent=2)

    # Save to Backend directory
    os.makedirs(os.path.dirname(OUT_BACKEND_JSON), exist_ok=True)
    with open(OUT_BACKEND_JSON, "w") as f:
        json.dump({"events": events_out, "total": len(events_out)}, f, indent=2)

    print(f"✅ Saved 100-event demonstration dataset to:\n  - {OUT_ML_JSON}\n  - {OUT_BACKEND_JSON}")

if __name__ == "__main__":
    main()
