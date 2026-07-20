import { describe, expect, it } from "vitest";

import { BUILD_GLOSSARY, glossaryLine } from "./glossary";

describe("BUILD_GLOSSARY", () => {
  it("keeps one job per product name", () => {
    expect(BUILD_GLOSSARY.project.term).toBe("Project");
    expect(BUILD_GLOSSARY.environment.meaning).toMatch(/not Billing/i);
    expect(glossaryLine(["project", "deployment"])).toMatch(/Project:/);
  });
});
