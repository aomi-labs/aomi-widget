"use client";

import { useState } from "react";

export function PrivacySettings() {
  const [dataRetention, setDataRetention] = useState("30");
  const [saveHistory, setSaveHistory] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  const handleSave = () => {
    // Save privacy settings
    console.log("Privacy settings saved", { dataRetention, saveHistory, analytics });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Retention</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="data-retention" className="block text-sm font-medium text-gray-700 mb-2">
              Conversation history retention
            </label>
            <select
              id="data-retention"
              value={dataRetention}
              onChange={(e) => setDataRetention(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="never">Never delete</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              How long to keep your conversation history. Older conversations will be automatically deleted.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation History</h3>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Save conversation history</p>
            <p className="text-sm text-gray-500 mt-1">
              When enabled, your conversations will be saved and accessible across devices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSaveHistory(!saveHistory)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              saveHistory ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                saveHistory ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h3>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Usage analytics</p>
            <p className="text-sm text-gray-500 mt-1">
              Help improve the service by sharing anonymous usage data. This data cannot be used to identify you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAnalytics(!analytics)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              analytics ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                analytics ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
