import Para from '@getpara/web-sdk';

let paraClient: Para | null | undefined;

export function isParaEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PARA_API_KEY?.trim());
}

export function getParaClient(): Para | null {
  const apiKey = process.env.NEXT_PUBLIC_PARA_API_KEY?.trim();
  if (!apiKey) return null;

  if (paraClient === undefined) {
    paraClient = new Para(apiKey);
  }

  return paraClient;
}
