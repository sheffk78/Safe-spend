import React, { useState, useEffect } from 'react';
import { 
    Users, 
    UserPlus, 
    Shield, 
    ShieldCheck, 
    Eye, 
    Code2,
    Crown,
    Trash2,
    ChevronDown,
    Copy,
    Check,
    Mail,
    Clock,
    AlertCircle,
    ExternalLink
} from 'lucide-react';
import { 
    listTeamMembers, 
    getTeamRoles, 
    inviteTeamMember, 
    updateMemberRole, 
    removeMember,
    getMyRole
} from '@/lib/api';

// Role configuration with icons and colors
const ROLE_CONFIG = {
    owner: {
        label: 'Owner',
        icon: Crown,
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10',
        borderColor: 'border-amber-400/20'
    },
    finance_admin: {
        label: 'Finance Admin',
        icon: ShieldCheck,
        color: 'text-teal-400',
        bgColor: 'bg-teal-400/10',
        borderColor: 'border-teal-400/20'
    },
    developer: {
        label: 'Developer',
        icon: Code2,
        color: 'text-ss-accent',
        bgColor: 'bg-ss-accent/10',
        borderColor: 'border-ss-accent/20'
    },
    read_only: {
        label: 'Read Only',
        icon: Eye,
        color: 'text-ss-text-tertiary',
        bgColor: 'bg-gray-400/10',
        borderColor: 'border-gray-400/20'
    }
};

// Role Badge Component
const RoleBadge = ({ role, size = 'md' }) => {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.read_only;
    const Icon = config.icon;
    
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs gap-1',
        md: 'px-2.5 py-1 text-sm gap-1.5',
        lg: 'px-3 py-1.5 text-sm gap-2'
    };
    
    return (
        <span className={`inline-flex items-center ${sizeClasses[size]} rounded-full font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
            <Icon size={size === 'sm' ? 12 : 14} />
            {config.label}
        </span>
    );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
    const statusConfig = {
        active: { label: 'Active', color: 'text-teal-400', bg: 'bg-teal-400/10' },
        pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-400/10' },
        removed: { label: 'Removed', color: 'text-red-400', bg: 'bg-red-400/10' }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            {config.label}
        </span>
    );
};

// Invite Modal Component
const InviteModal = ({ onClose, onInvite, roles }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('developer');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            await onInvite(email, role);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Filter out owner role from options
    const availableRoles = roles?.filter(r => r.name !== 'owner') || [];
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-ss-text mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-ss-accent" />
                    Invite Team Member
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-1.5">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            className="w-full px-3 py-2 bg-ss-bg border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                            required
                            data-testid="invite-email-input"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-1.5">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-3 py-2 bg-ss-bg border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                            data-testid="invite-role-select"
                        >
                            {availableRoles.map((r) => (
                                <option key={r.name} value={r.name}>
                                    {ROLE_CONFIG[r.name]?.label || r.name}
                                </option>
                            ))}
                        </select>
                        
                        {/* Role description */}
                        <p className="mt-2 text-xs text-ss-text-tertiary">
                            {availableRoles.find(r => r.name === role)?.description}
                        </p>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-ss-text-secondary hover:text-ss-text bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="flex-1 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            data-testid="invite-submit-btn"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Mail size={16} />
                                    Send Invite
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Invite Success Modal
const InviteSuccessModal = ({ inviteUrl, email, onClose }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = async () => {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl max-w-md w-full p-6">
                <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-teal-400/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check size={24} className="text-teal-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-ss-text">Invitation Sent!</h3>
                    <p className="text-sm text-ss-text-secondary mt-1">
                        An invitation has been created for {email}
                    </p>
                </div>
                
                <div className="bg-ss-bg rounded-lg p-3 mb-4">
                    <p className="text-xs text-ss-text-tertiary mb-2">Share this invite link:</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-ss-text bg-black/20 px-2 py-1.5 rounded overflow-hidden text-ellipsis">
                            {inviteUrl}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="p-2 text-ss-text-secondary hover:text-ss-text bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] rounded transition-colors"
                            data-testid="copy-invite-url-btn"
                        >
                            {copied ? <Check size={16} className="text-teal-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
                
                <p className="text-xs text-ss-text-tertiary mb-4 flex items-center gap-1.5">
                    <Clock size={12} />
                    This invite link expires in 7 days
                </p>
                
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

// Change Role Dropdown Component
const RoleDropdown = ({ member, roles, onChangeRole, currentUserRole }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Can't change roles if:
    // - You're not owner
    // - The member is the owner
    // - The member is yourself
    const canChange = currentUserRole === 'owner' && !member.isOrgOwner;
    
    if (!canChange) {
        return <RoleBadge role={member.role} />;
    }
    
    const availableRoles = roles?.filter(r => r.name !== 'owner') || [];
    
    const handleRoleChange = async (newRole) => {
        if (newRole === member.role) {
            setIsOpen(false);
            return;
        }
        
        setLoading(true);
        try {
            await onChangeRole(member.id, newRole);
        } finally {
            setLoading(false);
            setIsOpen(false);
        }
    };
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="inline-flex items-center gap-1 group"
                data-testid={`role-dropdown-${member.id}`}
            >
                <RoleBadge role={member.role} />
                <ChevronDown size={14} className="text-ss-text-tertiary group-hover:text-ss-text transition-colors" />
            </button>
            
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-ss-card border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                        {availableRoles.map((r) => (
                            <button
                                key={r.name}
                                onClick={() => handleRoleChange(r.name)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2 ${
                                    r.name === member.role ? 'text-ss-accent' : 'text-ss-text'
                                }`}
                            >
                                {React.createElement(ROLE_CONFIG[r.name]?.icon || Eye, { size: 14 })}
                                {ROLE_CONFIG[r.name]?.label || r.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// Member Row Component
const MemberRow = ({ member, roles, onChangeRole, onRemove, currentUserRole }) => {
    const [confirmRemove, setConfirmRemove] = useState(false);
    
    const canRemove = currentUserRole === 'owner' && !member.isOrgOwner;
    
    const handleRemove = async () => {
        await onRemove(member.id);
        setConfirmRemove(false);
    };
    
    return (
        <div className="flex items-center justify-between py-4 border-b border-[rgba(255,255,255,0.04)] last:border-0">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-ss-accent/20 to-ss-accent/5 rounded-full flex items-center justify-center text-ss-accent font-medium">
                    {member.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-ss-text font-medium truncate" data-testid={`member-email-${member.id}`}>
                        {member.email}
                        {member.isOrgOwner && (
                            <span className="ml-2 text-xs text-amber-400">(Organization Owner)</span>
                        )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-ss-text-tertiary">
                        <StatusBadge status={member.status} />
                        {member.joinedAt && (
                            <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                        )}
                        {member.invitedBy && member.status === 'pending' && (
                            <span>Invited by {member.invitedBy}</span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <RoleDropdown 
                    member={member} 
                    roles={roles} 
                    onChangeRole={onChangeRole}
                    currentUserRole={currentUserRole}
                />
                
                {canRemove && (
                    confirmRemove ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRemove}
                                className="px-2 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                data-testid={`confirm-remove-${member.id}`}
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setConfirmRemove(false)}
                                className="px-2 py-1 text-xs text-ss-text-tertiary hover:text-ss-text"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmRemove(true)}
                            className="p-2 text-ss-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Remove member"
                            data-testid={`remove-member-${member.id}`}
                        >
                            <Trash2 size={16} />
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

// Main Team Page Component
const TeamPage = () => {
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState(null);
    
    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamData, rolesData, myRoleData] = await Promise.all([
                listTeamMembers(),
                getTeamRoles(),
                getMyRole()
            ]);
            
            setMembers(teamData.data || []);
            setRoles(rolesData.roles || []);
            setCurrentUser({
                email: myRoleData.email,
                role: myRoleData.role,
                permissions: myRoleData.permissions
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);
    
    const handleInvite = async (email, role) => {
        const result = await inviteTeamMember(email, role);
        setInviteSuccess({
            email,
            inviteUrl: result.invite_url
        });
        fetchData();
    };
    
    const handleChangeRole = async (memberId, newRole) => {
        await updateMemberRole(memberId, newRole);
        fetchData();
    };
    
    const handleRemove = async (memberId) => {
        await removeMember(memberId);
        fetchData();
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-ss-accent/30 border-t-ss-accent rounded-full animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6" data-testid="team-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-ss-text flex items-center gap-3">
                        <Users size={28} className="text-ss-accent" />
                        Team Management
                    </h1>
                    <p className="text-ss-text-secondary mt-1">
                        Manage team members and their roles
                    </p>
                </div>
                
                {currentUser?.role === 'owner' && (
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        data-testid="invite-member-btn"
                    >
                        <UserPlus size={18} />
                        Invite Member
                    </button>
                )}
            </div>
            
            {/* Current User Role Card */}
            <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-ss-accent/10 rounded-full flex items-center justify-center text-ss-accent">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-ss-text-secondary">Your Role</p>
                            <div className="mt-0.5">
                                <RoleBadge role={currentUser?.role} size="lg" />
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-ss-text-secondary">{currentUser?.email}</p>
                        <p className="text-xs text-ss-text-tertiary mt-0.5">
                            {currentUser?.permissions?.length || 0} permissions
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}
            
            {/* Members List */}
            <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl">
                <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 className="font-medium text-ss-text">
                        Team Members ({members.length})
                    </h2>
                </div>
                
                <div className="px-4">
                    {members.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users size={48} className="text-ss-text-tertiary mx-auto mb-3" />
                            <p className="text-ss-text-secondary">No team members yet</p>
                            <p className="text-xs text-ss-text-tertiary mt-1">
                                Invite team members to collaborate on your Safe-Spend organization
                            </p>
                        </div>
                    ) : (
                        members.map((member) => (
                            <MemberRow
                                key={member.id}
                                member={member}
                                roles={roles}
                                onChangeRole={handleChangeRole}
                                onRemove={handleRemove}
                                currentUserRole={currentUser?.role}
                            />
                        ))
                    )}
                </div>
            </div>
            
            {/* Role Permissions Reference */}
            <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl">
                <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 className="font-medium text-ss-text">Role Permissions</h2>
                </div>
                
                <div className="p-4 grid gap-4 md:grid-cols-2">
                    {roles.map((role) => {
                        const config = ROLE_CONFIG[role.name] || ROLE_CONFIG.read_only;
                        const Icon = config.icon;
                        
                        return (
                            <div 
                                key={role.name}
                                className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon size={18} className={config.color} />
                                    <span className={`font-medium ${config.color}`}>
                                        {config.label}
                                    </span>
                                </div>
                                <p className="text-xs text-ss-text-secondary mb-3">
                                    {role.description}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {role.permissions.map((perm) => (
                                        <span 
                                            key={perm}
                                            className="px-2 py-0.5 text-xs bg-black/20 text-ss-text-secondary rounded"
                                        >
                                            {perm.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Trust Law Callout */}
            <div className="bg-gradient-to-r from-ss-accent/5 to-transparent border border-ss-accent/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Shield size={20} className="text-ss-accent mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-ss-text mb-1">
                            Role-Based Access Control (RBAC)
                        </h3>
                        <p className="text-xs text-ss-text-secondary">
                            Safe-Spend uses RBAC to separate financial governance (Owner, Finance Admin) from 
                            technical development (Developer). This ensures that agents cannot modify their own 
                            spending limits while allowing developers to build and test integrations safely.
                        </p>
                        <a 
                            href="/docs/trust-law"
                            className="inline-flex items-center gap-1 text-xs text-ss-accent hover:underline mt-2"
                        >
                            Learn more about spending governance
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
            
            {/* Invite Modal */}
            {showInviteModal && (
                <InviteModal
                    onClose={() => setShowInviteModal(false)}
                    onInvite={handleInvite}
                    roles={roles}
                />
            )}
            
            {/* Invite Success Modal */}
            {inviteSuccess && (
                <InviteSuccessModal
                    email={inviteSuccess.email}
                    inviteUrl={inviteSuccess.inviteUrl}
                    onClose={() => setInviteSuccess(null)}
                />
            )}
        </div>
    );
};

export default TeamPage;
