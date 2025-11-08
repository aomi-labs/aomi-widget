import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
  injected,
  type Config,
  type CreateConnectorFn,
  type InjectedParameters,
} from '@wagmi/core';
import {
  arbitrum,
  base,
  goerli,
  gnosis,
  linea,
  lineaSepolia,
  localhost,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'viem/chains';
import type { EthereumProvider } from '../types';

const DEFAULT_CHAINS = [
  mainnet,
  polygon,
  arbitrum,
  base,
  optimism,
  gnosis,
  sepolia,
  goerli,
  lineaSepolia,
  linea,
  localhost,
] as const;

type WidgetTransports = {
  [chainId in (typeof DEFAULT_CHAINS)[number]['id']]: ReturnType<typeof http>;
};

const DEFAULT_TRANSPORTS: WidgetTransports = DEFAULT_CHAINS.reduce(
  (acc, chain) => {
    acc[chain.id] = http();
    return acc;
  },
  {} as WidgetTransports,
);

export interface WidgetWagmiClient {
  config: Config<
    typeof DEFAULT_CHAINS,
    WidgetTransports,
    readonly CreateConnectorFn[]
  >;
  preferredConnectorId?: string;
}

export function createWidgetWagmiClient(
  options: { provider?: EthereumProvider } = {},
): WidgetWagmiClient {
  const preferredConnectorId = options.provider
    ? 'aomi-embedded-provider'
    : undefined;

  const connectorTarget: InjectedParameters['target'] = options.provider
    ? (() => ({
      id: preferredConnectorId!,
      name: 'Embedded Wallet',
      provider: () => options.provider,
    })) as InjectedParameters['target']
    : undefined;

  const connectors = [
    injected({
      shimDisconnect: true,
      unstable_shimAsyncInject: true,
      target: connectorTarget,
    }),
  ] as const;

  const isBrowser = typeof window !== 'undefined';
  const storage = isBrowser
    ? createStorage({ storage: cookieStorage })
    : undefined;

  const config = createConfig({
    chains: DEFAULT_CHAINS,
    connectors,
    transports: DEFAULT_TRANSPORTS,
    storage,
    ssr: !isBrowser,
  });

  return {
    config,
    preferredConnectorId,
  };
}
