import apiClient from './client';
import type {
  CheckingStatementResponseDto,
  CheckingStatementSummaryDto,
  SaveCheckingStatementRequest,
  StatementAnalysisResponseDto,
  StatementSummaryResponseDto,
  SaveStatementRequest,
  AnnualFinancialSummaryDto,
} from '../types/statements';

// ── Checking (Money In) ───────────────────────────────────────

export async function analyzeChecking(files: File[]): Promise<CheckingStatementResponseDto> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const { data } = await apiClient.post<CheckingStatementResponseDto>(
    '/statements/analyze-checking',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function saveChecking(
  body: SaveCheckingStatementRequest,
): Promise<CheckingStatementSummaryDto> {
  const { data } = await apiClient.post<CheckingStatementSummaryDto>(
    '/statements/checking/save',
    body,
  );
  return data;
}

export async function updateChecking(
  id: string,
  body: SaveCheckingStatementRequest,
): Promise<CheckingStatementSummaryDto> {
  const { data } = await apiClient.put<CheckingStatementSummaryDto>(
    `/statements/checking/${id}`,
    body,
  );
  return data;
}

export async function fetchCheckingHistory(): Promise<CheckingStatementSummaryDto[]> {
  const { data } = await apiClient.get<CheckingStatementSummaryDto[]>(
    '/statements/checking/history',
  );
  return data;
}

// ── Credit Card (Money Out) ───────────────────────────────────

export async function analyzeStatement(files: File[]): Promise<StatementAnalysisResponseDto> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const { data } = await apiClient.post<StatementAnalysisResponseDto>(
    '/statements/analyze',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function saveStatement(
  body: SaveStatementRequest,
): Promise<StatementSummaryResponseDto> {
  const { data } = await apiClient.post<StatementSummaryResponseDto>('/statements/save', body);
  return data;
}

export async function updateStatement(
  id: string,
  body: SaveStatementRequest,
): Promise<StatementSummaryResponseDto> {
  const { data } = await apiClient.put<StatementSummaryResponseDto>(`/statements/${id}`, body);
  return data;
}

export async function fetchStatementHistory(): Promise<StatementSummaryResponseDto[]> {
  const { data } = await apiClient.get<StatementSummaryResponseDto[]>('/statements/history');
  return data;
}

export async function fetchStatementAnnualSummary(): Promise<AnnualFinancialSummaryDto[]> {
  const { data } = await apiClient.get<AnnualFinancialSummaryDto[]>('/statements/annual-summary');
  return data;
}

export async function deleteStatement(id: string): Promise<void> {
  await apiClient.delete(`/statements/${id}`);
}

export async function deleteChecking(id: string): Promise<void> {
  await apiClient.delete(`/statements/checking/${id}`);
}
