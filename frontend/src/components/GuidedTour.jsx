import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    X,
    ChevronRight,
    ChevronLeft,
    Rocket,
    Play,
    Key,
    CheckCircle,
    Sparkles,
    HelpCircle
} from 'lucide-react';

// Tour step definitions
const TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Safe-Spend!',
        description: 'Let\'s take a quick tour to get you started with AI agent spending controls. This will only take about 2 minutes.',
        target: null, // No specific target - centered modal
        route: '/dashboard',
        position: 'center',
        icon: Sparkles
    },
    {
        id: 'quick-start',
        title: 'Quick Start Templates',
        description: 'Click here to create a pre-configured protected account and spending policy in one click. Choose from Marketing, Procurement, R&D, or DevOps templates.',
        target: '[data-testid="quickstart-btn"]',
        route: '/dashboard',
        position: 'bottom',
        icon: Rocket,
        action: 'Click "Quick Start" to create your first protected account setup'
    },
    {
        id: 'escrow-accounts',
        title: 'Protected Accounts',
        description: 'This is where your agent funds are held. Each protected account is a segregated pool with its own balance and spending policies.',
        target: 'a[href="/dashboard/accounts"]',
        route: '/dashboard',
        position: 'right',
        icon: Rocket
    },
    {
        id: 'spending-rules',
        title: 'Spending Rules',
        description: 'Define spending policies that control how your agents can spend. Set limits, vendor allowlists, approval thresholds, and more.',
        target: 'a[href="/dashboard/rules"]',
        route: '/dashboard',
        position: 'right',
        icon: Rocket
    },
    {
        id: 'playground',
        title: 'API Playground',
        description: 'Test spend requests and explore the rules engine without writing code. Use quick scenarios to see how policies work.',
        target: 'a[href="/dashboard/playground"]',
        route: '/dashboard',
        position: 'right',
        icon: Play,
        action: 'Try the Playground after creating a protected account'
    },
    {
        id: 'api-keys',
        title: 'API Keys',
        description: 'Generate API keys for your agents to authenticate spend requests. Each key can be scoped and revoked independently.',
        target: 'a[href="/dashboard/keys"]',
        route: '/dashboard',
        position: 'right',
        icon: Key,
        action: 'Create an API key to start integrating'
    },
    {
        id: 'complete',
        title: 'You\'re All Set!',
        description: 'You now know the basics of Safe-Spend. Create a protected account, define policies, generate an API key, and your agent is ready to spend safely.',
        target: null,
        route: '/dashboard',
        position: 'center',
        icon: CheckCircle
    }
];

// Tooltip position calculator
const getTooltipPosition = (target, position) => {
    if (!target || position === 'center') {
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = target.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    switch (position) {
        case 'bottom':
            return {
                top: `${rect.bottom + scrollY + 12}px`,
                left: `${rect.left + scrollX + rect.width / 2}px`,
                transform: 'translateX(-50%)'
            };
        case 'top':
            return {
                top: `${rect.top + scrollY - 12}px`,
                left: `${rect.left + scrollX + rect.width / 2}px`,
                transform: 'translate(-50%, -100%)'
            };
        case 'right':
            return {
                top: `${rect.top + scrollY + rect.height / 2}px`,
                left: `${rect.right + scrollX + 12}px`,
                transform: 'translateY(-50%)'
            };
        case 'left':
            return {
                top: `${rect.top + scrollY + rect.height / 2}px`,
                left: `${rect.left + scrollX - 12}px`,
                transform: 'translate(-100%, -50%)'
            };
        default:
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
};

// Spotlight overlay component
const Spotlight = ({ target }) => {
    const [spotlightStyle, setSpotlightStyle] = useState(null);

    useEffect(() => {
        if (!target) {
            setSpotlightStyle(null);
            return;
        }

        const element = document.querySelector(target);
        if (!element) {
            setSpotlightStyle(null);
            return;
        }

        const rect = element.getBoundingClientRect();
        const padding = 8;

        setSpotlightStyle({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2
        });
    }, [target]);

    if (!spotlightStyle) return null;

    return (
        <>
            {/* Dark overlay with cutout */}
            <div 
                className="fixed inset-0 pointer-events-none z-[9998]"
                style={{
                    background: `radial-gradient(circle at ${spotlightStyle.left + spotlightStyle.width / 2}px ${spotlightStyle.top + spotlightStyle.height / 2}px, transparent ${Math.max(spotlightStyle.width, spotlightStyle.height) / 2 + 20}px, rgba(0,0,0,0.75) ${Math.max(spotlightStyle.width, spotlightStyle.height) / 2 + 40}px)`
                }}
            />
            {/* Spotlight border */}
            <div
                className="fixed border-2 border-ss-accent rounded-lg pointer-events-none z-[9999] animate-pulse"
                style={{
                    top: spotlightStyle.top,
                    left: spotlightStyle.left,
                    width: spotlightStyle.width,
                    height: spotlightStyle.height,
                    boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2), 0 0 20px rgba(16, 185, 129, 0.4)'
                }}
            />
        </>
    );
};

// Tour tooltip component
const TourTooltip = ({ step, currentIndex, totalSteps, onNext, onPrev, onSkip, onComplete }) => {
    const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
    const Icon = step.icon;
    const isFirstStep = currentIndex === 0;
    const isLastStep = currentIndex === totalSteps - 1;
    const isCentered = step.position === 'center';

    useEffect(() => {
        if (isCentered) {
            setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
            return;
        }

        const updatePosition = () => {
            const target = document.querySelector(step.target);
            if (target) {
                setPosition(getTooltipPosition(target, step.position));
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [step, isCentered]);

    return (
        <div
            className={`fixed z-[10000] ${isCentered ? 'w-full max-w-md px-4' : 'w-80'}`}
            style={position}
            data-testid="tour-tooltip"
        >
            <div className={`bg-ss-code border border-ss-accent/50 rounded-xl shadow-2xl overflow-hidden ${isCentered ? '' : ''}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-ss-accent/20 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-ss-accent" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-ss-text text-sm">{step.title}</h3>
                            <p className="text-[10px] text-ss-text-tertiary">
                                Step {currentIndex + 1} of {totalSteps}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onSkip}
                        className="text-ss-text-tertiary hover:text-ss-text p-1"
                        data-testid="tour-skip-btn"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-ss-text-secondary text-sm leading-relaxed">
                        {step.description}
                    </p>
                    {step.action && (
                        <div className="mt-3 p-2 bg-ss-accent/10 border border-ss-accent/20 rounded-lg">
                            <p className="text-xs text-ss-accent font-medium">
                                💡 {step.action}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-[rgba(255,255,255,0.06)] bg-ss-surface/50">
                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    i === currentIndex
                                        ? 'bg-ss-accent w-4'
                                        : i < currentIndex
                                        ? 'bg-ss-accent/50'
                                        : 'bg-ss-elevated'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        {!isFirstStep && (
                            <button
                                onClick={onPrev}
                                className="flex items-center gap-1 px-3 py-1.5 text-ss-text-secondary hover:text-ss-text text-sm transition-colors"
                                data-testid="tour-prev-btn"
                            >
                                <ChevronLeft size={14} />
                                Back
                            </button>
                        )}
                        {isLastStep ? (
                            <button
                                onClick={onComplete}
                                className="flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white text-sm font-medium transition-all"
                                data-testid="tour-complete-btn"
                            >
                                <CheckCircle size={14} />
                                Get Started
                            </button>
                        ) : (
                            <button
                                onClick={onNext}
                                className="flex items-center gap-1 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white text-sm font-medium transition-all"
                                data-testid="tour-next-btn"
                            >
                                Next
                                <ChevronRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Arrow pointer for non-centered tooltips */}
            {!isCentered && (
                <div
                    className={`absolute w-3 h-3 bg-ss-code border-ss-accent/50 transform rotate-45 ${
                        step.position === 'bottom' ? '-top-1.5 left-1/2 -translate-x-1/2 border-t border-l' :
                        step.position === 'top' ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r' :
                        step.position === 'right' ? '-left-1.5 top-1/2 -translate-y-1/2 border-l border-b' :
                        '-right-1.5 top-1/2 -translate-y-1/2 border-r border-t'
                    }`}
                />
            )}
        </div>
    );
};

// Main GuidedTour component
const GuidedTour = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    const step = TOUR_STEPS[currentStep];

    // Navigate to step's route if needed
    useEffect(() => {
        if (isActive && step.route && location.pathname !== step.route) {
            navigate(step.route);
        }
    }, [currentStep, isActive, step.route, location.pathname, navigate]);

    const handleNext = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleSkip = useCallback(() => {
        setIsActive(false);
        localStorage.setItem('ss_tour_completed', 'true');
        localStorage.setItem('ss_tour_skipped', 'true');
        onComplete?.();
    }, [onComplete]);

    const handleComplete = useCallback(() => {
        setIsActive(false);
        localStorage.setItem('ss_tour_completed', 'true');
        onComplete?.();
    }, [onComplete]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isActive) return;
            if (e.key === 'Escape') handleSkip();
            if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, handleNext, handlePrev, handleSkip]);

    if (!isActive) return null;

    return (
        <>
            {/* Backdrop for centered modals */}
            {step.position === 'center' && (
                <div className="fixed inset-0 bg-black/70 z-[9997]" />
            )}

            {/* Spotlight for targeted elements */}
            {step.target && <Spotlight target={step.target} />}

            {/* Tooltip */}
            <TourTooltip
                step={step}
                currentIndex={currentStep}
                totalSteps={TOUR_STEPS.length}
                onNext={handleNext}
                onPrev={handlePrev}
                onSkip={handleSkip}
                onComplete={handleComplete}
            />
        </>
    );
};

// Hook to check if tour should be shown
export const useShouldShowTour = () => {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        const tourCompleted = localStorage.getItem('ss_tour_completed');
        setShouldShow(!tourCompleted);
    }, []);

    return shouldShow;
};

// Function to restart tour
export const restartTour = () => {
    localStorage.removeItem('ss_tour_completed');
    localStorage.removeItem('ss_tour_skipped');
    window.location.reload();
};

// Help button component to restart tour
export const TourHelpButton = ({ className = '' }) => {
    const handleClick = () => {
        if (window.confirm('Would you like to restart the guided tour?')) {
            restartTour();
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center gap-2 px-3 py-2 text-ss-text-secondary hover:text-ss-text transition-colors ${className}`}
            title="Restart guided tour"
            data-testid="restart-tour-btn"
        >
            <HelpCircle size={16} />
            <span className="text-sm">Tour</span>
        </button>
    );
};

export default GuidedTour;
