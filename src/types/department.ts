export interface Department {
  id: string;
  code: string;
  name: string;
  head: string;
  contactEmail: string;
  contactPhone: string;
  stationsCount: number;
  totalComplaints: number;
  openComplaints: number;
  status: 'active' | 'inactive';
}

export interface PoliceStation {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  location: string;
  contactNumber: string;
  inChargeName: string;
  inChargeRank: string;
  officersCount: number;
  activeCases: number;
  status: 'active' | 'inactive';
}
