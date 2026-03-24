import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error('useAdminAuth must be used within AdminAuthProvider');
    }
    return context;
};

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [impersonation, setImpersonation] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Check for existing admin token on mount
    useEffect(() => {
        const token = localStorage.getItem('ss_admin_token');
        if (token) {
            fetchAdminProfile(token);
        } else {
            setLoading(false);
        }

        // Check for impersonation token
        const impToken = localStorage.getItem('ss_impersonation_token');
        const impOrg = localStorage.getItem('ss_impersonation_org');
        if (impToken && impOrg) {
            setImpersonation({
                token: impToken,
                org: JSON.parse(impOrg)
            });
        }
    }, []);

    const fetchAdminProfile = async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/admin/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAdmin(data.admin);
            } else {
                // Token invalid, clear it
                localStorage.removeItem('ss_admin_token');
            }
        } catch (error) {
            console.error('Failed to fetch admin profile:', error);
            localStorage.removeItem('ss_admin_token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/api/admin/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('ss_admin_token', data.token);
        setAdmin(data.admin);

        return data;
    };

    const logout = useCallback(() => {
        localStorage.removeItem('ss_admin_token');
        localStorage.removeItem('ss_impersonation_token');
        localStorage.removeItem('ss_impersonation_org');
        setAdmin(null);
        setImpersonation(null);
        navigate('/admin');
    }, [navigate]);

    const startImpersonation = async (orgId) => {
        const token = localStorage.getItem('ss_admin_token');
        
        const response = await fetch(`${API_URL}/api/admin/orgs/${orgId}/impersonate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Impersonation failed');
        }

        // Store impersonation state
        localStorage.setItem('ss_impersonation_token', data.token);
        localStorage.setItem('ss_impersonation_org', JSON.stringify(data.organization));
        
        // Also set as the regular dashboard token so dashboard works
        localStorage.setItem('ss_token', data.token);

        setImpersonation({
            token: data.token,
            org: data.organization
        });

        // Navigate to dashboard
        navigate('/dashboard');
    };

    const endImpersonation = useCallback(() => {
        localStorage.removeItem('ss_impersonation_token');
        localStorage.removeItem('ss_impersonation_org');
        localStorage.removeItem('ss_token');
        setImpersonation(null);
        navigate('/admin/orgs');
    }, [navigate]);

    const getAdminToken = () => localStorage.getItem('ss_admin_token');

    const value = {
        admin,
        loading,
        impersonation,
        login,
        logout,
        startImpersonation,
        endImpersonation,
        getAdminToken,
        isAuthenticated: !!admin
    };

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export default AdminAuthContext;
