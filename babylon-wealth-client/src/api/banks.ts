import apiClient from './client';
import type { BankDto } from '../types/ledger';

export async function searchBanks(q: string): Promise<BankDto[]> {
  const { data } = await apiClient.get<BankDto[]>('/banks/search', { params: { q } });
  return data;
}
