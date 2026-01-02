declare module "*.mdx" {
  import type { MDXContent } from "mdx/types";
  const content: MDXContent;
  export default content;
}
