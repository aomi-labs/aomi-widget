import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type {
  AomiEventListeners,
  AomiWidgetHandler,
  OptionalParam,
  EthereumProvider,
} from '../types/interface';
import { createAomiWidget } from '../core/aomiWidget';

export interface ReactAomiChatWidgetProps {
  params: OptionalParam;
  provider?: EthereumProvider;
  listeners?: AomiEventListeners;
  className?: string;
  style?: CSSProperties;
}

export function AomiChatWidget({
  params,
  provider,
  listeners,
  className,
  style,
}: ReactAomiChatWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handlerRef = useRef<AomiWidgetHandler | null>(null);
  const listenersRef = useRef<AomiEventListeners | undefined>(listeners);
  const [error, setError] = useState<Error | null>(null);

  const destroyHandler = useCallback(() => {
    if (handlerRef.current) {
      handlerRef.current.destroy();
      handlerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!handlerRef.current) {
      try {
        handlerRef.current = createAomiWidget(container, {
          params,
          provider,
          listeners,
        });
        listenersRef.current = listeners;
        setError(null);
      } catch (creationError) {
        setError(
          creationError instanceof Error
            ? creationError
            : new Error('Failed to create widget'),
        );
      }
      return;
    }

    try {
      handlerRef.current.updateParams(params);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError
          : new Error('Failed to update widget parameters'),
      );
    }
  }, [params]);

  useEffect(() => {
    return () => {
      destroyHandler();
    };
  }, [destroyHandler]);

  useEffect(() => {
    const handler = handlerRef.current;
    if (!handler || listenersRef.current === listeners) {
      return;
    }

    // Recreate the widget to ensure listeners attach predictably
    const container = containerRef.current;
    destroyHandler();
    if (!container) {
      return;
    }

    try {
      handlerRef.current = createAomiWidget(container, {
        params,
        provider,
        listeners,
      });
      listenersRef.current = listeners;
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError
          : new Error('Failed to refresh widget listeners'),
      );
    }
  }, [listeners, params, provider, destroyHandler]);

  useEffect(() => {
    if (!handlerRef.current) {
      return;
    }

    handlerRef.current.updateProvider(provider);
  }, [provider]);

  if (error) {
    return (
      <div className={className} style={{ color: '#dc2626', ...style }}>
        {error.message}
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={style} />;
}
