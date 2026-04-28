import client from './client';
import type { NetWorthResponseDto, NetWorthHistoryPointDto } from '../types';

export const fetchNetWorthCurrent = () =>
  client.get<NetWorthResponseDto>('/networth/current').then((r) => r.data);

export const fetchNetWorthHistory = (from: Date, to: Date) =>
  client
    .get<NetWorthHistoryPointDto[]>('/networth/history', {
      params: { from: from.toISOString(), to: to.toISOString() },
    })
    .then((r) => r.data);

export const annotateNetWorth = (snapshotDate: string, annotation: string) =>
  client.post('/networth/annotate', { snapshotDate, annotation }).then((r) => r.data);
