# Project Progress Summary

## Completed Tasks

### 1. Component Documentation
- Created `COMPONENT.md` with full component dependency diagram starting from `AomiFrame`
- Added ASCII visual layouts for major components
- Documented all props, responsibilities, and usage patterns

### 2. Sidebar Collapse/Expand Fix
**Issue**: `SidebarInset` didn't expand when `ThreadListSidebar` collapsed

**Solution** (`components/ui/sidebar.tsx`):
- Added width classes to parent Sidebar div (line 211-216):
  - `w-[var(--sidebar-width)]`
  - `data-[collapsible=offcanvas]:w-0`
  - `transition-[width] duration-200 ease-linear`
- Changed `h-svh` to `h-full` (line 238) to respect AomiFrame container height

**Solution** (`components/aomi-frame.tsx`):
- Removed wrapper div around `ThreadListSidebar` to establish proper peer relationship

### 3. Custom Logo Integration
**File**: `components/assistant-ui/threadlist-sidebar.tsx` (line 38-43)
- Replaced `MessagesSquare` icon with custom `/assets/images/a.svg`
- Added white background for visibility (black icon on transparent background)

### 4. Code Block Styling
**File**: `components/assistant-ui/markdown-text.tsx`
- Added `font-mono` class to `<pre>` elements (line 208)
- Added `font-mono` class to `<code>` elements (line 220)
- Fixed font family from sans-serif to monospace

### 5. Tool Call Display
**Issue**: Backend tool calls mixed with message text instead of displaying in Tool UI

**Solution** (`components/assistant-ui/runtime.tsx` lines 21-50):
- Modified `convertMessage` to format `tool_stream` as proper `type: "tool-call"` content parts
- Tool calls now render in `ToolFallback` component

**Enhanced styling** (`components/assistant-ui/tool-fallback.tsx`):
- Added `text-xs`, `font-mono`, `bg-muted`, `p-3`, `rounded-lg`, `overflow-x-auto`

### 6. Wallet Button Integration
**File**: `components/assistant-ui/threadlist-sidebar.tsx`
- Added `<AppKitButton />` in `SidebarFooter` (line 64)

**File**: `app/layout.tsx`
- Fixed duplicate `{children}` rendering that broke wallet provider context

### 7. AppKit Theme Customization
**File**: `app/globals.css` (lines 133-158)
- Overrode AppKit CSS variables to match app theme:
  - `--apkt-tokens-core-backgroundAccentPrimary`
  - `--apkt-tokens-core-backgroundAccentSecondary`
  - `--apkt-tokens-core-foregroundPrimary`
  - `--apkt-tokens-core-borderPrimary`
- Added dark mode support with `.dark` selector
- Added CSS to make nested AppKit button components fill container width

## Current Codebase Status

### Working Features
- AomiFrame container with collapsible sidebar
- Thread-based chat interface with message history
- Tool call rendering in dedicated UI component
- Custom branding (logo in sidebar header)
- Monospace code blocks in markdown
- AppKitButton for crypto wallet connection
- Wallet state sync with backend (connect/disconnect/network switch)
- Dark mode theming throughout

### Key Files Modified
| File | Changes |
|------|---------|
| `components/ui/sidebar.tsx` | Width classes, height fix |
| `components/aomi-frame.tsx` | Removed wrapper div |
| `components/assistant-ui/threadlist-sidebar.tsx` | Custom logo, wallet button |
| `components/assistant-ui/markdown-text.tsx` | Monospace fonts |
| `components/assistant-ui/runtime.tsx` | Tool call conversion |
| `components/assistant-ui/tool-fallback.tsx` | Enhanced styling |
| `app/layout.tsx` | Fixed duplicate children |
| `app/globals.css` | AppKit theme overrides |

### Technical Notes
- Using `oklch()` color format (not `hsl()`)
- CSS variables cascade through selector scopes
- AppKit uses Shadow DOM - style via CSS variables or `::part()` selectors
- Peer selectors require proper DOM sibling relationships

### Known Considerations
- AppKit button inner components styled via CSS variables (Shadow DOM limitation)
- Sidebar height respects AomiFrame 80vh container
- Polling interval for backend state: 500ms

## Architecture Overview
```
AomiFrame (80vh container)
├── SidebarProvider
│   ├── ThreadListSidebar (collapsible, 16rem)
│   │   ├── Header (logo)
│   │   ├── Content (thread list)
│   │   └── Footer (wallet button)
│   └── SidebarInset (expands on collapse)
│       └── Thread
│           ├── ThreadWelcome
│           ├── ThreadMessages
│           └── Composer
```

## Runtime Flow
1. `AomiRuntimeProvider` initializes with backend URL and session ID
2. Fetches initial state from backend
3. User messages trigger `onNew` → POST to backend → start polling
4. `isRunning` state controls UI loading indicators
5. Wallet events send system messages to backend
