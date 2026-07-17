"use client";

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
} from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@portal/lib/utils";

export type PortalIconProps = {
  icon: IconSvgElement;
  /** Pixel size; default 14 to match prior Lucide `size-3.5`. */
  size?: number;
  className?: string;
  strokeWidth?: number;
  color?: string;
  style?: CSSProperties;
} & Omit<
  ComponentPropsWithoutRef<"svg">,
  "width" | "height" | "color" | "strokeWidth"
>;

/**
 * Thin Hugeicons renderer for portal-owned surfaces.
 *
 * Free set today: `@hugeicons/core-free-icons` (Stroke Rounded only).
 * Solid styles require Hugeicons Pro (`@hugeicons-pro/core-solid-*` via
 * private registry). Swap icon imports when Pro is licensed — keep this
 * wrapper.
 */
export const PortalIcon = forwardRef<SVGSVGElement, PortalIconProps>(
  function PortalIcon(
    {
      icon,
      size = 14,
      className,
      strokeWidth = 1.75,
      color = "currentColor",
      style,
      ...rest
    },
    ref,
  ) {
    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={cn("shrink-0", className)}
        style={style}
        {...rest}
      />
    );
  },
);
