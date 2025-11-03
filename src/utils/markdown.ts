import DOMPurify from 'dompurify';
import { Marked, Renderer } from 'marked';
import { addAlpha, adjustColor, getRelativeLuminance, mixColors } from './color-utils';

type MermaidModule = typeof import('mermaid');

export interface MarkdownColors {
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  border: string;
  background: string;
  inlineBackground: string;
  blockBackground: string;
  blockBorder: string;
  calloutBackground: string;
  calloutBorder: string;
}

export interface MarkdownRenderOptions {
  colors: MarkdownColors;
  fontFamily: string;
  monospaceFontFamily: string;
}

const MERMAID_CONTAINER_CLASS = 'aomi-md-mermaid';
const CALLOUT_BODY_ATTR = 'data-callout-body';

let mermaidPromise: Promise<MermaidModule['default'] | null> | null = null;

const calloutIconMap: Record<string, string> = {
  note: '📝',
  info: 'ℹ️',
  tip: '💡',
  success: '✅',
  warning: '⚠️',
  caution: '⚠️',
  danger: '🚨',
  error: '🚨',
  bug: '🐞',
  example: '🧪',
};

const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'hr', 'i',
  'img', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
];

const MERMAID_THEME_DEFAULTS = {
  primaryColor: '#1e293b',
  primaryTextColor: '#e2e8f0',
  primaryBorderColor: '#475569',
  lineColor: '#64748b',
  secondaryColor: '#334155',
  tertiaryColor: '#0f172a',
  background: '#0f172a',
  mainBkg: '#1e293b',
  secondBkg: '#334155',
  tertiaryBkg: '#475569',
};

/**
 * Renders markdown into a styled HTMLElement mirroring the product-mono implementation.
 */
export function renderMarkdown(content: string, options: MarkdownRenderOptions): HTMLElement {
  const renderer = createRenderer();
  const parser = new Marked();
  parser.use({ renderer });
  parser.setOptions({
    gfm: true,
    breaks: false,
  });

  const parsed = parser.parse(content || '');
  const rawHtml = typeof parsed === 'string' ? parsed : '';
  const sanitized = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ADD_ATTR: ['target', 'rel', 'data-code'],
  });

  const container = document.createElement('div');
  container.className = 'aomi-markdown';
  container.innerHTML = sanitized;

  applyBaseStyles(container, options);
  transformCallouts(container);
  styleElements(container, options);
  normalizeBlockSpacing(container);
  renderMermaidDiagrams(container, options);

  return container;
}

/**
 * Creates a marked renderer with mermaid support.
 */
function createRenderer(): Renderer {
  const renderer = new Renderer();
  const baseCodeRenderer = renderer.code.bind(renderer);

  renderer.code = (code: string, infostring?: string, escaped?: boolean): string => {
    const lang = (infostring ?? '').trim().toLowerCase();
    if (lang === 'mermaid') {
      const encoded = encodeURIComponent(code);
      return `<div class="${MERMAID_CONTAINER_CLASS}" data-code="${encoded}"></div>`;
    }

    return baseCodeRenderer(code, infostring, escaped ?? false);
  };

  return renderer;
}

/**
 * Applies base container styles.
 */
function applyBaseStyles(container: HTMLElement, options: MarkdownRenderOptions): void {
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.fontFamily = options.fontFamily;
  container.style.fontSize = '13px';
  container.style.color = options.colors.text;
  container.style.lineHeight = '1.6';
  container.style.gap = '0';
}

/**
 * Applies styles to markdown elements.
 */
function styleElements(container: HTMLElement, options: MarkdownRenderOptions): void {
  const { colors, monospaceFontFamily } = options;

  container.querySelectorAll('p').forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.calloutTitle === 'true') return;

    const isInCallout = !!element.closest(`[${CALLOUT_BODY_ATTR}="true"]`);
    element.style.marginTop = isInCallout ? '4px' : '20px';
    element.style.marginBottom = isInCallout ? '8px' : '16px';
    element.style.fontSize = isInCallout ? '12px' : '13px';
    element.style.lineHeight = '1.6';
    element.style.color = isInCallout ? colors.text : colors.text;
  });

  container.querySelectorAll('a').forEach((anchor) => {
    if (!(anchor instanceof HTMLAnchorElement)) return;
    anchor.style.color = colors.accent;
    anchor.style.textDecoration = 'underline';
    anchor.style.transition = 'color 0.2s ease';
    anchor.addEventListener('mouseenter', () => {
      anchor.style.color = colors.accentHover;
    });
    anchor.addEventListener('mouseleave', () => {
      anchor.style.color = colors.accent;
    });
    if (!anchor.getAttribute('target')) {
      anchor.setAttribute('target', '_blank');
    }
    anchor.setAttribute('rel', 'noreferrer');
  });

  container.querySelectorAll('ul').forEach((list) => {
    if (!(list instanceof HTMLElement)) return;
    list.style.marginTop = '16px';
    list.style.marginBottom = '16px';
    list.style.marginLeft = '24px';
    list.style.paddingLeft = '12px';
    list.style.listStyleType = 'disc';
    list.style.color = colors.text;
  });

  container.querySelectorAll('ol').forEach((list) => {
    if (!(list instanceof HTMLElement)) return;
    list.style.marginTop = '16px';
    list.style.marginBottom = '16px';
    list.style.marginLeft = '24px';
    list.style.paddingLeft = '12px';
    list.style.listStyleType = 'decimal';
    list.style.color = colors.text;
  });

  container.querySelectorAll('li').forEach((item) => {
    if (!(item instanceof HTMLElement)) return;
    item.style.marginBottom = '4px';
    item.style.lineHeight = '1.6';
    item.style.color = colors.text;
  });

  container.querySelectorAll('pre').forEach((block) => {
    if (!(block instanceof HTMLElement)) return;
    block.style.marginTop = '20px';
    block.style.marginBottom = '16px';
    block.style.padding = '12px';
    block.style.borderRadius = '8px';
    block.style.backgroundColor = colors.blockBackground;
    block.style.border = `1px solid ${colors.blockBorder}`;
    block.style.overflowX = 'auto';
    block.style.fontFamily = monospaceFontFamily;
    block.style.fontSize = '12px';
    block.style.lineHeight = '1.5';

    const code = block.querySelector('code');
    if (code instanceof HTMLElement) {
      code.style.color = colors.text;
      code.style.fontFamily = monospaceFontFamily;
      code.style.display = 'block';
      code.style.whiteSpace = 'pre';
    }
  });

  container.querySelectorAll('code').forEach((inline) => {
    if (!(inline instanceof HTMLElement)) return;
    if (inline.parentElement?.tagName === 'PRE') return;
    inline.style.display = 'inline';
    inline.style.padding = '2px 6px';
    inline.style.borderRadius = '4px';
    inline.style.fontSize = '12px';
    inline.style.backgroundColor = colors.inlineBackground;
    inline.style.color = colors.accent;
    inline.style.fontFamily = monospaceFontFamily;
  });

  container.querySelectorAll('blockquote').forEach((blockquote) => {
    if (!(blockquote instanceof HTMLElement)) return;
    if (blockquote.classList.contains('aomi-md-callout')) return;

    blockquote.style.marginTop = '16px';
    blockquote.style.marginBottom = '16px';
    blockquote.style.padding = '12px 16px';
    blockquote.style.borderLeft = `2px solid ${colors.border}`;
    blockquote.style.backgroundColor = colors.inlineBackground;
    blockquote.style.borderRadius = '6px';
    blockquote.style.color = colors.muted;
  });

  styleCallouts(container, options);
  styleHeadings(container, colors);
  styleTables(container, options);

  container.querySelectorAll('hr').forEach((divider) => {
    if (!(divider instanceof HTMLElement)) return;
    divider.style.marginTop = '24px';
    divider.style.marginBottom = '24px';
    divider.style.border = 'none';
    divider.style.borderTop = `1px solid ${colors.border}`;
  });

  container.querySelectorAll('img').forEach((image) => {
    if (!(image instanceof HTMLImageElement)) return;
    image.style.maxWidth = '100%';
    image.style.borderRadius = '8px';
  });
}

/**
 * Styles headings to match GitHub-like markdown.
 */
function styleHeadings(container: HTMLElement, colors: MarkdownColors): void {
  container.querySelectorAll('h1').forEach((heading) => {
    if (!(heading instanceof HTMLElement)) return;
    heading.style.marginTop = '0';
    heading.style.marginBottom = '20px';
    heading.style.fontSize = '24px';
    heading.style.fontWeight = '600';
    heading.style.color = colors.text;
    heading.style.borderBottom = `1px solid ${colors.border}`;
    heading.style.paddingBottom = '12px';
  });

  container.querySelectorAll('h2').forEach((heading) => {
    if (!(heading instanceof HTMLElement)) return;
    heading.style.marginTop = '24px';
    heading.style.marginBottom = '16px';
    heading.style.fontSize = '20px';
    heading.style.fontWeight = '600';
    heading.style.color = colors.text;
    heading.style.borderBottom = `1px solid ${colors.border}`;
    heading.style.paddingBottom = '12px';
  });

  container.querySelectorAll('h3').forEach((heading) => {
    if (!(heading instanceof HTMLElement)) return;
    heading.style.marginTop = '20px';
    heading.style.marginBottom = '12px';
    heading.style.fontSize = '17px';
    heading.style.fontWeight = '600';
    heading.style.color = colors.text;
  });
}

/**
 * Wraps and styles tables.
 */
function styleTables(container: HTMLElement, options: MarkdownRenderOptions): void {
  const { colors } = options;

  container.querySelectorAll('table').forEach((table) => {
    if (!(table instanceof HTMLTableElement)) return;

    if (!table.parentElement?.classList.contains('aomi-md-table-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'aomi-md-table-wrapper';
      wrapper.style.marginTop = '20px';
      wrapper.style.marginBottom = '16px';
      wrapper.style.overflowX = 'auto';
      wrapper.style.borderRadius = '8px';
      wrapper.style.border = `1px solid ${colors.blockBorder}`;
      wrapper.style.backgroundColor = colors.blockBackground;

      table.parentElement?.replaceChild(wrapper, table);
      wrapper.appendChild(table);
    }

    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '13px';
    table.style.color = colors.text;

    table.querySelectorAll('thead').forEach((thead) => {
      if (!(thead instanceof HTMLElement)) return;
      thead.style.backgroundColor = colors.inlineBackground;
      thead.style.color = colors.text;
    });

    table.querySelectorAll('tbody').forEach((tbody) => {
      if (!(tbody instanceof HTMLElement)) return;
      tbody.style.backgroundColor = colors.blockBackground;
    });

    table.querySelectorAll('th').forEach((cell) => {
      if (!(cell instanceof HTMLElement)) return;
      cell.style.borderBottom = `1px solid ${colors.blockBorder}`;
      cell.style.padding = '10px 12px';
      cell.style.textAlign = 'left';
      cell.style.fontWeight = '600';
      cell.style.color = colors.text;
    });

    table.querySelectorAll('td').forEach((cell) => {
      if (!(cell instanceof HTMLElement)) return;
      cell.style.borderBottom = `1px solid ${colors.blockBorder}`;
      cell.style.padding = '10px 12px';
      cell.style.color = colors.muted;
    });
  });
}

/**
 * Ensures the first and last block elements have no extra outer spacing.
 */
function normalizeBlockSpacing(container: HTMLElement): void {
  const blocks = Array.from(
    container.querySelectorAll<HTMLElement>(
      'h1, h2, h3, p, ul, ol, pre, blockquote, .aomi-md-callout, table, hr',
    ),
  );

  if (blocks.length === 0) {
    return;
  }

  const first = blocks[0];
  if (first) {
    first.style.marginTop = '0';
  }

  const last = blocks[blocks.length - 1];
  if (last) {
    last.style.marginBottom = '0';
  }
}

/**
 * Converts blockquotes with [!TYPE] syntax into callout cards.
 */
function transformCallouts(container: HTMLElement): void {
  const blockquotes = Array.from(container.querySelectorAll('blockquote'));

  blockquotes.forEach((blockquote) => {
    if (!(blockquote instanceof HTMLElement)) return;
    const firstElement = blockquote.firstElementChild as HTMLElement | null;
    const firstText = firstElement?.textContent?.trim() ?? '';
    const calloutMatch = firstText.match(/^\[!([A-Z]+)]\s*(.*)$/i);

    if (!calloutMatch) return;

    const [, rawType, restText] = calloutMatch;
    if (firstElement) {
      blockquote.removeChild(firstElement);
    }

    const calloutType = rawType.toLowerCase();
    const titleText = capitalize(calloutType);

    const wrapper = document.createElement('div');
    wrapper.className = 'aomi-md-callout';

    const header = document.createElement('div');
    header.className = 'aomi-md-callout-header';

    const icon = document.createElement('span');
    icon.className = 'aomi-md-callout-icon';
    icon.textContent = calloutIconMap[calloutType] ?? '⚠️';

    const title = document.createElement('span');
    title.className = 'aomi-md-callout-title';
    title.dataset.calloutTitle = 'true';
    title.textContent = titleText;

    header.appendChild(icon);
    header.appendChild(title);

    const body = document.createElement('div');
    body.className = 'aomi-md-callout-body';
    body.setAttribute(CALLOUT_BODY_ATTR, 'true');

    if (restText) {
      const paragraph = document.createElement('p');
      paragraph.textContent = restText;
      body.appendChild(paragraph);
    }

    while (blockquote.firstChild) {
      body.appendChild(blockquote.firstChild);
    }

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    blockquote.replaceWith(wrapper);
  });
}

/**
 * Styles callout containers after transformation.
 */
function styleCallouts(container: HTMLElement, options: MarkdownRenderOptions): void {
  const { colors } = options;

  container.querySelectorAll('.aomi-md-callout').forEach((callout) => {
    if (!(callout instanceof HTMLElement)) return;
    callout.style.marginTop = '16px';
    callout.style.marginBottom = '16px';
    callout.style.padding = '16px';
    callout.style.borderRadius = '10px';
    callout.style.border = `1px solid ${colors.calloutBorder}`;
    callout.style.backgroundColor = colors.calloutBackground;
    callout.style.color = colors.text;
    callout.style.fontSize = '12px';
  });

  container.querySelectorAll('.aomi-md-callout-header').forEach((header) => {
    if (!(header instanceof HTMLElement)) return;
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.fontWeight = '600';
    header.style.fontSize = '12px';
    header.style.textTransform = 'uppercase';
    header.style.letterSpacing = '0.08em';
    header.style.color = colors.accent;
    header.style.marginBottom = '8px';
  });

  container.querySelectorAll('.aomi-md-callout-icon').forEach((icon) => {
    if (!(icon instanceof HTMLElement)) return;
    icon.style.fontSize = '16px';
  });

  container.querySelectorAll(`.${MERMAID_CONTAINER_CLASS}`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.marginTop = '20px';
    node.style.marginBottom = '16px';
    node.style.padding = '12px';
    node.style.borderRadius = '8px';
    node.style.backgroundColor = colors.blockBackground;
    node.style.border = `1px solid ${colors.blockBorder}`;
    node.style.overflow = 'hidden';
  });
}

/**
 * Loads mermaid and renders diagrams in markdown content.
 */
function renderMermaidDiagrams(container: HTMLElement, options: MarkdownRenderOptions): void {
  const mermaidNodes = Array.from(
    container.querySelectorAll<HTMLElement>(`.${MERMAID_CONTAINER_CLASS}`),
  );

  if (mermaidNodes.length === 0 || typeof window === 'undefined') {
    return;
  }

  const themeVariables = createMermaidTheme(options.colors);

  getMermaid(themeVariables)
    .then((mermaidApi) => {
      if (!mermaidApi) return;

      mermaidNodes.forEach(async (node) => {
        const encoded = node.dataset.code ?? '';
        const code = decodeURIComponent(encoded);

        if (!code.trim()) {
          node.remove();
          return;
        }

        try {
          const { svg } = await mermaidApi.render(`aomi-mermaid-${hashString(code)}`, code.trim());
          node.innerHTML = svg;
          const svgElement = node.querySelector('svg');
          if (svgElement) {
            svgElement.setAttribute('width', '100%');
            svgElement.style.width = '100%';
            svgElement.style.height = 'auto';
            svgElement.setAttribute('preserveAspectRatio', 'xMinYMin meet');
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          node.innerHTML = '';
          const fallback = document.createElement('pre');
          fallback.textContent = code;
          fallback.style.margin = '0';
          fallback.style.padding = '0';
          fallback.style.background = 'transparent';
          fallback.style.color = options.colors.text;
          fallback.style.fontFamily = options.monospaceFontFamily;
          node.appendChild(fallback);
        }
      });
    })
    .catch((error) => {
      console.error('Failed to initialize mermaid:', error);
    });
}

/**
 * Lazily loads mermaid and applies theme variables.
 */
async function getMermaid(themeVariables: Record<string, string>): Promise<MermaidModule['default'] | null> {
  if (typeof window === 'undefined') return null;

  if (!mermaidPromise) {
    mermaidPromise = import('mermaid')
      .then((module) => module.default)
      .catch((error) => {
        console.error('Failed to load mermaid:', error);
        return null;
      });
  }

  const mermaidApi = await mermaidPromise;
  if (!mermaidApi) {
    return null;
  }

  mermaidApi.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables,
  });

  return mermaidApi;
}

/**
 * Creates theme overrides for mermaid diagrams based on message palette.
 */
function createMermaidTheme(colors: MarkdownColors): Record<string, string> {
  return {
    ...MERMAID_THEME_DEFAULTS,
    primaryColor: colors.blockBackground,
    primaryTextColor: colors.text,
    primaryBorderColor: colors.blockBorder,
    lineColor: colors.border,
    secondaryColor: colors.inlineBackground,
    tertiaryColor: colors.background,
    background: colors.background,
    mainBkg: colors.blockBackground,
    secondBkg: colors.inlineBackground,
    tertiaryBkg: colors.blockBackground,
  };
}

/**
 * Hash helper for stable mermaid IDs.
 */
function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Capitalizes a string.
 */
function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Builds markdown colors for a message bubble based on theme palette and role.
 */
export function buildMarkdownColors(
  baseBackground: string,
  baseText: string,
  accent: string,
  border: string,
): MarkdownColors {
  const luminance = getRelativeLuminance(baseBackground);
  const isLightBackground = luminance > 0.5;

  const inlineBackground = addAlpha(isLightBackground ? '#000000' : '#ffffff', 0.12);
  const blockBackground = mixColors(baseBackground, isLightBackground ? '#000000' : '#0f172a', 0.08);
  const blockBorder = addAlpha(border, isLightBackground ? 0.4 : 0.6);
  const calloutBackground = addAlpha(accent, 0.12);
  const calloutBorder = addAlpha(accent, 0.45);
  const muted = addAlpha(baseText, isLightBackground ? 0.7 : 0.65);
  const accentHover = adjustColor(accent, isLightBackground ? -0.15 : 0.2);

  return {
    text: baseText,
    muted,
    accent,
    accentHover,
    border,
    background: baseBackground,
    inlineBackground,
    blockBackground,
    blockBorder,
    calloutBackground,
    calloutBorder,
  };
}
