import client from './client';
import type { IncomeResponseDto, InvestmentIncomeResponseDto } from '../types';

export const fetchIncomeSources = () =>
  client.get<IncomeResponseDto[]>('/income').then((r) => r.data);

export const fetchInvestmentIncome = () =>
  client.get<InvestmentIncomeResponseDto[]>('/investmentincome').then((r) => r.data);
