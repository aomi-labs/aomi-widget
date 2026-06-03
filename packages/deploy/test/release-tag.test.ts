import { describe, expect, it } from "vitest";

import {
  COMMIT_RE,
  assertValidCommit,
  deriveSourceCommit,
  releaseTag,
  shortCommit,
} from "../src/release-tag";
import type { StagedFile } from "../src/contract";

describe("release-tag", () => {
  it("builds apps-<slug>-<commit[:12]>", () => {
    const commit = "0123456789abcdef0123456789abcdef01234567";
    expect(releaseTag("krexa-finance", commit)).toBe("apps-krexa-finance-0123456789ab");
  });

  it("short commit is the first 12 chars", () => {
    expect(shortCommit("0123456789abcdef")).toBe("0123456789ab");
  });

  it("COMMIT_RE accepts 12-40 lowercase hex, rejects otherwise", () => {
    expect(COMMIT_RE.test("0123456789ab")).toBe(true);
    expect(COMMIT_RE.test("0123456789abcdef0123456789abcdef01234567")).toBe(true);
    expect(COMMIT_RE.test("0123456789a")).toBe(false); // 11 chars
    expect(COMMIT_RE.test("0123456789ABCDEF")).toBe(false); // uppercase
    expect(COMMIT_RE.test("zzzzzzzzzzzz")).toBe(false);
  });

  it("assertValidCommit throws INVALID_COMMIT on bad input", () => {
    expect(() => assertValidCommit("nope")).toThrowError(/12.40 lowercase hex/);
  });

  it("releaseTag honours a custom convention", () => {
    const commit = "abcabcabcabc";
    expect(releaseTag("x", commit, "rel/{app_slug}@{short_commit}")).toBe("rel/x@abcabcabcabc");
  });

  describe("deriveSourceCommit", () => {
    const files: StagedFile[] = [
      { path: "a.txt", sha256: "sha256:aa", bytes: 1 },
      { path: "b.txt", sha256: "sha256:bb", bytes: 2 },
    ];

    it("is deterministic and 40 lowercase hex", () => {
      const c1 = deriveSourceCommit(files);
      const c2 = deriveSourceCommit([...files].reverse());
      expect(c1).toBe(c2); // order-independent (sorted internally)
      expect(c1).toMatch(/^[0-9a-f]{40}$/);
    });

    it("changes when content changes", () => {
      const other = deriveSourceCommit([{ path: "a.txt", sha256: "sha256:cc", bytes: 1 }]);
      expect(other).not.toBe(deriveSourceCommit(files));
    });
  });
});
