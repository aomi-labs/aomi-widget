import { planDisconnect, planHeal } from "./policy";
import type {
  RegistryCommand,
  RegistryEvent,
  WalletRegistryState,
} from "./types";

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function persistableChanged(
  prev: WalletRegistryState,
  next: WalletRegistryState,
): boolean {
  return (
    stableJson(prev.activeByFamily) !== stableJson(next.activeByFamily) ||
    stableJson(prev.intents) !== stableJson(next.intents)
  );
}

export function planCommands(
  prev: WalletRegistryState,
  next: WalletRegistryState,
  event: RegistryEvent,
): RegistryCommand[] {
  const commands: RegistryCommand[] = [
    {
      kind: "debug",
      event: "registry:event",
      data: { type: event.type, phase: next.phase },
    },
  ];

  if (event.type === "wagmi/settled") {
    commands.push(
      ...planHeal(
        {
          ...next,
          phase: prev.phase,
          heal: {
            ...next.heal,
            reattachBudget: prev.heal.reattachBudget,
          },
        },
        event.now,
      ),
    );
  }

  if (
    event.type === "user/disconnect-account" ||
    event.type === "user/disconnect-family"
  ) {
    commands.push(...planDisconnect(prev, event));
  }

  if (event.type === "user/select-active") {
    commands.push({
      kind: "debug",
      event: "active-evm:user-select",
      data: {
        family: event.family,
        address: event.address,
        stableId: event.stableId,
      },
    });
  }

  if (event.type === "boot/init" && next.activeByFamily.evm) {
    commands.push({
      kind: "debug",
      event: "active-evm:persisted",
      data: {
        address: next.activeByFamily.evm.address,
        stableId: next.activeByFamily.evm.stableId,
      },
    });
  }

  if (persistableChanged(prev, next)) {
    commands.push({ kind: "persist" });
  }

  return commands;
}
