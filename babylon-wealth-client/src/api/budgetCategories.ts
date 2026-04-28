import apiClient from './client';
import type { BudgetCategoryResponseDto } from '../types/ledger';

export async function fetchBudgetCategories(): Promise<BudgetCategoryResponseDto[]> {
  const { data } = await apiClient.get<BudgetCategoryResponseDto[]>('/budget/categories');
  return data;
}
