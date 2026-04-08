import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on mount
    const storedUser = localStorage.getItem('ssv_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setRole(parsedUser.role);
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        localStorage.removeItem('ssv_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // 1. First, try to find the user by username only to see if it exists
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_name', username)
        .maybeSingle();

      if (userError) throw userError;

      if (!userRow) {
        console.log('Diagnostic: Username not found in database:', username);
        throw new Error(`Username "${username}" not found. Check for hidden spaces in Supabase.`);
      }

      console.log('Diagnostic: User found, checking password...', {
        inputPassword: password,
        dbPassword: userRow.password
      });

      // 2. Check the password
      if (userRow.password !== password) {
        throw new Error('Invalid password for this user.');
      }

      const userData = {
        id: userRow.id,
        username: userRow.user_name,
        role: userRow.role?.toLowerCase() || 'user'
      };

      setUser(userData);
      setRole(userData.role);
      localStorage.setItem('ssv_user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('ssv_user');
    localStorage.removeItem('isAuth');
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
