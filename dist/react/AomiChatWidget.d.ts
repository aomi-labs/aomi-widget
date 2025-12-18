import type { CSSProperties } from 'react';
import type { AomiEventListeners, OptionalParam, EthereumProvider } from '../types/interface';
export interface ReactAomiChatWidgetProps {
    params: OptionalParam;
    provider?: EthereumProvider;
    listeners?: AomiEventListeners;
    className?: string;
    style?: CSSProperties;
}
export declare function AomiChatWidget({ params, provider, listeners, className, style, }: ReactAomiChatWidgetProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AomiChatWidget.d.ts.map