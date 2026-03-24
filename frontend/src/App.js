import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import ScrollToTop from "@/components/ScrollToTop";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import NotFoundPage from "@/pages/NotFoundPage";

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
import PlaygroundPage from "@/pages/dashboard/PlaygroundPage";
import PricingPage from "@/pages/dashboard/PricingPage";
import { SettingsPage } from "@/pages/dashboard/PlaceholderPages";

// Admin
import AdminLayout from "@/layouts/AdminLayout";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminOrgsPage from "@/pages/admin/AdminOrgsPage";
import AdminOrgDetailPage from "@/pages/admin/AdminOrgDetailPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";

// Admin wrapper component that provides AdminAuthContext
const AdminRoutes = () => (
    <AdminAuthProvider>
        <ImpersonationBanner />
        <Routes>
            <Route path="/" element={<AdminLoginPage />} />
            <Route element={<AdminLayout />}>
                <Route path="orgs" element={<AdminOrgsPage />} />
                <Route path="orgs/:orgId" element={<AdminOrgDetailPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="settings" element={<div className="text-ss-text">Admin Settings (Coming Soon)</div>} />
            </Route>
        </Routes>
    </AdminAuthProvider>
);

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
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
                        <Route path="playground" element={<PlaygroundPage />} />
                        <Route path="keys" element={<ApiKeysPage />} />
                        <Route path="webhooks" element={<WebhooksPage />} />
                        <Route path="audit" element={<AuditLogPage />} />
                        <Route path="pricing" element={<PricingPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>

                    {/* Admin routes - separate auth system */}
                    <Route path="/admin/*" element={<AdminRoutes />} />

                    {/* 404 catch-all */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
