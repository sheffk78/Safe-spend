/**
 * Admin Dashboard Context
 * Manages admin authentication state
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const AdminContext = createContext(null);

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within AdminProvider');
    }
    return context;
};

export const AdminProvider = ({ children }) => {
    const [adminKey, setAdminKey] = useState(null);
    const [keyInfo, setKeyInfo] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check for stored admin key on mount
    useEffect(() => {
        const storedKey = localStorage.getItem('adminKey');
        const storedInfo = localStorage.getItem('adminKeyInfo');
        
        if (storedKey) {
            // Validate the key is still active
            validateKey(storedKey).then(isValid => {
                if (isValid) {
                    setAdminKey(storedKey);
                    setKeyInfo(storedInfo ? JSON.parse(storedInfo) : null);
                    setIsAuthenticated(true);
                } else {
                    // Clear invalid key
                    localStorage.removeItem('adminKey');
                    localStorage.removeItem('adminKeyInfo');
                }
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    const validateKey = async (key) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/status`, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            return res.ok;
        } catch {
            return false;
        }
    };

    const login = async (key) => {
        try {
            // Try to fetch status to validate key
            const res = await fetch(`${API_URL}/api/admin/status`, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'Invalid admin key');
            }
            
            // Key is valid - extract info
            const statusData = await res.json();
            
            // Get key info
            const keysRes = await fetch(`${API_URL}/api/admin/keys`, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            
            let keyInfo = { label: 'Admin' };
            if (keysRes.ok) {
                const keysData = await keysRes.json();
                // Find matching key by prefix
                const keyPrefix = key.substring(0, 20);
                const matchingKey = keysData.keys?.find(k => k.key_prefix?.startsWith(keyPrefix.substring(0, 16)));
                if (matchingKey) {
                    keyInfo = matchingKey;
                }
            }
            
            // Store key
            localStorage.setItem('adminKey', key);
            localStorage.setItem('adminKeyInfo', JSON.stringify(keyInfo));
            
            setAdminKey(key);
            setKeyInfo(keyInfo);
            setIsAuthenticated(true);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('adminKey');
        localStorage.removeItem('adminKeyInfo');
        setAdminKey(null);
        setKeyInfo(null);
        setIsAuthenticated(false);
    };

    // API fetch helper with auth
    const adminFetch = async (endpoint, options = {}) => {
        const isFormData = options.body instanceof FormData;
        
        const headers = {
            'Authorization': `Bearer ${adminKey}`,
            // Only set Content-Type for non-FormData requests
            // FormData needs browser to set it with boundary
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers
        };
        
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        if (res.status === 401) {
            logout();
            throw new Error('Session expired');
        }
        
        return res;
    };

    return (
        <AdminContext.Provider value={{
            adminKey,
            keyInfo,
            isAuthenticated,
            loading,
            login,
            logout,
            adminFetch
        }}>
            {children}
        </AdminContext.Provider>
    );
};

export default AdminContext;
