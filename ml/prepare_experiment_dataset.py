#!/usr/bin/env python3
"""
AstraFlare Phase 2: Reproducible Experiment Dataset Builder
------------------------------------------------------------
Constructs an auditable, versioned 5,500-event experiment dataset
from the clean Phase 1 event collection and generates a comprehensive manifest.
"""

import os
import json
import hashlib
import datetime
import pandas as pd
import numpy as np

CLEAN_DIR = "ml/data/processed/phase1_clean_dataset"
OUTPUT_DIR = "ml/data/processed/experiment_dataset_v1"
RANDOM_SEED = 42

def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("⏳ Loading Phase 1 clean features and weak labels...")

    features_path = os.path.join(CLEAN_DIR, "events_features_clean.csv")
    labels_path = os.path.join(CLEAN_DIR, "events_weak_labels.csv")

    df_feat = pd.read_csv(features_path)
    df_lab = pd.read_csv(labels_path)

    print(f"Loaded {len(df_feat)} features rows and {len(df_lab)} labels rows.")

    # Merge on event_id
    df = pd.merge(df_feat, df_lab[['event_id', 'label', 'rule_id', 'label_source', 'label_confidence', 'unlabeled_reason_code']], on='event_id', how='inner')
    print(f"Merged dataset shape: {df.shape}")

    # Check distribution
    label_dist = df['label'].value_counts().to_dict()
    print("Initial label distribution:", label_dist)

    # Stratified reproducible sampling for 5,500 records:
    # 1. Take all minority classes:
    #    - LIKELY_INDUSTRIAL_INCIDENT (N=1)
    #    - NATURAL_WILDLAND_FIRE (N=34)
    # 2. Sample 2,700 POSSIBLE_AGRICULTURAL_BURNING
    # 3. Sample 2,765 UNLABELED events (representing ambiguous / analyst review cases)
    # Total = 1 + 34 + 2700 + 2765 = 5,500

    np.random.seed(RANDOM_SEED)

    subsets = []
    for label_val in ['LIKELY_INDUSTRIAL_INCIDENT', 'NATURAL_WILDLAND_FIRE']:
        sub = df[df['label'] == label_val]
        subsets.append(sub)

    # Sample agricultural burning
    agri_df = df[df['label'] == 'POSSIBLE_AGRICULTURAL_BURNING']
    agri_sampled = agri_df.sample(n=min(2700, len(agri_df)), random_state=RANDOM_SEED)
    subsets.append(agri_sampled)

    # Sample unlabeled
    unlabeled_df = df[df['label'] == 'UNLABELED']
    target_unlabeled = 5500 - sum(len(s) for s in subsets)
    unlabeled_sampled = unlabeled_df.sample(n=target_unlabeled, random_state=RANDOM_SEED)
    subsets.append(unlabeled_sampled)

    experiment_df = pd.concat(subsets, ignore_index=True)
    # Sort deterministically by event_start and event_id
    experiment_df = experiment_df.sort_values(by=['event_start', 'event_id']).reset_index(drop=True)

    print(f"Final experiment dataset count: {len(experiment_df)}")
    print("Final label distribution:\n", experiment_df['label'].value_counts())

    # Save CSV and Parquet
    csv_out = os.path.join(OUTPUT_DIR, "experiment_events.csv")
    parquet_out = os.path.join(OUTPUT_DIR, "experiment_events.parquet")

    experiment_df.to_csv(csv_out, index=False)
    experiment_df.to_parquet(parquet_out, index=False)

    csv_sha = compute_sha256(csv_out)
    parquet_sha = compute_sha256(parquet_out)

    # Missing value statistics
    missing_counts = experiment_df.isnull().sum().to_dict()

    # Build Manifest
    manifest = {
        "manifest_version": "2.0.0",
        "dataset_name": "AstraFlare_Experiment_Dataset_v1",
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "random_seed": RANDOM_SEED,
        "input_sources": [
            {
                "path": features_path,
                "sha256": compute_sha256(features_path),
                "total_rows": len(df_feat)
            },
            {
                "path": labels_path,
                "sha256": compute_sha256(labels_path),
                "total_rows": len(df_lab)
            }
        ],
        "output_files": {
            "experiment_events.csv": {
                "rows": len(experiment_df),
                "sha256": csv_sha,
                "size_bytes": os.path.getsize(csv_out)
            },
            "experiment_events.parquet": {
                "rows": len(experiment_df),
                "sha256": parquet_sha,
                "size_bytes": os.path.getsize(parquet_out)
            }
        },
        "temporal_range": {
            "start": str(experiment_df['event_start'].min()),
            "end": str(experiment_df['event_end'].max())
        },
        "geographic_bounds": {
            "min_lat": float(experiment_df['centroid_lat'].min()),
            "max_lat": float(experiment_df['centroid_lat'].max()),
            "min_lon": float(experiment_df['centroid_lon'].min()),
            "max_lon": float(experiment_df['centroid_lon'].max())
        },
        "label_distribution": {k: int(v) for k, v in experiment_df['label'].value_counts().items()},
        "unlabeled_reason_breakdown": {
            k: int(v) for k, v in experiment_df[experiment_df['label'] == 'UNLABELED']['unlabeled_reason_code'].value_counts().items()
        },
        "missing_values": {k: int(v) for k, v in missing_counts.items() if v > 0},
        "scientific_integrity_notes": [
            "Idempotent deterministic sampling with seed 42.",
            "All non-positive and zero FRP records preserved truthfully; no synthetic imputation applied.",
            "Causal historical features strictly computed prior to event_start.",
            "Independent industrial ground-truth sample size in repository is N=6, which is statistically insufficient for standalone ML supervised classification.",
            "Weak labels generated by conservative spatial-thermal heuristics; they are provisional and not presented as verified truth."
        ]
    }

    manifest_path = os.path.join(OUTPUT_DIR, "dataset_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"✅ Saved experiment dataset and manifest to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
