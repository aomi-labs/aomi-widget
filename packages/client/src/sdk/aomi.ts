import { AomiClient } from "../client";
import type { ActionCapabilities } from "../actions";
import type { AomiClientOptions } from "../types";
import { AomiAgent } from "./agent";
import { AomiPipeline } from "./pipeline";

export interface AomiOptions extends AomiClientOptions {
  actions?: ActionCapabilities;
}

/** Product-oriented SDK facade. Use `raw` for wire-close protocol control. */
export class Aomi {
  readonly raw: AomiClient;
  readonly pipeline: AomiPipeline;
  readonly agent: AomiAgent;

  constructor(options: AomiOptions) {
    const { actions, ...clientOptions } = options;
    this.raw = new AomiClient(clientOptions);
    this.pipeline = new AomiPipeline(this.raw.pipeline);
    this.agent = new AomiAgent(this.raw.agent, this.raw, actions);
  }
}
