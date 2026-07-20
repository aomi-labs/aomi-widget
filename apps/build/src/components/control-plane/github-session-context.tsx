"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchGitHubSession,
  type GitHubSessionInfo,
} from "@build/features/launch/dashboard";

export type GitHubAccountState = GitHubSessionInfo & {
  loading: boolean;
};

type GitHubSessionContextValue = {
  account: GitHubAccountState;
  setAccount: (account: GitHubAccountState) => void;
};

const signedOutState: GitHubAccountState = {
  loading: false,
  signedIn: false,
  githubLogin: null,
  githubAvatarUrl: null,
  installationId: null,
};

const initialState: GitHubAccountState = {
  ...signedOutState,
  loading: true,
};

const GitHubSessionContext = createContext<GitHubSessionContextValue | null>(
  null,
);

export function signedOutGitHubAccount(): GitHubAccountState {
  return signedOutState;
}

export function GitHubSessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<GitHubAccountState>(initialState);

  useEffect(() => {
    let cancelled = false;
    fetchGitHubSession().then((session) => {
      if (!cancelled) setAccount({ ...session, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      account,
      setAccount,
    }),
    [account],
  );

  return (
    <GitHubSessionContext.Provider value={value}>
      {children}
    </GitHubSessionContext.Provider>
  );
}

export function useGitHubSession() {
  const context = useContext(GitHubSessionContext);
  if (!context) {
    throw new Error(
      "useGitHubSession must be used inside GitHubSessionProvider",
    );
  }
  return context;
}
