import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import {
  guides,
  examples as examplePages,
} from "@/.source/server";

export const source = loader({
  baseUrl: "/docs",
  source: guides.toFumadocsSource(),
});

export const examples = loader({
  baseUrl: "/examples",
  source: examplePages.toFumadocsSource(),
});

export type Page = InferPageType<typeof source>;
export type ExamplePage = InferPageType<typeof examples>;
