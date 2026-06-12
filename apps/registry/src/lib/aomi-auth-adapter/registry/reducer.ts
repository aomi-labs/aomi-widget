import { resolveActive, countPlannedHealConnects } from "./policy";
import type {
  ActiveRef,
  PersistedRegistryV1,
  RegistryConnection,
  RegistryEvent,
  WalletRegistryState,
} from "./types";
import { POPUP_REATTACH_BUDGET, REATTACH_SUPPRESSION_MS } from "./types";

const PARA_SESSION_UID = "para-session";

export function createInitialState(): WalletRegistryState {
  return {
    phase: "booting",
    connections: [],
    activeByFamily: {},
    intents: {
      droppedAddresses: [],
      providerSessionDetached: false,
      explicitFamilyDisconnect: {},
      pendingSolanaWallet: null,
      preferProviderEmbeddedOnConnect: false,
    },
    heal: {
      expected: [],
      reattachBudget: POPUP_REATTACH_BUDGET,
      suppressedUntil: null,
      suppressionReason: null,
    },
    evmGrace: {
      last: null,
      disconnectedAt: null,
    },
    paraSession: {
      up: false,
      embeddedEvmAddress: null,
    },
  };
}

function activeFromPersisted(
  persisted: PersistedRegistryV1 | null,
): WalletRegistryState["activeByFamily"] {
  if (!persisted) return {};
  const active: WalletRegistryState["activeByFamily"] = {};
  if (persisted.active.evm?.address) {
    active.evm = {
      family: "evm",
      address: persisted.active.evm.address.toLowerCase(),
      stableId: persisted.active.evm.stableId,
    };
  }
  if (persisted.active.solana?.address) {
    active.solana = {
      family: "solana",
      address: persisted.active.solana.address,
      stableId: persisted.active.solana.stableId,
    };
  }
  return active;
}

function classifyConnection(
  connection: Omit<RegistryConnection, "key" | "kind">,
): RegistryConnection {
  const stableId = connection.stableId;
  const kind =
    connection.family === "solana"
      ? "solana"
      : stableId === "para"
        ? "para"
        : stableId === "walletConnect"
          ? "walletconnect"
          : "external-evm";
  const address =
    connection.family === "evm"
      ? connection.address.toLowerCase()
      : connection.address;

  return {
    ...connection,
    key: `${connection.family}:${connection.uid}`,
    kind,
    address,
    addresses:
      connection.family === "evm"
        ? connection.addresses.map((item) => item.toLowerCase())
        : connection.addresses,
  };
}

function withResolvedActive(
  state: WalletRegistryState,
  families: ReadonlyArray<"evm" | "solana"> = ["evm", "solana"],
): WalletRegistryState {
  const activeByFamily = { ...state.activeByFamily };
  for (const family of families) {
    const active = resolveActive(state, family);
    if (active) activeByFamily[family] = active;
    else delete activeByFamily[family];
  }
  return { ...state, activeByFamily };
}

function currentActiveEvmConnection(
  state: WalletRegistryState,
): RegistryConnection | undefined {
  const active = state.activeByFamily.evm;
  if (!active) return undefined;
  return state.connections.find((connection) => {
    if (connection.family !== "evm") return false;
    if (active.uid && connection.uid === active.uid) return true;
    if (active.stableId && connection.stableId !== active.stableId) {
      return false;
    }
    return connection.address.toLowerCase() === active.address.toLowerCase();
  });
}

function withoutSyntheticParaConnection(
  connections: readonly RegistryConnection[],
): RegistryConnection[] {
  return connections.filter(
    (connection) =>
      !(
        connection.family === "evm" &&
        connection.uid === PARA_SESSION_UID &&
        connection.stableId === "para"
      ),
  );
}

function withParaSessionConnection(
  state: WalletRegistryState,
): WalletRegistryState {
  const connections = withoutSyntheticParaConnection(state.connections);
  const address = state.paraSession.embeddedEvmAddress;
  if (
    !state.paraSession.up ||
    !address ||
    state.intents.providerSessionDetached
  ) {
    return { ...state, connections };
  }
  const hasLiveParaConnection = connections.some(
    (connection) =>
      connection.family === "evm" &&
      connection.stableId === "para" &&
      connection.address.toLowerCase() === address.toLowerCase(),
  );
  if (hasLiveParaConnection) {
    return { ...state, connections };
  }
  return {
    ...state,
    connections: [
      ...connections,
      {
        key: `evm:${PARA_SESSION_UID}`,
        family: "evm",
        uid: PARA_SESSION_UID,
        stableId: "para",
        kind: "para",
        address,
        addresses: [address],
        walletName: "Para",
      },
    ],
  };
}

function liveConnectionForActive(
  state: WalletRegistryState,
  active: ActiveRef | undefined,
): RegistryConnection | undefined {
  if (!active) return undefined;
  return state.connections.find((connection) => {
    if (connection.family !== active.family) return false;
    if (active.uid && connection.uid === active.uid) return true;
    if (active.stableId && connection.stableId !== active.stableId) {
      return false;
    }
    const left =
      connection.family === "evm"
        ? connection.address.toLowerCase()
        : connection.address;
    const right =
      active.family === "evm" ? active.address.toLowerCase() : active.address;
    return left === right;
  });
}

function withPreferredParaActive(
  state: WalletRegistryState,
): WalletRegistryState {
  if (!state.intents.preferProviderEmbeddedOnConnect) return state;
  const para = state.connections.find(
    (connection) =>
      connection.family === "evm" && connection.stableId === "para",
  );
  if (!para) return state;
  const currentLive = liveConnectionForActive(state, state.activeByFamily.evm);
  if (currentLive && currentLive.stableId !== "para") return state;
  return {
    ...state,
    activeByFamily: {
      ...state.activeByFamily,
      evm: {
        family: "evm",
        address: para.address,
        uid: para.uid,
        stableId: para.stableId,
      },
    },
    intents: {
      ...state.intents,
      preferProviderEmbeddedOnConnect: false,
    },
  };
}

function withEvmGrace(
  previous: WalletRegistryState,
  next: WalletRegistryState,
  now: number,
): WalletRegistryState {
  const current = currentActiveEvmConnection(next);
  if (current) {
    return {
      ...next,
      evmGrace: {
        last: {
          address: current.address,
          chainId: current.chainId,
          connectorId: current.uid,
          walletName: current.walletName,
        },
        disconnectedAt: null,
      },
    };
  }

  if (!previous.evmGrace.last) return next;
  return {
    ...next,
    evmGrace: {
      last: previous.evmGrace.last,
      disconnectedAt: previous.evmGrace.disconnectedAt ?? now,
    },
  };
}

function externalHealExpected(
  connections: readonly RegistryConnection[],
): WalletRegistryState["heal"]["expected"] {
  const seen = new Set<string>();
  const expected: WalletRegistryState["heal"]["expected"] = [];
  for (const connection of connections) {
    if (connection.family !== "evm" || connection.kind !== "external-evm") {
      continue;
    }
    const key = `${connection.stableId}:${connection.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    expected.push({
      stableId: connection.stableId,
      address: connection.address.toLowerCase(),
    });
  }
  return expected;
}

function expectedIsLive(
  connections: readonly RegistryConnection[],
  expected: { stableId: string; address: string },
): boolean {
  return connections.some(
    (connection) =>
      connection.family === "evm" &&
      connection.stableId === expected.stableId &&
      connection.address.toLowerCase() === expected.address.toLowerCase(),
  );
}

function nextHealExpectedOnSettled(
  state: WalletRegistryState,
): WalletRegistryState["heal"]["expected"] {
  if (state.phase === "rebuilding") return state.heal.expected;
  const missingExpected = state.heal.expected.filter(
    (expected) => !expectedIsLive(state.connections, expected),
  );
  return missingExpected.length > 0
    ? state.heal.expected
    : externalHealExpected(state.connections);
}

function addDroppedAddress(
  droppedAddresses: readonly string[],
  address: string,
): string[] {
  const normalized = address.toLowerCase();
  return droppedAddresses.includes(normalized)
    ? [...droppedAddresses]
    : [...droppedAddresses, normalized];
}

function dropAddressMatches(
  active: ActiveRef | undefined,
  address: string,
): boolean {
  return !!active && active.address.toLowerCase() === address.toLowerCase();
}

function connectionSignature(
  connections: readonly RegistryConnection[],
): string {
  return JSON.stringify(
    connections
      .map((connection) => ({
        family: connection.family,
        uid: connection.uid,
        stableId: connection.stableId,
        kind: connection.kind,
        address:
          connection.family === "evm"
            ? connection.address.toLowerCase()
            : connection.address,
        addresses: connection.addresses.map((address) =>
          connection.family === "evm" ? address.toLowerCase() : address,
        ),
        chainId: connection.chainId ?? null,
        walletName: connection.walletName ?? null,
      }))
      .sort((left, right) =>
        `${left.family}:${left.uid}:${left.address}`.localeCompare(
          `${right.family}:${right.uid}:${right.address}`,
        ),
      ),
  );
}

export function reduce(
  state: WalletRegistryState,
  event: RegistryEvent,
): WalletRegistryState {
  switch (event.type) {
    case "boot/init": {
      return {
        ...createInitialState(),
        activeByFamily: activeFromPersisted(event.persisted),
        intents: {
          droppedAddresses:
            event.persisted?.droppedAddresses.map((item) =>
              item.toLowerCase(),
            ) ?? [],
          providerSessionDetached:
            event.persisted?.providerSessionDetached ?? false,
          explicitFamilyDisconnect: {},
          pendingSolanaWallet: null,
          preferProviderEmbeddedOnConnect: false,
        },
      };
    }

    case "wagmi/connections-changed": {
      const connections = event.connections.map(classifyConnection);
      const currentEvmConnections = state.connections.filter(
        (connection) => connection.family === "evm",
      );
      if (
        connectionSignature(connections) ===
        connectionSignature(currentEvmConnections)
      ) {
        return state;
      }
      const nextPhase = state.phase === "stable" ? "settling" : state.phase;
      let next: WalletRegistryState = {
        ...state,
        phase: nextPhase,
        connections: [
          ...connections,
          ...withoutSyntheticParaConnection(state.connections).filter(
            (connection) => connection.family === "solana",
          ),
        ],
      };
      next = withParaSessionConnection(next);
      next = withPreferredParaActive(next);
      if (state.phase === "stable") {
        next = {
          ...next,
          heal: {
            ...next.heal,
            expected: externalHealExpected(state.connections),
          },
        };
      }
      next = withResolvedActive(next, ["evm"]);
      return withEvmGrace(state, next, event.now);
    }

    case "wagmi/config-rebuilt":
      return {
        ...state,
        phase: "rebuilding",
        heal: {
          ...state.heal,
          expected:
            state.phase === "stable"
              ? externalHealExpected(state.connections)
              : state.heal.expected,
        },
      };

    case "wagmi/brands-changed": {
      let changed = false;
      const connections = state.connections.map((connection) => {
        const walletName =
          event.brands[connection.uid] ?? connection.walletName;
        if (walletName !== connection.walletName) changed = true;
        return { ...connection, walletName };
      });
      if (!changed) return state;
      return {
        ...state,
        connections,
      };
    }

    case "wagmi/settled": {
      const stateForHeal = { ...state, phase: state.phase };
      const spentBudget =
        state.phase === "stable"
          ? countPlannedHealConnects(stateForHeal, event.now)
          : 0;
      let next: WalletRegistryState = {
        ...state,
        phase: "stable",
        heal: {
          ...state.heal,
          expected: nextHealExpectedOnSettled(state),
          reattachBudget: Math.max(0, state.heal.reattachBudget - spentBudget),
        },
      };
      next = withResolvedActive(next);
      return withEvmGrace(state, next, event.now);
    }

    case "para/session-changed": {
      let next: WalletRegistryState = {
        ...state,
        phase: state.phase === "booting" ? "settling" : state.phase,
        paraSession: {
          up: event.up,
          embeddedEvmAddress: event.embeddedEvmAddress?.toLowerCase() ?? null,
        },
      };
      next = withParaSessionConnection(next);
      next = withPreferredParaActive(next);
      next = withResolvedActive(next, ["evm"]);
      return withEvmGrace(state, next, event.now);
    }

    case "provider/auth-flow-started":
      return {
        ...state,
        heal: {
          ...state.heal,
          suppressedUntil: event.now + REATTACH_SUPPRESSION_MS,
          suppressionReason: event.reason,
        },
      };

    case "solana/changed": {
      const connections = state.connections.filter(
        (connection) => connection.family !== "solana",
      );
      const pendingConnected =
        event.publicKey &&
        state.intents.pendingSolanaWallet &&
        event.walletName === state.intents.pendingSolanaWallet;
      if (event.publicKey) {
        connections.push({
          key: `solana:${event.walletName ?? event.publicKey}`,
          family: "solana",
          uid: event.walletName ?? event.publicKey,
          stableId: event.walletName ?? event.publicKey,
          kind: "solana",
          address: event.publicKey,
          addresses: [event.publicKey],
          walletName: event.walletName ?? undefined,
        });
      }
      return withResolvedActive(
        {
          ...state,
          connections,
          intents: {
            ...state.intents,
            pendingSolanaWallet: pendingConnected
              ? null
              : state.intents.pendingSolanaWallet,
          },
        },
        ["solana"],
      );
    }

    case "solana/connect-requested":
      return {
        ...state,
        intents: {
          ...state.intents,
          pendingSolanaWallet: event.walletName,
        },
      };

    case "solana/connect-settled":
      if (state.intents.pendingSolanaWallet !== event.walletName) return state;
      return {
        ...state,
        intents: {
          ...state.intents,
          pendingSolanaWallet: null,
        },
      };

    case "user/select-active":
      return {
        ...state,
        activeByFamily: {
          ...state.activeByFamily,
          [event.family]: {
            family: event.family,
            address:
              event.family === "evm"
                ? event.address.toLowerCase()
                : event.address,
            uid: event.uid,
            stableId: event.stableId,
          },
        },
        intents: {
          ...state.intents,
          preferProviderEmbeddedOnConnect: false,
          explicitFamilyDisconnect: {
            ...state.intents.explicitFamilyDisconnect,
            [event.family]: false,
          },
        },
      };

    case "user/connect-succeeded":
      return {
        ...state,
        intents: {
          ...state.intents,
          droppedAddresses:
            event.family === "evm"
              ? state.intents.droppedAddresses.filter(
                  (address) => address !== event.address.toLowerCase(),
                )
              : state.intents.droppedAddresses,
          providerSessionDetached:
            event.family === "evm" && event.stableId === "para"
              ? false
              : state.intents.providerSessionDetached,
          explicitFamilyDisconnect: {
            ...state.intents.explicitFamilyDisconnect,
            [event.family]: false,
          },
          preferProviderEmbeddedOnConnect: false,
        },
      };

    case "user/provider-reconnect-requested":
      return withPreferredParaActive(
        withParaSessionConnection({
          ...state,
          intents: {
            ...state.intents,
            providerSessionDetached: false,
            preferProviderEmbeddedOnConnect: true,
          },
        }),
      );

    case "user/disconnect-account": {
      const filtered = state.connections.filter(
        (connection) => !event.uids.includes(connection.uid),
      );
      const activeByFamily = { ...state.activeByFamily };
      if (dropAddressMatches(activeByFamily.evm, event.address)) {
        delete activeByFamily.evm;
      }
      let next: WalletRegistryState = {
        ...state,
        connections: withoutSyntheticParaConnection(filtered),
        activeByFamily,
        intents: {
          ...state.intents,
          droppedAddresses:
            (event.markDroppedAddress ?? true)
              ? addDroppedAddress(state.intents.droppedAddresses, event.address)
              : [...state.intents.droppedAddresses],
          providerSessionDetached:
            event.isProviderOwnedAccount && event.othersRemain
              ? true
              : state.intents.providerSessionDetached,
        },
      };
      next = withParaSessionConnection(next);
      next = withResolvedActive(next, ["evm"]);
      return withEvmGrace(state, next, event.now);
    }

    case "user/disconnect-family": {
      const activeByFamily = { ...state.activeByFamily };
      const explicitFamilyDisconnect = {
        ...state.intents.explicitFamilyDisconnect,
      };
      if (event.family === "all" || event.family === "evm") {
        delete activeByFamily.evm;
        explicitFamilyDisconnect.evm = true;
      }
      if (event.family === "all" || event.family === "solana") {
        delete activeByFamily.solana;
        explicitFamilyDisconnect.solana = true;
      }
      let next: WalletRegistryState = {
        ...state,
        activeByFamily,
        evmGrace:
          event.family === "all" || event.family === "evm"
            ? { last: null, disconnectedAt: null }
            : state.evmGrace,
        connections:
          event.family === "all" || event.family === "evm"
            ? withoutSyntheticParaConnection(state.connections)
            : state.connections,
        intents: {
          ...state.intents,
          explicitFamilyDisconnect,
          providerSessionDetached:
            event.family === "all" || event.family === "evm"
              ? true
              : state.intents.providerSessionDetached,
        },
      };
      next = withParaSessionConnection(next);
      return next;
    }

    default:
      return state;
  }
}
