using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

[ApiController]
[Route("api/v1/networth")]
[Authorize]
public class AnnotationsController : ControllerBase
{
    private readonly IAnnotationService _annotationService;

    public AnnotationsController(IAnnotationService annotationService)
    {
        _annotationService = annotationService;
    }

    [HttpPost("annotate")]
    public async Task<ActionResult<AnnotationResponseDto>> Annotate([FromBody] CreateAnnotationRequest request)
    {
        var userId = GetUserId();
        var result = await _annotationService.UpsertAsync(userId, request);
        return Ok(result);
    }

    [HttpGet("annotations")]
    public async Task<ActionResult<IEnumerable<AnnotationResponseDto>>> GetAnnotations(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userId = GetUserId();
        var effectiveFrom = DateTime.SpecifyKind(from ?? DateTime.UtcNow.AddYears(-1), DateTimeKind.Utc);
        var effectiveTo   = DateTime.SpecifyKind(to   ?? DateTime.UtcNow,             DateTimeKind.Utc);
        var annotations = await _annotationService.GetByDateRangeAsync(userId, effectiveFrom, effectiveTo);
        return Ok(annotations);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
