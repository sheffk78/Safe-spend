import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DocsPage from "@/pages/DocsPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";

// Dashboard
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import {
    EscrowAccountsPage,
    SpendingRulesPage,
    TransactionsPage,
    ApprovalsPage,
    ApiKeysPage,
    WebhooksPage,
    AuditLogPage,
    SettingsPage
} from "@/pages/dashboard/PlaceholderPages";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/docs" element={<DocsPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* Protected dashboard routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<DashboardOverview />} />
                        <Route path="accounts" element={<EscrowAccountsPage />} />
                        <Route path="rules" element={<SpendingRulesPage />} />
                        <Route path="transactions" element={<TransactionsPage />} />
                        <Route path="approvals" element={<ApprovalsPage />} />
                        <Route path="keys" element={<ApiKeysPage />} />
                        <Route path="webhooks" element={<WebhooksPage />} />
                        <Route path="audit" element={<AuditLogPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
