"use client";

import { useEffect, useRef, useState } from "react";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { WalletFooter } from "@/components/wallet-footer";

export function HeroTerminal() {
  const [terminalState, setTerminalState] = useState<
    "normal" | "minimized" | "expanded" | "closed"
  >("normal");
  const [lastOpenState, setLastOpenState] = useState<"normal" | "expanded">(
    "normal",
  );
  const [isMinimizing, setIsMinimizing] = useState(false);
  const [isRestoringFromMinimize, setIsRestoringFromMinimize] = useState(false);
  const minimizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (minimizeTimeoutRef.current) {
        clearTimeout(minimizeTimeoutRef.current);
      }
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
      }
    };
  }, []);

  const handleTerminalClose = () => {
    if (minimizeTimeoutRef.current) {
      clearTimeout(minimizeTimeoutRef.current);
      minimizeTimeoutRef.current = null;
    }
    if (restoreTimeoutRef.current) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
    setIsMinimizing(false);
    setIsRestoringFromMinimize(false);
    setLastOpenState("normal");
    setTerminalState("closed");
  };

  const handleTerminalMinimize = () => {
    if (terminalState === "minimized" || terminalState === "closed") return;
    if (minimizeTimeoutRef.current) {
      clearTimeout(minimizeTimeoutRef.current);
    }
    if (restoreTimeoutRef.current) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
    setIsRestoringFromMinimize(false);
    setLastOpenState(terminalState === "expanded" ? "expanded" : "normal");
    setIsMinimizing(true);
    minimizeTimeoutRef.current = setTimeout(() => {
      setIsMinimizing(false);
      setTerminalState("minimized");
      minimizeTimeoutRef.current = null;
    }, 230);
  };

  const handleTerminalExpand = () => {
    setTerminalState((prev) => {
      const next = prev === "expanded" ? "normal" : "expanded";
      setLastOpenState(next as "normal" | "expanded");
      return next;
    });
  };

  const handleRestoreFromClosed = () => {
    if (minimizeTimeoutRef.current) {
      clearTimeout(minimizeTimeoutRef.current);
      minimizeTimeoutRef.current = null;
    }
    setLastOpenState("normal");
    setTerminalState("normal");
  };

  const handleRestoreFromMinimized = () => {
    if (restoreTimeoutRef.current) {
      clearTimeout(restoreTimeoutRef.current);
    }
    setIsMinimizing(false);
    setTerminalState(lastOpenState);
    setIsRestoringFromMinimize(true);
    restoreTimeoutRef.current = setTimeout(() => {
      setIsRestoringFromMinimize(false);
      restoreTimeoutRef.current = null;
    }, 350);
  };

  const isTerminalVisible =
    terminalState !== "closed" && terminalState !== "minimized";
  const terminalWrapperSpacing =
    terminalState === "closed" || terminalState === "minimized"
      ? "pt-4 pb-6"
      : "pt-10 pb-10";
  const terminalSizeClasses =
    terminalState === "expanded"
      ? "max-w-[1260px] h-[900px]"
      : "max-w-[900px] h-[680px]";
  const terminalAnimationClass = isMinimizing
    ? "terminal-animate-shrink"
    : isRestoringFromMinimize
      ? "terminal-animate-pop"
      : "";

  return (
    <>
      <div
        className={`flex w-full max-w-[1500px] flex-col items-center justify-start ${terminalWrapperSpacing}`}
      >
        {isTerminalVisible && (
          <div
            id="terminal-container"
            className={`w-full ${terminalSizeClasses} origin-bottom-left transform transition-all duration-300 ${terminalAnimationClass}`}
          >
            <AomiFrame
              height="100%"
              width="100%"
              walletFooter={(props) => <WalletFooter {...props} />}
            />
          </div>
        )}

        {terminalState === "closed" && (
          <div className="py-10">
            <button
              type="button"
              onClick={handleRestoreFromClosed}
              className="rounded-full border border-gray-300 bg-gray-200 px-8 py-3 font-['Bauhaus_Chez_Display_2.0'] text-sm font-light text-gray-900 transition-colors hover:bg-gray-300"
            >
              + New Conversation
            </button>
          </div>
        )}
      </div>

      {terminalState === "minimized" && (
        <button
          type="button"
          aria-label="Restore terminal"
          onClick={handleRestoreFromMinimized}
          className="fixed bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-white shadow-xl focus:ring-2 focus:ring-gray-400 focus:outline-none"
        >
          <span className="text-2xl">{"\u{1F4AC}"}</span>
        </button>
      )}
    </>
  );
}
