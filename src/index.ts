// @aomi-labs/widget-lib - Main Entry Point

// ============================================
// Main Frame Component
// ============================================
export { AomiFrame } from "./components/aomi-frame";

// ============================================
// Runtime & Context Providers
// ============================================
export {
  AomiRuntimeProvider,
  useRuntimeActions,
} from "./components/assistant-ui/runtime";
export {
  ThreadContextProvider,
  useThreadContext,
} from "./lib/thread-context";

// ============================================
// Assistant UI Components
// ============================================
export { Thread } from "./components/assistant-ui/thread";
export { ThreadList } from "./components/assistant-ui/thread-list";
export { BaseSidebar } from "./components/assistant-ui/base-sidebar";
export { MarkdownText } from "./components/assistant-ui/markdown-text";
export { ToolFallback } from "./components/assistant-ui/tool-fallback";
export { TooltipIconButton } from "./components/assistant-ui/tooltip-icon-button";
export {
  UserMessageAttachments,
  ComposerAttachments,
} from "./components/assistant-ui/attachment";

// ============================================
// UI Components (shadcn-style)
// ============================================
export { Button, buttonVariants } from "./components/ui/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/ui/card";
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
export { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./components/ui/tooltip";
export { Badge, badgeVariants } from "./components/ui/badge";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export { Separator } from "./components/ui/separator";
export { Skeleton } from "./components/ui/skeleton";
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "./components/ui/breadcrumb";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";
export {
  Sidebar,
  SidebarProvider,
  useSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
  SidebarMenuBadge,
} from "./components/ui/sidebar";

// ============================================
// Hooks
// ============================================
export { useIsMobile } from "./hooks/use-mobile";

// ============================================
// Utilities
// ============================================
export { cn } from "./lib/utils";
