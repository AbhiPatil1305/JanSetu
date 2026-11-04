import { User } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import { delay, ApiError, USE_MOCK_API } from './client';

class OfficersService {
  async getOfficers(stationId?: string): Promise<User[]> {
    await delay(60);
    if (USE_MOCK_API) {
      const all = mockStorage.getOfficers();
      if (stationId) {
        return all.filter((o) => o.stationId === stationId);
      }
      return all;
    }
    throw new ApiError('Real backend not configured', 501);
  }

  async getOfficerById(id: string): Promise<User> {
    await delay(50);
    const officers = mockStorage.getOfficers();
    const officer = officers.find((o) => o.id === id);
    if (!officer) throw new ApiError('Officer not found', 404);
    return officer;
  }

  async addOfficer(data: Omit<User, 'id'>): Promise<User> {
    await delay(100);
    const newOfficer: User = {
      ...data,
      id: `user-officer-${Date.now()}`,
    };
    return mockStorage.addOfficer(newOfficer);
  }

  async updateOfficer(id: string, updates: Partial<User>): Promise<User> {
    await delay(80);
    const updated = mockStorage.updateOfficer(id, updates);
    if (!updated) throw new ApiError('Officer not found', 404);
    return updated;
  }
}

export const officersService = new OfficersService();
