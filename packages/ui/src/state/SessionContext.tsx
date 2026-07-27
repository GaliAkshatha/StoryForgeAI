import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, ParentProfile } from "../api/client";

interface SessionState {

    token: string | null;

    parent: ParentProfile | null;

    // True while a persisted token is being verified against the
    // API on first load. ProtectedRoute waits for this instead of
    // redirecting a valid session to the login screen just because
    // `parent` hasn't been fetched yet.
    isRestoring: boolean;

    setSession: (token: string, parent: ParentProfile) => void;

    setParent: (parent: ParentProfile) => void;

    clearSession: () => void;

}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {

    const [token, setToken] = useState<string | null>(
        sessionStorage.getItem("storyforge_token")
    );

    const [parent, setParentState] = useState<ParentProfile | null>(null);

    const [isRestoring, setIsRestoring] = useState<boolean>(!!token);

    // A page reload keeps the JWT in sessionStorage but loses all
    // React state -- restore the parent profile once on mount using
    // the token alone (GET /auth/me). If the token is expired or
    // invalid, the API returns 401 and the session is cleared.
    useEffect(() => {

        if (!token) {

            setIsRestoring(false);

            return;

        }

        api.me(token)

            .then(result => setParentState(result.parent))

            .catch(() => {

                sessionStorage.removeItem("storyforge_token");

                setToken(null);

            })

            .finally(() => setIsRestoring(false));

        // Only ever run this once per mount/token-presence, not on
        // every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setSession = (nextToken: string, nextParent: ParentProfile) => {

        sessionStorage.setItem("storyforge_token", nextToken);

        setToken(nextToken);

        setParentState(nextParent);

    };

    const setParent = (nextParent: ParentProfile) => {

        setParentState(nextParent);

    };

    const clearSession = () => {

        sessionStorage.removeItem("storyforge_token");

        setToken(null);

        setParentState(null);

    };

    return (
        <SessionContext.Provider value={{ token, parent, isRestoring, setSession, setParent, clearSession }}>
            {children}
        </SessionContext.Provider>
    );

}

export function useSession(): SessionState {

    const context = useContext(SessionContext);

    if (!context) {

        throw new Error("useSession must be used within a SessionProvider.");

    }

    return context;

}
