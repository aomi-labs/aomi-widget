"use client";

import { useState } from "react";

export function AccountSettings() {
  const [email, setEmail] = useState("user@example.com");
  const [username, setUsername] = useState("");

  const handleSave = () => {
    // Save account settings
    console.log("Account settings saved", { email, username });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter your username"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
        <div className="space-y-3">
          <button
            type="button"
            className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            Change password
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-3 border border-red-300 rounded-md hover:bg-red-50 text-sm font-medium text-red-700"
          >
            Delete account
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
