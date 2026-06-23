export function defaultBackendUrl(): string {
  if (process.env.VERCEL_ENV === "preview") {
    return "https://api-staging.aomi.dev";
  }
  if (process.env.VERCEL_ENV === "production") {
    return "https://api.aomi.dev";
  }
  return "http://127.0.0.1:8080";
}

export function configuredBackendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    defaultBackendUrl()
  ).replace(/\/+$/, "");
}
