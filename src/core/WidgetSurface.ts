import {
  CSS_CLASSES,
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_WIDGET_WIDTH,
} from '../types/constants';
import type { WidgetRenderSurface } from '../types/interfaces';

export interface WidgetSurfaceOptions {
  mode: WidgetRenderSurface;
  width?: string;
  height?: string;
}

const IFRAME_TEMPLATE = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        font-family: inherit;
        background: transparent;
      }
    </style>
  </head>
  <body></body>
</html>
`;

export class WidgetSurface {
  private iframe: HTMLIFrameElement | null = null;
  private rootElement: HTMLElement;
  private documentRef: Document;

  constructor(
    private container: HTMLElement,
    private options: WidgetSurfaceOptions,
  ) {
    if (options.mode === 'iframe') {
      const iframe = this.createIframe();
      this.container.innerHTML = '';
      this.container.appendChild(iframe);
      this.iframe = iframe;

      const iframeDocument = iframe.contentDocument;
      if (!iframeDocument || !iframeDocument.body) {
        throw new Error('Failed to initialize iframe document');
      }

      iframeDocument.open();
      iframeDocument.write(IFRAME_TEMPLATE);
      iframeDocument.close();

      this.documentRef = iframe.contentDocument || iframeDocument;
      this.rootElement = this.documentRef.body;
    } else {
      this.container.innerHTML = '';
      const ownerDocument = this.container.ownerDocument;
      if (!ownerDocument) {
        throw new Error('Container is detached from a document');
      }
      this.documentRef = ownerDocument;
      this.rootElement = this.container;
    }
  }

  public getDocument(): Document {
    return this.documentRef;
  }

  public getRoot(): HTMLElement {
    return this.rootElement;
  }

  public clear(): void {
    this.rootElement.innerHTML = '';
  }

  public setDimensions(width?: string, height?: string): void {
    const targetWidth = width || DEFAULT_WIDGET_WIDTH;
    const targetHeight = height || DEFAULT_WIDGET_HEIGHT;

    if (this.iframe) {
      Object.assign(this.iframe.style, {
        width: targetWidth,
        height: targetHeight,
      });
    } else {
      Object.assign(this.container.style, {
        width: targetWidth,
        height: targetHeight,
      });
    }
  }

  public destroy(): void {
    if (this.iframe && this.iframe.parentElement) {
      this.iframe.parentElement.removeChild(this.iframe);
    } else {
      this.container.innerHTML = '';
    }
  }

  private createIframe(): HTMLIFrameElement {
    const iframe = this.container.ownerDocument.createElement('iframe');
    iframe.setAttribute('title', 'Aomi Chat Widget');
    iframe.setAttribute('aria-live', 'polite');
    iframe.className = CSS_CLASSES.WIDGET_IFRAME;
    iframe.style.border = '0';
    iframe.style.width = this.options.width || DEFAULT_WIDGET_WIDTH;
    iframe.style.height = this.options.height || DEFAULT_WIDGET_HEIGHT;
    iframe.style.display = 'block';

    return iframe;
  }
}
