<!--
Aomi Research post — auth-across-two-worlds
slug: auth-across-two-worlds
tag: engineering
Figures live in public/research/auth-across-two-worlds/figures/ and are referenced
by absolute path so the shared renderer serves them without slug-specific rewrites.
Code samples are architectural pseudocode; they deliberately avoid internal package,
table, env, and endpoint names.
-->

# One User, Many Wallets: Authentication Across the Onchain–Offchain Boundary

*A design study in authentication for applications that straddle the chain: why "how many users do we have?" is a surprisingly hard question, the four proofs a hybrid system has to keep separate, and the patterns that hold them apart — with the stack we settled on at Aomi as the running example.*

Start with a question every product team assumes is trivial: **how many users do you have?**

An offchain application answers it with one query against its users table. A crypto application usually cannot. What it has is addresses, and an address is not a person. One person shows up as a MetaMask EOA, an embedded wallet minted by a provider, a smart account owned by the first address, and a Solana account in a different key format. And the mapping drifts — wallets get created, imported, rotated, abandoned, and replaced, and nobody tells your database.

If counting were only an analytics problem, you could shrug it off. It isn't, because almost everything an application does offchain keys off "user":

- **Continuity.** Recognize the returning person — same history, same settings, same entitlements — even when they arrive on a new device with a different wallet connected. Users experience a failure here as amnesia: "I was here yesterday, why does the app not know me?"
- **Limits and quotas.** Rate limits, free tiers, and usage metering have to be per person. Addresses are free to mint, so a per-address limit is a 10× coupon for anyone willing to click "new wallet" ten times.
- **Billing.** You cannot invoice an address — and you especially cannot invoice five of them separately for what is one customer.
- **Abuse, support, recovery.** Fraud signals, bans, "I lost my wallet" tickets — all of it needs a person-level root that survives any single key.

![Figure 1 — The counting problem: one person spans many addresses, and the mapping drifts.](/research/auth-across-two-worlds/figures/f00_users_vs_addresses.svg)

**Figure 1 — The counting problem.** One person spans several wallets — external, embedded, smart, rotated, abandoned — and the mapping changes without anyone telling your database. Every per-user question — counting, limits, history, billing — is unanswerable until the application owns an account object of its own.

For us the forcing function was sharper still. Aomi runs conversations and prepares transactions server-side: every request burns model tokens, RPC calls, and fork simulations, and the end of a session can be a signed transaction. Metering that per address is meaningless. Authorizing it per address is dangerous. Somewhere between "how many users do we have?" and "may this signer approve this action?" an analytics annoyance turns into a security requirement — and the missing object is the same in both cases: the user.

The tension underneath is that a hybrid application inherits two identity systems that were never designed to line up. Onchain identity is a keypair: permissionless, pseudonymous, free to create, impossible to recover. Offchain identity is an account: issued by the application, recoverable, countable, attached to state. The tempting fixes collapse one into the other. The wallet address becomes the user id. The wallet provider's access token becomes the session. One JWT gets reused for login, backend access, and signing. "The connected wallet" is whichever address a React hook reported most recently. Each of these holds together while the app has one provider, one chain, one wallet, and no server-side execution — and falls apart the moment a real user shows up with an external EVM wallet *and* an embedded one, a Solana account next to an Ethereum one, a smart account, a second login method, or an agent preparing transactions on their behalf.

Our answer, condensed to one rule:

> **A wallet is not a user, a provider is not the identity root, and a session is not a signing grant.**

The rest of this post walks that rule outward. Section 2 lays out a small framework — the four different proofs hiding inside "sign in with a wallet." Sections 3 through 8 turn it into six patterns that apply to any hybrid application regardless of stack, each stated generally first and then grounded in our own implementation: Better Auth for sessions, a backend-for-frontend, a Rust backend, Privy and Para as embedded-wallet providers. Section 9 catalogues every token in the system, and Section 10 explains why we picked that particular stack and what you could swap without losing the properties.

## 1. What "sign in with a wallet" actually asks

Before the framework, it is worth being precise about why wallet login feels deceptively complete. A signature from a wallet is real cryptographic evidence — it proves control of a key at a moment in time. The mistake is treating that one proof as an answer to every identity question an application has.

An agentic or execution-capable application has to answer at least these, separately: Which account is this person? Is this still the same session as an hour ago? Which addresses belong to that account? Which address should act on this chain right now? And may this particular signer approve this particular action? A wallet signature answers the first question weakly and the rest not at all. Those questions sit side by side in a wallet picker, and they are not the same security question.

## 2. A framework: four proofs, two planes

"Sign in with a wallet" is at least four operations, with different lifetimes, different verifiers, and different blast radii when stolen.

**Table 1 — The four proofs a hybrid application must keep separate.**

| Proof | Question it answers | Typical evidence | What it does **not** prove |
|---|---|---|---|
| Login proof | Did the user satisfy a login method just now? | SIWE signature, provider JWT, passkey, email link | A permanent person-level identity |
| First-party session | Is this still the same authenticated session? | HttpOnly session cookie or opaque session token | Control of every linked wallet |
| Wallet association | Is this address linked to this account? | SIWE proof, provider-side wallet attestation | Permission to sign every future action |
| Execution authority | May this signer approve this class of action? | Interactive approval, delegated provider grant | The user's global application identity |

A login proof is short-lived and method-specific. A session is application-specific and should outlive any one login provider. A wallet association stays useful long after the login ceremony that discovered it has ended. And an execution grant can be far narrower than the wallet itself: one provider, one address, one chain family, one expiry, one signer mode.

We found it useful to arrange these on two planes. The **identity plane** consumes login proofs, resolves account linking, and emits one stable user id — it answers who. The **execution plane** manages wallets and authority: which addresses exist, which one is active per chain family, whether a wallet signs interactively or through a provider, and which delegated approvals are still valid — it answers what a wallet may do. The planes meet at the canonical user id, and nowhere else.

![Figure 2 — Four proofs across the identity and execution planes, meeting at one canonical user id.](/research/auth-across-two-worlds/figures/f01_four_proofs.svg)

**Figure 2 — Four proofs, two planes.** Login proves a credential, the first-party session preserves continuity, a wallet attestation associates an address, and a signing grant authorizes one execution path. The identity plane answers who the user is; the execution plane answers what a wallet may do.

One subtle consequence: the same vendor can appear in both planes without doing the same job. An embedded-wallet provider's token used at the edge answers "which account does this credential belong to?" A provider connection created later answers "how can this wallet authorize an action?" Same vendor, different proof, different lifetime, different verifier.

The common shortcuts are attractive precisely because each deletes one of these layers:

1. **Use the wallet address as the user id.** A second wallet now looks like a second person, and rotating a wallet becomes an account migration.
2. **Pass the provider JWT to every backend service.** Every service is now coupled to every provider's issuer, key format, claims, outages, and deprecation schedule.
3. **Put everything in one long-lived JWT.** Login continuity, backend access, wallet selection, and signing collapse into a single replayable credential with an oversized blast radius.
4. **Assume the currently connected address is the intended signer.** Multi-connector sessions, EVM/SVM coexistence, embedded wallets, and smart accounts make "current" an unstable concept.
5. **Treat a successful provider fetch as the only truth.** A transient outage now looks like the provider deleted every wallet.

The six patterns below add boundaries instead of removing them. The extra boundaries are what make the system possible to reason about.

## 3. Own your identity root

> Mint your own user id — a boring, application-owned identifier — and treat every external identity as a *signal attached to it*: wallet addresses, provider subjects, verified emails, session records. Nothing you do not issue can be the root, because anything you do not issue can be rotated, revoked, or taken away by someone else's outage, migration, or deprecation.

This is the move that answers the counting question directly. Users become countable because the application finally has a row per person. Limits, billing, and history hang off that row. A user who arrives through a wallet signature, later adds a provider login, then switches providers does not become three people — and if a provider has an outage, the account still exists.

It also turns abuse economics right-side up. Once limits hang off the account instead of the address, they can be tiered by *identity strength*: a wallet-only account gets a conservative free tier, and linking a verified email or phone raises it — because every added factor raises the cost of manufacturing another account. Sybil resistance stops being a binary gate and becomes a pricing curve. The session layer's position pays off here too: because every login terminates in one framework, fleet-level abuse tooling plugs in at exactly one place. Better Auth's [Sentinel](https://better-auth.com/docs/infrastructure/plugins/sentinel) plugin, for example, adds signup and sign-in velocity limits per IP and visitor, device fingerprinting that catches one machine farming "different" free accounts, email normalization that collapses alias tricks into a single identity, and bot and credential-stuffing defenses — all upstream of the account graph, not reimplemented per service. For a product whose requests are genuinely expensive to serve — ours burn model tokens, RPC calls, and simulations — this is the difference between rate-limiting people and rate-limiting whoever bothered to mint a fresh address.

In our implementation, the account model is a graph with three classes of node: the **canonical user** (the stable Aomi-owned id), **authentication identities** (Better Auth user references, SIWE identities, Privy and Para subjects, verified emails), and **wallets** (external, embedded, or smart-account addresses, tagged by chain family, provider, provenance, and status). A fourth class — execution approvals — belongs to the execution plane and is linked later.

![Figure 3 — The canonical account graph: login identities above, wallets below, execution approvals attached separately.](/research/auth-across-two-worlds/figures/f02_account_graph.svg)

**Figure 3 — The canonical account graph.** Login factors and wallet resources attach to one application-owned user. Provider subjects are credential keys, wallet addresses are resources, and execution approvals are separate capability records that reference — but never replace — the canonical id.

The resolver can use any verified signal to find an existing user: a session mapping, a provider subject, a verified email, a previously proven wallet. It creates a new canonical user only when nothing resolves. Two rules keep the graph trustworthy:

**Uniqueness is a security invariant.** A provider identity, verified email, or normalized wallet address must never silently move between accounts. For each verified signal there are exactly three outcomes: unclaimed (attach it), already attached here (no-op), attached elsewhere (conflict — roll back). That turns ambiguous identity evidence into an explicit support case instead of an accidental account takeover. Linking is transactional: if a provider subject belongs to one user but one of its attested wallets already belongs to another, the exchange fails and the graph stays untouched.

**A linked wallet is not a login root.** External wallets link through a SIWE-style challenge binding user, address, chain, domain, nonce, and time — signature recovery for EOAs, an onchain or deployless check for smart accounts, since not every valid wallet has a recoverable secp256k1 signer behind it. Embedded wallets link through a server-verified provider attestation instead, and the record is marked with that provenance so it is never confused with a signature-proven link. The account stays stable across wallet types; the wallet record stays honest about how it got there.

One positioning decision matters more than any library choice: the session framework sits *in front of* the account graph, never inside it. Better Auth handles what session systems are good at — cookies, rotation, expiry, sign-out, login-method plugins — and when a session resolves, we map its user reference to the canonical id. That id, never the session record and never a provider DID, is what the rest of the system sees. It makes the session layer replaceable, which is exactly the property an identity root should force on everything around it.

## 4. Verify at the edge, normalize after

> Every external credential gets verified according to *its own* cryptographic contract, at the edge, before anything else touches it — and only verified claims get normalized into a common internal shape. The order matters: normalize after verification, never before. An unverified claim is input, not identity.

The anti-pattern is a generic "decode JWT" helper that treats all vendor tokens alike. Different providers pin different things — one a fixed verification key and issuer, another a JWKS lookup with key-id and audience checks — and a helper that papers over the differences will eventually accept something it should not.

In practice, the frontend presents several login surfaces — SIWE from an external or smart-account wallet, a Privy token, a Para session JWT, a plain email flow. The browser can *acquire* those proofs; it cannot declare them valid. Every lane converges server-side:

![Figure 4 — SIWE, Privy, and Para login lanes converge through normalization and transactional linking into one first-party session.](/research/auth-across-two-worlds/figures/f03_login_lanes.svg)

**Figure 4 — Three ceremonies, one session.** Provider-specific verification is isolated at the edge. After verification, each lane emits the same normalized identity and wallet signals, which are linked transactionally before a session is created. Raw provider tokens never travel past this boundary.

For a Privy token, the verifier pins algorithm, verification key, issuer, audience, expiry, and required claims. For a Para session JWT, it resolves the signing key from a JWKS, checks the key id, and validates algorithm, audience, expiry, and subject. In both cases the raw token is never the user id, is never forwarded deeper into the system, and never appears in logs. After verification, every adapter emits the same shape:

![Code 1 — VerifiedCredential: the normalized shape every provider adapter emits.](/research/auth-across-two-worlds/figures/code1_verified_credential.svg)

**Code 1.** The normalization seam keeps provider-specific claim names, wallet nesting, and API conventions out of the account graph. A provider can populate this from more than one source — token claims as a low-latency fallback, a server-side API for a fresher wallet list — merged and deduplicated by chain family and normalized address.

The exchange itself is intentionally boring:

![Code 2 — the provider exchange: verify, then link transactionally, then create the session.](/research/auth-across-two-worlds/figures/code2_provider_exchange.svg)

**Code 2.** Verification happens before mutation, linking happens in one transaction, and the session is created only after the graph is coherent.

One reconciliation rule deserves emphasis because so many systems get it wrong: **an outage is not a revocation.** Provider wallet lists change — users create, import, archive, and remove embedded wallets — and the graph needs to converge without turning an upstream incident into mass deletion. So reconciliation is monotonic: upsert every attested wallet, and only after a *successful* provider read, soft-revoke previously attested wallets from that same provider that are no longer present. If the fetch fails, existing links stay untouched. A Privy sync cannot touch a Para wallet, and no embedded-wallet sync can remove a signature-proven external wallet. "The provider returned no wallets" and "we could not ask the provider" are different facts.

## 5. Broker identity across the service boundary

> Do not let your session format leak into your backend services. Terminate the session at one edge service, and have that service mint a small, short-lived, audience-bound assertion for everything behind it. The backend verifies the assertion and stays ignorant of how the user logged in.

Another token is justified only when it removes more coupling than it adds; here it removes a lot. Without the broker, every backend service parses session cookies, depends on the session store, understands provider fallback flows, and changes whenever the login stack changes. With it, the backend needs one stable contract:

> "A trusted first-party issuer states that canonical user `sub` is making this request for audience `aud`, under role `role`, until `exp`."

The frontend stays free to change login providers. The backend stays free to change language or framework. The contract between them is one small signed object.

Concretely, the broker is a backend-for-frontend next to the web app; the consumer is a Rust backend that has no idea whether the user arrived through SIWE, Privy, Para, or an email link. The assertion, in full:

**Table 2 — The backend assertion.**

| Field | Meaning |
|---|---|
| `sub` | Stable canonical user id |
| `iss` | Identity of the issuing BFF |
| `aud` | Identity of the backend that may accept it |
| `role` | Principal kind: user, service, or admin |
| `iat` / `exp` | Issuance time and a short expiry — minutes, not days |
| `kid` header | Public-key selector for rotation and multiple issuers |

No provider tokens, no wallet secrets, no account graph — those facts have different lifetimes and do not belong frozen inside a service identity token. The browser session can live for days because it is first-party and revocable; the assertion is re-minted from a valid session as needed.

In the default web path the browser never even holds the assertion. It calls a same-origin route with its HttpOnly cookie, and the BFF matches an explicit route allowlist, resolves the session to the canonical user, mints the assertion, **discards incoming cookies and any client-supplied authorization header**, injects its own `Authorization: Bearer`, and streams the response.

![Figure 5 — The BFF converts a browser session into a server-injected backend assertion; no client credential crosses the boundary.](/research/auth-across-two-worlds/figures/f04_bff_boundary.svg)

**Figure 5 — The credential-changing boundary.** The session cookie never crosses into the backend, and the browser cannot choose the backend identity header. The private signing key lives only in the BFF; the backend holds only public verification keys. Provider tokens stop one hop earlier still.

This does more than hide a JWT from JavaScript: it makes it impossible for a client to smuggle an arbitrary bearer through the proxy, and it guarantees the backend sees identity only when the broker has resolved a real session. Clients that cannot use a same-origin proxy — a CLI, an embedded host — obtain the same short-lived assertion through an authenticated flow and carry it directly; only the transport changes, and the exposure is larger, which is why proxy injection stays the preferred web path.

The whole handoff, end to end:

![Figure 6 — one request end to end: each step changes credential type.](/research/auth-across-two-worlds/figures/f09_credential_pipeline.svg)

**Figure 6 — One request, end to end.** Every arrow changes credential type. That is the point — reusing one credential across all five steps would erase the trust boundaries between them.

## 6. Make verification boring and fail-closed

> Verification should be a chain of small, independent checks where any failure is a hard rejection — and the verifier should be structurally unable to mint what it verifies. Key material is architecture: give the issuer the private key and the verifier only public keys, and "the backend cannot impersonate users" stops being a convention and becomes a physical fact.

![Figure 7 — The backend verification chain: seven independent checks, each with a hard rejection exit, ending in typed context.](/research/auth-across-two-worlds/figures/f05_verification_chain.svg)

**Figure 7 — Verification is a chain, and every link can fail.** A recognized key id is only a search hint. Signature, issuer, audience, expiry, issuer role policy, and the route's required role must all pass independently before `sub` becomes authenticated context.

Two details generalize beyond our stack. First, the untrusted `kid` header only *selects candidate keys* — it narrows a search, it grants nothing. Second, roles are constrained per issuer: each trusted issuer is configured with the roles it may assert, so a frontend issuer trusted for `user` cannot sign a syntactically perfect token claiming `admin` and have it accepted. The signature is fine; the *permission to make that claim* is not.

In our stack, the Rust backend registers every route with explicit, composable auth classes — which turns authentication from a middleware convention into a property of route construction:

**Table 3 — Backend auth classes.**

| Class | Requires | Resolves |
|---|---|---|
| Public | Nothing | No authenticated context |
| Thread | Thread/session identifier | Conversation or runtime thread context |
| Account | User-role assertion | Canonical user and account context |
| App gate | Valid application key for private apps | App entitlement |
| Service | Service-role assertion | Trusted service principal |
| Admin | Admin-role assertion | Human operator principal |

A chat route requires `Thread + Account + App gate`; a profile route only `Account`; a service callback only `Service`. Composition is AND. The property that matters is structural: adding a route *forces* choosing its auth class — there is no informal path list that can drift away from the router, and no handler that silently assumes middleware ran. A thread id identifies a conversation; an app key grants an entitlement; neither identifies the person. Keeping the dimensions separate is what lets policy be precise: the right user on the wrong thread fails, and the right user without the entitlement fails. Auth is a vector, not a Boolean.

## 7. Wallets are a registry, not a variable

> Model wallets as a registry of durable records with explicit state — not as "the connected address," a mutable global that happens to hold whatever a frontend hook last reported. A registry can represent what is actually true: many wallets known to the account, a subset live in the current client, and exactly one active per chain family.

![Figure 8 — The multi-wallet registry: many known wallets, one active wallet per chain family, live and stored states kept distinct.](/research/auth-across-two-worlds/figures/f06_wallet_registry.svg)

**Figure 8 — Durable ownership versus current selection.** The account can know many wallets while the client picks one active wallet independently per family. Selecting a Solana wallet does not touch the active EVM wallet, and connecting MetaMask does not erase an embedded wallet from the graph. Changing the active wallet never changes the authenticated user.

Our registry distinguishes three states — **live** (attached through a connector, can act now), **stored** (linked to the account, useful for history and labels, cannot sign until reconnected), and **connectable** (brands and methods the user could activate). The picker renders one list, but every row carries capability and provenance instead of provider-specific branches: which chain family, external or embedded or smart, which provider manages it, how it was linked, what it can do (read, sign, send, display), and whether its association is live, revoked, or stale. That kills a recurring anti-pattern — deriving security policy from a display label like "Privy wallet." Labels are presentation; provenance and capability are state.

The registry earns its keep at execution time. When an action needs a signature, the resolver does not ask for "the user's Privy wallet" and take the first match. It resolves a grant by canonical user, provider, chain family, **exact operating address**, and an active approval — EVM matching normalized, Solana matching exact — and fails if no grant yields the requested address. In a system where the server prepares transactions, this check is not optional: the transaction may target one wallet while several are linked, and "first available" is not a selection policy, it is a bug with a settlement layer.

Smart accounts fit without special cases: account abstraction adds an owner address, a smart-account address, and sometimes a delegated authorization address, and all of them can matter to execution — but none replaces the canonical user. An account can move from an EOA path to a 4337 or 7702 path without becoming a new person.

## 8. Login is not signing

> Authenticating *with* a wallet provider and executing *through* one are different flows with different proofs, and a user can have either without the other.

A **login flow** verifies a provider-issued credential and attaches the subject and attested wallets to the account. A **connection flow** establishes an operational grant a signer runtime can use later — wallet id, session material, policy, expiry. Logged in through Privy but executing through MetaMask is a perfectly coherent state; so is holding a Para wallet whose every signature stays interactive in the browser.

In our system, connection flows leave the application and come back through a callback, so the callback needs cryptographic context. Before redirecting, the backend mints a short-lived state token binding the runtime thread, the canonical user, the requested provider, the application scope, and an expiry. The provider name lives *inside* the signed state — the callback cannot switch adapters by editing an unsigned query param.

![Figure 9 — The provider connection ceremony: signed state protects the redirect round-trip before any approval is persisted.](/research/auth-across-two-worlds/figures/f08_connection_ceremony.svg)

**Figure 9 — The connection ceremony.** Signed state travels out with the redirect and is verified before anything else on the way back — the adapter is selected from the verified state, never from the request, and only a fully verified callback is normalized into a revocable execution grant. The state token protects one round-trip; it is not a session and it is not a signing grant.

The signer layer uses one provider abstraction with four responsibilities:

![Code 3 — the provider interface: four responsibilities, one shape.](/research/auth-across-two-worlds/figures/code3_wallet_provider.svg)

**Code 3.** The shared driver owns state verification and persistence; the provider owns its login URLs, callback interpretation, credential slots, and signing transport. Persistence never needs to know whether a provider called a field `wallets`, `linked_accounts`, or nested it inside a JWT claim.

The abstraction unifies *shape*, not *authority*:

**Table 4 — Provider capabilities in the current architecture.**

| Dimension | Privy | Para |
|---|---|---|
| Login/link proof | Identity or access token | Session JWT |
| Key verification | Pinned provider key, expected claims | Remote JWKS with key-id and audience checks |
| Wallet discovery | Verified token + server-side lookup | Signed JWT wallet claims + optional server checks |
| EVM and SVM association | Supported | Supported |
| Server-side delegated signing | Supported with the required signer authorization | Not exposed through the current server path |
| Interactive browser signing | Separate client path | Primary execution path |

A provider that cannot safely sign server-side returns "unsupported" — it does not emulate success or leak a browser session into the backend. **Provider-neutral core does not mean capability-neutral providers.**

The same discipline bounds what an agent can do. Provider credential material is resolved through a narrow signer interface: the agent sees wallet candidates, capabilities, approval status, and transaction results — never access tokens, never raw secret maps, and nothing that could be serialized into model context or logs. Delegation does not hand the agent a pen. The execution path keeps its gates — authenticated account, authorized route and app, exact-address grant match, provider mode support — and policy, simulation, and guards can still reject the action. The agent decides that an action *needs* a wallet; it never gains the unilateral ability to sign an arbitrary payload.

### The payoff: execution that outlives the session

The reason to keep these flows separate is not tidiness — it is that they have different lifetimes. A session ends when the user closes the tab. A standing grant does not, and that is what makes unattended work possible. A user can tell the agent to do something *later* — a one-shot task for tomorrow morning, a recurring check every day — and a scheduler will spawn the run with nobody present: no browser, no session, no signature prompt to click.

What authorizes that run is deliberately narrow. Two independent axes must both hold:

- **Policy.** The operating wallet's signing mode must be explicitly set to autonomous — and the backend refuses to even offer that change unless the wallet is provider-managed and already holds an active delegated approval, so the policy axis can never be loosened ahead of the capability axis. The flip itself is a ceremony: a short-lived, replay-protected permit signed *by that wallet* while the user is present (EIP-712 on EVM, a wallet-standard signed message on Solana). Loosening authority always traces back to the key being loosened — a sibling wallet on the same account cannot escalate it, and the agent cannot self-grant it. Tightening is deliberately easier: any key on the account can sign a lockdown.
- **Capability.** An active, unexpired delegated approval from the connection ceremony above — revocable at any time, at most one active per provider identity, with its secrets resolved from a vault only at the moment of signing.

At sign time the resolver runs the same match it runs for an interactive request — user, provider, chain family, exact address, active grant — and the provider executes the signature server-side under the application's provider authorization key (in our stack, Privy's quorum-key authorization; the user's permit never signs a transaction, it only flips the policy row). If either axis is missing, the run fails closed: a wallet whose mode still requires a human simply cannot sign unattended, and the job stalls and retries rather than falling back to a weaker path. Crucially, the authority is the user's own standing grant, never a service credential — the scheduler has no signing power of its own to escalate.

![Figure 10 — Unattended execution: a scheduled run signs only when the policy axis and the capability axis both hold.](/research/auth-across-two-worlds/figures/f10_unattended_execution.svg)

**Figure 10 — Unattended execution.** A scheduled task fires with no user in the session. It can sign only if two independently granted axes agree — the wallet's signing mode (set by a user-present, wallet-signed permit) and an active delegated approval — resolved through the same exact-address match as any interactive request. Anything less fails closed.

The bounds today are the grant's expiry, its revocability, and the user-present permit gating the mode change. Binding grants to per-action budgets and spend limits is the natural next tightening — and the grant record is exactly the seam where those controls belong.

## 9. A field guide to the tokens

By this point the system contains several signed or opaque artifacts, and calling all of them "the auth token" would make the design impossible to audit. The inventory:

**Table 5 — Credential and capability taxonomy.**

| Artifact | Issuer | Verifier | Purpose | Lifetime |
|---|---|---|---|---|
| SIWE message + signature | User's wallet | BFF | Prove control of an address | One ceremony |
| Privy/Para provider token | Wallet provider | BFF adapter | Prove provider subject, attest wallets | Provider-defined, short |
| Better Auth session | First-party auth service | BFF | Preserve login continuity | Days, revocable |
| Backend account assertion | BFF signing key | Rust backend | Assert canonical user and role | Minutes |
| Provider connection state | Backend | Callback driver | Protect one redirect round-trip | Minutes to an hour |
| Delegated approval | Application/provider policy | Signer runtime | Authorize one execution path | Policy-defined, revocable |
| Signing-mode permit | User's wallet | Backend policy layer | Loosen or tighten a wallet's autonomy | Minutes, replay-protected |
| Thread id | Runtime | Runtime | Select conversation state | Runtime-defined |
| Application key | Platform | Backend app gate | Grant app entitlement | Revocable |

![Figure 11 — Credential lifetimes on one time axis: proofs are consumed in minutes, sessions live for days, and only the short-lived assertion crosses into the backend.](/research/auth-across-two-worlds/figures/f07_credential_lifetimes.svg)

**Figure 11 — Different artifacts, different clocks.** Provider proofs are consumed at the edge in one ceremony, sessions preserve login for days, backend assertions live for minutes, state tokens protect a single redirect, and delegated approvals run on policy time. Exactly one artifact crosses the BFF–backend trust boundary.

Three naming rules kept this table honest, and they transfer to any stack. Name a credential after the authority it carries, not its serialization — "backend account assertion" says more than "JWT." Include the verifier in the design — a token with no intended verifier tends to spread. And define what each artifact *cannot* authorize — negative scope is part of the contract.

## 10. Why this particular stack

The patterns are stack-agnostic; the stack is where we spent our tradeoff budget. For each choice, what we picked, why, and what you could swap.

**A session framework in front of the graph — Better Auth.** Session mechanics — cookie flags, rotation, device sessions, sign-out, CSRF — are commodity engineering with expensive failure modes, so we rent them. The non-negotiable was topology, not vendor: the framework sits in front of the account graph, and its user record maps to our canonical id rather than being it. Better Auth's plugin model let SIWE and provider exchanges attach as ordinary login methods. Swap freely: any session library with the same position in the diagram preserves the architecture.

**A BFF as the identity broker.** Something has to be the credential exchange point, and the BFF is the natural place for three reasons at once: same-origin HttpOnly cookies want to live next to the web app; the assertion signing key wants to exist in exactly one service; and backend services want one small contract instead of a session dependency. An API gateway could play the role; what cannot be swapped away is the *existence* of a single, reviewable exchange point.

**Ed25519 JWTs for the assertion.** The issuer is TypeScript and the verifier is Rust, so the token is effectively a cross-language protocol — which argues for a small, rigid contract: one modern signature scheme with no algorithm-negotiation footguns, tiny keys, a `kid` header for rotation, and fixture tests in both directions (a token minted by the production issuer must verify in the backend library; wrong audience, issuer, expiry, role, and key id must each fail independently). We load trusted keys from deployment-controlled configuration for deterministic startup; a JWKS endpoint can be added later without changing the token contract.

**A backend that verifies and cannot mint.** Keeping the Rust backend ignorant of the login stack is a feature, not an accident: it holds only public keys, so a compromised verifier cannot impersonate its issuer, and no frontend auth migration has ever required a backend deploy. The typed route classes (Section 6) are the other half — identity arrives as one small object, so policy can be declared where routes are constructed.

**Two embedded-wallet providers behind one adapter seam.** Users arrive with preferences, and providers genuinely differ — one exposes server-side delegated signing, the other keeps signatures interactive. Running two from day one forced the adapter seam to be real rather than aspirational, and the seam is also vendor insurance: any single provider's outage, pricing change, or deprecation is a credential swap at the edge, not an identity rewrite.

## 11. Closing

Come back to the opening question: how many users do you have? In this architecture it has a boring answer — count the canonical accounts — and the boring answer is the achievement. Rate limits meter people instead of addresses. History follows the person across wallets, providers, and devices. And when a transaction request arrives, the system can say exactly which user, which wallet, which provider path, and which grant authorized it.

The general lesson is about preserving meaning across boundaries. A provider token means a provider verified a subject. A session means the application still recognizes a login. A canonical user id means history and ownership have a stable root. A wallet association means an address belongs in the graph. An active wallet means the client selected an execution context. A delegated approval means one provider path may authorize a bounded class of actions. A backend assertion means a trusted issuer authenticated one user, for one service, for one short window. Every one of those statements is useful — and they become dangerous the moment they are treated as synonyms.

That is the whole design, and none of it is specific to our stack: own the identity root, verify at the edge, broker identity across service boundaries, fail closed, keep wallets in a registry, and keep login separate from signing. The result is not fewer auth objects — it is fewer ambiguous ones. For applications that execute onchain on a user's behalf, as ours does, that is the difference between an app that knows who it serves and one that hopes the connected wallet is the right one.
