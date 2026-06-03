import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';

const PrivacyPage = () => {
    const location = useLocation();

    // Scroll to section if hash is present
    useEffect(() => {
        if (location.hash) {
            const element = document.querySelector(location.hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [location]);

    const sections = [
        { id: 'what-we-collect', title: '1. What Information We Collect' },
        { id: 'how-we-use', title: '2. How We Use Your Information' },
        { id: 'data-processing', title: '3. Data We Process on Your Behalf' },
        { id: 'sharing', title: '4. How We Share Your Information' },
        { id: 'stripe', title: '5. Stripe & Third-Party Services' },
        { id: 'retention', title: '6. Data Retention' },
        { id: 'security', title: '7. Security' },
        { id: 'your-rights', title: '8. Your Rights (GDPR / CCPA)' },
        { id: 'cookies', title: '9. Cookies & Tracking' },
        { id: 'children', title: '10. Children\'s Privacy' },
        { id: 'changes', title: '11. Changes to This Policy' },
        { id: 'contact', title: '12. Contact Us' },
    ];

    return (
        <div className="min-h-screen bg-ss-bg">
            <Helmet>
                <title>Privacy Policy | Safe-Spend</title>
                <meta name="description" content="Safe-Spend Privacy Policy — how Agentic Trust collects, uses, and protects your data including API usage, transaction records, and agent spend data." />
            </Helmet>
            <Navbar />
            
            <main className="pt-24 pb-20 px-6">
                <div className="max-w-[800px] mx-auto">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors mb-8"
                        data-testid="back-to-home"
                    >
                        <ArrowLeft size={18} />
                        Back to home
                    </Link>

                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="font-heading text-4xl font-bold text-ss-text mb-4">Privacy Policy</h1>
                        <div className="text-ss-text-secondary">
                            <p><strong>Effective Date:</strong> April 1, 2026</p>
                            <p><strong>Last Updated:</strong> April 1, 2026</p>
                        </div>
                        <p className="text-ss-text-secondary mt-6">
                            Agentic Trust, LLC ("we", "us", "our") operates Safe-Spend. This Privacy Policy describes 
                            how we collect, use, and share information when you use our API, dashboard, and related services. 
                            We believe you should understand exactly what data we handle — especially because Safe-Spend is 
                            a financial infrastructure tool.
                        </p>
                    </div>

                    {/* Table of Contents */}
                    <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)] mb-12">
                        <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Table of Contents</h2>
                        <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {sections.map((section) => (
                                <a
                                    key={section.id}
                                    href={`#${section.id}`}
                                    className="text-ss-text-secondary hover:text-ss-accent transition-colors text-sm"
                                >
                                    {section.title}
                                </a>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="space-y-12">
                        {/* Section 1 */}
                        <Section id="what-we-collect" title="1. What Information We Collect">
                            <SubSection title="Account Information">
                                <ul className="space-y-2">
                                    <li>Organization name, email address, password (stored as a bcrypt hash — we never store your plain-text password).</li>
                                </ul>
                            </SubSection>

                            <SubSection title="Billing & Payment Information">
                                <ul className="space-y-2">
                                    <li>Payment method details are processed and stored by <strong className="text-ss-text">Stripe</strong>, not by Safe-Spend directly.</li>
                                    <li>We store only your Stripe Customer ID and transaction references.</li>
                                </ul>
                            </SubSection>

                            <SubSection title="API Usage Data">
                                <ul className="space-y-2">
                                    <li>API keys (stored as hashed values — we never store full keys after issuance).</li>
                                    <li>Request timestamps, endpoint paths, IP addresses.</li>
                                    <li>Rate limit events and authentication attempts.</li>
                                </ul>
                            </SubSection>

                            <SubSection title="Transaction & Spend Data">
                                <ul className="space-y-2">
                                    <li>Protected account balances and funding history.</li>
                                    <li>Spend request details: amount, vendor, category, description, idempotency key.</li>
                                    <li>Rules engine evaluation results per transaction.</li>
                                    <li>Approval decisions and notes.</li>
                                </ul>
                            </SubSection>

                            <SubSection title="Audit Log Data">
                                <ul className="space-y-2">
                                    <li>Event type, actor type, actor ID, affected resources, timestamps, IP addresses.</li>
                                </ul>
                            </SubSection>

                            <SubSection title="Webhook Configuration">
                                <ul className="space-y-2">
                                    <li>Endpoint URLs and subscribed event types.</li>
                                    <li>HMAC secrets are stored securely and never returned in plaintext after creation.</li>
                                </ul>
                            </SubSection>
                        </Section>

                        {/* Section 2 */}
                        <Section id="how-we-use" title="2. How We Use Your Information">
                            <ul className="space-y-3">
                                <li>To operate and deliver Safe-Spend's services (protected account management, spend validation, approvals).</li>
                                <li>To authenticate and authorize API access.</li>
                                <li>To detect and prevent fraud, abuse, and unauthorized access.</li>
                                <li>To process payments via Stripe.</li>
                                <li>To send service-critical communications (billing, security alerts, product updates you opt into).</li>
                                <li>To improve the platform using aggregated, anonymized usage patterns.</li>
                                <li>To comply with applicable law and respond to legal requests.</li>
                            </ul>
                            <p className="mt-4 text-ss-accent font-medium">We do not sell your personal data.</p>
                        </Section>

                        {/* Section 3 */}
                        <Section id="data-processing" title="3. Data We Process on Your Behalf (Agent & Transaction Data)">
                            <p className="mb-4">
                                When your AI Agents use Safe-Spend, they submit transaction data (vendor names, amounts, categories, descriptions). 
                                This data is processed by Safe-Spend solely on your behalf to:
                            </p>
                            <ul className="space-y-2 mb-4">
                                <li>Evaluate spend requests against your defined policies.</li>
                                <li>Record audit trails for your access.</li>
                            </ul>
                            <p className="mb-4">
                                <strong className="text-ss-text">You remain the data controller</strong> for transaction data originating from your agents. 
                                We are a data processor for this category.
                            </p>
                            <p>
                                You are responsible for ensuring the data your agents submit (e.g. vendor names, descriptions) does not contain 
                                personal data of third parties that would create additional compliance obligations.
                            </p>
                        </Section>

                        {/* Section 4 */}
                        <Section id="sharing" title="4. How We Share Your Information">
                            <p className="mb-4">We share data only as follows:</p>
                            <ul className="space-y-3">
                                <li><strong className="text-ss-text">Stripe:</strong> For payment processing and fraud prevention.</li>
                                <li><strong className="text-ss-text">Infrastructure providers:</strong> Our hosting provider (compute and database). Data is stored in the United States.</li>
                                <li><strong className="text-ss-text">Legal requirements:</strong> If required by law, court order, or government request. We will notify you if legally permitted.</li>
                                <li><strong className="text-ss-text">Business transfers:</strong> In the event of a merger, acquisition, or asset sale, we will notify affected users before data is transferred.</li>
                            </ul>
                            <p className="mt-4 text-ss-accent font-medium">We do not share your data with advertising platforms or data brokers.</p>
                        </Section>

                        {/* Section 5 */}
                        <Section id="stripe" title="5. Stripe & Third-Party Services">
                            <p className="mb-4">
                                Safe-Spend uses <strong className="text-ss-text">Stripe</strong> for payment processing. When you fund a Protected Account, 
                                your payment details are submitted directly to Stripe. Stripe's privacy policy is available at{' '}
                                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-ss-accent hover:underline">
                                    stripe.com/privacy
                                </a>.
                            </p>
                            <p>
                                Stripe may independently collect and process data for fraud prevention, compliance, and regulatory purposes under their own terms.
                            </p>
                        </Section>

                        {/* Section 6 */}
                        <Section id="retention" title="6. Data Retention">
                            <ul className="space-y-3">
                                <li><strong className="text-ss-text">Account data:</strong> Retained while your account is active and for 3 years after termination.</li>
                                <li><strong className="text-ss-text">Transaction & audit log data:</strong> Retained for 7 years to support financial audits and dispute resolution.</li>
                                <li><strong className="text-ss-text">API usage logs:</strong> Retained for 90 days for security and debugging purposes.</li>
                                <li><strong className="text-ss-text">Webhook delivery logs:</strong> Retained for 30 days.</li>
                            </ul>
                            <p className="mt-4">
                                You may request deletion of non-legally-required data by contacting{' '}
                                <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:underline">support@agentictrust.app</a>.
                            </p>
                        </Section>

                        {/* Section 7 */}
                        <Section id="security" title="7. Security">
                            <p className="mb-4">We take security seriously, including:</p>
                            <ul className="space-y-3">
                                <li>All API traffic over HTTPS/TLS.</li>
                                <li>Passwords stored as bcrypt hashes (never in plaintext).</li>
                                <li>API keys stored as SHA-256 hashes (the full key is shown only once at issuance).</li>
                                <li>HMAC signatures on webhook payloads so you can verify authenticity.</li>
                                <li>Rate limiting and anomaly detection on API endpoints.</li>
                                <li>Stripe handles all card data; Safe-Spend is never in scope for raw cardholder data (PCI scope handled by Stripe).</li>
                            </ul>
                            <p className="mt-4">
                                No security measures are perfect. Please report security issues to{' '}
                                <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:underline">support@agentictrust.app</a>.
                            </p>
                        </Section>

                        {/* Section 8 */}
                        <Section id="your-rights" title="8. Your Rights (GDPR / CCPA)">
                            <p className="mb-4">Depending on where you are located, you may have the following rights:</p>
                            <ul className="space-y-3">
                                <li><strong className="text-ss-text">Access:</strong> Request a copy of personal data we hold about you.</li>
                                <li><strong className="text-ss-text">Correction:</strong> Request correction of inaccurate data.</li>
                                <li><strong className="text-ss-text">Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
                                <li><strong className="text-ss-text">Portability:</strong> Request your data in a machine-readable format.</li>
                                <li><strong className="text-ss-text">Opt-out:</strong> Opt out of non-essential communications at any time.</li>
                                <li><strong className="text-ss-text">CCPA:</strong> California residents may request disclosure of data categories sold or shared (we do not sell personal data).</li>
                            </ul>
                            <p className="mt-4">
                                To exercise these rights, contact{' '}
                                <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:underline">support@agentictrust.app</a>. 
                                We will respond within 30 days.
                            </p>
                        </Section>

                        {/* Section 9 */}
                        <Section id="cookies" title="9. Cookies & Tracking">
                            <p className="mb-4">Safe-Spend uses minimal cookies:</p>
                            <ul className="space-y-3">
                                <li><strong className="text-ss-text">Session cookies:</strong> To maintain your logged-in state in the dashboard (JWT stored in localStorage, not a cookie).</li>
                                <li><strong className="text-ss-text">No third-party advertising cookies.</strong></li>
                            </ul>
                            <p className="mt-4">
                                If we add analytics in the future, we will update this policy and provide opt-out options.
                            </p>
                        </Section>

                        {/* Section 10 */}
                        <Section id="children" title="10. Children's Privacy">
                            <p>
                                Safe-Spend is a B2B API service for businesses and developers. We do not knowingly collect personal data from 
                                individuals under 18 years of age. If we become aware of such data, we will delete it promptly.
                            </p>
                        </Section>

                        {/* Section 11 */}
                        <Section id="changes" title="11. Changes to This Policy">
                            <p className="mb-4">We may update this Privacy Policy from time to time. We will:</p>
                            <ul className="space-y-3">
                                <li>Post the updated policy at this URL.</li>
                                <li>Update the "Last Updated" date.</li>
                                <li>Notify you via email for material changes.</li>
                            </ul>
                            <p className="mt-4">
                                Continued use of Safe-Spend after the effective date constitutes acceptance of the updated policy.
                            </p>
                        </Section>

                        {/* Section 12 */}
                        <Section id="contact" title="12. Contact Us">
                            <p className="mb-4">For privacy questions, data requests, or concerns:</p>
                            <ul className="space-y-2">
                                <li>Email: <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:underline">support@agentictrust.app</a></li>
                                <li>Subject line: "Privacy Request"</li>
                                <li>Response time: within 30 business days.</li>
                            </ul>
                        </Section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

// Section component for consistent styling
const Section = ({ id, title, children }) => (
    <section id={id} className="scroll-mt-24">
        <h2 className="font-heading text-xl font-semibold text-ss-text mb-4 pl-4 border-l-4 border-ss-accent">
            {title}
        </h2>
        <div className="text-ss-text-secondary leading-relaxed">
            {children}
        </div>
    </section>
);

// SubSection component for nested categories
const SubSection = ({ title, children }) => (
    <div className="mb-4">
        <h3 className="font-medium text-ss-text mb-2">{title}</h3>
        {children}
    </div>
);

export default PrivacyPage;
