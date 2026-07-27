import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useSession } from "../state/SessionContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {

    const { token, isRestoring } = useSession();

    // Wait for the JWT-based session restore (GET /auth/me) to
    // finish before deciding whether to redirect -- otherwise a
    // valid, persisted session briefly bounces to the login screen
    // on every page reload.
    if (isRestoring) {

        return (
            <div className="min-h-screen flex items-center justify-center bg-night">
                <div
                    role="status"
                    className="w-10 h-10 rounded-full border-2 border-ember/30 border-t-ember animate-spin"
                />
            </div>
        );

    }

    if (!token) {
        return <Navigate to="/auth?mode=login" replace />;
    }

    return <>{children}</>;

}
