# Quick Start: Adding Your First ToolUI

## 1. Copy the Example

You already have an example tool at:
```
components/tools/example-tool/ExampleTool.tsx
```

## 2. Customize It

```typescript
// components/tools/my-custom-tool/MyCustomTool.tsx
"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";

type MyToolArgs = {
  // Your tool arguments
  param1: string;
  param2?: number;
};

type MyToolResult = {
  // Your tool result structure
  success: boolean;
  data: any;
};

export const MyCustomTool = makeAssistantToolUI<MyToolArgs, MyToolResult>({
  // ⚠️ MUST match your backend tool name EXACTLY
  toolName: "my_backend_tool_name",

  render: ({ args, result, status }) => {
    // Loading state
    if (status.type === "running") {
      return <div>Loading...</div>;
    }

    // Result state
    if (result) {
      return (
        <div>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      );
    }

    return null;
  },
});
```

## 3. Register in Your App

Find where you render your `<Thread />` component and add your ToolUI:

```typescript
// app/page.tsx (or wherever your Thread component is)
import { Thread } from "@/components/assistant-ui/thread";
import { MyCustomTool } from "@/components/tools/my-custom-tool/MyCustomTool";

export default function Page() {
  return (
    <div>
      <Thread />

      {/* Add your tool here - just render it! */}
      <MyCustomTool />
    </div>
  );
}
```

## 4. Test It

1. **Make sure your backend has a tool with matching name:**
   ```python
   # Backend example
   tools = [
       {
           "name": "my_backend_tool_name",  # Must match toolName in ToolUI
           "description": "Does something cool",
           "parameters": { ... }
       }
   ]
   ```

2. **Ask your AI to use the tool:**
   ```
   User: "Can you use the my_backend_tool_name tool with param1='test'?"
   ```

3. **Your custom UI should appear!** 🎉

## Common Issues

### Tool Not Showing Up?

✅ **Checklist:**
- [ ] Tool name matches exactly (case-sensitive!)
- [ ] ToolUI component is rendered in component tree
- [ ] Backend returns tool call in correct format
- [ ] AssistantRuntimeProvider wraps your app

### Check Registration

Add this debug component temporarily:

```typescript
import { useAssistantApi } from "@assistant-ui/react";
import { useEffect } from "react";

function DebugTools() {
  const api = useAssistantApi();

  useEffect(() => {
    const tools = api.toolUIs().getState();
    console.log("Registered ToolUIs:", tools);
  }, [api]);

  return null;
}

// Add to your page
<DebugTools />
```

## Next Steps

See **TOOL-UI-GUIDE.md** for:
- Advanced patterns (human-in-the-loop, interactive UIs)
- Error handling
- Loading states
- Multiple tool UIs
- Best practices

## Examples in This Project

After you create your first tool, you can organize them like this:

```
components/tools/
├── example-tool/
│   └── ExampleTool.tsx          ← Example (already exists)
├── my-custom-tool/
│   ├── MyCustomTool.tsx         ← Your ToolUI registration
│   ├── my-custom-ui.tsx         ← UI component
│   └── types.ts                 ← Type definitions
└── another-tool/
    └── AnotherTool.tsx
```

Then register all in one place:

```typescript
// app/page.tsx
import { ExampleTool } from "@/components/tools/example-tool/ExampleTool";
import { MyCustomTool } from "@/components/tools/my-custom-tool/MyCustomTool";
import { AnotherTool } from "@/components/tools/another-tool/AnotherTool";

export default function Page() {
  return (
    <>
      <Thread />
      <ExampleTool />
      <MyCustomTool />
      <AnotherTool />
    </>
  );
}
```

That's it! 🚀
