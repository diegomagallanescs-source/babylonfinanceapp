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
    private readonly ISnapshotService _snapshotService;
    private readonly IAnnotationService _annotationService;

    public AnnotationsController(ISnapshotService snapshotService, IAnnotationService annotationService)
    {
        _snapshotService = snapshotService;
        _annotationService = annotationService;
    }

    /// <summary>Creates or updates the annotation for the snapshot nearest to the given date.</summary>
    /// <response code="204">Annotation saved.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost("annotate")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Annotate([FromBody] CreateAnnotationRequest request)
    {
        var date = DateTime.SpecifyKind(request.AnnotationDate, DateTimeKind.Utc);
        await _snapshotService.AnnotateSnapshotAsync(GetUserId(), date, request.Text);
        return NoContent();
    }

    /// <summary>Clears the annotation from the snapshot nearest to the given date.</summary>
    /// <response code="204">Annotation cleared.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpDelete("annotate")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ClearAnnotation([FromQuery] DateTime date)
    {
        var utcDate = DateTime.SpecifyKind(date, DateTimeKind.Utc);
        await _snapshotService.ClearAnnotationAsync(GetUserId(), utcDate);
        return NoContent();
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
