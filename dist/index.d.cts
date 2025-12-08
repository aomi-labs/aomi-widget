import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React$1 from 'react';
import { CSSProperties, ReactNode, FC, ComponentPropsWithRef } from 'react';
import { ThreadMessageLike, ToolCallMessagePartComponent } from '@assistant-ui/react';
import * as class_variance_authority_types from 'class-variance-authority/types';
import { VariantProps } from 'class-variance-authority';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { ClassValue } from 'clsx';

type WalletButtonState = {
    address?: string;
    chainId?: number;
    isConnected: boolean;
    ensName?: string;
};
type WalletFooterProps = {
    wallet: WalletButtonState;
    setWallet: (data: Partial<WalletButtonState>) => void;
};
/**
 * Get network name from chainId
 */
declare const getNetworkName: (chainId: number | string | undefined) => string;
/**
 * Format wallet address for display (0x1234...5678)
 */
declare const formatAddress: (addr?: string) => string;

type AomiFrameProps = {
    width?: CSSProperties["width"];
    height?: CSSProperties["height"];
    className?: string;
    style?: CSSProperties;
    /** Render prop for wallet footer - receives wallet state and setter from lib */
    walletFooter?: (props: WalletFooterProps) => ReactNode;
    /** Additional content to render inside the frame */
    children?: ReactNode;
};
declare const AomiFrame: ({ width, height, className, style, walletFooter, children, }: AomiFrameProps) => react_jsx_runtime.JSX.Element;

type RuntimeActions = {
    sendSystemMessage: (message: string) => Promise<void>;
};
declare const useRuntimeActions: () => RuntimeActions;
declare function AomiRuntimeProvider({ children, backendUrl, publicKey, }: Readonly<{
    children: ReactNode;
    backendUrl?: string;
    publicKey?: string;
}>): react_jsx_runtime.JSX.Element;

/**
 * Thread Context Value
 *
 * Manages global state for multi-thread support:
 * - Current active thread ID
 * - Message history for all threads
 * - Thread metadata (title, archived status)
 */
type ThreadContextValue = {
    currentThreadId: string;
    setCurrentThreadId: (id: string) => void;
    threadViewKey: number;
    bumpThreadViewKey: () => void;
    threads: Map<string, ThreadMessageLike[]>;
    setThreads: React.Dispatch<React.SetStateAction<Map<string, ThreadMessageLike[]>>>;
    threadMetadata: Map<string, ThreadMetadata>;
    setThreadMetadata: React.Dispatch<React.SetStateAction<Map<string, ThreadMetadata>>>;
    threadCnt: number;
    setThreadCnt: React.Dispatch<React.SetStateAction<number>>;
    getThreadMessages: (threadId: string) => ThreadMessageLike[];
    setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
};
type ThreadMetadata = {
    title: string;
    status: "regular" | "archived" | "pending";
    lastActiveAt?: string | number;
};
/**
 * Hook to access Thread Context
 *
 * Must be used within a ThreadContextProvider
 *
 * @example
 * ```tsx
 * const { currentThreadId, setCurrentThreadId } = useThreadContext();
 * ```
 */
declare function useThreadContext(): ThreadContextValue;
/**
 * Thread Context Provider Props
 */
type ThreadContextProviderProps = {
    children: ReactNode;
    /**
     * Initial thread ID to set as current
     * @default Generated UUID v4 (matches backend's generate_session_id)
     */
    initialThreadId?: string;
};
/**
 * Thread Context Provider
 *
 * Provides global state for multi-thread management.
 * Should be placed high in your component tree, typically in your root layout.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * export default function Layout({ children }) {
 *   return (
 *     <ThreadContextProvider>
 *       <AomiRuntimeProvider>
 *         {children}
 *       </AomiRuntimeProvider>
 *     </ThreadContextProvider>
 *   );
 * }
 * ```
 */
declare function ThreadContextProvider({ children, initialThreadId, }: ThreadContextProviderProps): react_jsx_runtime.JSX.Element;

declare const Thread: FC;

declare const ThreadList: FC;

declare const buttonVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function Button({ className, variant, size, asChild, ...props }: React$1.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
}): react_jsx_runtime.JSX.Element;

declare function Input({ className, type, ...props }: React$1.ComponentProps<"input">): react_jsx_runtime.JSX.Element;

declare function Separator({ className, orientation, decorative, ...props }: React$1.ComponentProps<typeof SeparatorPrimitive.Root>): react_jsx_runtime.JSX.Element;

declare function TooltipProvider({ delayDuration, ...props }: React$1.ComponentProps<typeof TooltipPrimitive.Provider>): react_jsx_runtime.JSX.Element;
declare function Tooltip({ ...props }: React$1.ComponentProps<typeof TooltipPrimitive.Root>): react_jsx_runtime.JSX.Element;
declare function TooltipTrigger({ ...props }: React$1.ComponentProps<typeof TooltipPrimitive.Trigger>): react_jsx_runtime.JSX.Element;
declare function TooltipContent({ className, sideOffset, children, ...props }: React$1.ComponentProps<typeof TooltipPrimitive.Content>): react_jsx_runtime.JSX.Element;

type SidebarContextProps = {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
};
declare function useSidebar(): SidebarContextProps;
declare function SidebarProvider({ defaultOpen, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }: React$1.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}): react_jsx_runtime.JSX.Element;
declare function Sidebar({ side, variant, collapsible, className, children, ...props }: React$1.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
}): react_jsx_runtime.JSX.Element;
declare function SidebarTrigger({ className, onClick, ...props }: React$1.ComponentProps<typeof Button>): react_jsx_runtime.JSX.Element;
declare function SidebarRail({ className, ...props }: React$1.ComponentProps<"button">): react_jsx_runtime.JSX.Element;
declare function SidebarInset({ className, ...props }: React$1.ComponentProps<"main">): react_jsx_runtime.JSX.Element;
declare function SidebarHeader({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SidebarFooter({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SidebarSeparator({ className, ...props }: React$1.ComponentProps<typeof Separator>): react_jsx_runtime.JSX.Element;
declare function SidebarContent({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SidebarGroup({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SidebarGroupLabel({ className, asChild, ...props }: React$1.ComponentProps<"div"> & {
    asChild?: boolean;
}): react_jsx_runtime.JSX.Element;
declare function SidebarGroupAction({ className, asChild, ...props }: React$1.ComponentProps<"button"> & {
    asChild?: boolean;
}): react_jsx_runtime.JSX.Element;
declare function SidebarGroupContent({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SidebarMenu({ className, ...props }: React$1.ComponentProps<"ul">): react_jsx_runtime.JSX.Element;
declare function SidebarMenuItem({ className, ...props }: React$1.ComponentProps<"li">): react_jsx_runtime.JSX.Element;
declare const sidebarMenuButtonVariants: (props?: ({
    variant?: "default" | "outline" | null | undefined;
    size?: "default" | "sm" | "lg" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
declare function SidebarMenuButton({ asChild, isActive, variant, size, tooltip, className, ...props }: React$1.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React$1.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>): react_jsx_runtime.JSX.Element;
declare function SidebarMenuAction({ className, asChild, showOnHover, ...props }: React$1.ComponentProps<"button"> & {
    asChild?: boolean;
    showOnHover?: boolean;
}): react_jsx_runtime.JSX.Element;
declare function SidebarMenuBadge({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SidebarMenuSub({ className, ...props }: React$1.ComponentProps<"ul">): react_jsx_runtime.JSX.Element;
declare function SidebarMenuSubItem({ className, ...props }: React$1.ComponentProps<"li">): react_jsx_runtime.JSX.Element;
declare function SidebarMenuSubButton({ asChild, size, isActive, className, ...props }: React$1.ComponentProps<"a"> & {
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
}): react_jsx_runtime.JSX.Element;

type BaseSidebarProps = React$1.ComponentProps<typeof Sidebar> & {
    /** Label to display on the footer button */
    footerLabel?: string;
    /** Secondary label (e.g., network name) */
    footerSecondaryLabel?: string;
    /** Click handler for footer button */
    onFooterClick?: () => void;
    /** Logo URL (defaults to aomi logo) */
    logoUrl?: string;
    /** Logo link href */
    logoHref?: string;
};
declare function BaseSidebar({ footerLabel, footerSecondaryLabel, onFooterClick, logoUrl, logoHref, ...props }: BaseSidebarProps): react_jsx_runtime.JSX.Element;

type ThreadListSidebarProps = React$1.ComponentProps<typeof Sidebar> & {
    /** Optional footer component (e.g., WalletFooter from consumer app) */
    footer?: React$1.ReactNode;
};
declare function ThreadListSidebar({ footer, ...props }: ThreadListSidebarProps): react_jsx_runtime.JSX.Element;

declare const MarkdownText: React$1.MemoExoticComponent<() => react_jsx_runtime.JSX.Element>;

declare const ToolFallback: ToolCallMessagePartComponent;

type TooltipIconButtonProps = ComponentPropsWithRef<typeof Button> & {
    tooltip: string;
    side?: "top" | "bottom" | "left" | "right";
};
declare const TooltipIconButton: React$1.ForwardRefExoticComponent<Omit<TooltipIconButtonProps, "ref"> & React$1.RefAttributes<HTMLButtonElement>>;

declare const UserMessageAttachments: FC;
declare const ComposerAttachments: FC;

declare const Card: React$1.ForwardRefExoticComponent<React$1.HTMLAttributes<HTMLDivElement> & React$1.RefAttributes<HTMLDivElement>>;
declare const CardHeader: React$1.ForwardRefExoticComponent<React$1.HTMLAttributes<HTMLDivElement> & React$1.RefAttributes<HTMLDivElement>>;
declare const CardTitle: React$1.ForwardRefExoticComponent<React$1.HTMLAttributes<HTMLHeadingElement> & React$1.RefAttributes<HTMLParagraphElement>>;
declare const CardDescription: React$1.ForwardRefExoticComponent<React$1.HTMLAttributes<HTMLParagraphElement> & React$1.RefAttributes<HTMLParagraphElement>>;
declare const CardContent: React$1.ForwardRefExoticComponent<React$1.HTMLAttributes<HTMLDivElement> & React$1.RefAttributes<HTMLDivElement>>;
declare const CardFooter: React$1.ForwardRefExoticComponent<React$1.HTMLAttributes<HTMLDivElement> & React$1.RefAttributes<HTMLDivElement>>;

declare function Dialog({ ...props }: React$1.ComponentProps<typeof DialogPrimitive.Root>): react_jsx_runtime.JSX.Element;
declare function DialogTrigger({ ...props }: React$1.ComponentProps<typeof DialogPrimitive.Trigger>): react_jsx_runtime.JSX.Element;
declare function DialogPortal({ ...props }: React$1.ComponentProps<typeof DialogPrimitive.Portal>): react_jsx_runtime.JSX.Element;
declare function DialogClose({ ...props }: React$1.ComponentProps<typeof DialogPrimitive.Close>): react_jsx_runtime.JSX.Element;
declare function DialogOverlay({ className, ...props }: React$1.ComponentProps<typeof DialogPrimitive.Overlay>): react_jsx_runtime.JSX.Element;
declare function DialogContent({ className, children, showCloseButton, ...props }: React$1.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
}): react_jsx_runtime.JSX.Element;
declare function DialogHeader({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function DialogFooter({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function DialogTitle({ className, ...props }: React$1.ComponentProps<typeof DialogPrimitive.Title>): react_jsx_runtime.JSX.Element;
declare function DialogDescription({ className, ...props }: React$1.ComponentProps<typeof DialogPrimitive.Description>): react_jsx_runtime.JSX.Element;

declare function Avatar({ className, ...props }: React$1.ComponentProps<typeof AvatarPrimitive.Root>): react_jsx_runtime.JSX.Element;
declare function AvatarImage({ className, ...props }: React$1.ComponentProps<typeof AvatarPrimitive.Image>): react_jsx_runtime.JSX.Element;
declare function AvatarFallback({ className, ...props }: React$1.ComponentProps<typeof AvatarPrimitive.Fallback>): react_jsx_runtime.JSX.Element;

declare const badgeVariants: (props?: ({
    variant?: "default" | "destructive" | "outline" | "secondary" | null | undefined;
} & class_variance_authority_types.ClassProp) | undefined) => string;
interface BadgeProps extends React$1.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
}
declare function Badge({ className, variant, ...props }: BadgeProps): react_jsx_runtime.JSX.Element;

declare const Label: React$1.ForwardRefExoticComponent<React$1.LabelHTMLAttributes<HTMLLabelElement> & React$1.RefAttributes<HTMLLabelElement>>;

declare function Skeleton({ className, ...props }: React.ComponentProps<"div">): react_jsx_runtime.JSX.Element;

declare function Breadcrumb({ ...props }: React$1.ComponentProps<"nav">): react_jsx_runtime.JSX.Element;
declare function BreadcrumbList({ className, ...props }: React$1.ComponentProps<"ol">): react_jsx_runtime.JSX.Element;
declare function BreadcrumbItem({ className, ...props }: React$1.ComponentProps<"li">): react_jsx_runtime.JSX.Element;
declare function BreadcrumbLink({ asChild, className, ...props }: React$1.ComponentProps<"a"> & {
    asChild?: boolean;
}): react_jsx_runtime.JSX.Element;
declare function BreadcrumbPage({ className, ...props }: React$1.ComponentProps<"span">): react_jsx_runtime.JSX.Element;
declare function BreadcrumbSeparator({ children, className, ...props }: React$1.ComponentProps<"li">): react_jsx_runtime.JSX.Element;
declare function BreadcrumbEllipsis({ className, ...props }: React$1.ComponentProps<"span">): react_jsx_runtime.JSX.Element;

declare function Sheet({ ...props }: React$1.ComponentProps<typeof DialogPrimitive.Root>): react_jsx_runtime.JSX.Element;
declare function SheetTrigger({ ...props }: React$1.ComponentProps<typeof DialogPrimitive.Trigger>): react_jsx_runtime.JSX.Element;
declare function SheetClose({ ...props }: React$1.ComponentProps<typeof DialogPrimitive.Close>): react_jsx_runtime.JSX.Element;
declare function SheetContent({ className, children, side, ...props }: React$1.ComponentProps<typeof DialogPrimitive.Content> & {
    side?: "top" | "right" | "bottom" | "left";
}): react_jsx_runtime.JSX.Element;
declare function SheetHeader({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SheetFooter({ className, ...props }: React$1.ComponentProps<"div">): react_jsx_runtime.JSX.Element;
declare function SheetTitle({ className, ...props }: React$1.ComponentProps<typeof DialogPrimitive.Title>): react_jsx_runtime.JSX.Element;
declare function SheetDescription({ className, ...props }: React$1.ComponentProps<typeof DialogPrimitive.Description>): react_jsx_runtime.JSX.Element;

declare function useIsMobile(): boolean;

declare function cn(...inputs: ClassValue[]): string;

export { AomiFrame, AomiRuntimeProvider, Avatar, AvatarFallback, AvatarImage, Badge, BaseSidebar, Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ComposerAttachments, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger, Input, Label, MarkdownText, Separator, Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, Skeleton, Thread, ThreadContextProvider, ThreadList, ThreadListSidebar, ToolFallback, Tooltip, TooltipContent, TooltipIconButton, TooltipProvider, TooltipTrigger, UserMessageAttachments, type WalletButtonState, type WalletFooterProps, badgeVariants, buttonVariants, cn, formatAddress, getNetworkName, useIsMobile, useRuntimeActions, useSidebar, useThreadContext };
