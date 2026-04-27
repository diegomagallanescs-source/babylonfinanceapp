using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Net worth snapshot annotations — add notes to any point on the chart.</summary>
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

    /// <summary>Creates or updates the annotation for a specific snapshot date (upsert by date).</summary>
    /// <response code="200">Annotation saved.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost("annotate")]
    [ProducesResponseType(typeof(AnnotationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AnnotationResponseDto>> Annotate([FromBody] CreateAnnotationRequest request)
    {
        var userId = GetUserId();
        var result = await _annotationService.UpsertAsync(userId, request);
        return Ok(result);
    }

    /// <summary>Returns all annotations within the given date range. Defaults to the past year.</summary>
    /// <param name="from">Range start (UTC). Defaults to one year ago.</param>
    /// <param name="to">Range end (UTC). Defaults to now.</param>
    /// <response code="200">List of annotations.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("annotations")]
    [ProducesResponseType(typeof(IEnumerable<AnnotationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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
