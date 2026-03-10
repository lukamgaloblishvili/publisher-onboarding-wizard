import { createContext, createElement, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const nextUser = await api.login(credentials);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return createElement(AuthContext.Provider, { value: { user, setUser, loading, login, logout } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
