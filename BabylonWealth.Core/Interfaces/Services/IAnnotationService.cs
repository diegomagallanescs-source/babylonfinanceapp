using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IAnnotationService
{
    /// <summary>
    /// Creates or updates an annotation for the given date (upsert by date).
    /// Called by POST /api/v1/networth/annotate
    /// </summary>
    Task<AnnotationResponseDto> UpsertAsync(Guid userId, CreateAnnotationRequest request);

    /// <summary>
    /// Returns all annotations within a date range, ordered by date ascending.
    /// Called by GET /api/v1/networth/annotations?from=&to=
    /// </summary>
    Task<IEnumerable<AnnotationResponseDto>> GetByDateRangeAsync(Guid userId, DateTime from, DateTime to);
}
