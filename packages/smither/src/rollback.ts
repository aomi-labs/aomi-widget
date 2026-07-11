import {
  DeploymentClient,
  type ListActivationsResult,
} from "@aomi-labs/deploy";
import { resolveActivationCredential } from "./commands";

export type RollbackClient = Pick<
  DeploymentClient,
  "listActivations" | "rollback"
>;

export type RollbackTarget = {
  deploymentId: string;
  releaseTag: string;
  action: string;
  createdAt: number;
  current: boolean;
};

export type RollbackPlanSummary = {
  app: string;
  current: RollbackTarget | null;
  /** Newest activation whose release tag differs from the live one. */
  previous: RollbackTarget | null;
  activations: RollbackTarget[];
};

export function planRollback(
  result: ListActivationsResult,
): RollbackPlanSummary {
  const activations = result.activations.map((row) => ({
    deploymentId: row.deploymentId,
    releaseTag: row.releaseTag,
    action: row.action,
    createdAt: row.createdAt,
    current: row.current,
  }));
  const current = activations.find((row) => row.current) ?? null;
  const previous =
    activations.find((row) => row.releaseTag !== result.currentReleaseTag) ??
    null;
  return { app: result.app, current, previous, activations };
}

export async function executeRollback(
  client: RollbackClient,
  input: { platform: string; app: string; deploymentId: string },
): Promise<{ ok: boolean; releaseTags: string[]; status: string }> {
  const result = await client.rollback({
    platform: input.platform,
    deploymentId: input.deploymentId,
    apps: [input.app],
    actor: "aomi-smither",
  });
  return {
    ok: result.ok,
    releaseTags: result.rollback.releaseTags,
    status: result.rollback.status,
  };
}

export async function rollbackClientFromEnv(options: {
  env?: NodeJS.ProcessEnv;
  activationToken?: string;
  backendUrl?: string;
}): Promise<DeploymentClient> {
  const env = options.env ?? process.env;
  const backendUrl = options.backendUrl ?? env.AOMI_BACKEND_URL;
  if (!backendUrl) {
    throw new Error(
      "No backend URL. Pass --backend-url or set AOMI_BACKEND_URL.",
    );
  }
  const activation = await resolveActivationCredential({
    activationToken: options.activationToken,
    env,
  });
  if (!activation) {
    throw new Error(
      "No activation token found. Set AOMI_APP_ACTIVATION_TOKEN or pass --activation-token.",
    );
  }
  return new DeploymentClient({
    aomi: { backendUrl, activationToken: activation.token },
  });
}
