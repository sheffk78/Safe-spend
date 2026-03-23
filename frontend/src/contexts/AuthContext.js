import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

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
                // Verify token is still valid
                verifyToken(storedToken);
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('ss_token');
                localStorage.removeItem('ss_user');
            }
        }
        setLoading(false);
    }, []);

    const verifyToken = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (!response.ok) {
                // Token is invalid, clear session
                logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                throw new Error('Invalid response from server');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            const authToken = data.token;
            const userData = data.organization;
            
            // Store in localStorage
            localStorage.setItem('ss_token', authToken);
            localStorage.setItem('ss_user', JSON.stringify(userData));
            
            setToken(authToken);
            setUser(userData);
            
            return { success: true, user: userData };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const signup = async (email, password, name) => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, name: name || email.split('@')[0] })
            });
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                throw new Error('Invalid response from server');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }
            
            const authToken = data.token;
            const userData = data.organization;
            
            // Store in localStorage
            localStorage.setItem('ss_token', authToken);
            localStorage.setItem('ss_user', JSON.stringify(userData));
            
            setToken(authToken);
            setUser(userData);
            
            return { success: true, user: userData };
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
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
