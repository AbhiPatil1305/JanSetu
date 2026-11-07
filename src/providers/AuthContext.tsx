import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/auth';
import { authService } from '../services/api/auth.service';
import { mockStorage } from '../services/mock/mockStorage';
import { USE_MOCK_API } from '../services/api/client';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrId: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  switchRoleDemo: (targetRole: UserRole) => Promise<User>;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const handleSessionExpired = () => {
      if (mounted) {
        setUser(null);
      }
    };
    window.addEventListener('jansetu:session_expired', handleSessionExpired);

    const initAuth = async () => {
      // 1. Check local session storage first for immediate UI hydration
      const storedSession = authService.getCurrentSession();
      if (storedSession && storedSession.user) {
        setUser(storedSession.user);
      }

      // 2. If connected to real backend, verify token with GET /auth/me
      if (!USE_MOCK_API) {
        try {
          const verifiedUser = await authService.getCurrentProfile();
          if (mounted) {
            setUser(verifiedUser);
          }
        } catch {
          if (mounted) {
            setUser(null);
          }
        }
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      window.removeEventListener('jansetu:session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (emailOrId: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const session = await authService.login(emailOrId, password);
      setUser(session.user);
      return session.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
    authService.updateStoredUser(updates);
  };

  const switchRoleDemo = async (targetRole: UserRole): Promise<User> => {
    let email = 'admin@jansetu.demo';
    if (targetRole === 'DC_PA') email = 'pa@jansetu.demo';
    if (targetRole === 'POLICE_OFFICER') email = 'officer@jansetu.demo';
    return login(email, 'JanSetu@123');
  };

  const resetDemoData = () => {
    mockStorage.resetAllData();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateCurrentUser,
        switchRoleDemo,
        resetDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
