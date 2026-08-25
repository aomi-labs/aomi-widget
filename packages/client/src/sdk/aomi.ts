import { AomiClient } from "../client";
import type { AomiClientOptions } from "../types";
import { WalletController, type AomiWalletAdapter } from "../wallet/controller";
import { AomiAgent } from "./agent";
import { AomiPipeline } from "./pipeline";

export interface AomiOptions extends AomiClientOptions {
  wallet?: AomiWalletAdapter;
}

/** Product-oriented SDK facade. Use `raw` for wire-close protocol control. */
export class Aomi {
  readonly raw: AomiClient;
  readonly pipeline: AomiPipeline;
  readonly agent: AomiAgent;
  readonly wallet: WalletController;

  constructor(options: AomiOptions) {
    const { wallet, ...clientOptions } = options;
    this.raw = new AomiClient(clientOptions);
    this.wallet = new WalletController(wallet);
    this.pipeline = new AomiPipeline(this.raw.pipeline, this.wallet);
    this.agent = new AomiAgent(this.raw.agent, this.raw, this.wallet);
  }
}
