import { api } from './client';

export type BeaconListItem = {
  id: string;
  number: number;
  description?: string;
  latitude: number;
  longitude: number;
  floor: number;
  status: string;
};

export type UserListItem = {
  id: string;
  email: string;
  displayName: string;
  role: number;
  createdAt: string;
  lastLoginAt?: string;
};

export type UserLocation = {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  floor: number;
  beaconId?: string;
  recordedAt: string;
};

export type BciAction = {
  id: string;
  userId: string;
  sessionId: string;
  occurredAt: string;
  action: number;
  confidence: number;
  source: string;
  targetReference?: string;
};

export const adminApi = {
  listBeacons: () =>
    api.get<{ items: BeaconListItem[] }>('/api/v1/beacons', { params: { pageSize: 100 } }).then((r) => r.data?.items ?? []),

  updateBeaconLocation: (id: string, data: {
    latitude: number;
    longitude: number;
    floor: number;
    description?: string;
  }) => api.patch(`/api/v1/beacons/${id}/location`, data),

  listUsers: (search?: string, page = 1) =>
    api.get<{ items: UserListItem[]; totalCount: number }>('/api/v1/admin/users', {
      params: { search, page, pageSize: 50 },
    }).then((r) => r.data),

  getUserLocations: () =>
    api.get<UserLocation[]>('/api/v1/admin/locations').then((r) => r.data),

  listBciActions: (userId?: string, page = 1) =>
    api.get<{ items: BciAction[]; totalCount: number }>('/api/v1/admin/bci/actions', {
      params: { userId, page, pageSize: 50 },
    }).then((r) => r.data),

  createRoute: (data: {
    name: string;
    fromBeaconId: string;
    toRoomId: string;
    floor: number;
    coordinatesJson: string;
    steps: { order: number; beaconId: string; instruction: string }[];
  }) => api.post('/api/v1/admin/routes', data).then((r) => r.data),

  toggleRoute: (id: string, active: boolean) =>
    api.patch(`/api/v1/admin/routes/${id}/active`, { active }),

  listDiaryEntries: (page = 1) =>
    api.get('/api/v1/admin/diary', { params: { page, pageSize: 50 } }).then((r) => r.data),
};
