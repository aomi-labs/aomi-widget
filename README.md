# @aomi/widget-lib

Embeddable AI chat widget with Web3 capabilities for any website.

## 🚀 Quick Start

### Installation

```bash
npm install @aomi/widget-lib
```

### Basic Usage

```typescript
import { createChatWidget } from '@aomi/widget-lib';

const widget = createChatWidget('chat-container', {
  appCode: 'my-dapp',
  theme: 'terminal',
  provider: window.ethereum
});
```

### Advanced Usage

```typescript
import { createAomiChatWidget } from '@aomi/widget-lib';

const widget = createAomiChatWidget(container, {
  params: {
    appCode: 'my-advanced-dapp',
    theme: {
      baseTheme: 'dark',
      primary: '#00ff88',
      background: '#0a0a0a'
    },
    width: '500px',
    height: '700px',
    enableTransactions: true,
    chainId: 1
  },
  provider: window.ethereum,
  listeners: {
    onReady: () => console.log('Widget ready!'),
    onMessage: (msg) => console.log('New message:', msg),
    onTransactionRequest: (tx) => console.log('Transaction:', tx)
  }
});
```

## 📚 Documentation

### Configuration Options

```typescript
interface AomiChatWidgetParams {
  // Required
  appCode: string;

  // Appearance
  theme?: 'light' | 'dark' | 'terminal' | 'neon' | 'minimal' | CustomTheme;
  width?: string;
  height?: string;
  mode?: 'full' | 'minimal' | 'compact' | 'terminal';

  // Behavior
  welcomeMessage?: string;
  placeholder?: string;
  enableTransactions?: boolean;
  requireWalletConnection?: boolean;

  // Network
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];

  // Integration
  baseUrl?: string;
  apiKey?: string;
  sessionId?: string;
}
```

### Event Handling

```typescript
widget.on('ready', () => {
  console.log('Widget is ready');
});

widget.on('message', (message) => {
  console.log('New message:', message.content);
});

widget.on('transactionRequest', async (tx) => {
  // Handle transaction request
  console.log('Transaction requested:', tx);
});

widget.on('walletConnect', (address) => {
  console.log('Wallet connected:', address);
});

widget.on('error', (error) => {
  console.error('Widget error:', error);
});
```

### Widget Methods

```typescript
// Send a message
await widget.sendMessage('Hello AI!');

// Update configuration
widget.updateParams({
  theme: 'light',
  enableTransactions: false
});

// Clear chat history
widget.clearChat();

// Export chat messages
const messages = widget.exportChat();

// Resize widget
widget.resize('600px', '800px');

// Destroy widget
widget.destroy();
```

## 🎨 Themes

### Predefined Themes

- `light` - Clean light theme
- `dark` - Modern dark theme  
- `terminal` - Green terminal style
- `neon` - Cyberpunk neon theme
- `minimal` - Clean minimal design

### Custom Themes

```typescript
const customTheme = {
  baseTheme: 'dark',
  primary: '#ff6b35',
  background: '#1a1a1a',
  surface: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#cccccc',
  border: '#404040',
  success: '#00d26a',
  error: '#ff4757',
  warning: '#ffa500',
  accent: '#8b5cf6'
};

widget.updateParams({ theme: customTheme });
```

## 🌐 Network Support

Supported networks:
- Ethereum Mainnet (1)
- Goerli Testnet (5)
- Sepolia Testnet (11155111)
- Gnosis Chain (100)
- Polygon (137)
- Arbitrum One (42161)
- Base (8453)
- Optimism (10)

## 🔧 Advanced Features

### Flexible Configuration

Configure different settings per network or mode:

```typescript
const config = {
  appCode: 'my-app',
  // Different settings per network
  enableTransactions: {
    1: true,      // Mainnet: enabled
    5: false,     // Goerli: disabled
    100: true     // Gnosis: enabled
  },
  // Different settings per mode
  welcomeMessage: {
    full: 'Welcome to our full chat experience!',
    minimal: 'Hi there!',
    compact: 'Hello!'
  }
};
```

### Custom Commands

```typescript
const widget = createAomiChatWidget(container, {
  params: {
    appCode: 'my-app',
    customCommands: [
      {
        command: 'balance',
        description: 'Check wallet balance',
        handler: async (args) => {
          // Custom command logic
        }
      }
    ]
  }
});
```

### Rate Limiting

```typescript
const config = {
  appCode: 'my-app',
  rateLimiting: {
    maxMessages: 10,
    windowMs: 60000, // 1 minute
    skipWhenConnected: true
  }
};
```

## 🧪 Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Development Server

```bash
npm run dev
```

## 📦 Package Exports

```typescript
// Main factory functions
import { createChatWidget, createAomiChatWidget } from '@aomi/widget-lib';

// Core managers
import { ChatManager, ThemeManager, WalletManager } from '@aomi/widget-lib';

// Types
import type { 
  AomiChatWidgetParams, 
  AomiChatWidgetHandler,
  ChatMessage,
  WalletTransaction 
} from '@aomi/widget-lib';

// Constants
import { 
  SUPPORTED_CHAINS, 
  PREDEFINED_THEMES, 
  ERROR_CODES 
} from '@aomi/widget-lib';

// Utilities
import { 
  validateWidgetParams,
  generateSessionId,
  formatTimestamp 
} from '@aomi/widget-lib';
```

## 🔗 Related Packages

- `@aomi/widget-react` - React wrapper component
- `@aomi/widget-vue` - Vue.js wrapper component  
- `@aomi/widget-themes` - Additional theme packs

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

- Documentation: [docs.aomi.ai/widget](https://docs.aomi.ai/widget)
- Issues: [GitHub Issues](https://github.com/aomi-labs/widget-lib/issues)
- Discord: [Aomi Labs Community](https://discord.gg/aomi)

---

Built with ❤️ by [Aomi Labs](https://aomi.ai)