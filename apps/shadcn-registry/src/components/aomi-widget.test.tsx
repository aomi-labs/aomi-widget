import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const captures = vi.hoisted(() => ({
  frame: undefined as Record<string, unknown> | undefined,
  provider: undefined as Record<string, unknown> | undefined,
}));

vi.mock("./aomi-frame", () => ({
  AomiFrame: {
    Root: ({ children, ...props }: { children?: ReactNode }) => {
      captures.frame = props;
      return <div>{children}</div>;
    },
    Header: () => <header />,
    Composer: () => <main />,
  },
}));

vi.mock("../lib/wallet-kit/config", () => ({
  AomiWalletKitProvider: ({ children, ...props }: { children?: ReactNode }) => {
    captures.provider = props;
    return <>{children}</>;
  },
}));

import { AomiWidget } from "./aomi-widget";

describe("AomiWidget", () => {
  beforeEach(() => {
    captures.frame = undefined;
    captures.provider = undefined;
  });

  it("uses one normalized URL for account and chat traffic", () => {
    render(<AomiWidget apiUrl="https://portal.example///" />);

    expect(captures.frame?.backendUrl).toBe("https://portal.example");
    expect(captures.frame?.clientOptions).toEqual({
      credentials: "include",
    });
    expect(captures.provider?.account).toEqual({
      mode: "aomi-backend",
      baseUrl: "https://portal.example",
    });
    expect(captures.provider?.auth).toBe(false);
  });

  it("passes selected provider configuration into the internal wallet kit", () => {
    render(
      <AomiWidget
        apiUrl="https://portal.example"
        auth={{
          provider: "para",
          methods: ["email", "google"],
          providers: {
            para: {
              apiKey: "para-key",
              environment: "PROD",
              appName: "Consumer",
            },
          },
        }}
      />,
    );

    expect(captures.provider?.auth).toEqual({
      provider: "para",
      methods: ["email", "google"],
    });
    expect(captures.provider?.providers).toEqual({
      para: {
        apiKey: "para-key",
        environment: "PROD",
        appName: "Consumer",
      },
    });
  });

  it("provides safe execution defaults and allows overrides", () => {
    render(
      <AomiWidget
        apiUrl="https://portal.example"
        clientOptions={{ credentials: "omit" }}
        execution={{ aa: "off" }}
      />,
    );

    expect(captures.frame?.clientOptions).toEqual({ credentials: "omit" });
    expect(captures.provider?.execution).toEqual({ aa: "off" });
  });
});
