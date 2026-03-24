import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";

// Docs
import DocsLayout from "@/layouts/DocsLayout";
import DocsOverview from "@/pages/docs/DocsOverview";
import DocsConcepts from "@/pages/docs/DocsConcepts";
import DocsQuickstart from "@/pages/docs/DocsQuickstart";
import DocsApiReference from "@/pages/docs/DocsApiReference";
import DocsWebhooks from "@/pages/docs/DocsWebhooks";
import DocsIntegrations from "@/pages/docs/DocsIntegrations";
import DocsTrustLaw from "@/pages/docs/DocsTrustLaw";

// Dashboard
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import TransactionsPage from "@/pages/dashboard/TransactionsPage";
import TransactionDetailPage from "@/pages/dashboard/TransactionDetailPage";
import EscrowAccountsPage from "@/pages/dashboard/EscrowAccountsPage";
import SpendingRulesPage from "@/pages/dashboard/SpendingRulesPage";
import ApprovalsPage from "@/pages/dashboard/ApprovalsPage";
import ApprovalDetailPage from "@/pages/dashboard/ApprovalDetailPage";
import ApiKeysPage from "@/pages/dashboard/ApiKeysPage";
import AuditLogPage from "@/pages/dashboard/AuditLogPage";
import WebhooksPage from "@/pages/dashboard/WebhooksPage";
import { SettingsPage } from "@/pages/dashboard/PlaceholderPages";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* Docs routes */}
                    <Route path="/docs" element={<DocsLayout />}>
                        <Route index element={<DocsOverview />} />
                        <Route path="concepts" element={<DocsConcepts />} />
                        <Route path="trust-law" element={<DocsTrustLaw />} />
                        <Route path="quickstart" element={<DocsQuickstart />} />
                        <Route path="api" element={<DocsApiReference />} />
                        <Route path="webhooks" element={<DocsWebhooks />} />
                        <Route path="integrations" element={<DocsIntegrations />} />
                    </Route>

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
                        <Route path="transactions/:id" element={<TransactionDetailPage />} />
                        <Route path="approvals" element={<ApprovalsPage />} />
                        <Route path="approvals/:id" element={<ApprovalDetailPage />} />
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
