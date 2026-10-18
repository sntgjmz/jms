import { createContext, useContext, useState, type PropsWithChildren } from "react";

export type StoredSession = {
  accessToken: string;
  refreshToken?: string | null;
  sessionId: string;
  principalType: "SUPERADMIN" | "ADMIN" | "BOAT_OPERATOR" | "USER";
  principalId: number;
  username: string;
  accessExpiresAt: string;
};

export type PendingGoogleProfile = {
  idToken: string;
  email: string;
  googleSub?: string;
  pictureUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  birthday?: string | null;
  middleName?: string | null;
};

export type DemoRole = "passenger" | "operator";

export function createDemoSession(role: DemoRole): StoredSession {
  return {
    accessToken: role === "operator" ? "demo-operator" : "demo-passenger",
    refreshToken: null,
    sessionId: `local-${role}`,
    principalType: role === "operator" ? "BOAT_OPERATOR" : "USER",
    principalId: role === "operator" ? 101 : 1,
    username: role === "operator" ? "demo.operator" : "passenger.demo@example.com",
    accessExpiresAt: "2099-12-31T23:59:59Z",
  };
}

function getInitialSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const role = new URLSearchParams(window.location.search).get("role");
  if (role === "operator" || window.location.pathname.includes("/operator/")) return createDemoSession("operator");
  if (role === "passenger" || window.location.pathname.includes("/user/")) return createDemoSession("passenger");
  return null;
}

type AuthContextValue = {
  session: StoredSession | null;
  pendingGoogleProfile: PendingGoogleProfile | null;
  pushRegistrationError: { title: string; message: string } | null;
  isHydrating: boolean;
  setSession: (session: StoredSession | null) => Promise<void>;
  setPendingGoogleProfile: (profile: PendingGoogleProfile | null) => void;
  clearPushRegistrationError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<StoredSession | null>(getInitialSession);
  const [pendingGoogleProfile, setPendingGoogleProfile] = useState<PendingGoogleProfile | null>(null);

  return (
    <AuthContext.Provider value={{
      session,
      pendingGoogleProfile,
      pushRegistrationError: null,
      isHydrating: false,
      setSession: async (nextSession) => {
        setSessionState(nextSession);
        if (typeof window === "undefined") return;
        // Keep the canonical showcase entry in sync without reloading in-memory edits.
        const host = window.parent !== window ? window.parent : window;
        const url = new URL(host.location.href);
        if (nextSession) {
          url.searchParams.set("role", nextSession.principalType === "BOAT_OPERATOR" ? "operator" : "passenger");
        } else {
          url.searchParams.delete("role");
        }
        if (window.parent !== window) {
          url.pathname = new URL("./index.html", window.location.href).pathname;
        }
        host.history.replaceState(null, "", url);
      },
      setPendingGoogleProfile,
      clearPushRegistrationError: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
