import apiClient from './client';
import type {
  ProjectionSummaryDto,
  ProjectionDetailDto,
  ProjectionSnapshotDto,
  ProjectionState,
  CreateProjectionRequest,
  UpdateProjectionRequest,
  CreateProjectionSnapshotRequest,
} from '../types/projections';

export async function fetchProjections(): Promise<ProjectionSummaryDto[]> {
  const { data } = await apiClient.get<ProjectionSummaryDto[]>('/projections');
  return data;
}

export async function fetchProjection(id: string): Promise<ProjectionDetailDto> {
  const { data } = await apiClient.get<ProjectionDetailDto>(`/projections/${id}`);
  return data;
}

export async function createProjection(body: CreateProjectionRequest): Promise<ProjectionDetailDto> {
  const { data } = await apiClient.post<ProjectionDetailDto>('/projections', body);
  return data;
}

export async function updateProjection(
  id: string,
  body: UpdateProjectionRequest,
): Promise<ProjectionSummaryDto> {
  const { data } = await apiClient.put<ProjectionSummaryDto>(`/projections/${id}`, body);
  return data;
}

export async function deleteProjection(id: string): Promise<void> {
  await apiClient.delete(`/projections/${id}`);
}

/** Persists the projection's editable ledger. Writes only inside the projection. */
export async function saveProjectionWorkspace(id: string, state: ProjectionState): Promise<void> {
  await apiClient.put(`/projections/${id}/workspace`, { state });
}

export async function createProjectionSnapshot(
  id: string,
  body: CreateProjectionSnapshotRequest,
): Promise<ProjectionSnapshotDto> {
  const { data } = await apiClient.post<ProjectionSnapshotDto>(`/projections/${id}/snapshots`, body);
  return data;
}

export async function deleteProjectionSnapshot(id: string, snapshotId: string): Promise<void> {
  await apiClient.delete(`/projections/${id}/snapshots/${snapshotId}`);
}
