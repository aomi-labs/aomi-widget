"use client";

import { useState, type FC } from "react";
import { KeyIcon, CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useControl, cn } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export type ApiKeyInputProps = {
  className?: string;
  title?: string;
  description?: string;
};

export const ApiKeyInput: FC<ApiKeyInputProps> = ({
  className,
  title = "Aomi API Key",
  description = "Enter your API key to authenticate with Aomi services.",
}) => {
  const { state, setState } = useControl();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);

  const hasApiKey = Boolean(state.apiKey);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative rounded-full", className)}
          aria-label={hasApiKey ? "API key configured" : "Set API key"}
        >
          <KeyIcon className={cn("h-4 w-4", hasApiKey && "text-green-500")} />
          {hasApiKey && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[280px] pl-4 rounded-3xl">
        <DialogHeader className="border-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="api-key" className="mb-2">
              API Key
            </Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder={hasApiKey ? "********" : "Enter your API key"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="rounded-full pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? (
                  <EyeIcon className="h-4 w-4" />
                ) : (
                  <EyeOffIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {hasApiKey && (
              <p className="text-muted-foreground text-xs">
                <CheckIcon className="mr-1 inline h-3 w-3 text-green-500" />
                API key is configured
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          {hasApiKey && (
            <Button
              variant="outline"
              onClick={() => {
                setState({ apiKey: null });
                setInputValue("");
              }}
            >
              Clear
            </Button>
          )}
          <Button
            onClick={() => {
              if (inputValue.trim()) {
                setState({ apiKey: inputValue.trim() });
                setOpen(false);
                setInputValue("");
              }
            }}
            disabled={!inputValue.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
