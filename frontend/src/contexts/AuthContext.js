import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    useEffect(() => {
        // Check for existing session on mount
        const storedToken = localStorage.getItem('ss_token');
        const storedUser = localStorage.getItem('ss_user');
        
        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('ss_token');
                localStorage.removeItem('ss_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // This will be replaced with actual API call when backend is ready
        // For now, simulate a successful login
        const mockToken = `jwt_${btoa(email)}_${Date.now()}`;
        const mockUser = {
            id: `org_${Math.random().toString(36).substring(2, 14)}`,
            email: email,
            name: email.split('@')[0],
            createdAt: new Date().toISOString()
        };

        // Store in localStorage
        localStorage.setItem('ss_token', mockToken);
        localStorage.setItem('ss_user', JSON.stringify(mockUser));
        
        setToken(mockToken);
        setUser(mockUser);
        
        return { success: true, user: mockUser };
    };

    const signup = async (email, password, name) => {
        // This will be replaced with actual API call when backend is ready
        // For now, simulate a successful signup
        const mockToken = `jwt_${btoa(email)}_${Date.now()}`;
        const mockUser = {
            id: `org_${Math.random().toString(36).substring(2, 14)}`,
            email: email,
            name: name || email.split('@')[0],
            createdAt: new Date().toISOString()
        };

        // Store in localStorage
        localStorage.setItem('ss_token', mockToken);
        localStorage.setItem('ss_user', JSON.stringify(mockUser));
        
        setToken(mockToken);
        setUser(mockUser);
        
        return { success: true, user: mockUser };
    };

    const logout = () => {
        localStorage.removeItem('ss_token');
        localStorage.removeItem('ss_user');
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
