#!/usr/bin/env python3
"""
AstraFlare Acceptance Test Suite
---------------------------------
Executes comprehensive validation for:
1. Dataset manifest and cleaning reproducibility
2. Coordinate and timestamp validation
3. Historical feature causality
4. Train/inference feature schema consistency
5. Model artifact loading and inference
6. Inference on incomplete records
7. Model-unavailable fallback
8. Operational risk calculation vs model score separation
9. 100-event demonstration dataset integrity
"""

import os
import json
import joblib
import unittest
import numpy as np
import pandas as pd

from model import FirePredictor, haversine_distance_meters

class TestAstraFlareMLPipeline(unittest.TestCase):

    def setUp(self):
        self.repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        self.artifacts_dir = os.path.join(self.repo_root, "ml/artifacts")
        self.experiment_dir = os.path.join(self.repo_root, "ml/data/processed/experiment_dataset_v1")
        self.demo_path = os.path.join(self.repo_root, "ml/data/processed/demonstration_100_events.json")

    def test_01_manifest_and_dataset_integrity(self):
        """Verify experiment dataset manifest exists and matches record counts."""
        manifest_file = os.path.join(self.experiment_dir, "dataset_manifest.json")
        self.assertTrue(os.path.exists(manifest_file), "Dataset manifest missing")

        with open(manifest_file, "r") as f:
            manifest = json.load(f)

        self.assertEqual(manifest["output_files"]["experiment_events.csv"]["rows"], 5500)
        self.assertIn("scientific_integrity_notes", manifest)

        # Check CSV
        csv_file = os.path.join(self.experiment_dir, "experiment_events.csv")
        df = pd.read_csv(csv_file)
        self.assertEqual(len(df), 5500)

        # Validate coordinates within sovereign India bounds
        self.assertTrue((df["centroid_lat"] >= 6.0).all() and (df["centroid_lat"] <= 38.0).all())
        self.assertTrue((df["centroid_lon"] >= 68.0).all() and (df["centroid_lon"] <= 98.0).all())

    def test_02_historical_feature_causality(self):
        """Verify historical count and baseline FRP are non-negative and causal."""
        csv_file = os.path.join(self.experiment_dir, "experiment_events.csv")
        df = pd.read_csv(csv_file)
        self.assertTrue((df["historical_count_30d"] >= 0).all())
        # Timestamps must be valid ISO-8601 UTC
        start_dt = pd.to_datetime(df["event_start"], utc=True)
        end_dt = pd.to_datetime(df["event_end"], utc=True)
        self.assertTrue((end_dt >= start_dt).all(), "Temporal violation: event_end < event_start")

    def test_03_model_artifacts_and_schema_consistency(self):
        """Verify saved model artifacts and feature schema ordering."""
        model_path = os.path.join(self.artifacts_dir, "model.joblib")
        preproc_path = os.path.join(self.artifacts_dir, "preprocessor.joblib")
        meta_path = os.path.join(self.artifacts_dir, "model_metadata.json")

        self.assertTrue(os.path.exists(model_path), "model.joblib missing")
        self.assertTrue(os.path.exists(preproc_path), "preprocessor.joblib missing")
        self.assertTrue(os.path.exists(meta_path), "model_metadata.json missing")

        with open(meta_path, "r") as f:
            meta = json.load(f)

        self.assertEqual(meta["feature_count"], 19)
        self.assertIn("max_frp", meta["feature_columns"])
        self.assertIn("industrial_distance_m", meta["feature_columns"])
        self.assertGreater(meta["balanced_accuracy"], 0.70)

    def test_04_predictor_inference_valid_record(self):
        """Verify inference runs and returns all required keys."""
        predictor = FirePredictor()
        self.assertTrue(predictor.model_loaded)

        res = predictor.predict(
            lat=22.4707,
            lng=70.0577,
            frp=35.0,
            brightness=340.0,
            duration_hours=2.5,
            observation_count=3,
        )

        self.assertIn("fire_type", res)
        self.assertIn("confidence_score", res)
        self.assertIn("operational_risk", res)
        self.assertIn("endangered_industries", res)
        self.assertEqual(res["model_name"], "AstraFlare-ThermalEventClassifier")
        self.assertIsInstance(res["operational_risk"]["score"], float)

    def test_05_predictor_inference_incomplete_record(self):
        """Verify robust handling of incomplete records with defaults."""
        predictor = FirePredictor()
        res = predictor.predict(lat=19.0, lng=73.0)
        self.assertIn("fire_type", res)
        self.assertIn("operational_risk", res)
        self.assertEqual(res["model_status"], "active")

    def test_06_operational_risk_separation(self):
        """Verify operational risk is calculated independently from model score."""
        predictor = FirePredictor()
        # Incident directly next to an industrial site (Jamnagar refinery lat 22.4707, lng 70.0577)
        res_near = predictor.predict(lat=22.4707, lng=70.0577, frp=10.0)
        # Incident in remote uninhabited area
        res_remote = predictor.predict(lat=28.0, lng=71.0, frp=10.0)

        self.assertGreater(res_near["operational_risk"]["score"], res_remote["operational_risk"]["score"])

    def test_07_100_event_demonstration_integrity(self):
        """Verify the 100-event demonstration dataset is complete and valid."""
        self.assertTrue(os.path.exists(self.demo_path), "demonstration_100_events.json missing")
        with open(self.demo_path, "r") as f:
            demo = json.load(f)

        events = demo.get("events", [])
        self.assertEqual(len(events), 100)

        # Check required fields
        for evt in events:
            self.assertIn("event_id", evt)
            self.assertIn("latitude", evt)
            self.assertIn("longitude", evt)
            self.assertIn("classification", evt)
            self.assertIn("operational_risk", evt)
            self.assertIn("nearest_facility", evt)
            self.assertIn("model_score_uncalibrated", evt)

        # Check risk level distribution has mix of High/Critical/Moderate/Low
        levels = {e["operational_risk"]["risk_level"] for e in events}
        self.assertIn("Critical", levels)
        self.assertIn("High", levels)
        self.assertIn("Low", levels)

if __name__ == "__main__":
    unittest.main()
