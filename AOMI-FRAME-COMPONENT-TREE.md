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

## Component Reference Table

| Component Name | What It Does | Directly Visible | File Location |
|---------------|--------------|------------------|---------------|
| **Context Providers** |
| `AomiFrame` | Main entry component, wraps providers and frame shell | Yes | `apps/registry/src/components/aomi-frame.tsx` |
| `ThreadContextProvider` | Manages thread state, metadata, and thread switching | No | `packages/react/src/state/thread-context.tsx` |
| `AomiRuntimeProvider` | Connects to backend API, manages messages, handles polling | No | `packages/react/src/runtime/aomi-runtime.tsx` |
| `SidebarProvider` | Manages sidebar open/collapsed state and width | No | `apps/registry/src/components/ui/sidebar.tsx` |
| `WalletSystemMessageEmitter` | Watches wallet state changes and sends system messages | No | `packages/react/src/utils/wallet.ts` |
| **Layout Components** |
| `FrameShell` | Outer container div with styling and flex layout | Yes | `apps/registry/src/components/aomi-frame.tsx` |
| `ThreadListSidebar` | Wraps sidebar with header, content, and footer sections | Yes | `apps/registry/src/components/assistant-ui/threadlist-sidebar.tsx` |
| `Sidebar` | Collapsible sidebar container (renders as div or Sheet on mobile) | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarHeader` | Header section of sidebar containing logo | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarContent` | Scrollable content area of sidebar | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarFooter` | Footer section of sidebar (contains WalletFooter) | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarInset` | Main content area next to sidebar (renders as main element) | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarRail` | Resize handle button between sidebar and main content | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarTrigger` | Button to toggle sidebar open/collapsed | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| **Thread List Components** |
| `ThreadList` | Container for thread list items | Yes | `apps/registry/src/components/assistant-ui/thread-list.tsx` |
| `ThreadListNew` | "New Chat" button component | Yes | `apps/registry/src/components/assistant-ui/thread-list.tsx` |
| `ThreadListItems` | Container that renders thread items or skeleton loader | Yes | `apps/registry/src/components/assistant-ui/thread-list.tsx` |
| `ThreadListSkeleton` | Loading skeleton with 5 placeholder items | Yes | `apps/registry/src/components/assistant-ui/thread-list.tsx` |
| `ThreadListItem` | Individual thread item in the list | Yes | `apps/registry/src/components/assistant-ui/thread-list.tsx` |
| `ThreadListItemTitle` | Displays the thread title text | Yes | `apps/registry/src/components/assistant-ui/thread-list.tsx` |
| `ThreadListItemDelete` | Delete button for thread item | Yes | `apps/registry/src/components/assistant-ui/thread-list.tsx` |
| **Thread View Components** |
| `Thread` | Main conversation view container | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `ThreadWelcome` | Welcome screen shown when thread is empty | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `ThreadSuggestions` | Grid of suggestion buttons in welcome screen | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `ThreadScrollToBottom` | Scroll-to-bottom button (shown above composer) | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| **Message Components** |
| `UserMessage` | User's message bubble with actions | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `AssistantMessage` | AI assistant response with markdown rendering | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `SystemMessage` | System notification message card | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `EditComposer` | Inline editor shown when editing a message | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `MessageError` | Error message display component | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `UserMessageAttachments` | Displays attachments in user messages | Yes | `apps/registry/src/components/assistant-ui/attachment.tsx` |
| **Message Action Components** |
| `UserActionBar` | Action bar with edit button for user messages | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `AssistantActionBar` | Action bar with copy and reload buttons for assistant messages | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `BranchPicker` | Navigation controls for message branches (previous/next/count) | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| **Composer Components** |
| `Composer` | Main input area wrapper (sticky at bottom) | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `ComposerAction` | Action buttons container in composer | Yes | `apps/registry/src/components/assistant-ui/thread.tsx` |
| `ComposerAttachments` | Container for attached files in composer | Yes | `apps/registry/src/components/assistant-ui/attachment.tsx` |
| `ComposerAddAttachment` | Button to add attachments to composer | Yes | `apps/registry/src/components/assistant-ui/attachment.tsx` |
| **UI Primitives** |
| `Button` | Styled button component with variants | Yes | `apps/registry/src/components/ui/button.tsx` |
| `Separator` | Visual divider line | Yes | `apps/registry/src/components/ui/separator.tsx` |
| `Breadcrumb` | Navigation breadcrumb container | Yes | `apps/registry/src/components/ui/breadcrumb.tsx` |
| `BreadcrumbList` | Ordered list container for breadcrumb items | Yes | `apps/registry/src/components/ui/breadcrumb.tsx` |
| `BreadcrumbItem` | Individual breadcrumb item | Yes | `apps/registry/src/components/ui/breadcrumb.tsx` |
| `BreadcrumbSeparator` | Separator between breadcrumb items | Yes | `apps/registry/src/components/ui/breadcrumb.tsx` |
| `Skeleton` | Loading placeholder component | Yes | `apps/registry/src/components/ui/skeleton.tsx` |
| `SidebarMenu` | Menu list container (ul) | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarMenuItem` | Individual menu item (li) | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `SidebarMenuButton` | Button styled for sidebar menu | Yes | `apps/registry/src/components/ui/sidebar.tsx` |
| `TooltipIconButton` | Icon button with tooltip wrapper | Yes | `apps/registry/src/components/assistant-ui/tooltip-icon-button.tsx` |
| **Utility/Content Components** |
| `MarkdownText` | Renders markdown content with syntax highlighting | Yes | `apps/registry/src/components/assistant-ui/markdown-text.tsx` |
| `ToolFallback` | Renders tool call results and fallback UI | Yes | `apps/registry/src/components/assistant-ui/tool-fallback.tsx` |
| **Wallet Components** |
| `WalletFooter` | Wallet connection button and network display | Yes | `apps/landing/src/components/wallet/wallet-footer.tsx` |
| **External Libraries** |
| `Link` | Next.js Link component | Yes | `next/link` |
| `Image` | Next.js Image component | Yes | `next/image` |
| `LazyMotion` | Framer Motion lazy loader | No (wrapper) | `motion/react` |
| `MotionConfig` | Framer Motion configuration provider | No (wrapper) | `motion/react` |
| `ThreadPrimitive.*` | Core thread rendering primitives | Yes | `@assistant-ui/react` |
| `MessagePrimitive.*` | Message rendering primitives | Yes | `@assistant-ui/react` |
| `ComposerPrimitive.*` | Composer input primitives | Yes | `@assistant-ui/react` |
| `ActionBarPrimitive.*` | Message action bar primitives | Yes | `@assistant-ui/react` |
| `BranchPickerPrimitive.*` | Branch navigation primitives | Yes | `@assistant-ui/react` |
| `ThreadListPrimitive.*` | Thread list management primitives | Yes | `@assistant-ui/react` |
| `ErrorPrimitive.*` | Error display primitives | Yes | `@assistant-ui/react` |
| `AttachmentPrimitive.*` | Attachment handling primitives | Yes | `@assistant-ui/react` |
| Icons | Various icons from lucide-react | Yes | `lucide-react` |
