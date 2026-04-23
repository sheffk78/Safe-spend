import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';

const TermsPage = () => {
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
        { id: 'definitions', title: '1. Definitions' },
        { id: 'account-registration', title: '2. Account Registration & Organizations' },
        { id: 'api-keys', title: '3. API Keys & Agent Access' },
        { id: 'escrow-accounts', title: '4. Escrow Accounts & Funds' },
        { id: 'spending-policies', title: '5. Spending Policies & the Rules Engine' },
        { id: 'approvals', title: '6. Approvals & Human-in-the-Loop Controls' },
        { id: 'payment-terms', title: '7. Payment Terms & Fees' },
        { id: 'prohibited-uses', title: '8. Prohibited Uses' },
        { id: 'intellectual-property', title: '9. Intellectual Property' },
        { id: 'disclaimer', title: '10. Disclaimer of Warranties' },
        { id: 'limitation', title: '11. Limitation of Liability' },
        { id: 'indemnification', title: '12. Indemnification' },
        { id: 'termination', title: '13. Termination' },
        { id: 'changes', title: '14. Changes to These Terms' },
        { id: 'governing-law', title: '15. Governing Law & Disputes' },
        { id: 'contact', title: '16. Contact' },
    ];

    return (
        <div className="min-h-screen bg-ss-bg">
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
                        <h1 className="font-heading text-4xl font-bold text-ss-text mb-4">Terms of Service</h1>
                        <div className="text-ss-text-secondary">
                            <p><strong>Effective Date:</strong> April 1, 2026</p>
                            <p><strong>Last Updated:</strong> April 1, 2026</p>
                        </div>
                        <p className="text-ss-text-secondary mt-6">
                            These Terms of Service govern your access to and use of Safe-Spend by Agentic Trust. 
                            By signing up for an account or using our API, you agree to these terms. 
                            If you do not agree, do not use the service.
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
                        <Section id="definitions" title="1. Definitions">
                            <p className="mb-4">In these Terms, the following terms have the specified meanings:</p>
                            <ul className="space-y-3">
                                <li><strong className="text-ss-text">"Safe-Spend"</strong> — the escrow and spending-control API service operated by Agentic Trust.</li>
                                <li><strong className="text-ss-text">"Organization"</strong> or <strong className="text-ss-text">"you"</strong> — a business or individual who creates an account.</li>
                                <li><strong className="text-ss-text">"Escrow Account"</strong> — a segregated balance held by Safe-Spend on behalf of an Organization to fund agent spending.</li>
                                <li><strong className="text-ss-text">"AI Agent"</strong> or <strong className="text-ss-text">"Agent"</strong> — an automated software process authorized by an Organization to make spend requests.</li>
                                <li><strong className="text-ss-text">"Spending Policy"</strong> — a set of rules defined by an Organization governing how an Agent may spend.</li>
                                <li><strong className="text-ss-text">"API Key"</strong> — a credential issued by Safe-Spend that authorizes API access.</li>
                                <li><strong className="text-ss-text">"Spend Request"</strong> — a request by an Agent to disburse funds from an Escrow Account.</li>
                                <li><strong className="text-ss-text">"Platform"</strong> — the Safe-Spend web dashboard, API, and associated services.</li>
                            </ul>
                        </Section>

                        {/* Section 2 */}
                        <Section id="account-registration" title="2. Account Registration & Organizations">
                            <ul className="space-y-3">
                                <li>You must provide accurate registration information.</li>
                                <li>Each account represents an Organization; one Organization per account by default.</li>
                                <li>You are responsible for maintaining the security of your credentials and API keys.</li>
                                <li>You must notify us immediately of any unauthorized access at <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:underline">support@agentictrust.app</a>.</li>
                                <li>You must be at least 18 years old and legally authorized to enter agreements on behalf of your Organization.</li>
                            </ul>
                        </Section>

                        {/* Section 3 */}
                        <Section id="api-keys" title="3. API Keys & Agent Access">
                            <ul className="space-y-3">
                                <li>Safe-Spend issues three key types: <strong className="text-ss-text">Live</strong>, <strong className="text-ss-text">Test</strong>, and <strong className="text-ss-text">Agent</strong> keys with different permissions.</li>
                                <li><strong className="text-ss-text">Agent keys</strong> are scoped for use by automated agents only; they cannot modify account settings, policies, or funding.</li>
                                <li>You are responsible for the actions of any AI Agent using your API keys.</li>
                                <li>If an API key is compromised, revoke it immediately from the dashboard. Safe-Spend is not liable for unauthorized spends that result from key exposure.</li>
                                <li>Do not embed live keys in client-side code or public repositories.</li>
                            </ul>
                        </Section>

                        {/* Section 4 */}
                        <Section id="escrow-accounts" title="4. Escrow Accounts & Funds">
                            <ul className="space-y-3">
                                <li>Escrow Accounts hold funds you deposit to enable agent spending.</li>
                                <li>Funds are not FDIC insured unless explicitly noted for your tier (Safe-Spend uses Stripe for payment processing; applicable Stripe Issuing/Treasury terms may apply in future tiers).</li>
                                <li>Safe-Spend does not commingle escrow funds with its own operating funds in its accounting records, though actual custody is managed through Stripe's infrastructure.</li>
                                <li>You may withdraw unused funds by closing an Escrow Account, subject to any pending spend requests.</li>
                                <li>Safe-Spend reserves the right to freeze Escrow Accounts in cases of suspected fraud, legal requirement, or policy violation.</li>
                            </ul>
                        </Section>

                        {/* Section 5 */}
                        <Section id="spending-policies" title="5. Spending Policies & the Rules Engine">
                            <ul className="space-y-3">
                                <li>You are responsible for configuring Spending Policies appropriately for your use case.</li>
                                <li>Safe-Spend's rules engine enforces the policies you define; it does not independently evaluate the appropriateness of any given Agent action.</li>
                                <li>Safe-Spend is not liable for any losses arising from incorrectly configured policies.</li>
                                <li>All spend decisions (approved, denied, pending) are logged in an audit trail accessible to you.</li>
                            </ul>
                        </Section>

                        {/* Section 6 */}
                        <Section id="approvals" title="6. Approvals & Human-in-the-Loop Controls">
                            <ul className="space-y-3">
                                <li>Where your Spending Policies require human approval, you are responsible for reviewing and acting on approval requests in a timely manner.</li>
                                <li>Approvals expire after the timeout period you configure. Expired approvals will not execute and funds will not be disbursed.</li>
                                <li>Safe-Spend is not responsible for business harm resulting from approval delays or expirations.</li>
                            </ul>
                        </Section>

                        {/* Section 7 */}
                        <Section id="payment-terms" title="7. Payment Terms & Fees">
                            <p className="mb-4">Safe-Spend charges fees as described on the pricing page. Current tiers:</p>
                            <ul className="space-y-2 mb-4">
                                <li><strong className="text-ss-text">Sandbox:</strong> Free.</li>
                                <li><strong className="text-ss-text">Builder:</strong> $29/month + 0.5% per transaction.</li>
                                <li><strong className="text-ss-text">Scale:</strong> $149/month + 0.3% per transaction.</li>
                            </ul>
                            <ul className="space-y-3">
                                <li>Fees are subject to change with 30 days written notice.</li>
                                <li>Fees are non-refundable except as required by law.</li>
                                <li>You authorize Safe-Spend to charge your payment method on file for applicable fees.</li>
                                <li>Transaction volume is calculated from the total of approved disbursements in a billing period.</li>
                            </ul>
                        </Section>

                        {/* Section 8 */}
                        <Section id="prohibited-uses" title="8. Prohibited Uses">
                            <p className="mb-4">You may not use Safe-Spend to:</p>
                            <ul className="space-y-3">
                                <li>Fund or facilitate illegal activities.</li>
                                <li>Process payments for prohibited businesses (as defined by Stripe's terms).</li>
                                <li>Attempt to circumvent spending controls, rate limits, or API security measures.</li>
                                <li>Reverse-engineer, decompile, or copy Safe-Spend's proprietary rules engine logic.</li>
                                <li>Use the service to move money on behalf of third parties without appropriate authorization.</li>
                                <li>Use the service to fund activities that violate Agentic Trust's Acceptable Use Policy.</li>
                            </ul>
                        </Section>

                        {/* Section 9 */}
                        <Section id="intellectual-property" title="9. Intellectual Property">
                            <ul className="space-y-3">
                                <li>Safe-Spend, the rules engine, the API design, and all associated documentation are the intellectual property of Agentic Trust.</li>
                                <li>You retain ownership of data you submit (spending policies, transaction metadata, audit records).</li>
                                <li>You grant Agentic Trust a limited license to process your data to operate the service.</li>
                                <li>We may use aggregate, anonymized usage data to improve the platform.</li>
                            </ul>
                        </Section>

                        {/* Section 10 */}
                        <Section id="disclaimer" title="10. Disclaimer of Warranties">
                            <ul className="space-y-3">
                                <li>Safe-Spend is provided "as is" and "as available."</li>
                                <li>Agentic Trust makes no warranties, express or implied, including fitness for a particular purpose or merchantability.</li>
                                <li>We do not guarantee the service will be error-free, uninterrupted, or free from security vulnerabilities.</li>
                                <li>Use of AI Agents with real funds carries inherent risk; Safe-Spend provides governance tools but cannot guarantee agent behavior.</li>
                            </ul>
                        </Section>

                        {/* Section 11 */}
                        <Section id="limitation" title="11. Limitation of Liability">
                            <ul className="space-y-3">
                                <li>To the fullest extent permitted by law, Agentic Trust shall not be liable for indirect, incidental, special, or consequential damages.</li>
                                <li>Our total liability arising from your use of Safe-Spend shall not exceed the fees you paid to us in the 12 months preceding the claim.</li>
                                <li>This limitation applies regardless of the form of action (contract, tort, or otherwise).</li>
                            </ul>
                        </Section>

                        {/* Section 12 */}
                        <Section id="indemnification" title="12. Indemnification">
                            <p className="mb-4">You agree to indemnify and hold harmless Agentic Trust, its officers, employees, and partners from any claims arising from:</p>
                            <ul className="space-y-2">
                                <li>Your use of the service.</li>
                                <li>Your AI Agents' spend requests.</li>
                                <li>Your violation of these Terms.</li>
                                <li>Your violation of any third-party rights.</li>
                            </ul>
                        </Section>

                        {/* Section 13 */}
                        <Section id="termination" title="13. Termination">
                            <ul className="space-y-3">
                                <li>You may cancel your account at any time by contacting <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:underline">support@agentictrust.app</a>.</li>
                                <li>Agentic Trust may suspend or terminate your account for violation of these Terms with or without notice.</li>
                                <li>On termination, any unused escrow balance will be returned to you net of fees and pending transactions.</li>
                                <li>Sections 9–15 survive termination.</li>
                            </ul>
                        </Section>

                        {/* Section 14 */}
                        <Section id="changes" title="14. Changes to These Terms">
                            <ul className="space-y-3">
                                <li>We may update these Terms from time to time. We will notify you via email or dashboard notice at least 30 days before material changes take effect.</li>
                                <li>Continued use of the service after the effective date constitutes acceptance.</li>
                            </ul>
                        </Section>

                        {/* Section 15 */}
                        <Section id="governing-law" title="15. Governing Law & Disputes">
                            <ul className="space-y-3">
                                <li>These Terms are governed by the laws of the State of Utah, United States.</li>
                                <li>Disputes shall be resolved through binding arbitration under JAMS rules, with arbitration held in Utah County, Utah.</li>
                                <li>Class action and jury trial rights are waived to the extent permitted by law.</li>
                            </ul>
                        </Section>

                        {/* Section 16 */}
                        <Section id="contact" title="16. Contact">
                            <ul className="space-y-3">
                                <li>For legal notices: <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:underline">support@agentictrust.app</a></li>
                                <li>Website: <a href="https://agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-ss-accent hover:underline">agentictrust.app</a></li>
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

export default TermsPage;
