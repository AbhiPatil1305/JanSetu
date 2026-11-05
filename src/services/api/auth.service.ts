import { User, UserRole, AuthSession } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import {
  apiClient,
  tokenStorage,
  delay,
  ApiError,
  USE_MOCK_API,
  isUuid,
  getCurrentBackendRole,
} from './client';

const SESSION_STORAGE_KEY = 'jansetu_session';

export interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface BackendUserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department_id: string | null;
  office_id: string | null;
  is_active: boolean;
  is_verified: boolean;
}

export interface BackendUserResponse {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  department_id?: string | null;
  office_id?: string | null;
  role_id: string;
  role_name: string;
  is_active: boolean;
  is_verified: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Explicit, documented role-mapping layer connecting backend roles to JanSetu's 3-role frontend model.
 */
export function mapBackendRoleToFrontendRole(backendRole: string): UserRole {
  switch (backendRole.toUpperCase()) {
    case 'SUPER_ADMIN':
    case 'DEPARTMENT_ADMIN':
      return 'DC_MAIN_ADMIN';

    case 'SUPERVISOR':
    case 'DATA_ENTRY_OPERATOR':
      return 'DC_PA';

    case 'OFFICER':
      return 'POLICE_OFFICER';

    default:
      console.warn(`Unrecognized backend role "${backendRole}", defaulting to POLICE_OFFICER.`);
      return 'POLICE_OFFICER';
  }
}

/**
 * Maps backend user profile into frontend User model.
 */
export function mapBackendUserToFrontendUser(profile: BackendUserProfile): User {
  let role = mapBackendRoleToFrontendRole(profile.role);

  // Preserve JanSetu demo role mapping for designated administrative logins
  if (profile.email === 'pa@jansetu.demo' || profile.full_name?.toLowerCase().includes('devi')) {
    role = 'DC_PA';
  } else if (profile.email === 'officer@jansetu.demo') {
    role = 'POLICE_OFFICER';
  } else if (profile.email === 'admin@jansetu.demo') {
    role = 'DC_MAIN_ADMIN';
  }

  let designation = 'Government Official';
  let badgeNumber: string | undefined = undefined;

  if (role === 'DC_MAIN_ADMIN') {
    designation = 'Deputy Commissioner & District Magistrate';
  } else if (role === 'DC_PA') {
    designation = 'Personal Assistant to Deputy Commissioner';
  } else if (role === 'POLICE_OFFICER') {
    designation = 'Inspector of Police';
    badgeNumber = `KA-POL-${profile.id.substring(0, 4).toUpperCase()}`;
  }

  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    employeeId: `${role.substring(0, 3)}-${profile.id.substring(0, 6).toUpperCase()}`,
    role,
    backendRole: profile.role,
    departmentId: profile.department_id || undefined,
    departmentName: profile.department_id ? 'Police Department' : undefined,
    stationId: profile.office_id || undefined,
    stationName: profile.office_id ? 'Central Police Station' : undefined,
    designation,
    phone: '+91 94481 00000',
    status: profile.is_active ? 'active' : 'inactive',
    badgeNumber,
  };
}

class AuthService {
  /**
   * Authenticate with email/password, acquire JWT tokens, fetch user profile, and persist session.
   */
  async login(emailOrEmployeeId: string, password: string): Promise<AuthSession> {
    const trimmed = emailOrEmployeeId.trim();

    if (USE_MOCK_API) {
      await delay(120);
      const lower = trimmed.toLowerCase();
      const users = mockStorage.getUsers();

      const user = users.find(
        (u) =>
          u.email.toLowerCase() === lower ||
          u.employeeId.toLowerCase() === lower ||
          (lower.includes('admin') && u.role === 'DC_MAIN_ADMIN') ||
          (lower.includes('pa') && u.role === 'DC_PA') ||
          (lower.includes('officer') && u.role === 'POLICE_OFFICER')
      );

      if (!user) {
        throw new ApiError('Invalid Employee ID or Password. Use demo accounts provided.', 401);
      }

      const session: AuthSession = {
        user,
        token: `mock-jwt-token-${user.id}-${Date.now()}`,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      };

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return session;
    }

    // --- REAL BACKEND AUTHENTICATION (Kenneth's FastAPI Backend) ---
    // 1. Obtain JWT access & refresh tokens via POST /api/v1/auth/login
    const tokens = await apiClient.post<BackendTokenResponse>(
      '/auth/login',
      {
        email: trimmed,
        password,
      },
      { skipAuth: true }
    );

    // 2. Persist tokens in tokenStorage
    tokenStorage.setTokens(tokens.access_token, tokens.refresh_token);

    // 3. Fetch authenticated user profile via GET /api/v1/auth/me
    const profile = await apiClient.get<BackendUserProfile>('/auth/me');

    // 4. Map backend profile to JanSetu user model
    const user = mapBackendUserToFrontendUser(profile);

    // 5. Store session
    const session: AuthSession = {
      user,
      token: tokens.access_token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  /**
   * Discard tokens and acknowledge logout with backend.
   */
  async logout(): Promise<void> {
    if (!USE_MOCK_API) {
      try {
        await apiClient.post('/auth/logout');
      } catch (e) {
        // Suppress network error during logout
      }
    }
    tokenStorage.clearTokens();
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Retrieves current session from storage.
   */
  getCurrentSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Validates active session against backend GET /auth/me and updates cached user profile.
   */
  async getCurrentProfile(): Promise<User | null> {
    if (USE_MOCK_API) {
      const session = this.getCurrentSession();
      return session ? session.user : null;
    }

    const token = tokenStorage.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const profile = await apiClient.get<BackendUserProfile>('/auth/me');
      const user = mapBackendUserToFrontendUser(profile);

      const session: AuthSession = {
        user,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return user;
    } catch (err) {
      this.logout();
      return null;
    }
  }

  /**
   * Fetches user list from backend GET /api/v1/users.
   */
  async getUsers(): Promise<User[]> {
    if (USE_MOCK_API) {
      await delay(60);
      return mockStorage.getUsers();
    }

    const backendRole = getCurrentBackendRole();
    if (backendRole === 'DATA_ENTRY_OPERATOR' || backendRole === 'OFFICER') {
      return [];
    }

    let backendUsers: BackendUserResponse[] = [];
    try {
      backendUsers = await apiClient.get<BackendUserResponse[]>('/users');
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        return [];
      }
      throw err;
    }
    return backendUsers.map((bu) => {
      const profile: BackendUserProfile = {
        id: bu.id,
        full_name: bu.full_name,
        email: bu.email,
        role: bu.role_name,
        department_id: bu.department_id || null,
        office_id: bu.office_id || null,
        is_active: bu.is_active,
        is_verified: bu.is_verified,
      };
      return mapBackendUserToFrontendUser(profile);
    });
  }

  async createUser(user: Omit<User, 'id'> & { password?: string }): Promise<User> {
    if (USE_MOCK_API) {
      await delay(100);
      return mockStorage.addUser({
        ...user,
        id: `user-${Date.now()}`,
      });
    }

    const backendRoleName =
      user.role === 'DC_MAIN_ADMIN' ? 'SUPER_ADMIN' : user.role === 'DC_PA' ? 'SUPERVISOR' : 'OFFICER';

    const users = await apiClient.get<BackendUserResponse[]>('/users');
    const existingWithRole = users.find((u) => u.role_name === backendRoleName);
    const roleId = existingWithRole?.role_id || (users[0]?.role_id as string);

    const payload = {
      full_name: user.name,
      email: user.email,
      password: user.password || 'JanSetu@123',
      phone: user.phone || undefined,
      department_id: isUuid(user.departmentId) ? user.departmentId : (users[0]?.department_id || undefined),
      office_id: isUuid(user.stationId) ? user.stationId : (users[0]?.office_id || undefined),
      role_id: roleId,
      is_verified: true,
    };

    const res = await apiClient.post<BackendUserResponse>('/users', payload);
    const profile: BackendUserProfile = {
      id: res.id,
      full_name: res.full_name,
      email: res.email,
      role: res.role_name,
      department_id: res.department_id || null,
      office_id: res.office_id || null,
      is_active: res.is_active,
      is_verified: res.is_verified,
    };
    return mapBackendUserToFrontendUser(profile);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (USE_MOCK_API) {
      await delay(80);
      const updated = mockStorage.updateUser(id, updates);
      if (!updated) throw new ApiError('User not found', 404);
      return updated;
    }

    const payload: Record<string, any> = {};
    if (updates.name) payload.full_name = updates.name;
    if (updates.phone) payload.phone = updates.phone;

    const res = await apiClient.patch<BackendUserResponse>(`/users/${id}`, payload);
    const profile: BackendUserProfile = {
      id: res.id,
      full_name: res.full_name,
      email: res.email,
      role: res.role_name,
      department_id: res.department_id || null,
      office_id: res.office_id || null,
      is_active: res.is_active,
      is_verified: res.is_verified,
    };
    return mapBackendUserToFrontendUser(profile);
  }
}

export const authService = new AuthService();
