import { describe, it, expect } from "vitest";
import {
  isValidInstallationId,
  isValidRepo,
  isValidDeploymentId,
  isValidReleaseTags,
} from "./validate-input";

describe("isValidInstallationId", () => {
  it("accepts numeric strings", () => {
    expect(isValidInstallationId("123456789")).toBe(true);
    expect(isValidInstallationId("0")).toBe(true);
    expect(isValidInstallationId("9999999999999")).toBe(true);
  });

  it("rejects non-string values", () => {
    expect(isValidInstallationId(undefined)).toBe(false);
    expect(isValidInstallationId(null)).toBe(false);
    expect(isValidInstallationId(123)).toBe(false);
    expect(isValidInstallationId({})).toBe(false);
    expect(isValidInstallationId([])).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isValidInstallationId("")).toBe(false);
    expect(isValidInstallationId("  ")).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(isValidInstallationId("123abc")).toBe(false);
    expect(isValidInstallationId("12.34")).toBe(false);
    expect(isValidInstallationId("-1")).toBe(false);
    expect(isValidInstallationId("12 34")).toBe(false);
  });

  it("trims whitespace before checking", () => {
    expect(isValidInstallationId("  42  ")).toBe(true);
  });
});

describe("isValidRepo", () => {
  it("accepts owner/name format", () => {
    expect(isValidRepo("owner/repo")).toBe(true);
    expect(isValidRepo("a/b")).toBe(true);
    expect(isValidRepo("my-org/my-repo")).toBe(true);
  });

  it("rejects non-string values", () => {
    expect(isValidRepo(undefined)).toBe(false);
    expect(isValidRepo(null)).toBe(false);
    expect(isValidRepo(42)).toBe(false);
  });

  it("rejects invalid formats", () => {
    expect(isValidRepo("")).toBe(false);
    expect(isValidRepo("only-one")).toBe(false);
    expect(isValidRepo("/starts-with-slash")).toBe(false);
    expect(isValidRepo("ends-with-slash/")).toBe(false);
    expect(isValidRepo("three/parts/here")).toBe(false);
    expect(isValidRepo("//")).toBe(false);
    expect(isValidRepo("owner/")).toBe(false);
    expect(isValidRepo("/repo")).toBe(false);
  });

  it("trims whitespace", () => {
    expect(isValidRepo("  owner/repo  ")).toBe(true);
  });
});

describe("isValidDeploymentId", () => {
  it("accepts non-empty strings", () => {
    expect(isValidDeploymentId("dep_123_abc_456")).toBe(true);
    expect(isValidDeploymentId("a")).toBe(true);
  });

  it("rejects non-string values", () => {
    expect(isValidDeploymentId(undefined)).toBe(false);
    expect(isValidDeploymentId(null)).toBe(false);
    expect(isValidDeploymentId(42)).toBe(false);
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(isValidDeploymentId("")).toBe(false);
    expect(isValidDeploymentId("  ")).toBe(false);
  });

  it("rejects strings that become empty after trim", () => {
    expect(isValidDeploymentId("\t\n")).toBe(false);
  });
});

describe("isValidReleaseTags", () => {
  it("accepts a non-empty array of non-empty strings", () => {
    expect(isValidReleaseTags(["staging"])).toBe(true);
    expect(isValidReleaseTags(["staging", "production"])).toBe(true);
  });

  it("accepts an empty array", () => {
    expect(isValidReleaseTags([])).toBe(true);
  });

  it("rejects non-array values", () => {
    expect(isValidReleaseTags(undefined)).toBe(false);
    expect(isValidReleaseTags(null)).toBe(false);
    expect(isValidReleaseTags("staging")).toBe(false);
    expect(isValidReleaseTags(42)).toBe(false);
  });

  it("rejects arrays with non-string elements", () => {
    expect(isValidReleaseTags(["staging", 42])).toBe(false);
    expect(isValidReleaseTags([true])).toBe(false);
    expect(isValidReleaseTags([null])).toBe(false);
    expect(isValidReleaseTags([["nested"]])).toBe(false);
  });

  it("rejects arrays with whitespace-only strings", () => {
    expect(isValidReleaseTags(["staging", "  "])).toBe(false);
    expect(isValidReleaseTags(["\t"])).toBe(false);
  });

  it("trims before checking emptiness", () => {
    expect(isValidReleaseTags(["  staging  "])).toBe(true);
  });
});
