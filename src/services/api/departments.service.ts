import { Department, PoliceStation } from '../../types/department';
import { mockStorage } from '../mock/mockStorage';
import { delay, ApiError, USE_MOCK_API } from './client';

class DepartmentsService {
  async getDepartments(): Promise<Department[]> {
    await delay(60);
    if (USE_MOCK_API) {
      return mockStorage.getDepartments();
    }
    throw new ApiError('Real backend not configured', 501);
  }

  async addDepartment(data: Omit<Department, 'id' | 'stationsCount' | 'totalComplaints' | 'openComplaints'>): Promise<Department> {
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

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department> {
    await delay(80);
    const updated = mockStorage.updateDepartment(id, updates);
    if (!updated) throw new ApiError('Department not found', 404);
    return updated;
  }

  async getStations(departmentId?: string): Promise<PoliceStation[]> {
    await delay(60);
    if (USE_MOCK_API) {
      const all = mockStorage.getStations();
      if (departmentId) {
        return all.filter((s) => s.departmentId === departmentId);
      }
      return all;
    }
    throw new ApiError('Real backend not configured', 501);
  }

  async addStation(data: Omit<PoliceStation, 'id' | 'officersCount' | 'activeCases'>): Promise<PoliceStation> {
    await delay(100);
    const newStation: PoliceStation = {
      ...data,
      id: `stn-${Date.now()}`,
      officersCount: 0,
      activeCases: 0,
    };
    return mockStorage.addStation(newStation);
  }

  async updateStation(id: string, updates: Partial<PoliceStation>): Promise<PoliceStation> {
    await delay(80);
    const updated = mockStorage.updateStation(id, updates);
    if (!updated) throw new ApiError('Police station not found', 404);
    return updated;
  }
}

export const departmentsService = new DepartmentsService();
