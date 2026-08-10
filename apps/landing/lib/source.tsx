import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import {
  examples as examplePages,
  playground as playgroundPages,
} from "@/.source/server";

export const examples = loader({
  baseUrl: "/examples",
  source: examplePages.toFumadocsSource(),
});

export const playground = loader({
  baseUrl: "/playground",
  source: playgroundPages.toFumadocsSource(),
});

export type ExamplePage = InferPageType<typeof examples>;
