import { EscalationRequest, EscalationStatus } from '../../types/escalation';
import { User } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import { delay, ApiError, USE_MOCK_API } from './client';

class EscalationsService {
  async getEscalations(status?: EscalationStatus): Promise<EscalationRequest[]> {
    await delay(70);
    if (USE_MOCK_API) {
      let list = mockStorage.getEscalations();
      if (status) {
        list = list.filter((e) => e.status === status);
      }
      return list;
    }
    throw new ApiError('Real backend not configured', 501);
  }

  async createEscalationRequest(data: Omit<EscalationRequest, 'id' | 'requestDate' | 'status'>): Promise<EscalationRequest> {
    await delay(120);
    const newReq: EscalationRequest = {
      ...data,
      id: `esc-${Date.now()}`,
      requestDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'PENDING',
    };
    return mockStorage.addEscalation(newReq);
  }

  async reviewEscalation(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    remarks: string,
    adminUser: User
  ): Promise<EscalationRequest> {
    await delay(120);
    const updated = mockStorage.reviewEscalation(id, decision, remarks, adminUser);
    if (!updated) throw new ApiError('Escalation request not found', 404);
    return updated;
  }
}

export const escalationsService = new EscalationsService();
