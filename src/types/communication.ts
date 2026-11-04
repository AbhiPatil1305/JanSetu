export type CommunicationType = 'PHONE_CALL' | 'EMAIL' | 'LETTER' | 'IN_APP' | 'OTHER';
export type CommunicationDeliveryStatus = 'GENERATED' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED';

export interface CommunicationRecord {
  id: string;
  complaintId: string;
  timestamp: string;
  type: CommunicationType;
  sender: string;
  recipient: string;
  subject: string;
  message: string;
  outcome: string;
  deliveryStatus?: CommunicationDeliveryStatus;
}
