import type {
  EvmPipelineTransport,
  SvmPipelineTransport,
} from "../pipeline/transport";
import type {
  EvmCommitResult,
  EvmPresentedAction,
  EvmSimulatedBuild,
  EvmStagedBuild,
  PipelineActionSummary,
  PipelineCommitOptions,
  PipelineSimulation,
  SvmCommitResult,
  SvmPresentedAction,
  SvmSimulatedBuild,
  SvmStagedBuild,
} from "../pipeline/types";
import { WalletController } from "../wallet/controller";

export class EvmStaged {
  constructor(
    readonly raw: EvmStagedBuild,
    private readonly transport: EvmPipelineTransport,
    private readonly wallet: WalletController,
  ) {}

  get version(): 1 {
    return this.raw.version;
  }

  get status(): "staged" {
    return this.raw.status;
  }

  get actions(): EvmPresentedAction[] {
    return this.raw.actions.map((action) => ({
      ...action,
      chainFamily: "evm",
      kind: "calls",
    }));
  }

  get digest(): string {
    return this.raw.digest;
  }

  async simulate(): Promise<EvmBuild> {
    return new EvmBuild(
      await this.transport.simulate(this.raw),
      this.transport,
      this.wallet,
    );
  }

  toJSON(): EvmStagedBuild {
    return this.raw;
  }
}

export class EvmBuild {
  constructor(
    readonly raw: EvmSimulatedBuild,
    private readonly transport: EvmPipelineTransport,
    private readonly wallet: WalletController,
  ) {}

  get version(): 1 {
    return this.raw.version;
  }

  get status(): "simulated" {
    return this.raw.status;
  }

  get actions(): EvmPresentedAction[] {
    return this.raw.actions.map((action) => ({
      ...action,
      chainFamily: "evm",
      kind: "calls",
    }));
  }

  get summary(): PipelineActionSummary | undefined {
    return this.raw.summary;
  }

  get simulation(): PipelineSimulation {
    return this.raw.simulation;
  }

  get digest(): string {
    return this.raw.digest;
  }

  async commit(options?: PipelineCommitOptions): Promise<EvmCommitResult> {
    const result = await this.transport.commit(this.raw, options);
    if (!result.walletRequest || !this.wallet.canHandle(result.walletRequest)) {
      return result;
    }
    return {
      ...result,
      walletResult: await this.wallet.execute(result.walletRequest),
    };
  }

  toJSON(): EvmSimulatedBuild {
    return this.raw;
  }
}

export class SvmStaged {
  constructor(
    readonly raw: SvmStagedBuild,
    private readonly transport: SvmPipelineTransport,
    private readonly wallet: WalletController,
  ) {}

  get version(): 1 {
    return this.raw.version;
  }

  get status(): "staged" {
    return this.raw.status;
  }

  get actions(): SvmPresentedAction[] {
    return this.raw.actions.map((action) => ({
      ...action,
      chainFamily: "svm",
    }));
  }

  get digest(): string {
    return this.raw.digest;
  }

  async simulate(): Promise<SvmBuild> {
    return new SvmBuild(
      await this.transport.simulate(this.raw),
      this.transport,
      this.wallet,
    );
  }

  toJSON(): SvmStagedBuild {
    return this.raw;
  }
}

export class SvmBuild {
  constructor(
    readonly raw: SvmSimulatedBuild,
    private readonly transport: SvmPipelineTransport,
    private readonly wallet: WalletController,
  ) {}

  get version(): 1 {
    return this.raw.version;
  }

  get status(): "simulated" {
    return this.raw.status;
  }

  get actions(): SvmPresentedAction[] {
    return this.raw.actions.map((action) => ({
      ...action,
      chainFamily: "svm",
    }));
  }

  get summary(): PipelineActionSummary | undefined {
    return this.raw.summary;
  }

  get simulation(): PipelineSimulation {
    return this.raw.simulation;
  }

  get digest(): string {
    return this.raw.digest;
  }

  async commit(options?: PipelineCommitOptions): Promise<SvmCommitResult> {
    const result = await this.transport.commit(this.raw, options);
    if (!result.walletRequest || !this.wallet.canHandle(result.walletRequest)) {
      return result;
    }
    return {
      ...result,
      walletResult: await this.wallet.execute(result.walletRequest),
    };
  }

  toJSON(): SvmSimulatedBuild {
    return this.raw;
  }
}
