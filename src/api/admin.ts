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

export const adminApi = {
  listBeacons: () =>
    api.get<{ items: BeaconListItem[] }>('/api/v1/beacons', { params: { pageSize: 100 } }).then((r) => r.data?.items ?? []),

  updateBeaconLocation: (id: string, data: {
    latitude: number;
    longitude: number;
    floor: number;
    description?: string;
  }) => api.patch(`/api/v1/beacons/${id}/location`, data),
};
