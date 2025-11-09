# @aomi-labs/widget-lib

Embeddable AI chat widget with Web3 capabilities for any website.

## 🚀 Quick Start

### Installation

```bash
npm install @aomi-labs/widget-lib
```

### Basic Usage

```typescript
import { createChatWidget } from '@aomi-labs/widget-lib';

const widget = createChatWidget('chat-container', {
  appCode: 'my-dapp',
  provider: window.ethereum
});
```

### Advanced Usage

```typescript
import { createAomiChatWidget } from '@aomi-labs/widget-lib';

const widget = createAomiChatWidget(container, {
  params: {
    appCode: 'my-advanced-dapp',
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
  width?: string;
  height?: string;
  renderSurface?: 'inline' | 'iframe';

  // Behavior
  welcomeMessage?: string;
  placeholder?: string;
  interactionMode?: 'chat' | 'onchain';
  enableTransactions?: boolean;
  requireWalletConnection?: boolean;

  // Network
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];

  // Integration
  baseUrl?: string;
  apiKey?: string;
  sessionId?: string;

  // Presentation
  theme?: AomiWidgetThemeConfig;
  content?: {
    welcomeTitle?: string;
    assistantName?: string;
    emptyStateMessage?: string;
  };
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
  placeholder: 'What can I help you with?',
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

### Flexible configuration & themes

- Most string/number params now accept objects keyed by chain ID or interaction mode (`'chat' | 'onchain'`), e.g.:
  ```ts
  const params: AomiChatWidgetParams = {
    appCode: 'my-app',
    width: { 1: '480px', 8453: '420px' },
    placeholder: { chat: 'Ask anything', onchain: 'Ready to transact?' },
    theme: {
      palette: { accent: '#4f46e5' },
      content: { welcomeTitle: { chat: 'Assistant', onchain: 'Onchain Copilot' } },
    },
  };
  ```
- Use `resolveWidgetParams(params, context)` if you need the fully-resolved result in your host app.
- `renderSurface` defaults to `'iframe'`, sandboxing the UI while keeping the inline renderer available for legacy embedders.

### React adapter

The repo now ships a React-first wrapper inspired by `@cowprotocol/widget-react`:

```tsx
import { ReactAomiChatWidget } from '@aomi-labs/widget-lib';

<ReactAomiChatWidget params={params} provider={window.ethereum} />;
```

It manages widget lifecycle automatically and reacts to prop changes without leaking DOM nodes.

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
import { createChatWidget, createAomiChatWidget } from '@aomi-labs/widget-lib';

// Core managers
import { ChatManager, WalletManager } from '@aomi-labs/widget-lib';

// Types
import type { 
  AomiChatWidgetParams, 
  AomiChatWidgetHandler,
  ChatMessage,
  WalletTransaction 
} from '@aomi-labs/widget-lib';

// Constants
import { 
  SUPPORTED_CHAINS, 
  ERROR_CODES 
} from '@aomi-labs/widget-lib';

// Utilities
import { 
  validateWidgetParams,
  generateSessionId,
  formatTimestamp 
} from '@aomi-labs/widget-lib';
```

## 🔗 Related Packages

- `@aomi-labs/widget-react` - React wrapper component
- `@aomi-labs/widget-vue` - Vue.js wrapper component  

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

- Issues: [GitHub Issues](https://github.com/aomi-labs/aomi-widget/issues)

---

Built with ❤️ by [Aomi Labs](https://aomi.dev)
