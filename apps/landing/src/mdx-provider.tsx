import type { ComponentType, ReactNode } from "react";

type MDXComponents = Record<string, ComponentType<any>>;

export function useMDXComponents(
  components: MDXComponents = {},
): MDXComponents {
  return components;
}

export function MDXProvider({
  children,
}: {
  components?: MDXComponents;
  children: ReactNode;
}) {
  return <>{children}</>;
}
