import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Crown, 
  Rocket, 
  Building2, 
  Check, 
  X,
  Loader2,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, isAuthenticated } = useAuth();
  
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Check for checkout success/cancel
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setSuccessMessage('Payment successful! Your plan has been upgraded.');
      // Clear the query param
      navigate('/dashboard/pricing', { replace: true });
    }
  }, [searchParams, navigate]);

  // Fetch current subscription
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchCurrentPlan();
    }
  }, [isAuthenticated, token]);

  const fetchCurrentPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/dashboard/pricing');
      return;
    }

    setCheckoutLoading(planId);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: planId,
          success_url: `${window.location.origin}/dashboard/pricing?checkout=success`,
          cancel_url: `${window.location.origin}/dashboard/pricing`
        })
      });

      const data = await res.json();

      if (res.ok && data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!currentPlan?.subscription_id) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/subscription/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          return_url: `${window.location.origin}/dashboard/pricing`
        })
      });

      const data = await res.json();

      if (res.ok && data.portal_url) {
        window.location.href = data.portal_url;
      } else {
        setError(data.error || 'Failed to open billing portal');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'sandbox',
      name: 'Sandbox',
      price: 'Free',
      period: null,
      description: 'For testing and development',
      icon: Rocket,
      color: 'from-ss-text-tertiary to-ss-elevated',
      features: [
        { name: '1 test escrow account', included: true },
        { name: 'Fake money (no real transactions)', included: true },
        { name: 'Full API access', included: true },
        { name: 'Webhooks', included: true },
        { name: 'Audit trail', included: true },
        { name: 'Framework SDKs', included: true },
        { name: 'Live transactions', included: false },
        { name: 'Custom approval workflows', included: false },
        { name: 'Multi-tenant support', included: false },
      ],
      cta: 'Current Plan',
      ctaDisabled: true,
    },
    {
      id: 'builder',
      name: 'Builder',
      price: '$29',
      period: '/month',
      description: 'For indie developers and small teams',
      icon: Crown,
      color: 'from-teal-500 to-teal-600',
      popular: true,
      features: [
        { name: '1 live escrow account', included: true },
        { name: 'Up to $5,000/mo escrow volume', included: true },
        { name: '0.5% transaction fee', included: true },
        { name: 'Real-time webhooks', included: true },
        { name: 'Full audit trail', included: true },
        { name: 'Framework SDKs (Python, TS, MCP)', included: true },
        { name: 'Email support', included: true },
        { name: 'Custom approval workflows', included: false },
        { name: 'Multi-tenant / white-label', included: false },
      ],
      cta: 'Upgrade to Builder',
      ctaDisabled: false,
    },
    {
      id: 'scale',
      name: 'Scale',
      price: '$149',
      period: '/month',
      description: 'For growing teams and enterprises',
      icon: Building2,
      color: 'from-violet-500 to-violet-600',
      features: [
        { name: 'Unlimited escrow accounts', included: true },
        { name: 'Unlimited escrow volume', included: true },
        { name: '0.3% transaction fee', included: true },
        { name: 'Real-time webhooks', included: true },
        { name: 'Full audit trail', included: true },
        { name: 'Framework SDKs (Python, TS, MCP)', included: true },
        { name: 'Custom approval workflows', included: true },
        { name: 'Multi-tenant / white-label', included: true },
        { name: 'Priority support + SLA', included: true },
      ],
      cta: 'Upgrade to Scale',
      ctaDisabled: false,
    },
  ];

  const isCurrentPlan = (planId) => currentPlan?.plan === planId;
  const canUpgradeTo = (planId) => {
    if (!currentPlan) return planId !== 'sandbox';
    const planOrder = { sandbox: 0, builder: 1, scale: 2 };
    return planOrder[planId] > planOrder[currentPlan.plan];
  };

  return (
    <div className="min-h-screen bg-ss-bg py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-ss-text-tertiary max-w-2xl mx-auto">
            Scale your AI agent spending control from development to production
          </p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-8 p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400 text-center">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Current Plan Status */}
        {currentPlan && (
          <div className="mb-8 p-4 bg-ss-elevated/50 border border-[rgba(255,255,255,0.06)] rounded-lg flex items-center justify-between">
            <div>
              <span className="text-ss-text-tertiary">Current plan: </span>
              <span className="text-white font-semibold capitalize">{currentPlan.plan}</span>
              {currentPlan.status !== 'active' && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                  {currentPlan.status}
                </span>
              )}
            </div>
            {currentPlan.subscription_id && (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-ss-elevated hover:bg-ss-elevated text-white rounded-lg transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Manage Billing
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = isCurrentPlan(plan.id);
            const canUpgrade = canUpgradeTo(plan.id);
            
            return (
              <div
                key={plan.id}
                className={`relative bg-ss-surface rounded-2xl border ${
                  plan.popular ? 'border-teal-500/50' : 'border-[rgba(255,255,255,0.06)]'
                } overflow-hidden`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                {/* Plan Header */}
                <div className={`p-6 bg-gradient-to-r ${plan.color}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-ss-accent/20 rounded-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period && (
                      <span className="ml-1 text-white/70">{plan.period}</span>
                    )}
                  </div>
                  <p className="mt-2 text-white/80">{plan.description}</p>
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-ss-text-tertiary flex-shrink-0" />
                        )}
                        <span className={feature.included ? 'text-ss-text-secondary' : 'text-ss-text-tertiary'}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || !canUpgrade || checkoutLoading === plan.id}
                    className={`mt-6 w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-ss-elevated text-ss-text-tertiary cursor-default'
                        : canUpgrade
                        ? `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`
                        : 'bg-ss-elevated text-ss-text-tertiary cursor-not-allowed'
                    }`}
                  >
                    {checkoutLoading === plan.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Redirecting...
                      </>
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : canUpgrade ? (
                      plan.cta
                    ) : (
                      'Current or Higher'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            <details className="bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-lg p-4 cursor-pointer">
              <summary className="text-white font-medium">Can I switch plans anytime?</summary>
              <p className="mt-2 text-ss-text-tertiary">
                Yes! You can upgrade anytime and only pay the prorated difference. 
                Downgrades take effect at the end of your billing period.
              </p>
            </details>
            <details className="bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-lg p-4 cursor-pointer">
              <summary className="text-white font-medium">What happens if I exceed my volume limit?</summary>
              <p className="mt-2 text-ss-text-tertiary">
                Spend requests that would exceed your monthly volume limit will be denied until you upgrade 
                or the limit resets at the start of your next billing period.
              </p>
            </details>
            <details className="bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-lg p-4 cursor-pointer">
              <summary className="text-white font-medium">How are transaction fees calculated?</summary>
              <p className="mt-2 text-ss-text-tertiary">
                Transaction fees are calculated on the amount of each approved spend request. 
                Builder: 0.5%, Scale: 0.3%. Fees are tracked and invoiced separately.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
