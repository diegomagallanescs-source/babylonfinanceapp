import client from './client';
import type {
  IncomeResponseDto,
  InvestmentIncomeResponseDto,
  CreateInvestmentIncomeRequest,
  PassiveIncomeSummaryDto,
} from '../types';

export const fetchIncomeSources = () =>
  client.get<IncomeResponseDto[]>('/income').then((r) => r.data);

export const fetchInvestmentIncome = () =>
  client.get<InvestmentIncomeResponseDto[]>('/investmentincome').then((r) => r.data);

export const fetchPassiveIncomeSummary = () =>
  client.get<PassiveIncomeSummaryDto>('/investmentincome/summary').then((r) => r.data);

export const createInvestmentIncome = (body: CreateInvestmentIncomeRequest) =>
  client.post<InvestmentIncomeResponseDto>('/investmentincome', body).then((r) => r.data);

export const deleteInvestmentIncome = (id: string): Promise<void> =>
  client.delete(`/investmentincome/${id}`).then(() => undefined);
