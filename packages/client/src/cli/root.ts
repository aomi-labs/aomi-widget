import { defineCommand } from "citty";
import { chatDef } from "./commands/defs/chat";
import { txDef } from "./commands/defs/tx";
import { sessionDef } from "./commands/defs/session";
import { modelDef } from "./commands/defs/model";
import { appDef } from "./commands/defs/app";
import { chainDef } from "./commands/defs/chain";
import { secretDef } from "./commands/defs/secret";
import { aaDef } from "./commands/defs/aa";
import { globalArgs } from "./commands/defs/shared";
import packageJson from "../../package.json";

export const root = defineCommand({
  meta: {
    name: "aomi",
    version: packageJson.version,
    description: "CLI client for Aomi on-chain agent",
  },
  args: { ...globalArgs },
  subCommands: {
    chat: chatDef,
    tx: txDef,
    session: sessionDef,
    model: modelDef,
    app: appDef,
    chain: chainDef,
    secret: secretDef,
    aa: aaDef,
  },
});
