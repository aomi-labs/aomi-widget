import './style.css';

import {
  createChatWidget,
  PREDEFINED_THEMES,
  type AomiChatWidgetHandler,
  type AomiChatWidgetPalette,
  type EthereumProvider,
} from '@aomi-labs/widget-lib';

type ThemePreset = {
  id: string;
  title: string;
  description: string;
  accent: string;
  icon: string;
  theme: string | AomiChatWidgetPalette;
};

const fallbackBackend = 'http://localhost:8080';
const backendFromEnv = import.meta.env.VITE_AOMI_BACKEND_URL?.trim();
const backendFromQuery = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('backend')?.trim()
  : undefined;

const backendUrl = backendFromQuery && backendFromQuery.length > 0
  ? backendFromQuery
  : backendFromEnv && backendFromEnv.length > 0
    ? backendFromEnv
    : fallbackBackend;

type PresetTheme = string | AomiChatWidgetPalette;

const customAuroraPalette: AomiChatWidgetPalette = {
  baseTheme: 'dark',
  primary: '#8b5cf6',
  background: '#0f172a',
  surface: '#111c34',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  border: '#1e293b',
  success: '#34d399',
  error: '#f87171',
  warning: '#fbbf24',
  accent: '#38bdf8',
};

const themePresets: ThemePreset[] = [
  {
    id: 'light',
    title: 'Guide (Light)',
    description: 'Polished neutral palette for documentation portals and marketing pages.',
    accent: PREDEFINED_THEMES.light.palette.primary ?? '#6366f1',
    icon: '✨',
    theme: 'light',
  },
  {
    id: 'dark',
    title: 'Support (Dark)',
    description: 'High contrast layout for dashboards and late-night operators.',
    accent: '#141820',
    icon: '🌙',
    theme: 'dark',
  },
  {
    id: 'terminal',
    title: 'Ops Terminal',
    description: 'Retro terminal skin with monospace typography and command prompts.',
    accent: '#00f260',
    icon: '🖥️',
    theme: 'terminal',
  },
  {
    id: 'aurora',
    title: 'Aurora Custom',
    description: 'Gradient-inspired palette showcasing bespoke brand controls.',
    accent: customAuroraPalette.primary ?? '#8b5cf6',
    icon: '🌌',
    theme: customAuroraPalette,
  },
];

const themeGrid = document.getElementById('theme-grid') as HTMLDivElement | null;
const widgetHost = document.getElementById('widget-host') as HTMLDivElement | null;
const activeThemeLabel = document.getElementById('active-theme') as HTMLSpanElement | null;
const statusLabel = document.getElementById('widget-status') as HTMLSpanElement | null;
const resetButton = document.getElementById('reset-widget') as HTMLButtonElement | null;

if (!themeGrid || !widgetHost || !activeThemeLabel || !statusLabel || !resetButton) {
  throw new Error('Demo markup missing required elements.');
}

let activeWidget: AomiChatWidgetHandler | null = null;
let activeThemeId: string | null = null;

console.info('[Aomi demo] Using backend:', backendUrl);
if (backendFromQuery) {
  console.info('[Aomi demo] Backend provided via ?backend parameter.');
} else if (backendFromEnv) {
  console.info('[Aomi demo] Backend provided via VITE_AOMI_BACKEND_URL.');
} else {
  console.info('[Aomi demo] Falling back to local default for previews.');
}

resetButton.addEventListener('click', () => {
  if (activeWidget) {
    activeWidget.destroy();
    activeWidget = null;
  }

  activeThemeId = null;
  updateActiveThemeLabel('—');
  setStatus('Select a theme to load the widget.');
  widgetHost.innerHTML = '<p>Choose a theme to embed the widget.</p>';
  renderThemeCards();
});

renderThemeCards();

function renderThemeCards(): void {
  themeGrid.innerHTML = '';

  themePresets.forEach((preset) => {
    const card = document.createElement('article');
    card.className = 'theme-card';
    card.dataset.active = preset.id === activeThemeId ? 'true' : 'false';
    card.dataset.themeId = preset.id;
    card.style.setProperty('--accent', preset.accent);

    const head = document.createElement('div');
    head.className = 'theme-card-head';

    const chip = document.createElement('div');
    chip.className = 'theme-chip';
    chip.style.setProperty('--accent', preset.accent);
    if (preset.id === 'dark') {
      chip.style.setProperty('--chip-start', '#0b0d13');
      chip.style.setProperty('--chip-end', '#1f2733');
      chip.style.setProperty('--chip-foreground', '#e2e8f0');
    } else {
      chip.style.setProperty('--chip-start', preset.accent);
      chip.style.setProperty('--chip-end', 'rgba(255, 255, 255, 0.2)');
      chip.style.setProperty('--chip-foreground', '#f8fafc');
    }
    chip.setAttribute('aria-hidden', 'true');
    const chipContent = document.createElement('span');
    chipContent.textContent = preset.icon;
    chip.appendChild(chipContent);

    const title = document.createElement('h3');
    title.textContent = preset.title;

    head.append(chip, title);

    const description = document.createElement('p');
    description.textContent = preset.description;

    const button = document.createElement('button');
    button.type = 'button';
    const isActive = activeThemeId === preset.id;
    button.textContent = isActive ? 'Reload theme' : 'Preview theme';
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.title = isActive ? `Reload ${preset.title}` : `Preview ${preset.title}`;
    button.addEventListener('click', () => {
      loadTheme(preset.id, preset.theme);
    });

    card.append(head, description, button);
    themeGrid.appendChild(card);
  });
}

function loadTheme(id: string, theme: PresetTheme): void {
  if (activeWidget) {
    activeWidget.destroy();
    activeWidget = null;
  }

  widgetHost.innerHTML = '';
  setStatus('Booting widget…');
  updateActiveThemeLabel(themePresets.find((preset) => preset.id === id)?.title ?? id);

  activeThemeId = id;
  renderThemeCards();

  const provider = resolveProvider();

  try {
    activeWidget = createChatWidget(widgetHost, {
      appCode: `landing-demo-${id}`,
      theme,
      width: '100%',
      height: '520px',
      baseUrl: backendUrl,
      provider,
      onReady: () => {
        setStatus(`Ready • connected to ${backendUrl}`);
      },
      onMessage: (message) => {
        console.info('[Aomi widget message]', message);
      },
      onError: (error) => {
        setStatus(`Error: ${error.message}`);
        console.error('[Aomi widget error]', error);
      },
    });
  } catch (error) {
    activeThemeId = null;
    renderThemeCards();
    setStatus('Failed to mount the widget. Check the console for details.');
    widgetHost.innerHTML = '<p>Something went wrong while loading the widget.</p>';
    console.error('[Aomi widget init error]', error);
  }
}

function resolveProvider(): EthereumProvider | undefined {
  if (typeof window !== 'undefined' && (window as { ethereum?: EthereumProvider }).ethereum) {
    return (window as { ethereum?: EthereumProvider }).ethereum;
  }

  return createMockProvider();
}

function createMockProvider(): EthereumProvider {
  let connectedAccounts = ['0x742d35Cc6645C0532C8ae7a8a4eaaE43e3Df9E10'];

  return {
    request: async ({ method, params }) => {
      switch (method) {
        case 'eth_accounts':
          return connectedAccounts;
        case 'eth_chainId':
          return '0x1';
        case 'eth_requestAccounts':
          return connectedAccounts;
        case 'eth_getBalance':
          return '0x1bc16d674ec80000';
        case 'personal_sign':
          return `0x${'a'.repeat(130)}`;
        case 'wallet_switchEthereumChain':
          connectedAccounts = [...connectedAccounts];
          return null;
        default:
          console.warn(`Mock provider received unsupported method: ${method}`, params);
          return null;
      }
    },
    on: (event, handler) => {
      if (event === 'accountsChanged') {
        setTimeout(() => handler(connectedAccounts), 1000);
      }
    },
  };
}

function setStatus(text: string): void {
  statusLabel.textContent = text;
}

function updateActiveThemeLabel(text: string): void {
  activeThemeLabel.textContent = text;
}

window.addEventListener('beforeunload', () => {
  if (activeWidget) {
    activeWidget.destroy();
  }
});
