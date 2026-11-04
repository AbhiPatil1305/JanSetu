export type UserRole = 'DC_MAIN_ADMIN' | 'DC_PA' | 'POLICE_OFFICER';

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  stationId?: string;
  stationName?: string;
  designation: string;
  phone: string;
  status: 'active' | 'inactive';
  avatar?: string;
  lastLogin?: string;
  badgeNumber?: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
