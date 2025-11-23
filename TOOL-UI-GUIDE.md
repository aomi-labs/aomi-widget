# Tool UI Guide: Generative UI for Tool Calls

> **What is ToolUI?** Custom React components that render when your AI assistant calls a tool. This enables rich, interactive visualizations instead of just showing JSON results.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [How ToolUI Works](#how-toolui-works)
3. [Complete Example](#complete-example)
4. [Advanced Patterns](#advanced-patterns)
5. [Integration with Your Backend](#integration-with-your-backend)

---

## Quick Start

### 3-Step Setup

```typescript
// 1. Create a ToolUI component
import { makeAssistantToolUI } from "@assistant-ui/react";

export const MyToolUI = makeAssistantToolUI<TArgs, TResult>({
  toolName: "my_tool_name",
  render: ({ args, result, status, addResult }) => {
    return <div>Your custom UI here</div>;
  },
});

// 2. Register it in your app
export default function Page() {
  return (
    <>
      <Thread />
      <MyToolUI /> {/* Just render it anywhere in your component tree */}
    </>
  );
}

// 3. That's it! The ToolUI automatically shows when your AI calls "my_tool_name"
```

---

## How ToolUI Works

### Architecture Flow

```mermaid
graph LR
    A[AI calls tool] -->|tool_name: "get_weather"| B[Backend processes]
    B -->|Returns result| C[AssistantApi detects tool call]
    C -->|Looks up registered ToolUI| D[Renders WeatherToolUI]
    D -->|Shows custom UI| E[User sees weather card]
```

### What `makeAssistantToolUI` Does

```typescript
const WeatherToolUI = makeAssistantToolUI({
  toolName: "get_weather",  // Must match tool name from backend
  render: (props) => { ... } // Your custom React component
});

// Behind the scenes:
// 1. Creates a React component
// 2. Registers it with AssistantApi.toolUIs()
// 3. Automatically renders when tool is called
// 4. Provides reactive props (args, result, status)
```

---

## Complete Example

### Use Case: Stock Price Display

Let's create a custom UI that shows stock prices beautifully instead of raw JSON.

#### Step 1: Define Types

```typescript
// components/tools/stock-price/types.ts

export type StockPriceArgs = {
  ticker: string;
};

export type StockPriceResult = {
  snapshot: {
    price: number;
    day_change: number;
    day_change_percent: number;
    time: string;
  };
};
```

#### Step 2: Create UI Component

```typescript
// components/tools/stock-price/stock-price-card.tsx
"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StockPriceCardProps = {
  ticker: string;
  price: number;
  day_change: number;
  day_change_percent: number;
  time: string;
};

export function StockPriceCard({
  ticker,
  price,
  day_change,
  day_change_percent,
  time,
}: StockPriceCardProps) {
  const isPositive = day_change >= 0;
  const changeColor = isPositive ? "text-green-600" : "text-red-600";
  const ArrowIcon = isPositive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{ticker}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-3xl font-semibold">${price.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Day Change</p>
            <p className={`flex items-center text-lg font-medium ${changeColor}`}>
              <ArrowIcon className="mr-1 h-4 w-4" />
              ${Math.abs(day_change).toFixed(2)} (
              {Math.abs(day_change_percent).toFixed(2)}%)
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-lg font-medium">
              {new Date(time).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Step 3: Create ToolUI

```typescript
// components/tools/stock-price/StockPriceTool.tsx
"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import { StockPriceCard } from "./stock-price-card";
import type { StockPriceArgs, StockPriceResult } from "./types";

export const StockPriceTool = makeAssistantToolUI<
  StockPriceArgs,
  StockPriceResult
>({
  toolName: "get_stock_price", // MUST match backend tool name
  render: function StockPriceUI({ args, argsText, result, status }) {
    // Parse result if it exists
    const snapshot = result?.snapshot;

    return (
      <div className="mb-4 flex flex-col items-center gap-2">
        {/* Show the tool call */}
        <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
          get_stock_price({argsText})
        </pre>

        {/* Show loading state */}
        {status.type === "running" && (
          <div className="text-sm text-muted-foreground">
            Fetching stock data...
          </div>
        )}

        {/* Show result when available */}
        {snapshot && (
          <StockPriceCard
            ticker={args.ticker}
            price={snapshot.price}
            day_change={snapshot.day_change}
            day_change_percent={snapshot.day_change_percent}
            time={snapshot.time}
          />
        )}
      </div>
    );
  },
});
```

#### Step 4: Register in Your App

```typescript
// app/page.tsx
"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { StockPriceTool } from "@/components/tools/stock-price/StockPriceTool";

export default function Home() {
  return (
    <div className="flex h-dvh">
      <div className="flex-grow">
        <Thread />
        {/* Register the tool - that's it! */}
        <StockPriceTool />
      </div>
    </div>
  );
}
```

---

## ToolUI Props API

### Available Props

```typescript
type ToolCallMessagePartProps<TArgs, TResult> = {
  // Tool call information
  toolCallId: string;           // Unique ID for this tool call
  toolName: string;             // Name of the tool
  args: TArgs;                  // Parsed arguments
  argsText: string;             // Raw arguments as string

  // Result
  result: TResult | undefined;  // Tool result (undefined while running)

  // Status
  status: {
    type: "running" | "complete" | "requires-action" | "incomplete";
    reason?: string;
  };

  // Actions
  addResult: (result: TResult) => void;  // Add/update result (for human-in-the-loop)
  resume: (payload: unknown) => void;    // Resume execution (for interrupts)
};
```

### Props Breakdown

#### 1. **`args`** - Typed Tool Arguments
```typescript
// If your tool is called with: get_weather({ city: "SF", units: "celsius" })
// args = { city: "SF", units: "celsius" }

render: ({ args }) => {
  return <div>Weather for {args.city}</div>;
}
```

#### 2. **`argsText`** - Raw Arguments String
```typescript
// argsText = "{ city: \"SF\", units: \"celsius\" }"
// Useful for displaying the raw call

render: ({ argsText }) => {
  return <pre>{argsText}</pre>;
}
```

#### 3. **`result`** - Tool Result
```typescript
// result is undefined while running
// result = { temp: 72, conditions: "sunny" } after completion

render: ({ result, status }) => {
  if (status.type === "running") {
    return <div>Loading...</div>;
  }
  return <div>Temperature: {result.temp}°F</div>;
}
```

#### 4. **`status`** - Execution Status
```typescript
render: ({ status }) => {
  if (status.type === "running") return <Spinner />;
  if (status.type === "requires-action") return <ApprovalButton />;
  if (status.type === "complete") return <SuccessIcon />;
  return null;
}
```

#### 5. **`addResult`** - Human-in-the-Loop
```typescript
// For tools that require user confirmation
render: ({ args, addResult, result }) => {
  const handleConfirm = () => {
    addResult({ confirmed: true, timestamp: Date.now() });
  };

  if (result?.confirmed) {
    return <div>✓ Purchase confirmed!</div>;
  }

  return (
    <div>
      <p>Purchase {args.quantity} shares of {args.ticker}?</p>
      <button onClick={handleConfirm}>Confirm Purchase</button>
    </div>
  );
}
```

---

## Advanced Patterns

### Pattern 1: Human-in-the-Loop (Confirmation)

```typescript
// Tool that requires user approval before executing
export const PurchaseStockTool = makeAssistantToolUI<
  { ticker: string; quantity: number },
  { confirmed: boolean; transactionId?: string }
>({
  toolName: "purchase_stock",
  render: ({ args, result, status, addResult }) => {
    // Waiting for confirmation
    if (!result && status.type !== "running") {
      return (
        <div className="p-4 border rounded">
          <h3>Confirm Purchase</h3>
          <p>Buy {args.quantity} shares of {args.ticker}?</p>
          <button
            onClick={() => addResult({ confirmed: true })}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Confirm
          </button>
          <button
            onClick={() => addResult({ confirmed: false })}
            className="ml-2 bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      );
    }

    // After confirmation
    if (result?.confirmed) {
      return (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          ✓ Purchase completed!
          {result.transactionId && (
            <p className="text-sm">Transaction ID: {result.transactionId}</p>
          )}
        </div>
      );
    }

    // Cancelled
    if (result?.confirmed === false) {
      return (
        <div className="p-4 bg-gray-50 border rounded">
          Purchase cancelled
        </div>
      );
    }

    return null;
  },
});
```

### Pattern 2: Progressive Loading States

```typescript
export const DataAnalysisTool = makeAssistantToolUI<
  { dataset: string },
  { charts: any[]; summary: string }
>({
  toolName: "analyze_data",
  render: ({ args, result, status }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyzing {args.dataset}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Loading */}
          {status.type === "running" && (
            <div className="flex items-center gap-2">
              <Spinner />
              <span>Crunching the numbers...</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              <p className="mb-4">{result.summary}</p>
              <div className="grid grid-cols-2 gap-4">
                {result.charts.map((chart, i) => (
                  <ChartComponent key={i} data={chart} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  },
});
```

### Pattern 3: Interactive Results

```typescript
export const SearchResultsTool = makeAssistantToolUI<
  { query: string },
  { results: Array<{ title: string; url: string; snippet: string }> }
>({
  toolName: "web_search",
  render: ({ args, result }) => {
    const [expanded, setExpanded] = useState<number | null>(null);

    if (!result) return null;

    return (
      <div className="space-y-2">
        <h3 className="font-semibold">Search results for: {args.query}</h3>
        {result.results.map((item, i) => (
          <div key={i} className="border rounded p-3">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full text-left"
            >
              <h4 className="font-medium">{item.title}</h4>
            </button>
            {expanded === i && (
              <div className="mt-2 text-sm">
                <p className="text-gray-600">{item.snippet}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Visit →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
});
```

### Pattern 4: Error Handling

```typescript
export const APICallTool = makeAssistantToolUI<
  { endpoint: string },
  { data: any } | { error: string }
>({
  toolName: "call_api",
  render: ({ args, result, status }) => {
    // Error state
    if (result && "error" in result) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="font-semibold text-red-800">Error</p>
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      );
    }

    // Success state
    if (result && "data" in result) {
      return (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-semibold">API Response</p>
          <pre className="mt-2 text-xs">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      );
    }

    // Loading
    return <div>Calling {args.endpoint}...</div>;
  },
});
```

---

## Integration with Your Backend

### Backend Requirements

Your backend needs to return tool calls in the correct format. Here's what assistant-ui expects:

```typescript
// Message format from backend
{
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "call_123",
      toolName: "get_stock_price",  // Must match your ToolUI.toolName
      args: {
        ticker: "AAPL"
      },
      result: {  // Optional initially, filled after execution
        snapshot: {
          price: 150.25,
          day_change: 2.5,
          day_change_percent: 1.69,
          time: "2024-01-15T16:00:00Z"
        }
      }
    }
  ]
}
```

### Example: Adding Tool Results from Backend

If your backend processes tools separately, you'll need to update messages with results:

```typescript
// In your runtime provider
const applyMessages = useCallback((msgs: SessionMessage[]) => {
  const threadMessages: ThreadMessageLike[] = [];

  for (const msg of msgs) {
    if (msg.type === "tool_call") {
      threadMessages.push({
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: msg.tool_call_id,
            toolName: msg.tool_name,
            args: msg.arguments,
            result: msg.result, // Result from backend
          },
        ],
      });
    }
    // ... handle other message types
  }

  setMessages(threadMessages);
}, []);
```

### Backend Tool Definition Example

```python
# Example backend tool definition (Python)
tools = [
    {
        "name": "get_stock_price",
        "description": "Get current stock price for a ticker symbol",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Stock ticker symbol (e.g., AAPL, GOOGL)"
                }
            },
            "required": ["ticker"]
        }
    }
]

# When AI calls the tool, execute and return result
def execute_tool(tool_name, arguments):
    if tool_name == "get_stock_price":
        ticker = arguments["ticker"]
        # Fetch from API...
        return {
            "snapshot": {
                "price": 150.25,
                "day_change": 2.5,
                "day_change_percent": 1.69,
                "time": datetime.now().isoformat()
            }
        }
```

---

## Multiple Tool UIs

You can register as many ToolUIs as you need:

```typescript
// app/page.tsx
export default function Home() {
  return (
    <>
      <Thread />

      {/* Register multiple tools */}
      <StockPriceTool />
      <WeatherTool />
      <CalendarTool />
      <SearchTool />
      <ChartTool />
    </>
  );
}
```

Each ToolUI automatically:
- Registers itself with `AssistantApi.toolUIs()`
- Renders when its matching tool is called
- Unregisters when component unmounts

---

## Fallback UI

If no ToolUI is registered for a tool, assistant-ui shows a default fallback:

```typescript
// Customize the fallback in your Thread component
<MessagePrimitive.Parts
  components={{
    tools: {
      Fallback: ({ toolName, args, result }) => (
        <div className="border rounded p-3 bg-gray-50">
          <div className="font-mono text-sm">
            <span className="font-semibold">{toolName}</span>
            <pre>{JSON.stringify(args, null, 2)}</pre>
            {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
          </div>
        </div>
      ),
    },
  }}
/>
```

---

## Best Practices

### ✅ Do's

1. **Match tool names exactly**
   ```typescript
   // Backend tool name: "get_weather"
   // ToolUI must use: toolName: "get_weather"
   ```

2. **Handle loading states**
   ```typescript
   {status.type === "running" && <LoadingSpinner />}
   ```

3. **Parse results safely**
   ```typescript
   const data = result ? JSON.parse(result) : null;
   ```

4. **Use TypeScript types**
   ```typescript
   makeAssistantToolUI<ArgsType, ResultType>({ ... })
   ```

5. **Keep UI components separate**
   ```
   /components/tools/stock-price/
     ├── StockPriceTool.tsx       // ToolUI registration
     ├── stock-price-card.tsx     // Pure UI component
     └── types.ts                 // Type definitions
   ```

### ❌ Don'ts

1. **Don't rely on result format**
   ```typescript
   // ❌ Bad - assumes result is always object
   const price = result.snapshot.price;

   // ✅ Good - handle undefined
   const price = result?.snapshot?.price;
   ```

2. **Don't forget error states**
   ```typescript
   // ❌ Bad
   return <div>{result.data}</div>;

   // ✅ Good
   if (!result) return <Loading />;
   if ("error" in result) return <Error message={result.error} />;
   return <div>{result.data}</div>;
   ```

3. **Don't hardcode tool names**
   ```typescript
   // ❌ Bad
   toolName: "get-stock-price"

   // ✅ Good - use constant
   const TOOL_NAMES = {
     STOCK_PRICE: "get_stock_price"
   } as const;

   toolName: TOOL_NAMES.STOCK_PRICE
   ```

---

## Debugging Tips

### 1. Tool Not Rendering?

Check these:
```typescript
// ✅ ToolUI is rendered in component tree
<StockPriceTool />

// ✅ Tool name matches exactly (case-sensitive!)
toolName: "get_stock_price" // Must match backend

// ✅ AssistantRuntimeProvider wraps your app
<AssistantRuntimeProvider runtime={runtime}>
  <Thread />
  <StockPriceTool />
</AssistantRuntimeProvider>
```

### 2. Inspect Registered Tools

```typescript
import { useAssistantApi } from "@assistant-ui/react";

function DebugTools() {
  const api = useAssistantApi();

  useEffect(() => {
    const state = api.toolUIs().getState();
    console.log("Registered tools:", state);
  }, [api]);

  return null;
}
```

### 3. Check Message Format

```typescript
const messages = useAssistantState(({ thread }) => thread.messages);
console.log("Messages:", messages);
// Look for content with type: "tool-call"
```

---

## Next Steps

1. **Start Simple**: Create a basic ToolUI with just args and result display
2. **Add Loading States**: Show spinners/skeletons while tool executes
3. **Enhance UI**: Add cards, charts, interactive elements
4. **Add Confirmation**: Implement human-in-the-loop for critical actions
5. **Error Handling**: Gracefully handle failures

---

## Resources

- [ToolFallback Component Docs](https://www.assistant-ui.com/docs/ui/ToolFallback)
- [MessagePart API Reference](https://www.assistant-ui.com/docs/api-reference/primitives/MessagePart)
- [LangGraph Example with Tools](https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-langgraph)

---

**Ready to build?** Start with the [Complete Example](#complete-example) and customize from there!
