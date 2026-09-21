import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.checkAuth().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);