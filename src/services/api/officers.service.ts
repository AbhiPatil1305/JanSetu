import { User } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import { apiClient, delay, ApiError, USE_MOCK_API, isUuid, getCurrentBackendRole } from './client';
import {
  BackendUserResponse,
  BackendUserProfile,
  mapBackendUserToFrontendUser,
  authService,
} from './auth.service';
import { Complaint } from '../../types/complaint';
import { mapBackendGrievanceToComplaint, PaginatedGrievanceResponse } from './complaints.service';

export interface OfficerWorkload {
  officer_id: string;
  officer_name: string;
  officer_email: string;
  department_id?: string | null;
  assigned_count: number;
  in_progress_count: number;
  awaiting_information_count: number;
  resolved_count: number;
  total_active_workload: number;
}

class OfficersService {
  async getOfficers(stationId?: string): Promise<User[]> {
    if (USE_MOCK_API) {
      await delay(60);
      const all = mockStorage.getOfficers();
      if (stationId) {
        return all.filter((o) => o.stationId === stationId);
      }
      return all;
    }

    const backendRole = getCurrentBackendRole();
    if (backendRole === 'DATA_ENTRY_OPERATOR') {
      return [];
    }

    try {
      const params: Record<string, any> = {};
      if (stationId && isUuid(stationId)) params.office_id = stationId;

      const users = await apiClient.get<BackendUserResponse[]>('/users', { params });
      const officers = users
        .filter((u) => u.role_name === 'OFFICER' || u.role_name === 'SUPERVISOR')
        .map((bu) => {
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

      return officers;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        return [];
      }
      throw err;
    }
  }

  async getOfficerById(id: string): Promise<User> {
    if (USE_MOCK_API) {
      await delay(50);
      const officers = mockStorage.getOfficers();
      const officer = officers.find((o) => o.id === id);
      if (!officer) throw new ApiError('Officer not found', 404);
      return officer;
    }

    const bu = await apiClient.get<BackendUserResponse>(`/users/${id}`);
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
  }

  async getMyWorkload(): Promise<OfficerWorkload> {
    if (USE_MOCK_API) {
      await delay(50);
      return {
        officer_id: 'me',
        officer_name: 'Current Officer',
        officer_email: 'officer@jansetu.demo',
        assigned_count: 3,
        in_progress_count: 5,
        awaiting_information_count: 1,
        resolved_count: 8,
        total_active_workload: 9,
      };
    }
    return apiClient.get<OfficerWorkload>('/officers/me/workload');
  }

  async getOfficerWorkload(officerId: string): Promise<OfficerWorkload> {
    if (USE_MOCK_API) {
      await delay(50);
      return {
        officer_id: officerId,
        officer_name: 'Officer',
        officer_email: 'officer@jansetu.demo',
        assigned_count: 2,
        in_progress_count: 4,
        awaiting_information_count: 1,
        resolved_count: 6,
        total_active_workload: 7,
      };
    }
    return apiClient.get<OfficerWorkload>(`/officers/${officerId}/workload`);
  }

  async getMyAssignments(): Promise<Complaint[]> {
    if (USE_MOCK_API) {
      await delay(60);
      return [];
    }
    const res = await apiClient.get<PaginatedGrievanceResponse>('/officers/me/assignments');
    return (res.items || []).map(mapBackendGrievanceToComplaint);
  }

  async addOfficer(data: Omit<User, 'id'>): Promise<User> {
    if (USE_MOCK_API) {
      await delay(100);
      const newOfficer: User = {
        ...data,
        id: `user-officer-${Date.now()}`,
      };
      return mockStorage.addOfficer(newOfficer);
    }
    return authService.createUser({
      name: data.name,
      email: data.email,
      employeeId: data.employeeId,
      role: 'POLICE_OFFICER',
      designation: data.designation,
      phone: data.phone,
      stationId: data.stationId,
      departmentId: data.departmentId,
      status: data.status || 'active',
    });
  }

  async updateOfficer(id: string, updates: Partial<User>): Promise<User> {
    if (USE_MOCK_API) {
      await delay(80);
      const updated = mockStorage.updateOfficer(id, updates);
      if (!updated) throw new ApiError('Officer not found', 404);
      return updated;
    }

    const payload: Record<string, any> = {};
    if (updates.name) payload.full_name = updates.name;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.stationId) payload.office_id = updates.stationId;

    try {
      const bu = await apiClient.patch<BackendUserResponse>(`/users/${id}`, payload);
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
    } catch (err) {
      console.warn('Backend rejected profile update (permission restricted):', err);
      const curr = authService.getCurrentSession()?.user;
      if (curr && curr.id === id) {
        return { ...curr, ...updates };
      }
      throw err;
    }
  }
}

export const officersService = new OfficersService();
