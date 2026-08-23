using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IProjectionService
{
    Task<IEnumerable<ProjectionSummaryDto>> GetAllAsync(Guid userId);
    Task<ProjectionDetailResponseDto> GetByIdAsync(Guid id, Guid userId);
    Task<ProjectionDetailResponseDto> CreateAsync(Guid userId, CreateProjectionRequest request);
    Task<ProjectionSummaryDto> UpdateAsync(Guid id, Guid userId, UpdateProjectionRequest request);
    Task DeleteAsync(Guid id, Guid userId);

    /// <summary>Overwrites the projection's editable ledger. Never touches the real accounting tables.</summary>
    Task SaveWorkspaceAsync(Guid id, Guid userId, SaveProjectionWorkspaceRequest request);

    Task<ProjectionSnapshotResponseDto> AddSnapshotAsync(Guid id, Guid userId, CreateProjectionSnapshotRequest request);
    Task DeleteSnapshotAsync(Guid id, Guid snapshotId, Guid userId);
}
