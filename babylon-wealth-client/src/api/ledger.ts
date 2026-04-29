import apiClient from './client';
import type {
  BankAccountResponseDto, CreateBankAccountRequest, UpdateBankAccountRequest,
  CreditCardResponseDto, CreateCreditCardRequest, UpdateCreditCardRequest,
  LoanResponseDto, CreateLoanRequest, UpdateLoanRequest,
  InvestmentResponseDto, CreateInvestmentRequest, UpdateInvestmentRequest,
  PendingItemResponseDto, CreatePendingItemRequest,
  PropertyResponseDto, CreatePropertyRequest, UpdatePropertyRequest,
} from '../types/ledger';

// ── Bank Accounts ────────────────────────────────────────────
export async function fetchAccounts(): Promise<BankAccountResponseDto[]> {
  const { data } = await apiClient.get<BankAccountResponseDto[]>('/accounts');
  return data;
}

export async function createAccount(body: CreateBankAccountRequest): Promise<BankAccountResponseDto> {
  const { data } = await apiClient.post<BankAccountResponseDto>('/accounts', body);
  return data;
}

export async function updateAccount(id: string, body: UpdateBankAccountRequest): Promise<BankAccountResponseDto> {
  const { data } = await apiClient.put<BankAccountResponseDto>(`/accounts/${id}`, body);
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  await apiClient.delete(`/accounts/${id}`);
}

// ── Credit Cards ─────────────────────────────────────────────
export async function fetchCreditCards(): Promise<CreditCardResponseDto[]> {
  const { data } = await apiClient.get<CreditCardResponseDto[]>('/creditcards');
  return data;
}

export async function createCreditCard(body: CreateCreditCardRequest): Promise<CreditCardResponseDto> {
  const { data } = await apiClient.post<CreditCardResponseDto>('/creditcards', body);
  return data;
}

export async function updateCreditCard(id: string, body: UpdateCreditCardRequest): Promise<CreditCardResponseDto> {
  const { data } = await apiClient.put<CreditCardResponseDto>(`/creditcards/${id}`, body);
  return data;
}

// ── Loans ────────────────────────────────────────────────────
export async function fetchLoans(): Promise<LoanResponseDto[]> {
  const { data } = await apiClient.get<LoanResponseDto[]>('/loans');
  return data;
}

export async function createLoan(body: CreateLoanRequest): Promise<LoanResponseDto> {
  const { data } = await apiClient.post<LoanResponseDto>('/loans', body);
  return data;
}

export async function updateLoan(id: string, body: UpdateLoanRequest): Promise<LoanResponseDto> {
  const { data } = await apiClient.put<LoanResponseDto>(`/loans/${id}`, body);
  return data;
}

// ── Investments ──────────────────────────────────────────────
export async function fetchInvestments(): Promise<InvestmentResponseDto[]> {
  const { data } = await apiClient.get<InvestmentResponseDto[]>('/investments');
  return data;
}

export async function createInvestment(body: CreateInvestmentRequest): Promise<InvestmentResponseDto> {
  const { data } = await apiClient.post<InvestmentResponseDto>('/investments', body);
  return data;
}

export async function updateInvestment(id: string, body: UpdateInvestmentRequest): Promise<InvestmentResponseDto> {
  const { data } = await apiClient.put<InvestmentResponseDto>(`/investments/${id}`, body);
  return data;
}

export async function deleteInvestment(id: string): Promise<void> {
  await apiClient.delete(`/investments/${id}`);
}

// ── Pending Items ────────────────────────────────────────────
export async function fetchPendingItems(): Promise<PendingItemResponseDto[]> {
  const { data } = await apiClient.get<PendingItemResponseDto[]>('/pending');
  return data;
}

export async function createPendingItem(body: CreatePendingItemRequest): Promise<PendingItemResponseDto> {
  const { data } = await apiClient.post<PendingItemResponseDto>('/pending', body);
  return data;
}

export async function settlePendingItem(id: string): Promise<void> {
  await apiClient.patch(`/pending/${id}/settle`);
}

export async function deletePendingItem(id: string): Promise<void> {
  await apiClient.delete(`/pending/${id}`);
}

// ── Properties ───────────────────────────────────────────────
export async function fetchProperties(): Promise<PropertyResponseDto[]> {
  const { data } = await apiClient.get<PropertyResponseDto[]>('/properties');
  return data;
}

export async function createProperty(body: CreatePropertyRequest): Promise<PropertyResponseDto> {
  const { data } = await apiClient.post<PropertyResponseDto>('/properties', body);
  return data;
}

export async function updateProperty(id: string, body: UpdatePropertyRequest): Promise<PropertyResponseDto> {
  const { data } = await apiClient.put<PropertyResponseDto>(`/properties/${id}`, body);
  return data;
}

export async function deleteProperty(id: string): Promise<void> {
  await apiClient.delete(`/properties/${id}`);
}
