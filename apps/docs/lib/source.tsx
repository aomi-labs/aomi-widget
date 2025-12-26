import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import {
  docs,
  examples as examplePages,
  api as apiPages,
} from "@/.source/server";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const examples = loader({
  baseUrl: "/examples",
  source: examplePages.toFumadocsSource(),
});

export const api = loader({
  baseUrl: "/api",
  source: apiPages.toFumadocsSource(),
});

export type Page = InferPageType<typeof source>;
export type ExamplePage = InferPageType<typeof examples>;
export type ApiPage = InferPageType<typeof api>;
