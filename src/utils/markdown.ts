import DOMPurify from 'dompurify';
import { Marked, Renderer } from 'marked';

export interface MarkdownRenderOptions {
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
export function renderMarkdown(
  content: string,
  options: MarkdownRenderOptions,
  doc?: Document,
): HTMLElement {
  const targetDocument = doc ?? (typeof document !== 'undefined' ? document : null);
  if (!targetDocument) {
    throw new Error('Markdown rendering requires a Document context');
  }

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

  const container = targetDocument.createElement('div');
  container.className = 'aomi-markdown';
  container.innerHTML = sanitized;

  applyBaseStyles(container, options);
  styleElements(container, options);

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
  container.style.gap = '0';
}

/**
 * Applies styles to markdown elements.
 */
function styleElements(container: HTMLElement, options: MarkdownRenderOptions): void {
  const { monospaceFontFamily } = options;

  container.querySelectorAll('p').forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    element.className = 'aomi-md-paragraph';
  });

  container.querySelectorAll('a').forEach((anchor) => {
    if (!(anchor instanceof HTMLAnchorElement)) return;
    anchor.className = 'aomi-md-link';
    if (!anchor.getAttribute('target')) {
      anchor.setAttribute('target', '_blank');
    }
    anchor.setAttribute('rel', 'noreferrer');
  });

  container.querySelectorAll('ul').forEach((list) => {
    if (!(list instanceof HTMLElement)) return;
    list.className = 'aomi-md-list aomi-md-list-unordered';
  });

  container.querySelectorAll('ol').forEach((list) => {
    if (!(list instanceof HTMLElement)) return;
    list.className = 'aomi-md-list aomi-md-list-ordered';
  });

  container.querySelectorAll('li').forEach((item) => {
    if (!(item instanceof HTMLElement)) return;
    item.className = 'aomi-md-list-item';
  });

  container.querySelectorAll('pre').forEach((block) => {
    if (!(block instanceof HTMLElement)) return;
    block.className = 'aomi-md-code-block';
    block.style.overflowX = 'auto';
    block.style.fontFamily = monospaceFontFamily;

    const code = block.querySelector('code');
    if (code instanceof HTMLElement) {
      code.className = 'aomi-md-code-block-content';
      code.style.fontFamily = monospaceFontFamily;
      code.style.display = 'block';
      code.style.whiteSpace = 'pre';
    }
  });

  container.querySelectorAll('code').forEach((inline) => {
    if (!(inline instanceof HTMLElement)) return;
    if (inline.parentElement?.tagName === 'PRE') return;
    inline.className = 'aomi-md-code-inline';
    inline.style.display = 'inline';
    inline.style.fontFamily = monospaceFontFamily;
  });

  container.querySelectorAll('blockquote').forEach((blockquote) => {
    if (!(blockquote instanceof HTMLElement)) return;
    blockquote.className = 'aomi-md-blockquote';
  });

  styleHeadings(container);
  styleTables(container);

  container.querySelectorAll('hr').forEach((divider) => {
    if (!(divider instanceof HTMLElement)) return;
    divider.className = 'aomi-md-hr';
    divider.style.border = 'none';
  });

  container.querySelectorAll('img').forEach((image) => {
    if (!(image instanceof HTMLImageElement)) return;
    image.className = 'aomi-md-image';
    image.style.maxWidth = '100%';
  });
}

/**
 * Styles headings.
 */
function styleHeadings(container: HTMLElement): void {
  container.querySelectorAll('h1').forEach((heading) => {
    if (!(heading instanceof HTMLElement)) return;
    heading.className = 'aomi-md-heading aomi-md-heading-1';
  });

  container.querySelectorAll('h2').forEach((heading) => {
    if (!(heading instanceof HTMLElement)) return;
    heading.className = 'aomi-md-heading aomi-md-heading-2';
  });

  container.querySelectorAll('h3').forEach((heading) => {
    if (!(heading instanceof HTMLElement)) return;
    heading.className = 'aomi-md-heading aomi-md-heading-3';
  });
}

/**
 * Wraps and styles tables.
 */
function styleTables(container: HTMLElement): void {
  container.querySelectorAll('table').forEach((table) => {
    if (!(table instanceof HTMLTableElement)) return;

    if (!table.parentElement?.classList.contains('aomi-md-table-wrapper')) {
      const wrapper = container.ownerDocument?.createElement('div');
      if (!wrapper) return;
      wrapper.className = 'aomi-md-table-wrapper';
      wrapper.style.overflowX = 'auto';

      table.parentElement?.replaceChild(wrapper, table);
      wrapper.appendChild(table);
    }

    table.className = 'aomi-md-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    table.querySelectorAll('thead').forEach((thead) => {
      if (!(thead instanceof HTMLElement)) return;
      thead.className = 'aomi-md-table-head';
    });

    table.querySelectorAll('tbody').forEach((tbody) => {
      if (!(tbody instanceof HTMLElement)) return;
      tbody.className = 'aomi-md-table-body';
    });

    table.querySelectorAll('th').forEach((cell) => {
      if (!(cell instanceof HTMLElement)) return;
      cell.className = 'aomi-md-table-cell aomi-md-table-header';
      cell.style.textAlign = 'left';
    });

    table.querySelectorAll('td').forEach((cell) => {
      if (!(cell instanceof HTMLElement)) return;
      cell.className = 'aomi-md-table-cell aomi-md-table-data';
    });
  });
}
