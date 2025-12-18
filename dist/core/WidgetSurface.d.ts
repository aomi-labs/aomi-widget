import type { SurfaceMode } from '../types/interface';
export interface WidgetSurfaceOptions {
    mode: SurfaceMode;
    width?: string;
    height?: string;
}
export declare class WidgetSurface {
    private container;
    private options;
    private iframe;
    private rootElement;
    private documentRef;
    constructor(container: HTMLElement, options: WidgetSurfaceOptions);
    getDocument(): Document;
    getRoot(): HTMLElement;
    clear(): void;
    setDimensions(width?: string, height?: string): void;
    destroy(): void;
    private createIframe;
}
//# sourceMappingURL=widgetSurface.d.ts.map