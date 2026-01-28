// @ts-nocheck
import { browser } from "fumadocs-mdx/runtime/browser";
import type * as Config from "../source.config";

const create = browser<
  typeof Config,
  import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
    DocData: {};
  }
>();
const browserCollections = {
  api: create.doc("api", {}),
  docs: create.doc("docs", {}),
  examples: create.doc("examples", {}),
};
export default browserCollections;
