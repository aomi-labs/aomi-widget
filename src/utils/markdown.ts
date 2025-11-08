import DOMPurify from 'dompurify';
import { Marked, Renderer } from 'marked';
import { addAlpha, adjustColor, getRelativeLuminance, mixColors } from './color-utils';

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
}

export interface MarkdownRenderOptions {
  colors: MarkdownColors;
  fontFamily: string;
  monospaceFontFamily: string;
}

const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'hr', 'i',
  'img', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul',
];

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
    ADD_ATTR: ['target', 'rel'],
  });

  const container = document.createElement('div');
  container.className = 'aomi-markdown';
  container.innerHTML = sanitized;

  applyBaseStyles(container, options);
  styleElements(container, options);
  normalizeBlockSpacing(container);

  return container;
}

/**
 * Creates a marked renderer.
 */
function createRenderer(): Renderer {
  return new Renderer();
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
  container.style.lineHeight = '1.7';
  container.style.gap = '0';
}

/**
 * Applies styles to markdown elements.
 */
function styleElements(container: HTMLElement, options: MarkdownRenderOptions): void {
  const { colors, monospaceFontFamily } = options;

  container.querySelectorAll('p').forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    element.style.marginTop = '20px';
    element.style.marginBottom = '16px';
    element.style.fontSize = '13px';
    element.style.lineHeight = '1.7';
    element.style.color = colors.text;
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
    block.style.borderRadius = '6px';
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
    blockquote.style.marginTop = '16px';
    blockquote.style.marginBottom = '16px';
    blockquote.style.marginLeft = '12px';
    blockquote.style.padding = '12px 16px';
    blockquote.style.borderLeft = `2px solid ${colors.border}`;
    blockquote.style.backgroundColor = colors.inlineBackground;
    blockquote.style.borderRadius = '6px';
    blockquote.style.color = colors.muted;
    blockquote.style.fontSize = '12px';
  });

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
      'h1, h2, h3, p, ul, ol, pre, blockquote, table, hr',
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
  };
}
