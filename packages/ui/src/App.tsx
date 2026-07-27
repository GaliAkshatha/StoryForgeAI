import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./state/SessionContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { ParentAuthPage } from "./pages/ParentAuthPage";
import { ParentDashboardPage } from "./pages/ParentDashboardPage";
import { AdventurePage } from "./pages/AdventurePage";
import { ProfilePage } from "./pages/ProfilePage";

export function App() {

    return (
        <SessionProvider>
            <BrowserRouter>
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
            </BrowserRouter>
        </SessionProvider>
    );

}
