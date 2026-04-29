import { api } from './client';

export const getNodes = () => api.get('/api/v1/navigation/nodes').then((r) => r.data);
export const getRoutes = (roomId?: string) =>
  api.get('/api/v1/navigation/routes', { params: roomId ? { roomId } : {} }).then((r) => r.data);
export const getRoute = (id: string) =>
  api.get(`/api/v1/navigation/routes/${id}`).then((r) => r.data);
export const recordLocation = (data: {
  beaconId?: string;
  latitude: number;
  longitude: number;
  floor: number;
}) => api.post('/api/v1/navigation/location', data).then((r) => r.data);
export const getRooms = (pageSize = 50) =>
  api.get('/api/v1/rooms', { params: { pageSize } }).then((r) => r.data?.items ?? r.data ?? []);
