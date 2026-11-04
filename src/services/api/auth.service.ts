import { User, AuthSession } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import { delay, ApiError, USE_MOCK_API } from './client';

const SESSION_STORAGE_KEY = 'jansetu_session';

class AuthService {
  async login(emailOrEmployeeId: string, password: string): Promise<AuthSession> {
    await delay(120);

    if (USE_MOCK_API) {
      const trimmed = emailOrEmployeeId.trim().toLowerCase();
      const users = mockStorage.getUsers();

      // Demo login validation
      const user = users.find(
        (u) =>
          u.email.toLowerCase() === trimmed ||
          u.employeeId.toLowerCase() === trimmed ||
          (trimmed.includes('admin') && u.role === 'DC_MAIN_ADMIN') ||
          (trimmed.includes('pa') && u.role === 'DC_PA') ||
          (trimmed.includes('officer') && u.role === 'POLICE_OFFICER')
      );

      // Verify password (in demo, allow 'JanSetu@123' or any password for convenience)
      if (!user) {
        throw new ApiError('Invalid Employee ID or Password. Use demo accounts provided.', 401);
      }

      const session: AuthSession = {
        user,
        token: `mock-jwt-token-${user.id}-${Date.now()}`,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      // Update last login
      mockStorage.updateUser(user.id, {
        lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      return session;
    }

    throw new ApiError('Real backend API not yet configured.', 501);
  }

  async logout(): Promise<void> {
    await delay(50);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  getCurrentSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    await delay(60);
    return mockStorage.getUsers();
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    await delay(100);
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
    };
    return mockStorage.addUser(newUser);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await delay(80);
    const updated = mockStorage.updateUser(id, updates);
    if (!updated) throw new ApiError('User not found', 404);
    return updated;
  }
}

export const authService = new AuthService();
