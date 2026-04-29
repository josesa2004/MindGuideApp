import { api } from './client';

export const feedbackApi = {
  submit: (data: { routeId?: string; rating: number; comment: string }) =>
    api.post('/api/v1/feedback', data),
  getMine: () => api.get('/api/v1/feedback/mine'),
};
