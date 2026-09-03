import type { AgentRunOptions, AgentTarget, SessionOptions } from "../src";

const auto: AgentTarget = { mode: "auto" };
const implicitAuto: AgentTarget = {};
const directBuiltin: AgentTarget = { mode: "direct", app: "zerox" };
const directHosted: AgentTarget = { mode: "direct", applicationId: 42 };
const directHostedChecked: AgentTarget = {
  mode: "direct",
  applicationId: 42,
  app: "partner",
};

const sessionOptions: SessionOptions = { target: auto };
const runOptions: AgentRunOptions = { target: directBuiltin };
void [
  implicitAuto,
  directHosted,
  directHostedChecked,
  sessionOptions,
  runOptions,
];

// @ts-expect-error Auto cannot carry an app target.
const invalidAuto: AgentTarget = { mode: "auto", app: "zerox" };
// @ts-expect-error Direct requires one target identity.
const invalidDirect: AgentTarget = { mode: "direct" };
void [invalidAuto, invalidDirect];
