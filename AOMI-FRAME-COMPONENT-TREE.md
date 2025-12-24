# AomiFrame Component DOM Tree

Diagram showing the component hierarchy starting from `AomiFrame` as used in `apps/landing/app/page.tsx`.

```
AomiFrame [apps/registry/src/components/aomi-frame.tsx]
│
├─ ThreadContextProvider [packages/react/src/state/thread-context.tsx] (context provider)
│  └─ AomiRuntimeProvider [packages/react/src/runtime/aomi-runtime.tsx] (context provider)
│     ├─ WalletSystemMessageEmitter [packages/react/src/utils/wallet.ts] (internal component)
│     └─ FrameShell [apps/registry/src/components/aomi-frame.tsx] (returns div)
│        └─ SidebarProvider [apps/registry/src/components/ui/sidebar.tsx] (context provider)
│           ├─ {children} (optional - from AomiFrame props)
│           └─ div (main container - flex layout)
│              ├─ ThreadListSidebar [apps/registry/src/components/assistant-ui/threadlist-sidebar.tsx] (returns Sidebar)
│              │  └─ Sidebar [apps/registry/src/components/ui/sidebar.tsx] (returns div/Sheet - collapsible="offcanvas", variant="inset")
│              │     ├─ SidebarHeader [apps/registry/src/components/ui/sidebar.tsx] (returns div)
│              │     │  └─ SidebarMenu [apps/registry/src/components/ui/sidebar.tsx] (returns ul)
│              │     │     └─ SidebarMenuItem [apps/registry/src/components/ui/sidebar.tsx] (returns li)
│              │     │        └─ SidebarMenuButton [apps/registry/src/components/ui/sidebar.tsx] (returns button)
│              │     │           └─ Link [next/link] (returns <a>)
│              │     │              └─ Image [next/image] (returns <img> - logo: /assets/images/a.svg)
│              │     ├─ SidebarContent [apps/registry/src/components/ui/sidebar.tsx] (returns div)
│              │     │  └─ ThreadList [apps/registry/src/components/assistant-ui/thread-list.tsx] (returns ThreadListPrimitive.Root)
│              │     │     └─ ThreadListPrimitive.Root [@assistant-ui/react] (returns div)
│              │     │        ├─ ThreadListNew [apps/registry/src/components/assistant-ui/thread-list.tsx] (returns ThreadListPrimitive.New)
│              │     │        │  └─ ThreadListPrimitive.New [@assistant-ui/react] (returns button)
│              │     │        │     └─ Button [apps/registry/src/components/ui/button.tsx] (returns button - variant="ghost")
│              │     │        │        └─ PlusIcon [lucide-react] + "New Chat" (text node)
│              │     │        └─ ThreadListItems [apps/registry/src/components/assistant-ui/thread-list.tsx] (returns ThreadListPrimitive.Items or ThreadListSkeleton)
│              │     │           ├─ ThreadListSkeleton [apps/registry/src/components/assistant-ui/thread-list.tsx] (when loading - returns div)
│              │     │           │  └─ Skeleton [apps/registry/src/components/ui/skeleton.tsx] (returns div - ×5 items)
│              │     │           └─ ThreadListPrimitive.Items [@assistant-ui/react] (when loaded - returns div)
│              │     │              └─ ThreadListItem [apps/registry/src/components/assistant-ui/thread-list.tsx] (per thread - returns ThreadListItemPrimitive.Root)
│              │     │                 └─ ThreadListItemPrimitive.Root [@assistant-ui/react] (returns button)
│              │     │                    ├─ ThreadListItemPrimitive.Trigger [@assistant-ui/react] (returns button)
│              │     │                    │  └─ ThreadListItemTitle [apps/registry/src/components/assistant-ui/thread-list.tsx] (returns span)
│              │     │                    │     └─ ThreadListItemPrimitive.Title [@assistant-ui/react] (returns span)
│              │     │                    └─ ThreadListItemDelete [apps/registry/src/components/assistant-ui/thread-list.tsx] (returns ThreadListItemPrimitive.Delete)
│              │     │                       └─ ThreadListItemPrimitive.Delete [@assistant-ui/react] (returns button)
│              │     │                          └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│              │     │                             └─ TrashIcon [lucide-react]
│              │     ├─ SidebarRail [apps/registry/src/components/ui/sidebar.tsx] (returns button - resize handle)
│              │     └─ SidebarFooter [apps/registry/src/components/ui/sidebar.tsx] (conditional - if walletFooter prop provided - returns div)
│              │        └─ WalletFooter [apps/landing/src/components/wallet/wallet-footer.tsx] (from render prop - returns SidebarMenu)
│              │           └─ SidebarMenu [apps/registry/src/components/ui/sidebar.tsx] (returns ul)
│              │              └─ SidebarMenuItem [apps/registry/src/components/ui/sidebar.tsx] (returns li)
│              │                 └─ SidebarMenuButton [apps/registry/src/components/ui/sidebar.tsx] (returns button - size="lg")
│              │                    └─ Button [apps/registry/src/components/ui/button.tsx] (returns button - connect wallet button)
│              └─ SidebarInset [apps/registry/src/components/ui/sidebar.tsx] (returns main)
│                 ├─ header (returns header element)
│                 │  ├─ SidebarTrigger [apps/registry/src/components/ui/sidebar.tsx] (returns Button)
│                 │  │  └─ Button [apps/registry/src/components/ui/button.tsx] (returns button - variant="ghost", size="icon")
│                 │  │     └─ PanelLeftIcon [lucide-react]
│                 │  ├─ Separator [apps/registry/src/components/ui/separator.tsx] (returns div - orientation="vertical")
│                 │  └─ Breadcrumb [apps/registry/src/components/ui/breadcrumb.tsx] (returns nav)
│                 │     └─ BreadcrumbList [apps/registry/src/components/ui/breadcrumb.tsx] (returns ol)
│                 │        ├─ BreadcrumbItem [apps/registry/src/components/ui/breadcrumb.tsx] (returns li)
│                 │        │  └─ {currentTitle} (from useCurrentThreadMetadata - text node)
│                 │        └─ BreadcrumbSeparator [apps/registry/src/components/ui/breadcrumb.tsx] (returns li)
│                 └─ div (flex-1 overflow-hidden)
│                    └─ Thread [apps/registry/src/components/assistant-ui/thread.tsx] (returns LazyMotion)
│                       └─ LazyMotion [motion/react] (returns div)
│                          └─ MotionConfig [motion/react] (returns fragment)
│                             └─ ThreadPrimitive.Root [@assistant-ui/react] (returns div)
│                                └─ ThreadPrimitive.Viewport [@assistant-ui/react] (returns div)
│                                   ├─ ThreadPrimitive.If [@assistant-ui/react] (when empty - returns ThreadWelcome)
│                                   │  └─ ThreadWelcome [apps/registry/src/components/assistant-ui/thread.tsx] (returns div)
│                                   │     ├─ m.div [motion/react-m] (motion - welcome message - returns div)
│                                   │     └─ ThreadSuggestions [apps/registry/src/components/assistant-ui/thread.tsx] (returns div)
│                                   │        └─ m.div [motion/react-m] (motion - per suggestion - returns div)
│                                   │           └─ ThreadPrimitive.Suggestion [@assistant-ui/react] (returns button)
│                                   │              └─ Button [apps/registry/src/components/ui/button.tsx] (returns button - variant="ghost")
│                                   │                 └─ suggestion text (text node)
│                                   ├─ ThreadPrimitive.Messages [@assistant-ui/react] (returns div)
│                                   │  ├─ UserMessage [apps/registry/src/components/assistant-ui/thread.tsx] (returns MessagePrimitive.Root)
│                                   │  │  └─ MessagePrimitive.Root [@assistant-ui/react] (returns div)
│                                   │  │     ├─ UserMessageAttachments [apps/registry/src/components/assistant-ui/attachment.tsx] (returns div)
│                                   │  │     ├─ div (message content wrapper)
│                                   │  │     │  ├─ div (rounded message bubble)
│                                   │  │     │  │  └─ MessagePrimitive.Parts [@assistant-ui/react] (returns fragment)
│                                   │  │     │  └─ UserActionBar [apps/registry/src/components/assistant-ui/thread.tsx] (returns ActionBarPrimitive.Root)
│                                   │  │     │     └─ ActionBarPrimitive.Root [@assistant-ui/react] (returns div)
│                                   │  │     │        └─ ActionBarPrimitive.Edit [@assistant-ui/react] (returns button)
│                                   │  │     │           └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│                                   │  │     │              └─ PencilIcon [lucide-react]
│                                   │  │     └─ BranchPicker [apps/registry/src/components/assistant-ui/thread.tsx] (returns BranchPickerPrimitive.Root)
│                                   │  │        └─ BranchPickerPrimitive.Root [@assistant-ui/react] (returns div)
│                                   │  │           ├─ BranchPickerPrimitive.Previous [@assistant-ui/react] (returns button)
│                                   │  │           │  └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│                                   │  │           │     └─ ChevronLeftIcon [lucide-react]
│                                   │  │           ├─ span (branch number display)
│                                   │  │           │  ├─ BranchPickerPrimitive.Number [@assistant-ui/react] (returns span)
│                                   │  │           │  └─ BranchPickerPrimitive.Count [@assistant-ui/react] (returns span)
│                                   │  │           └─ BranchPickerPrimitive.Next [@assistant-ui/react] (returns button)
│                                   │  │              └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│                                   │  │                 └─ ChevronRightIcon [lucide-react]
│                                   │  ├─ EditComposer [apps/registry/src/components/assistant-ui/thread.tsx] (component - when editing - returns div)
│                                   │  │  └─ ComposerPrimitive.Root [@assistant-ui/react] (returns form)
│                                   │  │     ├─ ComposerPrimitive.Input [@assistant-ui/react] (returns textarea)
│                                   │  │     └─ div (footer actions)
│                                   │  │        ├─ ComposerPrimitive.Cancel [@assistant-ui/react] (returns button)
│                                   │  │        │  └─ Button [apps/registry/src/components/ui/button.tsx] (returns button - variant="ghost", size="sm")
│                                   │  │        │     └─ "Cancel" (text node)
│                                   │  │        └─ ComposerPrimitive.Send [@assistant-ui/react] (returns button)
│                                   │  │           └─ Button [apps/registry/src/components/ui/button.tsx] (returns button - size="sm")
│                                   │  │              └─ "Update" (text node)
│                                   │  ├─ AssistantMessage [apps/registry/src/components/assistant-ui/thread.tsx] (returns MessagePrimitive.Root)
│                                   │  │  └─ MessagePrimitive.Root [@assistant-ui/react] (returns div)
│                                   │  │     ├─ div (message content)
│                                   │  │     │  └─ MessagePrimitive.Parts [@assistant-ui/react] (returns fragment)
│                                   │  │     │     ├─ MarkdownText [apps/registry/src/components/assistant-ui/markdown-text.tsx] (for Text parts - returns div with ReactMarkdown)
│                                   │  │     │     └─ ToolFallback [apps/registry/src/components/assistant-ui/tool-fallback.tsx] (for tools - returns div)
│                                   │  │     ├─ MessageError [apps/registry/src/components/assistant-ui/thread.tsx] (returns MessagePrimitive.Error)
│                                   │  │     │  └─ MessagePrimitive.Error [@assistant-ui/react] (returns div)
│                                   │  │     │     └─ ErrorPrimitive.Root [@assistant-ui/react] (returns div)
│                                   │  │     │        └─ ErrorPrimitive.Message [@assistant-ui/react] (returns span)
│                                   │  │     ├─ div (message footer)
│                                   │  │     │  ├─ BranchPicker [apps/registry/src/components/assistant-ui/thread.tsx] (returns BranchPickerPrimitive.Root - same as UserMessage)
│                                   │  │     │  └─ AssistantActionBar [apps/registry/src/components/assistant-ui/thread.tsx] (returns ActionBarPrimitive.Root)
│                                   │  │     │     └─ ActionBarPrimitive.Root [@assistant-ui/react] (returns div)
│                                   │  │     │        ├─ ActionBarPrimitive.Copy [@assistant-ui/react] (returns button)
│                                   │  │     │        │  └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│                                   │  │     │        │     ├─ CheckIcon [lucide-react] (when copied)
│                                   │  │     │        │     └─ CopyIcon [lucide-react] (when not copied)
│                                   │  │     │        └─ ActionBarPrimitive.Reload [@assistant-ui/react] (returns button)
│                                   │  │     │           └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│                                   │  │     │              └─ RefreshCwIcon [lucide-react]
│                                   │  │     └─ BranchPicker [apps/registry/src/components/assistant-ui/thread.tsx] (also included)
│                                   │  └─ SystemMessage [apps/registry/src/components/assistant-ui/thread.tsx] (returns MessagePrimitive.Root)
│                                   │     └─ MessagePrimitive.Root [@assistant-ui/react] (returns div)
│                                   │        └─ div (system message card)
│                                   │           ├─ AlertCircleIcon [lucide-react]
│                                   │           └─ div (message body)
│                                   │              ├─ span ("System notice" title - text node)
│                                   │              └─ MessagePrimitive.Parts [@assistant-ui/react] (returns fragment)
│                                   │                 └─ MarkdownText [apps/registry/src/components/assistant-ui/markdown-text.tsx] (returns div with ReactMarkdown)
│                                   ├─ ThreadPrimitive.If [@assistant-ui/react] (when not empty - returns div)
│                                   │  └─ div (spacer - min-h-8 grow)
│                                   └─ Composer [apps/registry/src/components/assistant-ui/thread.tsx] (returns div)
│                                      └─ div (composer wrapper - sticky bottom)
│                                         ├─ ThreadScrollToBottom [apps/registry/src/components/assistant-ui/thread.tsx] (returns ThreadPrimitive.ScrollToBottom)
│                                         │  └─ ThreadPrimitive.ScrollToBottom [@assistant-ui/react] (returns button)
│                                         │     └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│                                         │        └─ ArrowDownIcon [lucide-react]
│                                         └─ ComposerPrimitive.Root [@assistant-ui/react] (returns form)
│                                            ├─ ComposerAttachments [apps/registry/src/components/assistant-ui/attachment.tsx] (returns div)
│                                            │  └─ ComposerAddAttachment [apps/registry/src/components/assistant-ui/attachment.tsx] (returns button)
│                                            ├─ ComposerPrimitive.Input [@assistant-ui/react] (returns textarea - "Send a message..." placeholder)
│                                            └─ ComposerAction [apps/registry/src/components/assistant-ui/thread.tsx] (returns div)
│                                               ├─ ComposerAddAttachment [apps/registry/src/components/assistant-ui/attachment.tsx] (returns button)
│                                               ├─ ThreadPrimitive.If [@assistant-ui/react] (when running=false - returns ComposerPrimitive.Send)
│                                               │  └─ ComposerPrimitive.Send [@assistant-ui/react] (returns button)
│                                               │     └─ TooltipIconButton [apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx] (returns button with Tooltip)
│                                               │        └─ ArrowUpIcon [lucide-react]
│                                               └─ ThreadPrimitive.If [@assistant-ui/react] (when running - returns ComposerPrimitive.Cancel)
│                                                  └─ ComposerPrimitive.Cancel [@assistant-ui/react] (returns button)
│                                                     └─ Button [apps/registry/src/components/ui/button.tsx] (returns button)
│                                                        └─ Square [lucide-react] (stop icon)
```

## Key Component Categories

### Context Providers
- **ThreadContextProvider**: Manages thread state and metadata
- **AomiRuntimeProvider**: Connects to backend API, manages messages, handles polling
- **SidebarProvider**: Manages sidebar open/collapsed state
- **AssistantRuntimeProvider**: From @assistant-ui/react, provides runtime to assistant components

### Layout Components
- **Sidebar**: Collapsible sidebar for thread list
- **SidebarInset**: Main content area (thread view)
- **FrameShell**: Outer container with styling

### Thread Management
- **ThreadList**: List of conversation threads
- **ThreadListSidebar**: Sidebar wrapper with header/footer
- **Thread**: Main conversation view

### Message Components
- **UserMessage**: User's messages
- **AssistantMessage**: AI assistant responses
- **SystemMessage**: System notifications
- **EditComposer**: Inline message editor

### UI Primitives
- **Button**: Styled button component
- **Breadcrumb**: Thread title display
- **Separator**: Visual divider
- **TooltipIconButton**: Icon button with tooltip
- **Skeleton**: Loading state placeholder

### Assistant UI Primitives (from @assistant-ui/react)
- **ThreadPrimitive**: Core thread rendering
- **MessagePrimitive**: Message rendering
- **ComposerPrimitive**: Input composer
- **ActionBarPrimitive**: Message actions (copy, edit, reload)
- **BranchPickerPrimitive**: Message branching/navigation
- **ThreadListPrimitive**: Thread list management

### Utility Components
- **MarkdownText**: Renders markdown content
- **ToolFallback**: Renders tool call results
- **WalletFooter**: Wallet connection UI (passed as prop from landing app)

## Visual Layout Diagram

Below is a visual representation of how the components are arranged on the page:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         FrameShell (div - flex container)                  │
│                                                                           │
│  ┌───────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  ThreadListSidebar    │  │  SidebarInset                            │ │
│  │  (Sidebar component)  │  │  (main element)                          │ │
│  │                       │  │                                          │ │
│  │  ┌─────────────────┐  │  │  ┌────────────────────────────────────┐ │ │
│  │  │ SidebarHeader   │  │  │  │ header                             │ │ │
│  │  │                 │  │  │  │ [SidebarTrigger] │ [Separator] │  │ │ │
│  │  │  Logo Link      │  │  │  │ [Breadcrumb]                       │ │ │
│  │  └─────────────────┘  │  │  └────────────────────────────────────┘ │ │
│  │                       │  │                                          │ │
│  │  ┌─────────────────┐  │  │  ┌────────────────────────────────────┐ │ │
│  │  │ SidebarContent  │  │  │  │ Thread                              │ │ │
│  │  │                 │  │  │  │                                     │ │ │
│  │  │ ThreadList      │  │  │  │  ThreadPrimitive.Viewport          │ │ │
│  │  │                 │  │  │  │  ┌───────────────────────────────┐ │ │ │
│  │  │ [New Chat btn]  │  │  │  │  │ ThreadWelcome                │ │ │ │
│  │  │                 │  │  │  │  │ (when empty - suggestions)    │ │ │ │
│  │  │ ThreadListItem  │  │  │  │  └───────────────────────────────┘ │ │ │
│  │  │ ThreadListItem  │  │  │  │                                     │ │ │
│  │  │ ThreadListItem  │  │  │  │  ThreadPrimitive.Messages          │ │ │
│  │  │ ...             │  │  │  │  ┌───────────────────────────────┐ │ │ │
│  │  └─────────────────┘  │  │  │  │ UserMessage                   │ │ │ │
│  │                       │  │  │  │ AssistantMessage              │ │ │ │
│  │  [SidebarRail]        │  │  │  │ SystemMessage                 │ │ │ │
│  │  (resize handle)      │  │  │  │ EditComposer (when editing)   │ │ │ │
│  │                       │  │  │  └───────────────────────────────┘ │ │ │
│  │  ┌─────────────────┐  │  │  │                                     │ │ │
│  │  │ SidebarFooter   │  │  │  │  Composer (sticky bottom)          │ │ │
│  │  │                 │  │  │  │  ┌───────────────────────────────┐ │ │ │
│  │  │ WalletFooter    │  │  │  │  │ ComposerPrimitive.Root        │ │ │ │
│  │  │ (optional)      │  │  │  │  │  [textarea + send/attach btns]│ │ │ │
│  │  └─────────────────┘  │  │  │  └───────────────────────────────┘ │ │ │
│  └───────────────────────┘  │  └────────────────────────────────────┘ │ │
│                             │                                          │ │
└─────────────────────────────┴──────────────────────────────────────────┘

Key Layout Areas:
├─ LEFT: ThreadListSidebar (collapsible sidebar)
│  ├─ SidebarHeader: Contains logo/brand link
│  ├─ SidebarContent: Contains ThreadList with thread items
│  ├─ SidebarRail: Resize handle between sidebar and main content
│  └─ SidebarFooter: Contains WalletFooter (connect wallet button)
│
└─ RIGHT: SidebarInset (main content area)
   ├─ header: Fixed header bar with
   │  ├─ SidebarTrigger: Toggle sidebar button
   │  ├─ Separator: Vertical divider
   │  └─ Breadcrumb: Shows current thread title
   │
   └─ Thread: Scrollable content area
      ├─ ThreadPrimitive.Viewport: Scrollable container
      │  ├─ ThreadWelcome: Welcome screen with suggestions (when empty)
      │  ├─ ThreadPrimitive.Messages: List of messages
      │  │  ├─ UserMessage: User's messages
      │  │  ├─ AssistantMessage: AI assistant responses
      │  │  ├─ SystemMessage: System notifications
      │  │  └─ EditComposer: Inline editor (when editing)
      │  └─ Composer: Input area (sticky at bottom)
      │     └─ ComposerPrimitive.Root: Form with textarea and action buttons
```
