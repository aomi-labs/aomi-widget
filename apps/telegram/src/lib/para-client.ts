import Para from '@getpara/web-sdk';

let paraClient: Para | null | undefined;
let telegramOAuthPopupInstalled = false;

type ParaWithPopup = Para & {
  platformUtils?: {
    openPopup?: (url: string, options?: { type?: { toString: () => string } }) => Promise<Window>;
  };
};

function installTelegramOAuthPopup(para: Para) {
  if (telegramOAuthPopupInstalled || typeof window === 'undefined') return;

  const openLink = window.Telegram?.WebApp?.openLink;
  const platformUtils = (para as ParaWithPopup).platformUtils;
  const originalOpenPopup = platformUtils?.openPopup?.bind(platformUtils);
  if (!openLink || !platformUtils || !originalOpenPopup) return;

  platformUtils.openPopup = async (url, options) => {
    const isOAuthPopup = options?.type?.toString() === 'OAUTH' && url === 'about:blank';
    if (!isOAuthPopup) {
      return originalOpenPopup(url, options);
    }

    let href = url;
    let closed = false;
    const popup = {
      get closed() {
        return closed;
      },
      close() {
        closed = true;
      },
      focus() {},
      location: {
        get href() {
          return href;
        },
        set href(nextUrl: string) {
          href = nextUrl;
          openLink(nextUrl);
        },
      },
    };

    // Para polls OAuth completion while holding the popup reference. Telegram
    // opens OAuth URLs through its own API, so this lightweight window shape
    // keeps Para from canceling the flow as soon as the external browser opens.
    return popup as Window;
  };

  telegramOAuthPopupInstalled = true;
}

export function isParaEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PARA_API_KEY?.trim());
}

export function getParaClient(): Para | null {
  const apiKey = process.env.NEXT_PUBLIC_PARA_API_KEY?.trim();
  if (!apiKey) return null;

  if (paraClient === undefined) {
    paraClient = new Para(apiKey);
  }

  if (paraClient) installTelegramOAuthPopup(paraClient);

  return paraClient;
}
