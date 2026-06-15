// Single source of truth for the onboarding deploy platform name.
//
// The browser-side GitHub App OAuth start decides which platform the install is
// registered against, while the server-side BFF (create-from-template /
// sources/resolve / deploy / activate) decides which platform those calls
// target. If the two disagree, the install lands on one platform but the source
// can't be resolved under the other and the deploy silently fails. They must
// resolve to the same value, so both call sites go through this helper.
//
// `NEXT_PUBLIC_AOMI_DEPLOY_PLATFORM` is canonical because it is the only form
// the browser can read (Next.js inlines it at build time). `APP_DEPLOY_PLATFORM`
// is kept as a server-only fallback for back-compat; in the browser bundle it is
// replaced with `undefined`, so the chain collapses to the public var there.
export function resolveDeployPlatform(): string {
  return (
    process.env.NEXT_PUBLIC_AOMI_DEPLOY_PLATFORM ||
    process.env.APP_DEPLOY_PLATFORM ||
    "community"
  );
}
