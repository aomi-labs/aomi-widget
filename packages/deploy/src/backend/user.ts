import { DeployError } from "../errors";
import type {
  BotRegistration,
  BuilderBotsInput,
  BuilderModelKey,
  BuilderModelKeysInput,
  CreateUserBotInput,
  CreateUserProjectBotInput,
  DeleteBuilderModelKeyInput,
  DeleteUserBotInput,
  DeleteUserProjectBotInput,
  ExchangeGitHubCodeInput,
  GetUserObservabilityInput,
  GetUserPaymentsInput,
  GetUserProjectAppDetailInput,
  GetUserProjectLatestDeploymentInput,
  GetUserProjectRequiredSecretsInput,
  GetUserProjectUsageInput,
  GetUserStatementsInput,
  GitHubIdentity,
  ListUserDeploymentsInput,
  ListUserLogsInput,
  ListUserProjectDeploymentsInput,
  ListUserProjectLogsInput,
  ListUserProjectTransactionsInput,
  ListUserProjectsInput,
  ListUserTransactionsInput,
  OperateAppDetailResult,
  OperateLogsResult,
  OperateObservabilityResult,
  OperateObservabilitySnapshot,
  OperatePaymentProjectResult,
  OperateStatementResult,
  OperateTransactionsResult,
  OperateUsageResult,
  OwnedOperateProjectInput,
  ProjectSdkUpgradeResult,
  ProjectSdkUpgradeStatusResult,
  SaveBuilderModelKeyInput,
  SetModelKeyGrantsInput,
  UpdateUserBotInput,
  UserDeployment,
  UserDeploymentsPage,
  UserLogsResult,
  UserProject,
  UserProjectLatestDeployment,
  UserProjectRequiredSecretsResult,
  UserTransactionsResult,
} from "../types";
import {
  camelBotRegistration,
  camelBuilderModelKey,
  camelLogCursor,
  camelLogRow,
  camelOperateAppDetail,
  camelOperateLogs,
  camelOperateObservability,
  camelOperateStatement,
  camelOperateTransactions,
  camelOperateUsage,
  camelPartnerPayments,
  camelProject,
  camelTransactionCursor,
  camelTransactionRow,
  camelUserDeployment,
  camelUserDeploymentsCursor,
  camelUserProject,
  camelUserProjectLatestDeployment,
  camelUserProjectRefs,
  encodeLogCursor,
  encodeTransactionCursor,
  optNumber,
  optString,
  required,
  responseRecord,
  setDateRange,
} from "../wire";
import { BackendPlatformClient } from "./platform";

/**
 * Server-side client to the Aomi platform deploy backend. It is a typed HTTP
 * wrapper only: source reads, platform writes, CI checks, and activation all
 * happen in the backend.
 */
export class BackendClient extends BackendPlatformClient {
  // ──────────────────── Sign-in: identity + user projects ──────────────────

  /**
   * Exchange a GitHub OAuth `code` for the user's identity (login flow). The
   * client secret stays backend-side; this is the portal's sign-in seam.
   * `GET /api/integrations/github-app/oauth/exchange`.
   */
  async exchangeGitHubCode(
    input: ExchangeGitHubCodeInput,
  ): Promise<GitHubIdentity> {
    const code = required(input.code, "code");
    const params = new URLSearchParams({ code });
    if (input.app) params.set("app", String(input.app));
    if (input.redirectUri?.trim()) {
      params.set("redirect_uri", input.redirectUri.trim());
    }
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<{
      github_user_id?: string;
      github_login?: string;
      installation_id?: number | string | null;
    }>(
      `/api/integrations/github-app/oauth/exchange?${params.toString()}`,
      "exchange_github_code",
      bearer,
    );
    return {
      githubUserId: String(raw.github_user_id ?? ""),
      githubLogin: String(raw.github_login ?? ""),
      installationId:
        raw.installation_id === null || raw.installation_id === undefined
          ? null
          : String(raw.installation_id),
    };
  }

  /**
   * Projects owned by a GitHub user. Passing `platform` narrows the result.
   */
  async listUserProjects(input: ListUserProjectsInput): Promise<UserProject[]> {
    return this.userGet(
      input,
      "projects",
      "list_user_projects",
      (raw) => ((raw.projects ?? []) as unknown[]).map(camelUserProject),
      (params) => {
        if (input.platform?.trim()) {
          params.set("platform", input.platform.trim());
        }
      },
      { platform: input.platform },
    );
  }

  async listUserDeployments(
    input: ListUserDeploymentsInput,
  ): Promise<UserDeploymentsPage> {
    return this.userGet(
      input,
      "deployments",
      "list_user_deployments",
      (raw) => ({
        deployments: ((raw.deployments ?? []) as unknown[])
          .map(camelUserDeployment)
          .filter((deployment): deployment is UserDeployment =>
            Boolean(deployment),
          ),
        nextCursor: camelUserDeploymentsCursor(raw.next_cursor),
      }),
      (params) => {
        if (
          input.limit &&
          Number.isSafeInteger(input.limit) &&
          input.limit > 0
        ) {
          params.set("limit", String(input.limit));
        }
        if (input.cursor) {
          params.set("cursor_created_at", String(input.cursor.createdAt));
          params.set("cursor_id", String(input.cursor.id));
        }
      },
    );
  }

  async getUserProjectLatestDeployment(
    input: GetUserProjectLatestDeploymentInput,
  ): Promise<UserProjectLatestDeployment | null> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const projectId = required(String(input.projectId), "projectId");
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({ github_user_id: githubUserId });
    const raw = await this.get<{ latest_deployment?: unknown }>(
      `/api/integrations/github-app/user/projects/${encodeURIComponent(
        projectId,
      )}/latest-deployment?${params.toString()}`,
      "get_user_project_latest_deployment",
      bearer,
    );
    await this.audit("get_user_project_latest_deployment", input.actor, {
      projectId: input.projectId,
    });
    return camelUserProjectLatestDeployment(raw.latest_deployment) ?? null;
  }

  async getUserProjectRequiredSecrets(
    input: GetUserProjectRequiredSecretsInput,
  ): Promise<UserProjectRequiredSecretsResult> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const projectId = required(String(input.projectId), "projectId");
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({ github_user_id: githubUserId });
    const raw = await this.get<{
      by_app?: Record<string, { slots?: unknown[] }>;
    }>(
      `/api/integrations/github-app/user/projects/${encodeURIComponent(
        projectId,
      )}/required-secrets?${params.toString()}`,
      "get_user_project_required_secrets",
      bearer,
    );
    await this.audit("get_user_project_required_secrets", input.actor, {
      projectId: input.projectId,
    });
    return {
      byApp: Object.fromEntries(
        Object.entries(raw.by_app ?? {}).map(([app, value]) => [
          app,
          {
            slots: (value.slots ?? []).flatMap((slot) => {
              if (!slot || typeof slot !== "object") return [];
              const rawSlot = slot as Record<string, unknown>;
              const name = rawSlot.name;
              const description = rawSlot.description;
              const required = rawSlot.required;
              return typeof name === "string" &&
                typeof description === "string" &&
                typeof required === "boolean"
                ? [{ name, description, required }]
                : [];
            }),
          },
        ]),
      ),
    };
  }

  async listUserProjectDeployments(
    input: ListUserProjectDeploymentsInput,
  ): Promise<UserProjectLatestDeployment[]> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const projectId = required(String(input.projectId), "projectId");
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({ github_user_id: githubUserId });
    if (input.limit && Number.isSafeInteger(input.limit) && input.limit > 0) {
      params.set("limit", String(input.limit));
    }
    const raw = await this.get<{ deployments?: unknown[] }>(
      `/api/integrations/github-app/user/projects/${encodeURIComponent(
        projectId,
      )}/deployments?${params.toString()}`,
      "list_user_project_deployments",
      bearer,
    );
    await this.audit("list_user_project_deployments", input.actor, {
      projectId: input.projectId,
    });
    return (raw.deployments ?? [])
      .map(camelUserProjectLatestDeployment)
      .filter((deployment): deployment is UserProjectLatestDeployment =>
        Boolean(deployment),
      );
  }

  async listUserProjectBots(
    input: OwnedOperateProjectInput,
  ): Promise<BotRegistration[]> {
    return this.ownedGet(input, "bots", "list_user_project_bots", (raw) =>
      ((raw.bot_registrations ?? []) as unknown[]).map(camelBotRegistration),
    );
  }

  async createUserProjectBot(
    input: CreateUserProjectBotInput,
  ): Promise<BotRegistration> {
    const { projectId, params, bearer } = this.ownedOperateRequest(input);
    const botPlatform = required(input.botPlatform, "botPlatform");
    const applicationId = required(
      String(input.applicationId),
      "applicationId",
    );
    const credential = required(input.credential, "credential");
    const raw = await this.post<{ bot_registration?: unknown }>(
      `/api/integrations/github-app/user/projects/${encodeURIComponent(
        String(projectId),
      )}/bots?${params.toString()}`,
      {
        platform: botPlatform,
        application_id: Number(applicationId),
        label: input.label,
        credential,
        thread_mode: input.threadMode,
      },
      "create_user_project_bot",
      bearer,
    );
    await this.audit("create_user_project_bot", input.actor, { projectId });
    return camelBotRegistration(raw.bot_registration);
  }

  async deleteUserProjectBot(input: DeleteUserProjectBotInput): Promise<void> {
    const { projectId, params, bearer } = this.ownedOperateRequest(input);
    const botId = required(input.botId, "botId");
    await this.del<unknown>(
      `/api/integrations/github-app/user/projects/${encodeURIComponent(
        String(projectId),
      )}/bots/${encodeURIComponent(botId)}?${params.toString()}`,
      "delete_user_project_bot",
      bearer,
    );
    await this.audit("delete_user_project_bot", input.actor, { projectId });
  }

  async listUserBots(input: BuilderBotsInput): Promise<BotRegistration[]> {
    return this.userGet(input, "bots", "list_user_bots", (raw) =>
      ((raw.bot_registrations ?? []) as unknown[]).map(camelBotRegistration),
    );
  }

  async createUserBot(input: CreateUserBotInput): Promise<BotRegistration> {
    const { params, bearer } = this.userParams(input);
    const credential = required(input.credential, "credential");
    const raw = await this.post<{ bot_registration?: unknown }>(
      `/api/integrations/github-app/user/bots?${params.toString()}`,
      {
        platform: required(input.botPlatform, "botPlatform"),
        application_ids: input.applicationIds,
        primary_application_id: input.primaryApplicationId,
        label: input.label,
        credential,
        thread_mode: input.threadMode,
      },
      "create_user_bot",
      bearer,
    );
    await this.audit("create_user_bot", input.actor);
    return camelBotRegistration(raw.bot_registration);
  }

  async updateUserBot(input: UpdateUserBotInput): Promise<BotRegistration> {
    const { params, bearer } = this.userParams(input);
    const raw = await this.patch<{ bot_registration?: unknown }>(
      `/api/integrations/github-app/user/bots/${encodeURIComponent(required(input.botId, "botId"))}?${params.toString()}`,
      {
        application_ids: input.applicationIds,
        primary_application_id: input.primaryApplicationId,
        label: input.label,
        thread_mode: input.threadMode,
      },
      "update_user_bot",
      bearer,
    );
    await this.audit("update_user_bot", input.actor);
    return camelBotRegistration(raw.bot_registration);
  }

  async deleteUserBot(input: DeleteUserBotInput): Promise<void> {
    const { params, bearer } = this.userParams(input);
    await this.del<unknown>(
      `/api/integrations/github-app/user/bots/${encodeURIComponent(required(input.botId, "botId"))}?${params.toString()}`,
      "delete_user_bot",
      bearer,
    );
    await this.audit("delete_user_bot", input.actor);
  }

  /** All builder-owned model keys with their grants (funder-ladder app
   *  rung). Names/prefixes/grants only — key material is write-only. */
  async listBuilderModelKeys(
    input: BuilderModelKeysInput,
  ): Promise<BuilderModelKey[]> {
    const { params, bearer } = this.builderKeyRequest(input);
    const raw = await this.get<{ keys?: unknown[] }>(
      `/api/integrations/github-app/user/model-keys?${params.toString()}`,
      "list_builder_model_keys",
      bearer,
    );
    await this.audit("list_builder_model_keys", input.actor, {
      platform: input.platform,
    });
    return (raw.keys ?? []).map(camelBuilderModelKey);
  }

  /** Create (no `keyId`) or rotate (`keyId` set) a builder model key. */
  async saveBuilderModelKey(
    input: SaveBuilderModelKeyInput,
  ): Promise<BuilderModelKey> {
    const { params, bearer } = this.builderKeyRequest(input);
    const provider = required(input.provider, "provider");
    const key = required(input.key, "key");
    const body = { provider, key, label: input.label };
    const raw =
      input.keyId === undefined
        ? await this.post<{ key?: unknown }>(
            `/api/integrations/github-app/user/model-keys?${params.toString()}`,
            body,
            "save_builder_model_key",
            bearer,
          )
        : await this.put<{ key?: unknown }>(
            `/api/integrations/github-app/user/model-keys/${encodeURIComponent(
              String(input.keyId),
            )}?${params.toString()}`,
            body,
            "save_builder_model_key",
            bearer,
          );
    await this.audit("save_builder_model_key", input.actor, {
      platform: input.platform,
    });
    return camelBuilderModelKey(raw.key);
  }

  async deleteBuilderModelKey(
    input: DeleteBuilderModelKeyInput,
  ): Promise<void> {
    const { params, bearer } = this.builderKeyRequest(input);
    const keyId = required(String(input.keyId), "keyId");
    await this.del<unknown>(
      `/api/integrations/github-app/user/model-keys/${encodeURIComponent(keyId)}?${params.toString()}`,
      "delete_builder_model_key",
      bearer,
    );
    await this.audit("delete_builder_model_key", input.actor, {
      platform: input.platform,
    });
  }

  /** Replace a key's grant set ("apply to projects"). */
  async setModelKeyGrants(
    input: SetModelKeyGrantsInput,
  ): Promise<BuilderModelKey> {
    const { params, bearer } = this.builderKeyRequest(input);
    const keyId = required(String(input.keyId), "keyId");
    const raw = await this.put<{ key?: unknown }>(
      `/api/integrations/github-app/user/model-keys/${encodeURIComponent(keyId)}/grants?${params.toString()}`,
      { application_ids: input.applicationIds },
      "set_model_key_grants",
      bearer,
    );
    await this.audit("set_model_key_grants", input.actor, {
      platform: input.platform,
    });
    return camelBuilderModelKey(raw.key);
  }

  async listUserProjectTransactions(
    input: ListUserProjectTransactionsInput,
  ): Promise<OperateTransactionsResult> {
    return this.ownedGet(
      input,
      "transactions",
      "list_user_project_transactions",
      camelOperateTransactions,
      (params) => {
        if (
          input.limit &&
          Number.isSafeInteger(input.limit) &&
          input.limit > 0
        ) {
          params.set("limit", String(input.limit));
        }
        if (input.status?.trim()) params.set("status", input.status.trim());
        const cursor = encodeTransactionCursor(input.cursor);
        if (cursor) params.set("cursor", cursor);
      },
    );
  }

  async getUserProjectUsage(
    input: GetUserProjectUsageInput,
  ): Promise<OperateUsageResult> {
    return this.ownedGet(
      input,
      "usage",
      "get_user_project_usage",
      camelOperateUsage,
      (params) => setDateRange(params, input),
    );
  }

  async getUserProjectStatement(
    input: GetUserProjectUsageInput,
  ): Promise<OperateStatementResult> {
    return this.ownedGet(
      input,
      "statement",
      "get_user_project_statement",
      camelOperateStatement,
      (params) => setDateRange(params, input),
    );
  }

  async listUserProjectLogs(
    input: ListUserProjectLogsInput,
  ): Promise<OperateLogsResult> {
    return this.ownedGet(
      input,
      "logs",
      "list_user_project_logs",
      camelOperateLogs,
      (params) => {
        if (
          input.limit &&
          Number.isSafeInteger(input.limit) &&
          input.limit > 0
        ) {
          params.set("limit", String(input.limit));
        }
        if (input.type?.trim()) params.set("type", input.type.trim());
        const cursor = encodeLogCursor(input.cursor);
        if (cursor) params.set("cursor", cursor);
      },
    );
  }

  async getUserProjectObservability(
    input: OwnedOperateProjectInput,
  ): Promise<OperateObservabilityResult> {
    return this.ownedGet(
      input,
      "observability",
      "get_user_project_observability",
      camelOperateObservability,
    );
  }

  /**
   * Account-wide observability batch: every owned project in one request,
   * each entry in the exact shape of {@link getUserProjectObservability}. The
   * manager resolves each project under its own bound platform —
   * partner-bound projects included.
   */
  async getUserObservability(
    input: GetUserObservabilityInput,
  ): Promise<OperateObservabilitySnapshot[]> {
    return this.userGet(
      input,
      "observability",
      "get_user_observability",
      (raw) =>
        ((raw.results ?? []) as Record<string, unknown>[]).map((entry) => {
          const { payments: _payments, ...snapshot } =
            camelOperateObservability(entry);
          return snapshot;
        }),
    );
  }

  async getUserPayments(
    input: GetUserPaymentsInput,
  ): Promise<OperatePaymentProjectResult[]> {
    return this.userGet(
      input,
      "payments",
      "get_user_payments",
      (raw) =>
        ((raw.results ?? []) as Record<string, unknown>[]).map((entry) => ({
          project: camelProject(entry.project),
          payments: camelPartnerPayments(entry.payments),
        })),
      undefined,
      { projectId: input.projectId },
    );
  }

  /**
   * Account-wide transactions batch: one newest-first page merged across
   * every owned source, with a single global cursor. Requires a manager with
   * `GET /user/transactions`; callers fall back to per-source reads when the
   * route 404s (older manager).
   */
  async listUserTransactions(
    input: ListUserTransactionsInput,
  ): Promise<UserTransactionsResult> {
    return this.userGet(
      input,
      "transactions",
      "list_user_transactions",
      (raw) => ({
        projects: camelUserProjectRefs(raw.projects),
        transactions: ((raw.transactions ?? []) as Record<string, any>[]).map(
          (row) => ({
            ...camelTransactionRow(row),
            projectId: optNumber(row.project_id ?? row.projectId),
            platform: optString(row.platform),
          }),
        ),
        nextCursor: camelTransactionCursor(raw.next_cursor ?? raw.nextCursor),
      }),
      (params) => {
        if (
          input.limit &&
          Number.isSafeInteger(input.limit) &&
          input.limit > 0
        ) {
          params.set("limit", String(input.limit));
        }
        if (input.status?.trim()) params.set("status", input.status.trim());
        const cursor = encodeTransactionCursor(input.cursor);
        if (cursor) params.set("cursor", cursor);
      },
    );
  }

  /**
   * Account-wide statement batch: every owned source in one request, each
   * entry in the exact shape of {@link getUserProjectStatement}.
   */
  async getUserStatements(
    input: GetUserStatementsInput,
  ): Promise<OperateStatementResult[]> {
    return this.userGet(
      input,
      "statement",
      "get_user_statement",
      (raw) =>
        ((raw.results ?? []) as Record<string, unknown>[]).map((entry) =>
          camelOperateStatement(entry),
        ),
      (params) => setDateRange(params, input),
    );
  }

  /**
   * Account-wide usage batch: every owned source in one request, each entry
   * in the exact shape of {@link getUserProjectUsage}.
   */
  async getUserUsage(
    input: GetUserStatementsInput,
  ): Promise<OperateUsageResult[]> {
    return this.userGet(
      input,
      "usage",
      "get_user_usage",
      (raw) =>
        ((raw.results ?? []) as Record<string, unknown>[]).map((entry) =>
          camelOperateUsage(entry),
        ),
      (params) => setDateRange(params, input),
    );
  }

  /**
   * Account-wide logs batch: one newest-first page of the merged log stream
   * across every owned source, with a single global cursor. Shared partner
   * settlements carry a null `projectId`.
   */
  async listUserLogs(input: ListUserLogsInput): Promise<UserLogsResult> {
    return this.userGet(
      input,
      "logs",
      "list_user_logs",
      (raw) => ({
        projects: camelUserProjectRefs(raw.projects),
        logs: ((raw.logs ?? []) as Record<string, any>[]).map((row) => ({
          ...camelLogRow(row),
          projectId: optNumber(row.project_id ?? row.projectId),
          platform: optString(row.platform),
        })),
        nextCursor: camelLogCursor(raw.next_cursor ?? raw.nextCursor),
        invocationsAvailable: raw.invocations_available !== false,
      }),
      (params) => {
        if (
          input.limit &&
          Number.isSafeInteger(input.limit) &&
          input.limit > 0
        ) {
          params.set("limit", String(input.limit));
        }
        if (input.type?.trim()) params.set("type", input.type.trim());
        const cursor = encodeLogCursor(input.cursor);
        if (cursor) params.set("cursor", cursor);
      },
    );
  }

  async getUserProjectAppDetail(
    input: GetUserProjectAppDetailInput,
  ): Promise<OperateAppDetailResult> {
    const applicationId = required(
      String(input.applicationId),
      "applicationId",
    );
    return this.ownedGet(
      input,
      `apps/${encodeURIComponent(applicationId)}/detail`,
      "get_user_project_app_detail",
      camelOperateAppDetail,
    );
  }

  async upgradeUserProjectSdk(
    input: OwnedOperateProjectInput,
  ): Promise<ProjectSdkUpgradeResult> {
    const { projectId, params, bearer } = this.ownedOperateRequest(input);
    const raw = await this.post<Record<string, unknown>>(
      `/api/integrations/github-app/user/projects/${encodeURIComponent(
        String(projectId),
      )}/sdk-upgrade?${params.toString()}`,
      {},
      "upgrade_user_project_sdk",
      bearer,
    );
    await this.audit("upgrade_user_project_sdk", input.actor, { projectId });
    const status = raw.status;
    const requiredSdkVersion = String(raw.required_sdk_version ?? "");
    const sourceRef = String(raw.source_ref ?? "");
    if (status === "current") {
      return { status, requiredSdkVersion, sourceRef };
    }
    if (status === "pull_request") {
      const pullRequest = responseRecord(raw.pull_request, "pull_request");
      return {
        status,
        requiredSdkVersion,
        sourceRef,
        branch: String(raw.branch ?? ""),
        files: Array.isArray(raw.files) ? raw.files.map(String) : [],
        pullRequest: {
          number: Number(pullRequest.number),
          url: String(pullRequest.url ?? ""),
          created: Boolean(pullRequest.created),
        },
      };
    }
    if (status === "manual") {
      return {
        status,
        requiredSdkVersion,
        sourceRef,
        reason: String(raw.reason ?? "SDK upgrade requires a local change."),
        command: String(raw.command ?? ""),
      };
    }
    throw new DeployError(
      "BACKEND",
      "backend returned an unknown source SDK upgrade status",
    );
  }

  /**
   * Read the merge state of the `aomi/sdk-<required>` upgrade PR with one
   * GitHub-backed call — the cheap counterpart to {@link upgradeUserProjectSdk},
   * safe to poll. No repo tarball, no branch mutation.
   */
  async sdkUpgradeStatus(
    input: OwnedOperateProjectInput,
  ): Promise<ProjectSdkUpgradeStatusResult> {
    return this.ownedGet(
      input,
      "sdk-upgrade-status",
      "get_project_sdk_upgrade_status",
      (raw) => {
        const status = raw.status;
        if (
          status !== "merged" &&
          status !== "open" &&
          status !== "closed" &&
          status !== "none"
        ) {
          throw new DeployError(
            "BACKEND",
            "backend returned an unknown source SDK upgrade status",
          );
        }
        const pr =
          raw.pull_request && typeof raw.pull_request === "object"
            ? (raw.pull_request as Record<string, unknown>)
            : null;
        return {
          status,
          requiredSdkVersion: String(raw.required_sdk_version ?? ""),
          branch: String(raw.branch ?? ""),
          pullRequest: pr
            ? {
                number: Number(pr.number),
                url: String(pr.url ?? ""),
                state: String(pr.state ?? ""),
                merged: Boolean(pr.merged),
              }
            : null,
        };
      },
    );
  }
}
