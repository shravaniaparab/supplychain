import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.me();
      setUser(response.data.user);
      setRole(response.data.role);
      setKycStatus(response.data.kyc_status);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { token, refresh, user, role, kyc_status } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('refresh', refresh);
    setUser(user);
    setRole(role);
    setKycStatus(kyc_status);
    console.log('User logged in:', role);

    return { user, role, kyc_status };
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    return response.data;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh');
      await authAPI.logout({ refresh });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      setUser(null);
      setRole(null);
      setKycStatus(null);
    }
  };

  const updateKycStatus = (status) => {
    setKycStatus(status);
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      setUser(response.data.user);
      setRole(response.data.role);
      setKycStatus(response.data.kyc_status);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const value = {
    user,
    role,
    kycStatus,
    loading,
    login,
    register,
    logout,
    updateKycStatus,
    refreshUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
