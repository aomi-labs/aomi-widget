#!/usr/bin/env python3
"""Fail closed on privileged pull-request jobs and mutable Actions refs."""

from __future__ import annotations

import pathlib
import re

import yaml


ROOT = pathlib.Path(__file__).resolve().parents[2]
WORKFLOWS = ROOT / ".github" / "workflows"
FORBIDDEN_WRITE = {"packages", "deployments", "id-token"}
FULL_SHA = re.compile(r"[0-9a-f]{40}")


def event_names(document: dict) -> set[str]:
    trigger = document.get("on", document.get(True, {}))
    if isinstance(trigger, str):
        return {trigger}
    if isinstance(trigger, list):
        return set(trigger)
    return set(trigger or {})


def permissions(document: dict, job: dict) -> dict[str, str]:
    value = job.get("permissions", document.get("permissions", {}))
    return value if isinstance(value, dict) else {}


def main() -> int:
    failures: list[str] = []
    for path in sorted(WORKFLOWS.glob("*.y*ml")):
        text = path.read_text()
        document = yaml.safe_load(text) or {}
        if "pull_request" in event_names(document):
            for job_name, job in (document.get("jobs") or {}).items():
                environment = job.get("environment")
                if isinstance(environment, dict):
                    environment = environment.get("name")
                if environment not in (None, "pr-tests"):
                    failures.append(
                        f"{path.name}:{job_name}: forbidden PR environment {environment!r}"
                    )
                for scope, level in permissions(document, job).items():
                    if scope in FORBIDDEN_WRITE and level == "write":
                        failures.append(
                            f"{path.name}:{job_name}: PR job grants {scope}: write"
                        )
        for line_number, line in enumerate(text.splitlines(), 1):
            if line.lstrip().startswith("#"):
                continue
            match = re.search(r"\buses:\s*([^\s#]+)", line)
            if not match or match.group(1).startswith("./"):
                continue
            ref = match.group(1).rsplit("@", 1)[-1]
            if not FULL_SHA.fullmatch(ref):
                failures.append(
                    f"{path.name}:{line_number}: action is not pinned to a full SHA"
                )
    for failure in failures:
        print(f"ERROR: {failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
