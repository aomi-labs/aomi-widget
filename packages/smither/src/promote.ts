import {
  DeploymentClient,
  type ListDeploymentRecordsResult,
} from "@aomi-labs/deploy";
import { resolveActivationCredential } from "./commands";

export type PromoteClient = Pick<
  DeploymentClient,
  "listDeploymentRecords" | "promote"
>;

export type PromoteTarget = {
  deploymentId: string;
  releaseTag: string;
  createdAt: number;
  current: boolean;
};

export type PromotePlanSummary = {
  app: string;
  current: PromoteTarget | null;
  /** Newest record whose release tag differs from the live one. */
  previous: PromoteTarget | null;
  records: PromoteTarget[];
};

export function planPromote(
  result: ListDeploymentRecordsResult,
): PromotePlanSummary {
  const records = result.records.map((row) => ({
    deploymentId: row.deploymentId,
    releaseTag: row.releaseTag,
    createdAt: row.createdAt,
    current: row.current,
  }));
  const current = records.find((row) => row.current) ?? null;
  const previous =
    records.find((row) => row.releaseTag !== result.currentReleaseTag) ?? null;
  return { app: result.app, current, previous, records };
}

export async function executePromote(
  client: PromoteClient,
  input: { platform: string; app: string; deploymentId: string },
): Promise<{ ok: boolean; releaseTags: string[]; status: string }> {
  const result = await client.promote({
    platform: input.platform,
    deploymentId: input.deploymentId,
    apps: [input.app],
    actor: "aomi-smither",
  });
  return {
    ok: result.ok,
    releaseTags: result.promote.releaseTags,
    status: result.promote.status,
  };
}

export async function promoteClientFromEnv(options: {
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
