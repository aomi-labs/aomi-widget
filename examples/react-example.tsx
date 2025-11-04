import React, { useEffect, useRef } from 'react';
import { createChatWidget, AomiChatWidgetHandler, ChatMessage, AomiChatError } from '@aomi-labs/widget-lib';

interface ChatWidgetProps {
  appCode: string;
  theme?: 'light' | 'dark' | 'terminal' | 'neon' | 'minimal';
  width?: string;
  height?: string;
  baseUrl?: string;
  onReady?: () => void;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: AomiChatError) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  appCode,
  theme = 'dark',
  width = '400px',
  height = '600px',
  baseUrl,
  onReady,
  onMessage,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<AomiChatWidgetHandler | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create the widget
    try {
      const widget = createChatWidget(containerRef.current, {
        appCode,
        theme,
        width,
        height,
        baseUrl,
        provider: (window as any).ethereum,
        onReady,
        onMessage,
        onError,
      });

      widgetRef.current = widget;

      // Cleanup function
      return () => {
        if (widgetRef.current) {
          widgetRef.current.destroy();
          widgetRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to create Aomi chat widget:', error);
      if (onError) {
        onError(error as AomiChatError);
      }
    }
  }, [appCode, theme, width, height, baseUrl, onReady, onMessage, onError]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: width,
        height: height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
};

// Example usage component
const App: React.FC = () => {
  const handleReady = () => {
    console.log('Aomi chat widget is ready!');
  };

  const handleMessage = (message: ChatMessage) => {
    console.log('New message:', message);
  };

  const handleError = (error: AomiChatError) => {
    console.error('Widget error:', error);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 Aomi Chat Widget - React Example</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Dark Theme</h2>
        <ChatWidget
          appCode="my-react-app"
          theme="dark"
          width="100%"
          height="500px"
          baseUrl="http://localhost:8080"
          onReady={handleReady}
          onMessage={handleMessage}
          onError={handleError}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Terminal Theme</h2>
        <ChatWidget
          appCode="my-react-app"
          theme="terminal"
          width="100%"
          height="400px"
          baseUrl="http://localhost:8080"
          onReady={handleReady}
          onMessage={handleMessage}
          onError={handleError}
        />
      </div>
    </div>
  );
};

export default App;
export { ChatWidget };