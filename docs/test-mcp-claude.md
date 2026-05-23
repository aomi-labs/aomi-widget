End-to-end as a real user means: install our MCP into Claude Code, run a chat, click the URL Claude shows you, watch Claude pick it up. Concrete steps:

## 0. Make sure both processes are up

In two terminals:

```bash
# Terminal A — BE (already up on :8080 with AOMI_AUTH_TOKEN=dev-aomi-auth-token)

# Terminal B — portal
cd /Users/cecilia/code/aomi-widget
export AOMI_AUTH_TOKEN=dev-aomi-auth-token
export AOMI_BE_URL=http://localhost:8080
pnpm --filter portal dev -- -p 3010
```

(`unset AOMI_SECRET_STORE` if you ever set it — we want the real be-vault path.)

Verify portal is up: `curl -sf http://localhost:3010 >/dev/null && echo OK`

## 1. Register the MCP server in Claude Code

One command:

```bash
claude mcp add aomi --transport http \
  --url http://localhost:3010/api/mcp/http \
  --header "X-Aomi-User: alice"
```

The header is what plays the role of "you are user alice" in v1 (replaces plugin OAuth). Pick any string — that's the `user_id` the portal and BE will use end-to-end.

Verify:

```bash
claude mcp list
# → aomi (http) — connected
```

## 2. Open Claude Code in any project and prompt it

```bash
cd /Users/cecilia/code/aomi-widget   # any dir is fine
claude
```

At the prompt:

```
Use aomi to connect the dummy provider.
```

Claude should call `aomi_connect_app({name: "dummy"})`. The tool will:

1. Look up — no existing approval for `alice` × `dummy`.
2. Insert a `pending_auths` row.
3. Start long-polling `/api/auth/await/<state>` for up to 60s.
4. Return to Claude with `{status: "pending", auth_url: "http://localhost:3010/api/auth/dummy/start?state=...", state_token: "..."}`.

Claude will then say something like: *"Please open this URL: http://localhost:3010/api/auth/dummy/start?state=Wis9cD…"*.

## 3. Click the URL

Cmd-click it in the terminal, or paste it into your browser. You'll see:

```
Approve dummy connection
A caller is requesting to connect the dummy provider for your Aomi account.
State: <token>
[Approve]
```

Click **Approve**.

Under the hood when you click:
- Portal callback handler synthesizes `DUMMY_TOKEN`
- POSTs it to BE `/api/_internal/secrets` with `X-Aomi-Auth`
- BE stores it in `SecretVault` under `client_id=alice, app=dummy`
- Portal inserts an `access_approval` row, marks the pending row complete
- Browser shows `Connected. You may close this tab.`

## 4. Watch Claude unblock

Within ~500ms, Claude's still-in-flight long-poll returns. Claude says:

> Connected. The dummy app is now linked to your Aomi account (label: "Dummy — alice").

## 5. Verify each layer (optional debugging)

If anything's off, here's where to look:

```bash
# (a) Portal log — should show begin → await poll → callback POST → BE 200 → await completed
tail -f /tmp/portal-dev.log    # or wherever you redirected it

# (b) BE log — should show the ingest line
# tail wherever the BE prints; you'll see:
#   POST /api/_internal/secrets  user_id=alice app=dummy count=1

# (c) Direct probe of BE vault (uses the associate_session shim)
curl -s -H 'X-Session-Id: alice' "http://localhost:8080/api/state?client_id=alice"
# Won't show secrets directly (they're handle-only), but the call should 200.

# (d) MCP Inspector — alternative to Claude Code if you want a debug UI
npx @modelcontextprotocol/inspector
# → "Connect to remote", URL http://localhost:3010/api/mcp/http, add header X-Aomi-User: alice
# → call aomi_connect_app({name:"dummy"}) interactively
```

## 6. Try the second tool

In the same Claude Code session:

```
Now use aomi to chat: ask "hi"
```

Claude calls `aomi_chat({message: "hi"})`. Today this round-trips to BE but returns empty text (the agent's `default` app isn't talking to an LLM in your local BE setup). Claude will surface `(no reply)`. That's expected until BE-side LLM config catches up.

Then:

```
What does aomi say is pending?
```

Claude calls `aomi_pending_tx({})` and gets `{pending: []}`. Confirms the read path.

---

If you want me to wait while you walk through it and report what breaks, I'll standby. Or if you want, I can spin up MCP Inspector alongside the real Claude Code session to debug whatever doesn't surface as expected.