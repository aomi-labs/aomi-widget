const LOCAL_WIDGET_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function observedWidgetOrigin(
  request: Request,
  nodeEnv = process.env.NODE_ENV,
): string | null {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin || rawOrigin === "null") return null;
  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return null;
  }
  if (origin.origin !== rawOrigin) return null;
  if (origin.protocol === "https:") return origin.origin;
  if (
    nodeEnv !== "production" &&
    origin.protocol === "http:" &&
    LOCAL_WIDGET_HOSTS.has(origin.hostname)
  ) {
    return origin.origin;
  }
  return null;
}

export function widgetOriginDomain(origin: string): string {
  return new URL(origin).host;
}
