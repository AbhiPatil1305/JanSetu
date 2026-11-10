import {
  Department,
  PoliceStation,
  DepartmentCandidate,
  DepartmentClassificationRequest,
  DepartmentClassificationResponse,
} from '../../types/department';
import { mockStorage } from '../mock/mockStorage';
import { apiClient, delay, ApiError, USE_MOCK_API, isUuid } from './client';

export interface BackendDepartment {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackendOffice {
  id: string;
  department_id: string;
  name: string;
  office_code: string;
  address?: string | null;
  district: string;
  state: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class DepartmentsService {
  async getDepartments(): Promise<Department[]> {
    if (USE_MOCK_API) {
      await delay(60);
      return mockStorage.getDepartments();
    }

    const data = await apiClient.get<BackendDepartment[]>('/departments');
    return data.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      head: d.description || 'Department Head',
      contactEmail: `${d.code.toLowerCase()}@karnataka.gov.in`,
      contactPhone: '+91 80 2200 0000',
      stationsCount: d.code === 'POL' ? 6 : 2,
      totalComplaints: 0,
      openComplaints: 0,
      status: d.is_active ? 'active' : 'inactive',
    }));
  }

  async addDepartment(
    data: Omit<Department, 'id' | 'stationsCount' | 'totalComplaints' | 'openComplaints'>
  ): Promise<Department> {
    if (USE_MOCK_API) {
      await delay(100);
      const newDept: Department = {
        ...data,
        id: `dept-${Date.now()}`,
        stationsCount: 0,
        totalComplaints: 0,
        openComplaints: 0,
      };
      return mockStorage.addDepartment(newDept);
    }

    const created = await apiClient.post<BackendDepartment>('/departments', {
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.head || undefined,
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      head: created.description || data.head,
      contactEmail: data.contactEmail || `${created.code.toLowerCase()}@karnataka.gov.in`,
      contactPhone: data.contactPhone || '+91 80 2200 0000',
      stationsCount: 0,
      totalComplaints: 0,
      openComplaints: 0,
      status: created.is_active ? 'active' : 'inactive',
    };
  }

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department> {
    if (USE_MOCK_API) {
      await delay(80);
      const updated = mockStorage.updateDepartment(id, updates);
      if (!updated) throw new ApiError('Department not found', 404);
      return updated;
    }

    const payload: Record<string, any> = {};
    if (updates.name) payload.name = updates.name;
    if (updates.head) payload.description = updates.head;

    const res = await apiClient.patch<BackendDepartment>(`/departments/${id}`, payload);

    if (updates.status !== undefined) {
      await apiClient.patch<BackendDepartment>(`/departments/${id}/status`, {
        is_active: updates.status === 'active',
      });
    }

    return {
      id: res.id,
      code: res.code,
      name: res.name,
      head: res.description || 'Department Head',
      contactEmail: updates.contactEmail || `${res.code.toLowerCase()}@karnataka.gov.in`,
      contactPhone: updates.contactPhone || '+91 80 2200 0000',
      stationsCount: 0,
      totalComplaints: 0,
      openComplaints: 0,
      status: res.is_active ? 'active' : 'inactive',
    };
  }

  async getStations(departmentId?: string): Promise<PoliceStation[]> {
    if (USE_MOCK_API) {
      await delay(60);
      const all = mockStorage.getStations();
      if (departmentId) {
        return all.filter((s) => s.departmentId === departmentId);
      }
      return all;
    }

    const params: Record<string, any> = {};
    if (departmentId && isUuid(departmentId)) params.department_id = departmentId;

    const offices = await apiClient.get<BackendOffice[]>('/offices', { params });
    return offices.map((o) => ({
      id: o.id,
      departmentId: o.department_id,
      code: o.office_code,
      name: o.name,
      location: o.district ? `${o.district}, ${o.state}` : 'Bengaluru Urban, Karnataka',
      contactNumber: '+91 80 2294 2222',
      inChargeName: 'Station House Officer (SHO)',
      inChargeRank: 'Police Inspector (PI)',
      officersCount: 5,
      activeCases: 0,
      status: o.is_active ? 'active' : 'inactive',
    }));
  }

  async addStation(
    data: Omit<PoliceStation, 'id' | 'officersCount' | 'activeCases'>
  ): Promise<PoliceStation> {
    if (USE_MOCK_API) {
      await delay(100);
      const newStation: PoliceStation = {
        ...data,
        id: `stn-${Date.now()}`,
        officersCount: 0,
        activeCases: 0,
      };
      return mockStorage.addStation(newStation);
    }

    const res = await apiClient.post<BackendOffice>('/offices', {
      department_id: data.departmentId,
      name: data.name,
      office_code: data.code,
      address: data.location || undefined,
      district: 'Bengaluru Urban',
      state: 'Karnataka',
    });

    return {
      id: res.id,
      departmentId: res.department_id,
      code: res.office_code,
      name: res.name,
      location: `${res.district}, ${res.state}`,
      contactNumber: data.contactNumber || '+91 80 2294 2222',
      inChargeName: data.inChargeName || 'Station House Officer',
      inChargeRank: data.inChargeRank || 'Police Inspector',
      officersCount: 0,
      activeCases: 0,
      status: res.is_active ? 'active' : 'inactive',
    };
  }

  async updateStation(id: string, updates: Partial<PoliceStation>): Promise<PoliceStation> {
    if (USE_MOCK_API) {
      await delay(80);
      const updated = mockStorage.updateStation(id, updates);
      if (!updated) throw new ApiError('Police station not found', 404);
      return updated;
    }

    const payload: Record<string, any> = {};
    if (updates.name) payload.name = updates.name;
    if (updates.location) payload.address = updates.location;

    const res = await apiClient.patch<BackendOffice>(`/offices/${id}`, payload);

    if (updates.status !== undefined) {
      await apiClient.patch<BackendOffice>(`/offices/${id}/status`, {
        is_active: updates.status === 'active',
      });
    }

    return {
      id: res.id,
      departmentId: res.department_id,
      code: res.office_code,
      name: res.name,
      location: `${res.district}, ${res.state}`,
      contactNumber: updates.contactNumber || '+91 80 2294 2222',
      inChargeName: updates.inChargeName || 'Station House Officer',
      inChargeRank: updates.inChargeRank || 'Police Inspector',
      officersCount: updates.officersCount || 0,
      activeCases: updates.activeCases || 0,
      status: res.is_active ? 'active' : 'inactive',
    };
  }

  async recommendDepartment(
    payload: DepartmentClassificationRequest
  ): Promise<DepartmentClassificationResponse> {
    if (USE_MOCK_API) {
      await delay(200);
      return {
        main_issue: 'Public nuisance and safety',
        secondary_issues: [],
        jurisdiction_clues: ['Bengaluru Urban'],
        recommended_department: {
          department_id: 'dept-1',
          department_code: 'POL',
          department_name: 'Home & Police Department',
          confidence_score: 0.95,
          rank: 1,
          primary_reason: 'Matches law enforcement and safety duties.',
          matched_responsibilities: ['Public Safety', 'Noise Pollution'],
          evidence_excerpts: ['loudspeakers playing commercial sound'],
          jurisdiction_match: true,
        },
        alternative_candidates: [],
        application_confidence: 'HIGH',
        uncertainty_notes: null,
        missing_information: [],
        disclaimer: 'The LLM is an assistant for administrative classification, not an authority. Human review required.',
        requires_human_confirmation: true,
        model_version: 'qwen2.5:1.5b',
        latency_sec: 0.25,
        eval_tokens_per_sec: 115.0,
      };
    }

    return apiClient.post<DepartmentClassificationResponse>('/departments/recommend', payload);
  }
}

export const departmentsService = new DepartmentsService();
