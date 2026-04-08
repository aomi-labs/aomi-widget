# Aomi Skills

Agent skills for interacting with the [Aomi](https://aomi.dev) on-chain AI transaction builder.

## Skills

| Skill | Description |
|-------|-------------|
| [aomi-app-builder](aomi-app-builder/SKILL.md) | Build Aomi apps and plugins from APIs, specs, SDK docs, runtime interfaces, and product requirements |
| [aomi-transact](aomi-transact/SKILL.md) | Build and execute EVM transactions through a conversational AI agent via the `aomi` CLI |

## Installation

```bash
npx skills add aomi-labs/skills
```

Works with Claude Code, Cursor, Gemini CLI, VS Code Copilot, and any [Agent Skills](https://agentskills.io)-compatible tool.

## Prerequisites

```bash
npm install -g @aomi-labs/client
```

For transaction signing, also install [viem](https://viem.sh):

```bash
npm install -g viem
```

## Usage

Once installed, ask your agent:

- "What's the price of ETH?"
- "Swap 1 ETH for USDC on Uniswap"
- "Send 0.1 ETH to vitalik.eth"

The agent handles the full flow: chat with the backend, review pending transactions, sign and broadcast on-chain.

## Resources

- [@aomi-labs/client on npm](https://www.npmjs.com/package/@aomi-labs/client)
- [Aomi Widget](https://github.com/aomi-labs/aomi-widget)
- [Agent Skills Spec](https://agentskills.io)
