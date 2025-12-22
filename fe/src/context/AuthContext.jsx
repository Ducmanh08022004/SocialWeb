import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token with backend and get fresh user data
          const res = await axiosClient.get('/auth/me');
          // res.user contains the user object
          setUser(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
        } catch (error) {
          console.error("Auth check failed", error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔐 Logging in with:', email);
      // Backend expects 'usernameOrEmail', so we map 'email' to it
      const res = await axiosClient.post('/auth/login', { usernameOrEmail: email, password });
      // Expecting res to contain token and user
      const { token, user } = res;
      console.log('✅ Login successful:', email);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error response:", error.response?.data);
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed';
      return { success: false, message };
    }
  };

  const register = async (username, email, password) => {
    try {
      await axiosClient.post('/auth/register', { username, email, password });
      return { success: true };
    } catch (error) {
      console.error("Register error", error);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
