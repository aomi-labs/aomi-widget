import { describe, expect, it } from "vitest";

import { getChainIcon } from "./chain-map";

describe("chain icon map", () => {
  it("uses the monochrome Robinhood icon for chain 4663", () => {
    const Icon = getChainIcon(4663);

    expect(Icon).toBeDefined();
    expect(Icon?.name).toBe("RobinhoodIcon");
  });
});
