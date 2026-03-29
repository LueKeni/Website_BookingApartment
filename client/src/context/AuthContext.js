import { createContext, createElement, useContext, useMemo, useState } from 'react';
import api from '../services/api.js';
import { disconnectSocket } from '../services/socket.js';

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '');

  const login = (payload) => {
    setUser(payload.user);
    setToken(payload.token);
    localStorage.setItem('auth_user', JSON.stringify(payload.user));
    localStorage.setItem('auth_token', payload.token);
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
  };

  const refreshProfile = async () => {
    if (!localStorage.getItem('auth_token')) {
      return null;
    }

    const response = await api.get('/users/profile');
    const profile = response?.data?.data;
    if (profile) {
      const merged = {
        id: profile._id || profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar,
        role: profile.role,
        status: profile.status,
        agentInfo: profile.agentInfo,
        favorites: profile.favorites || []
      };
      updateUser(merged);
    }
    return profile;
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    disconnectSocket();
  };

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(token), login, logout, updateUser, refreshProfile }),
    [user, token]
  );

  return createElement(AuthContext.Provider, { value }, children);
};

const useAuth = () => useContext(AuthContext);

export { AuthProvider, useAuth };
