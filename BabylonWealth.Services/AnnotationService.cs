using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class AnnotationService : IAnnotationService
{
    private readonly IAnnotationRepository _annotationRepo;

    public AnnotationService(IAnnotationRepository annotationRepo)
    {
        _annotationRepo = annotationRepo;
    }

    public async Task<AnnotationResponseDto> UpsertAsync(Guid userId, CreateAnnotationRequest request)
    {
        var categoryString = request.Category?.ToString();
        var date = DateTime.SpecifyKind(request.AnnotationDate, DateTimeKind.Utc);

        var annotation = await _annotationRepo.UpsertAsync(
            userId,
            date,
            request.Text,
            categoryString,
            request.SnapshotId);

        return ToDto(annotation);
    }

    public async Task<IEnumerable<AnnotationResponseDto>> GetByDateRangeAsync(Guid userId, DateTime from, DateTime to)
    {
        var annotations = await _annotationRepo.GetByDateRangeAsync(userId, from, to);
        return annotations.Select(ToDto);
    }

    private static AnnotationResponseDto ToDto(NetWorthAnnotation a)
    {
        var category = Enum.TryParse<AnnotationCategory>(a.Category, out var parsed) ? parsed : (AnnotationCategory?)null;

        return new AnnotationResponseDto
        {
            Id             = a.Id,
            AnnotationDate = a.AnnotationDate,
            Text           = a.Text,
            Category       = category,
            Color          = AnnotationResponseDto.ColorForCategory(category),
            SnapshotId     = a.SnapshotId,
            CreatedAt      = a.CreatedAt
        };
    }
}
