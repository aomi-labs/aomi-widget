# Aomi Chatbot Widget - Architecture Plan

## 🎯 **Vision**

Transform the existing Aomi chatbot application into an embeddable widget package (similar to CoW Swap widget) that allows any website to integrate an AI agent chatbot with Web3 capabilities.

## 📊 **Current System Analysis**

### **Existing Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js + React)                                    │
│  ├── Hero Component (main container)                           │
│  ├── ChatContainer (message handling)                          │
│  ├── Message Components (markdown rendering)                   │
│  ├── Terminal UI (styled like VS Code)                         │
│  ├── Wallet Integration (wagmi/viem)                           │
│  └── Real-time Chat (EventSource/SSE)                          │
│                           │                                     │
│                           ▼                                     │
│  Backend (Rust + Axum)                                         │
│  ├── SSE Streaming (/api/chat/stream)                          │
│  ├── Chat Endpoints (/api/chat)                                │
│  ├── Session Management                                         │
│  ├── Wallet Transaction Handling                               │
│  └── MCP (Model Context Protocol) Integration                  │
└─────────────────────────────────────────────────────────────────┘
```

### **Key Features Identified**
- **Real-time chat interface** with AI agent
- **Terminal-style UI** with tabs (README, chat, anvil)
- **Wallet integration** for Web3 transactions
- **Session persistence** across conversations
- **Event streaming** for live updates
- **Markdown rendering** for rich responses
- **Transaction execution** flow
- **Network switching** capabilities

## 🏗️ **Widget Package Architecture**

### **Package Structure**
```
@aomi-labs/widget-lib/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # Type definitions
│   ├── chatWidget.ts               # Core widget logic
│   ├── chatManager.ts              # Chat state management
│   ├── urlUtils.ts                 # URL parameter handling
│   ├── themeUtils.ts               # Theme customization
│   ├── flexibleConfig.ts           # Configuration resolution
│   ├── widgetIframeTransport.ts    # Message transport
│   ├── components/
│   │   ├── ChatInterface.tsx       # Main chat UI
│   │   ├── MessageList.tsx         # Message rendering
│   │   ├── MessageInput.tsx        # Input component
│   │   ├── WalletStatus.tsx        # Wallet connection UI
│   │   └── TypingIndicator.tsx     # Typing animation
│   └── styles/
│       ├── widget.css              # Base widget styles
│       ├── themes/                 # Theme variants
│       └── terminal.css            # Terminal styling
├── dist/                           # Built packages
│   ├── index.js                    # CommonJS build
│   ├── index.mjs                   # ESM build
│   └── index.umd.js                # Browser UMD build
├── package.json
├── README.md
└── CHANGELOG.md

@aomi-labs/widget-react/
├── src/
│   ├── index.ts
│   └── AomiChatWidget.tsx          # React wrapper component
├── package.json
└── README.md
```

## 🎨 **Widget Design Philosophy**

### **Core Principles**
1. **Embed Anywhere** - Works on any website without conflicts
2. **Zero Config** - Minimal setup required
3. **Highly Customizable** - Themes, sizes, features
4. **Web3 Native** - Built-in wallet integration
5. **Developer Friendly** - Strong TypeScript support

### **Integration Methods**

#### **1. Direct Iframe Approach (Simplest)**
```html
<iframe 
  src="https://chat.aomi.ai/widget?appCode=my-app&theme=dark" 
  width="400" 
  height="600">
</iframe>
```

#### **2. JavaScript Widget Library**
```javascript
import { createAomiChatWidget } from '@aomi-labs/widget-lib';

const widget = createAomiChatWidget(container, {
  params: {
    appCode: 'my-dapp',
    theme: 'dark',
    welcomeMessage: 'Hello! How can I help with Web3?'
  },
  provider: window.ethereum
});
```

#### **3. React Component**
```jsx
import { AomiChatWidget } from '@aomi-labs/widget-react';

<AomiChatWidget
  appCode="my-react-app"
  theme="terminal"
  provider={provider}
  onTransactionRequest={handleTx}
/>
```

## ⚙️ **Configuration System**

### **Flexible Configuration Pattern (like CoW Swap)**
```typescript
export type FlexibleConfig<T> =
  | T
  | PerNetworkConfig<T>
  | PerModeConfig<T>
  | PerModeConfig<PerNetworkConfig<T>>
  | PerNetworkConfig<PerModeConfig<T>>

export interface AomiChatWidgetParams {
  // Required
  appCode: string                    // Unique app identifier
  
  // Core Configuration
  width?: string                     // Widget width (default: '400px')
  height?: string                    // Widget height (default: '600px')
  baseUrl?: string                   // Backend URL override
  
  // UI Customization
  theme?: AomiChatTheme | AomiChatWidgetPalette
  mode?: 'full' | 'minimal' | 'compact'
  welcomeMessage?: string
  placeholder?: string
  showWalletStatus?: boolean
  showNetworkSelector?: boolean
  
  // Network Configuration
  chainId?: number
  supportedChains?: number[]
  
  // Behavioral Settings
  enableTransactions?: boolean
  requireWalletConnection?: boolean
  sessionPersistence?: boolean
  autoConnect?: boolean
  
  // Advanced Features
  customCommands?: ChatCommand[]
  eventListeners?: AomiChatEventListeners
  rateLimiting?: RateLimitConfig
  
  // Integration Settings
  apiKey?: string                    // For premium features
  webhookUrl?: string                // For external notifications
  analytics?: AnalyticsConfig
}
```

### **Theme System**
```typescript
export interface AomiChatWidgetPalette {
  baseTheme: 'light' | 'dark' | 'terminal'
  primary: string                    // Primary action color
  background: string                 // Main background
  surface: string                    // Card/message backgrounds
  text: string                       // Primary text
  textSecondary: string              // Secondary text
  border: string                     // Border colors
  success: string                    // Success states
  error: string                      // Error states
  warning: string                    // Warning states
  accent: string                     // Accent highlights
}

// Predefined themes
export const THEMES = {
  light: { /* light theme config */ },
  dark: { /* dark theme config */ },
  terminal: { /* green terminal theme */ },
  neon: { /* cyberpunk theme */ },
  minimal: { /* clean minimal theme */ }
} as const;
```

## 📡 **Communication Architecture**

### **Widget ↔ Host Communication**
```typescript
// Messages the widget sends to host
export enum WidgetMethodsEmit {
  ACTIVATE = 'ACTIVATE',
  RESIZE = 'RESIZE',
  CHAT_EVENT = 'CHAT_EVENT',
  TRANSACTION_REQUEST = 'TRANSACTION_REQUEST',
  ERROR = 'ERROR',
  READY = 'READY'
}

// Messages the host sends to widget
export enum WidgetMethodsListen {
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  WALLET_STATUS = 'WALLET_STATUS',
  TRANSACTION_RESPONSE = 'TRANSACTION_RESPONSE',
  CUSTOM_COMMAND = 'CUSTOM_COMMAND'
}
```

### **Event System**
```typescript
export interface AomiChatEventListeners {
  onReady?: () => void
  onMessage?: (message: ChatMessage) => void
  onTransactionRequest?: (tx: TransactionRequest) => void
  onError?: (error: ChatError) => void
  onSessionStart?: (sessionId: string) => void
  onSessionEnd?: (sessionId: string) => void
  onNetworkChange?: (chainId: number) => void
  onWalletConnect?: (address: string) => void
  onWalletDisconnect?: () => void
}
```

## 🔄 **Data Flow**

### **Message Flow Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                      HOST WEBSITE                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Widget Container                          │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │             Widget iframe                       │   │   │
│  │  │  (https://chat.aomi.ai/widget/...)             │   │   │
│  │  └──────────────────┬──────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AOMI WIDGET BACKEND                            │
│                 (chat.aomi.ai servers)                          │
│                                                                 │
│  Widget Frontend (React)                                       │
│  ├── Chat Interface                                            │
│  ├── Message Management                                        │
│  ├── Wallet Integration                                        │
│  └── Real-time Updates                                         │
│                           │                                     │
│                           ▼                                     │
│  Widget Backend API                                            │
│  ├── SSE Streaming                                             │
│  ├── Session Management                                        │
│  ├── AI Agent Integration                                      │
│  └── Transaction Handling                                      │
│                           │                                     │
│                           ▼                                     │
│  External Services                                             │
│  ├── AI Models (Claude, OpenAI)                               │
│  ├── Blockchain RPC                                           │
│  ├── Transaction Broadcasting                                  │
│  └── Analytics & Monitoring                                   │
└─────────────────────────────────────────────────────────────────┘
```

### **Real-time Communication**
```typescript
// Widget uses multiple communication channels:
1. **HTTP REST** - Initial configuration and one-off commands
2. **Server-Sent Events (SSE)** - Real-time chat updates
3. **PostMessage API** - Widget ↔ Host communication
4. **WebSocket** - Optional for advanced real-time features
```

## 🛠️ **Implementation Strategy**

### **Phase 1: Core Widget Infrastructure**
1. **Extract and Refactor Core Components**
   - Abstract ChatContainer from Next.js app
   - Create framework-agnostic message components
   - Build theme system
   - Implement iframe transport layer

2. **Create Widget Factory**
   ```typescript
   export function createAomiChatWidget(
     container: HTMLElement,
     config: AomiChatWidgetConfig
   ): AomiChatWidgetHandler
   ```

3. **URL Parameter System**
   ```
   https://chat.aomi.ai/widget/v1?
     appCode=my-app&
     theme=dark&
     chain=1&
     mode=compact&
     welcomeMessage=Hello%20World
   ```

### **Phase 2: Advanced Features**
1. **React Wrapper Component**
2. **Vue/Angular Adapters**
3. **Advanced Theming**
4. **Plugin System**
5. **Analytics Integration**

### **Phase 3: Enterprise Features**
1. **Self-hosted Deployment**
2. **Custom Backend Integration**
3. **White-label Solutions**
4. **Advanced Analytics Dashboard**

## 📦 **Package Distribution**

### **NPM Packages**
```json
{
  "@aomi-labs/widget-lib": "^1.0.0",        // Core widget library
  "@aomi-labs/widget-react": "^1.0.0",      // React wrapper
  "@aomi-labs/widget-vue": "^1.0.0",        // Vue wrapper
  "@aomi-labs/widget-angular": "^1.0.0",    // Angular wrapper
  "@aomi-labs/widget-themes": "^1.0.0"      // Additional themes
}
```

### **CDN Distribution**
```html
<!-- For quick testing/prototyping -->
<script src="https://unpkg.com/@aomi-labs/widget-lib@latest/dist/widget.umd.js"></script>
<script>
  const widget = AomiWidget.create(container, config);
</script>
```

## 🎯 **Widget Configurations**

### **Minimal Setup**
```javascript
// Simplest possible integration
const widget = createAomiChatWidget(document.getElementById('chat'), {
  appCode: 'my-app'
});
```

### **Full Featured Setup**
```javascript
const widget = createAomiChatWidget(container, {
  appCode: 'advanced-dapp',
  
  // Appearance
  theme: {
    baseTheme: 'dark',
    primary: '#00ff88',
    background: '#0a0a0a',
    accent: '#ff0088'
  },
  width: '500px',
  height: '700px',
  mode: 'full',
  
  // Behavior
  welcomeMessage: 'Welcome to our DeFi platform! How can I help?',
  enableTransactions: true,
  requireWalletConnection: true,
  
  // Network
  chainId: 1,
  supportedChains: [1, 137, 42161],
  
  // Events
  eventListeners: {
    onReady: () => console.log('Widget ready'),
    onTransactionRequest: handleTransaction,
    onError: handleError
  },
  
  // Integration
  provider: window.ethereum,
  sessionId: userSessionId,
  apiKey: process.env.AOMI_API_KEY
});
```

## 🔐 **Security Considerations**

### **Iframe Sandbox**
```html
<iframe 
  src="https://chat.aomi.ai/widget/..."
  sandbox="allow-scripts allow-same-origin allow-forms"
  allow="clipboard-read; clipboard-write"
></iframe>
```

### **Message Validation**
```typescript
// All postMessage communication validated
interface ValidatedMessage {
  origin: string;
  type: WidgetMessageType;
  payload: unknown;
  signature?: string;  // For sensitive operations
}
```

### **API Key Security**
- **Client-side**: Only for styling/theme customization
- **Server-side**: Required for advanced AI features
- **Rate limiting**: Prevent abuse
- **Origin validation**: Verify authorized domains

## 📈 **Monetization Strategy**

### **Tier Structure**
1. **Free Tier**
   - Basic chat functionality
   - Standard themes
   - 1000 messages/month
   - Community support

2. **Pro Tier ($29/month)**
   - Unlimited messages
   - Custom themes
   - Advanced AI models
   - Priority support
   - Analytics dashboard

3. **Enterprise Tier (Custom)**
   - Self-hosted deployment
   - Custom AI training
   - White-label solutions
   - SLA guarantees
   - Dedicated support

## 🧪 **Testing Strategy**

### **Widget Testing**
```typescript
// Widget integration tests
describe('AomiChatWidget', () => {
  test('initializes with minimal config', () => {
    const widget = createAomiChatWidget(container, {
      appCode: 'test-app'
    });
    expect(widget).toBeDefined();
  });
  
  test('handles theme customization', () => {
    const widget = createAomiChatWidget(container, {
      appCode: 'test-app',
      theme: { baseTheme: 'dark', primary: '#ff0000' }
    });
    // Verify theme application
  });
  
  test('emits events correctly', async () => {
    const onReady = jest.fn();
    const widget = createAomiChatWidget(container, {
      appCode: 'test-app',
      eventListeners: { onReady }
    });
    await waitFor(() => expect(onReady).toHaveBeenCalled());
  });
});
```

### **Cross-browser Testing**
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- Different screen sizes and orientations

## 🚀 **Launch Strategy**

### **Phase 1: MVP Launch (Month 1-2)**
- Core widget functionality
- Basic themes (light, dark, terminal)
- React wrapper
- Documentation site
- Simple demo applications

### **Phase 2: Community Growth (Month 3-4)**
- Additional frameworks (Vue, Angular)
- Advanced themes
- Plugin system
- Community examples
- Integration tutorials

### **Phase 3: Enterprise Ready (Month 5-6)**
- Self-hosted options
- Enterprise features
- Analytics dashboard
- SLA support
- Partner integrations

## 🔧 **Development Tools**

### **Build System**
```json
{
  "scripts": {
    "build": "rollup -c",
    "build:umd": "rollup -c rollup.umd.config.js",
    "dev": "rollup -c -w",
    "test": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "docs": "typedoc src/"
  }
}
```

### **Example Applications**
- **Basic HTML + JS**: Simple integration example
- **React App**: Complete e-commerce integration
- **Vue.js SPA**: DeFi dashboard integration
- **WordPress Plugin**: CMS integration
- **Shopify App**: E-commerce chat assistant

## 📚 **Documentation Strategy**

### **Documentation Site Structure**
```
docs.aomi.ai/widget/
├── getting-started/
│   ├── quick-start
│   ├── installation
│   └── first-widget
├── guides/
│   ├── react-integration
│   ├── theming
│   ├── wallet-integration
│   └── custom-commands
├── api-reference/
│   ├── widget-config
│   ├── events
│   └── methods
├── examples/
│   ├── basic-html
│   ├── react-app
│   ├── vue-app
│   └── advanced-configs
└── resources/
    ├── troubleshooting
    ├── migration-guide
    └── changelog
```

## 🎉 **Success Metrics**

### **Technical KPIs**
- **Widget Load Time**: < 2 seconds
- **Bundle Size**: < 500KB (gzipped)
- **Mobile Performance**: 90+ Lighthouse score
- **Browser Compatibility**: 95%+ modern browsers

### **Business KPIs**
- **Monthly Active Widgets**: 10,000+ (Month 6)
- **Developer Adoption**: 1,000+ registered apps
- **Community Growth**: 5,000+ Discord/GitHub stars
- **Enterprise Clients**: 50+ by end of Year 1

---

## 🎯 **Next Steps**

1. **Create widget package scaffolding**
2. **Extract and refactor core chat components**
3. **Build iframe transport system**
4. **Implement basic theme system**
5. **Create simple demo applications**
6. **Set up documentation site**
7. **Launch MVP with community**

This architecture plan provides a comprehensive roadmap for transforming your chatbot into a widely-adoptable widget package, following proven patterns from successful projects like CoW Swap while adding unique value through AI agent capabilities and Web3 integration.