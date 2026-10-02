#!/usr/bin/env python3
"""Standard-library summaries of actual lab outcomes or paired model replay results."""
import argparse
import json
from collections import defaultdict
from pathlib import Path


def analyze_results(data):
    totals = defaultdict(lambda: {"n": 0, "correct": 0, "wrong": 0, "miss": 0})
    paired = {}
    for row in data["rows"]:
        total = totals[row["mode"]]
        total["n"] += row["n"]
        for key in ("correct", "wrong", "miss"):
            total[key] += row["policy"][key]
        paired[(row.get("rms"), row.get("seed"), row["mode"])] = row.get("outcomes", [])
    print("Geometry/gesture model outcomes, aggregated over the supplied rows:")
    for mode, total in totals.items():
        n = total["n"]
        print(mode, "n=", n, ", ".join(f"{k}={100 * total[k] / n:.2f}%" for k in ("correct", "wrong", "miss")))
    for mode in ("stable", "adaptive"):
        improvements = regressions = n = 0
        for (rms, seed, m), baseline in paired.items():
            if m != "nearest":
                continue
            candidate = paired.get((rms, seed, mode), [])
            if len(baseline) != len(candidate):
                continue
            for a, b in zip(baseline, candidate):
                improvements += a != "correct" and b == "correct"
                regressions += a == "correct" and b != "correct"
                n += 1
        print(f"Paired {mode} vs nearest: {improvements} improvements, {regressions} regressions, {n} paired trials.")
    print("No population or clinical conclusion follows from these aggregates.")


def analyze_trace(data):
    groups = defaultdict(lambda: {"n": 0, "correct": 0, "wrong": 0, "miss": 0, "duplicate": 0, "seconds": []})
    for trial in data["trials"]:
        if "observedClickedIds" not in trial:
            continue
        group = groups[trial.get("conditionLabel", data.get("meta", {}).get("conditionLabel", "unknown"))]
        clicked = trial["observedClickedIds"]
        group["n"] += 1
        outcome = "miss" if not clicked else "correct" if clicked[0] == trial["intendedId"] else "wrong"
        group[outcome] += 1
        group["duplicate"] += max(0, len(clicked) - 1)
        down = next(s for s in trial["samples"] if s["type"] == "down")
        group["seconds"].append(down["t"])
    print("Observed lab activations (condition labels are self-reported, not verified):")
    for condition, group in groups.items():
        n = group["n"]
        print(condition, "n=", n, ", ".join(f"{k}={100 * group[k] / n:.2f}%" for k in ("correct", "wrong", "miss")),
              "duplicate activations=", group["duplicate"], "mean prompt-to-press seconds=", round(sum(group["seconds"]) / n, 3))
    print("Within-person trials are not independent participants. Do not pool them to claim population benefit.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    if args.file.stat().st_size > 25 * 1024 * 1024:
        raise SystemExit("Maximum input size: 25 MiB")
    data = json.loads(args.file.read_text())
    if "rows" in data:
        analyze_results(data)
    elif data.get("source") == "lab-recording":
        analyze_trace(data)
    else:
        raise SystemExit("Expected a replay result or lab recording JSON export.")
