import {
  defineConfig,
  defineDocs,
  defineCollections,
  frontmatterSchema,
  metaSchema,
} from "fumadocs-mdx/config";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerTwoslash } from "fumadocs-twoslash";
import { transformerMetaHighlight } from "@shikijs/transformers";
import { z } from "zod";
import { remarkMermaid } from "@theguild/remark-mermaid";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";

export const docs = defineDocs({
  docs: {
    schema: frontmatterSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
});

export const examples = defineDocs({
  dir: "content/examples",
  docs: {
    schema: frontmatterSchema,
  },
  meta: {
    schema: metaSchema,
  },
});

export const api = defineDocs({
  dir: "content/api",
  docs: {
    schema: frontmatterSchema,
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMermaid],
    rehypeCodeOptions: {
      lazy: true,
      langs: ["ts", "js", "html", "tsx", "mdx", "bash", "json"],
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-mocha",
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerMetaHighlight(),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
          twoslashOptions: {
            compilerOptions: {
              jsx: 1, // JSX preserve
              paths: {
                "@/*": ["./*"],
              },
            },
          },
        }),
      ],
    },
  },
});
