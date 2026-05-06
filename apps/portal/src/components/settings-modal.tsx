"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useApiKey } from "@/lib/use-api-key";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { apiKey, setApiKey } = useApiKey();
  const [inputValue, setInputValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync input with stored API key when modal opens
  useEffect(() => {
    if (open) {
      setInputValue(apiKey);
      setStatusMessage(null);
    }
  }, [open, apiKey]);

  const handleSave = () => {
    setApiKey(inputValue);
    setStatusMessage("API key saved successfully.");
    // Clear status message after 3 seconds
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const handleCancel = () => {
    setInputValue(apiKey); // Reset to stored value
    setStatusMessage(null);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <Dialog.Title className="text-xl font-semibold text-gray-900">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* API Key Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">API Key</h2>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  {statusMessage}
                </div>
              )}

              {/* Input Field */}
              <div className="mb-4">
                <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    id="api-key-input"
                    type={showPassword ? "text" : "password"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your API key is stored locally in your browser and is not shared with anyone.
                </p>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 my-6" />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-[#28C840] rounded-md hover:bg-[#28C840]/90 focus:outline-none focus:ring-2 focus:ring-[#28C840] focus:ring-offset-2 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
