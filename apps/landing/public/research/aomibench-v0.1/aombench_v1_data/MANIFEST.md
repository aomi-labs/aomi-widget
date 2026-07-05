# Aomi Bench v0.1 Manifest

Canonical files:

- `README.md`: final benchmark report.
- `suite.json`: benchmark suite definition for the canonical 7-model v0.1 bench.
- `summary.full.json`: native suite summary with all JSON-backed leaf data.
- `summary.compact.json`: native compact suite summary for charting and quick reads.
- `latest.json`: native suite snapshot; this remains partial because 6 canonical leaves had no JSON output.
- `summaries/`: timestamped copies of the native summary and snapshot files.
- `specs/`: merged leaf run outputs, keyed by benchmark/model/pass.
- `run-logs/`: preserved per-source `report.md` and `resume-status*.jsonl` files from the original split runs.

Notes:

- `specs/send_base_usdc_to_bob` is preserved as quarantined source data, but it is intentionally excluded from `suite.json` and the 700-leaf supported denominator.

Archived cleanup:

- Older aggregate folders and pre-promotion leftovers were moved under `../archive/20260601-aomi-bench-v0.1-cleanup`.
