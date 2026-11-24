
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AuthContext from "./AuthContext";

import {
  loginUser,
  registerUser,
  getCurrentUser,
  saveAccessToken,
  getAccessToken,
  clearAccessToken,
} from "../services/auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const token = getAccessToken();

      if (!token) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);

        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        clearAccessToken();

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await loginUser(credentials);

    saveAccessToken(result.access_token);

    try {
      const currentUser = await getCurrentUser(result.access_token);
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      clearAccessToken();
      setUser(null);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    await registerUser(userData);

    return login({
      email: userData.email,
      password: userData.password,
    });
  }, [login]);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
