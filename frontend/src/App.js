import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import NotFoundPage from "@/pages/NotFoundPage";
import InviteAcceptPage from "@/pages/InviteAcceptPage";
import ApprovalActionPage from "@/pages/ApprovalActionPage";

// Blog
import { BlogIndexPage, BlogPostPage } from "@/pages/BlogPage";

// Docs
import DocsLayout from "@/layouts/DocsLayout";
import DocsOverview from "@/pages/docs/DocsOverview";
import DocsConcepts from "@/pages/docs/DocsConcepts";
import DocsQuickstart from "@/pages/docs/DocsQuickstart";
import DocsApiReference from "@/pages/docs/DocsApiReference";
import DocsWebhooks from "@/pages/docs/DocsWebhooks";
import DocsIntegrations from "@/pages/docs/DocsIntegrations";
import DocsTrustLaw from "@/pages/docs/DocsTrustLaw";
import DocsSDKs from "@/pages/docs/DocsSDKs";

// Dashboard
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import TransactionsPage from "@/pages/dashboard/TransactionsPage";
import TransactionDetailPage from "@/pages/dashboard/TransactionDetailPage";
import EscrowAccountsPage from "@/pages/dashboard/EscrowAccountsPage";
import SpendingRulesPage from "@/pages/dashboard/SpendingRulesPage";
import FiduciaryPoliciesPage from "@/pages/dashboard/FiduciaryPoliciesPage";
import ApprovalsPage from "@/pages/dashboard/ApprovalsPage";
import ApprovalDetailPage from "@/pages/dashboard/ApprovalDetailPage";
import ApiKeysPage from "@/pages/dashboard/ApiKeysPage";
import AuditLogPage from "@/pages/dashboard/AuditLogPage";
import WebhooksPage from "@/pages/dashboard/WebhooksPage";
import DashboardPlaygroundPage from "@/pages/dashboard/PlaygroundPage";
import PricingPage from "@/pages/dashboard/PricingPage";

// Public Playground
import PublicPlaygroundPage from "@/pages/PlaygroundPage";
import { SettingsPage } from "@/pages/dashboard/PlaceholderPages";
import TeamPage from "@/pages/dashboard/TeamPage";
import ExportsPage from "@/pages/dashboard/ExportsPage";

// Admin (new API key based system)
import AdminLayout from "@/layouts/AdminLayout";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminOverviewPage from "@/pages/admin/AdminOverviewPage";
import AdminHealthPage from "@/pages/admin/AdminHealthPage";
import AdminBlogPage from "@/pages/admin/AdminBlogPage";
import AdminBlogEditorPage from "@/pages/admin/AdminBlogEditorPage";
import AdminMetricsPage from "@/pages/admin/AdminMetricsPage";
import AdminAuditPage from "@/pages/admin/AdminAuditPage";
import AdminKeysPage from "@/pages/admin/AdminKeysPage";
import AdminFeedbackPage from "@/pages/admin/AdminFeedbackPage";

// Feedback Page
import FeedbackPage from "@/pages/FeedbackPage";

// Admin wrapper component that provides AdminContext (API key auth)
const AdminRoutes = () => (
    <AdminProvider>
        <Routes>
            <Route path="/login" element={<AdminLoginPage />} />
            <Route element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="health" element={<AdminHealthPage />} />
                <Route path="blog" element={<AdminBlogPage />} />
                <Route path="blog/new" element={<AdminBlogEditorPage />} />
                <Route path="blog/edit/:id" element={<AdminBlogEditorPage />} />
                <Route path="metrics" element={<AdminMetricsPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
                <Route path="keys" element={<AdminKeysPage />} />
                <Route path="feedback" element={<AdminFeedbackPage />} />
            </Route>
        </Routes>
    </AdminProvider>
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
                    <Route path="/invite/:token" element={<InviteAcceptPage />} />
                    <Route path="/approval-action" element={<ApprovalActionPage />} />

                    {/* Docs routes */}
                    <Route path="/docs" element={<DocsLayout />}>
                        <Route index element={<DocsOverview />} />
                        <Route path="concepts" element={<DocsConcepts />} />
                        <Route path="trust-law" element={<DocsTrustLaw />} />
                        <Route path="quickstart" element={<DocsQuickstart />} />
                        <Route path="api" element={<DocsApiReference />} />
                        <Route path="webhooks" element={<DocsWebhooks />} />
                        <Route path="integrations" element={<DocsIntegrations />} />
                        <Route path="sdks" element={<DocsSDKs />} />
                    </Route>

                    {/* Blog routes */}
                    <Route path="/blog" element={<BlogIndexPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />

                    {/* Public Playground */}
                    <Route path="/playground" element={<PublicPlaygroundPage />} />

                    {/* Feature Requests Board (requires auth) */}
                    <Route
                        path="/feedback"
                        element={
                            <ProtectedRoute>
                                <FeedbackPage />
                            </ProtectedRoute>
                        }
                    />

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
                        <Route path="rules" element={<FiduciaryPoliciesPage />} />
                        <Route path="transactions" element={<TransactionsPage />} />
                        <Route path="transactions/:id" element={<TransactionDetailPage />} />
                        <Route path="approvals" element={<ApprovalsPage />} />
                        <Route path="approvals/:id" element={<ApprovalDetailPage />} />
                        <Route path="playground" element={<DashboardPlaygroundPage />} />
                        <Route path="keys" element={<ApiKeysPage />} />
                        <Route path="webhooks" element={<WebhooksPage />} />
                        <Route path="audit" element={<AuditLogPage />} />
                        <Route path="pricing" element={<PricingPage />} />
                        <Route path="team" element={<TeamPage />} />
                        <Route path="exports" element={<ExportsPage />} />
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
