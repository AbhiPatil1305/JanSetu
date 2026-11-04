import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/auth';
import { authService } from '../services/api/auth.service';
import { mockStorage } from '../services/mock/mockStorage';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrId: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  switchRoleDemo: (targetRole: UserRole) => Promise<User>;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check existing stored session
    const session = authService.getCurrentSession();
    if (session && session.user) {
      setUser(session.user);
    }
    setIsLoading(false);
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
