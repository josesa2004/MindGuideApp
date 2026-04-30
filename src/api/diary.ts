import { api } from './client';

export interface DiaryEntry {
  id: string;
  clientEntryId: string;
  userId: string;
  occurredAt: string;
  category: number;
  description: string;
  status: number;
  roomId?: string;
  beaconId?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  attachments: DiaryAttachment[];
}

export interface DiaryAttachment {
  id: string;
  mediaType: number;
  publicUrl: string;
  sizeBytes: number;
  duration?: number;
}

export const diaryApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<{ items: DiaryEntry[]; totalCount: number }>('/api/v1/diary/entries', {
      params: { page, pageSize },
    }).then((r) => r.data),

  submit: (entry: {
    clientEntryId: string;
    occurredAt: string;
    category: number;
    description: string;
    latitude?: number;
    longitude?: number;
  }) => api.post<DiaryEntry>('/api/v1/diary/entries', entry).then((r) => r.data),

  attachImage: (id: string, uri: string, fileName: string) => {
    const form = new FormData();
    form.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);
    return api.post(`/api/v1/diary/entries/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
