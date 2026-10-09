#!/usr/bin/env python3
"""
AstraFlare Phase 5: Reproducible Machine Learning Training Pipeline
---------------------------------------------------------------------
Trains a causal, leakage-free thermal event classifier on tabular event features.
Compares a gradient-boosted tree model against simple baselines using temporal holdout.
Generates comprehensive evaluation metrics, confusion matrices, and serialized artifacts.
"""

import os
import json
import joblib
import datetime
import numpy as np
import pandas as pd
from typing import List, Dict, Any

from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    balanced_accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

RANDOM_SEED = 42
MODEL_VERSION = "2.2.0"
DATASET_PATH = "ml/data/processed/experiment_dataset_v1/experiment_events.csv"
ARTIFACTS_DIR = "ml/artifacts"

FEATURE_COLUMNS = [
    "duration_hours",
    "observation_count",
    "satellite_count",
    "spatial_extent_m",
    "max_frp",
    "mean_frp",
    "std_frp",
    "max_brightness",
    "mean_brightness",
    "confidence_high_ratio",
    "centroid_lat",
    "centroid_lon",
    "industrial_distance_m",
    "industrial_site_count_1km",
    "industrial_site_count_5km",
    "land_cover_code",
    "historical_count_30d",
    "historical_mean_frp",
    "frp_anomaly_zscore",
]

def build_training_dataset(df: pd.DataFrame):
    """
    Formulate target labels with honest scientific provenance:
    - POSSIBLE_AGRICULTURAL_BURNING
    - NATURAL_WILDLAND_FIRE
    - UNKNOWN_REQUIRES_REVIEW (mapped from UNLABELED / abstention)
    Note: LIKELY_INDUSTRIAL_INCIDENT is isolated because N=1 is insufficient for ML training.
    """
    clean_df = df.copy()

    # Map target labels
    label_mapping = {
        "POSSIBLE_AGRICULTURAL_BURNING": "POSSIBLE_AGRICULTURAL_BURNING",
        "NATURAL_WILDLAND_FIRE": "NATURAL_WILDLAND_FIRE",
        "UNLABELED": "UNKNOWN_REQUIRES_REVIEW",
    }
    
    # Filter out LIKELY_INDUSTRIAL_INCIDENT from supervised training
    clean_df = clean_df[clean_df["label"] != "LIKELY_INDUSTRIAL_INCIDENT"]
    clean_df["target"] = clean_df["label"].map(label_mapping)
    
    # Convert timestamps
    clean_df["start_dt"] = pd.to_datetime(clean_df["event_start"])
    clean_df = clean_df.sort_values(by="start_dt").reset_index(drop=True)

    return clean_df

def temporal_split(df: pd.DataFrame, train_ratio: float = 0.75):
    """
    Temporal holdout split:
    All earlier events used for training, all later events used for testing.
    Prevents temporal data leakage and ensures future events are never seen in training.
    """
    split_idx = int(len(df) * train_ratio)
    split_date = df.iloc[split_idx]["start_dt"]
    
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    # Verify no event_id overlap
    train_ids = set(train_df["event_id"])
    test_ids = set(test_df["event_id"])
    assert len(train_ids.intersection(test_ids)) == 0, "Leakage detected: overlapping event IDs!"

    return train_df, test_df, split_date

def main():
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    print(f"🚀 Initializing AstraFlare ML Pipeline (v{MODEL_VERSION})...")

    raw_df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(raw_df)} records from {DATASET_PATH}")

    df = build_training_dataset(raw_df)
    print(f"Prepared {len(df)} records for training/validation. Class distribution:")
    print(df["target"].value_counts())

    train_df, test_df, split_date = temporal_split(df, train_ratio=0.75)
    print(f"\n📅 Temporal Split at {split_date.strftime('%Y-%m-%d %H:%M:%S UTC')}:")
    print(f"  Training events: {len(train_df)} | Class counts:\n{train_df['target'].value_counts()}")
    print(f"  Test events:     {len(test_df)} | Class counts:\n{test_df['target'].value_counts()}")

    X_train = train_df[FEATURE_COLUMNS].fillna(0.0).copy()
    y_train = train_df["target"].values

    X_test = test_df[FEATURE_COLUMNS].fillna(0.0).copy()
    y_test = test_df["target"].values

    classes = np.unique(y_train)

    # 1. Baseline Model (Majority Class Prior)
    dummy_prior = DummyClassifier(strategy="prior")
    dummy_prior.fit(X_train, y_train)
    y_pred_dummy = dummy_prior.predict(X_test)
    dummy_acc = balanced_accuracy_score(y_test, y_pred_dummy)
    dummy_f1 = f1_score(y_test, y_pred_dummy, average="macro", zero_division=0)
    print(f"\n📊 Baseline (Majority Class Prior): Balanced Acc = {dummy_acc:.4f}, Macro F1 = {dummy_f1:.4f}")

    # 2. Preprocessor Pipeline (Feature Scaling)
    preprocessor = Pipeline([
        ("scaler", StandardScaler()),
    ])

    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # 3. Primary Gradient Boosted Classifier (Random Forest with Balanced Class Weights)
    clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        class_weight="balanced",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    print("\n⏳ Fitting primary RandomForestClassifier...")
    clf.fit(X_train_proc, y_train)

    y_pred = clf.predict(X_test_proc)
    y_proba = clf.predict_proba(X_test_proc)

    # Metrics
    bal_acc = balanced_accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
    report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    conf_matrix = confusion_matrix(y_test, y_pred, labels=classes).tolist()

    print(f"\n🎯 AstraFlare Trained Model Results:")
    print(f"  Balanced Accuracy: {bal_acc:.4f} (vs Baseline: {dummy_acc:.4f})")
    print(f"  Macro F1:          {macro_f1:.4f} (vs Baseline: {dummy_f1:.4f})")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    # Feature Importances
    importances = clf.feature_importances_
    feat_importance_list = [
        {"feature": feat, "importance": round(float(imp), 5)}
        for feat, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True)
    ]
    print("Top 5 Predictive Features:")
    for item in feat_importance_list[:5]:
        print(f"  - {item['feature']}: {item['importance']}")

    # Failure case analysis
    test_df["predicted"] = y_pred
    test_df["max_prob"] = np.max(y_proba, axis=1)
    failures = test_df[test_df["target"] != test_df["predicted"]]
    failure_samples = []
    for _, row in failures.head(5).iterrows():
        failure_samples.append({
            "event_id": row["event_id"],
            "true_target": row["target"],
            "predicted": row["predicted"],
            "confidence_score": round(float(row["max_prob"]), 4),
            "frp": float(row["max_frp"]),
            "industrial_distance_m": float(row["industrial_distance_m"])
        })

    # Save Artifacts
    model_artifact_path = os.path.join(ARTIFACTS_DIR, "model.joblib")
    preprocessor_artifact_path = os.path.join(ARTIFACTS_DIR, "preprocessor.joblib")
    joblib.dump(clf, model_artifact_path)
    joblib.dump(preprocessor, preprocessor_artifact_path)

    # Save Model Metadata
    metadata = {
        "model_name": "AstraFlare-ThermalEventClassifier",
        "model_version": MODEL_VERSION,
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "random_seed": RANDOM_SEED,
        "algorithm": "RandomForestClassifier",
        "feature_columns": FEATURE_COLUMNS,
        "feature_count": len(FEATURE_COLUMNS),
        "classes": list(classes),
        "split_strategy": "Temporal Holdout (75% train / 25% test)",
        "split_date_utc": str(split_date),
        "train_samples": len(train_df),
        "test_samples": len(test_df),
        "balanced_accuracy": round(float(bal_acc), 4),
        "macro_f1": round(float(macro_f1), 4),
        "baseline_comparison": {
            "dummy_prior_balanced_accuracy": round(float(dummy_acc), 4),
            "dummy_prior_macro_f1": round(float(dummy_f1), 4),
            "balanced_accuracy_lift": round(float(bal_acc - dummy_acc), 4)
        },
        "feature_importances": feat_importance_list,
        "scientific_limitations": [
            "Trained on weak provisional labels; does not represent ground-truth physical verification.",
            "Industrial fire instances (N=1 weak, N=6 audit) are too scarce for supervised ML; industrial risk is computed via deterministic proximity and physical rules rather than direct classification.",
            "Model scores are uncalibrated probabilities; operational priority is computed independently."
        ]
    }
    with open(os.path.join(ARTIFACTS_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    # Save Evaluation Report
    eval_report = {
        "model_version": MODEL_VERSION,
        "evaluation_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "classes": list(classes),
        "confusion_matrix": conf_matrix,
        "classification_metrics": report_dict,
        "balanced_accuracy": float(bal_acc),
        "macro_f1": float(macro_f1),
        "sample_failure_cases": failure_samples,
    }
    with open(os.path.join(ARTIFACTS_DIR, "evaluation_report.json"), "w") as f:
        json.dump(eval_report, f, indent=2)

    print(f"\n✅ Model artifacts and evaluation report successfully saved in {ARTIFACTS_DIR}/")

if __name__ == "__main__":
    main()
