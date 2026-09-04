import apiClient from './client';
import type { PurchaseResponseDto, CreatePurchaseRequest, PurchaseTrendPointDto } from '../types/spending';

export async function fetchPurchasesByMonth(month: number, year: number): Promise<PurchaseResponseDto[]> {
  const { data } = await apiClient.get<PurchaseResponseDto[]>('/purchases', { params: { month, year } });
  return data;
}

export async function createPurchase(request: CreatePurchaseRequest): Promise<PurchaseResponseDto> {
  const { data } = await apiClient.post<PurchaseResponseDto>('/purchases', request);
  return data;
}

export async function deletePurchase(id: string): Promise<void> {
  await apiClient.delete(`/purchases/${id}`);
}

export async function deletePurchaseMonth(month: number, year: number): Promise<void> {
  await apiClient.delete('/purchases/month', { params: { month, year } });
}

export async function fetchPurchaseTrendByCategory(from: Date, to: Date): Promise<PurchaseTrendPointDto[]> {
  const { data } = await apiClient.get<PurchaseTrendPointDto[]>('/purchases/trend/by-category', {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return data;
}
