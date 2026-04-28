import client from './client';
import type { SpendingTrendPointDto } from '../types';

export const fetchSpendingTrend = (from: Date, to: Date) =>
  client
    .get<SpendingTrendPointDto[]>('/spending/trend', {
      params: { from: from.toISOString(), to: to.toISOString() },
    })
    .then((r) => r.data);
