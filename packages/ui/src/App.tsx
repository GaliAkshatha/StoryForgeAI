import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./state/SessionContext";
import { AccessibilityProvider } from "./state/AccessibilityContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AccessibilityMenu } from "./components/AccessibilityMenu";

// Part 15 (Performance): route-level code splitting -- each page is
// only downloaded when actually navigated to, instead of one large
// bundle up front.
const LandingPage = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
const ParentAuthPage = lazy(() => import("./pages/ParentAuthPage").then(m => ({ default: m.ParentAuthPage })));
const ParentDashboardPage = lazy(() => import("./pages/ParentDashboardPage").then(m => ({ default: m.ParentDashboardPage })));
const AdventurePage = lazy(() => import("./pages/AdventurePage").then(m => ({ default: m.AdventurePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));

function RouteFallback() {

    return (
        <div className="min-h-screen flex items-center justify-center bg-night">
            <div
                role="status"
                aria-label="Loading"
                className="w-10 h-10 rounded-full border-2 border-ember/30 border-t-ember animate-spin"
            />
        </div>
    );

}

export function App() {

    return (
        <AccessibilityProvider>
            <SessionProvider>
                <BrowserRouter>

                    <AccessibilityMenu />

                    <Suspense fallback={<RouteFallback />}>
                        <Routes>

                            <Route path="/" element={<LandingPage />} />

                            <Route path="/auth" element={<ParentAuthPage />} />

                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <ParentDashboardPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/adventure/:childId"
                                element={
                                    <ProtectedRoute>
                                        <AdventurePage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                }
                            />

                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </SessionProvider>
        </AccessibilityProvider>
    );

}
