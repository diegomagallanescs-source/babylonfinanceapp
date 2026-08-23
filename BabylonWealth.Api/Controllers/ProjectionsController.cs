using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>
/// Net worth projections. Each projection holds its own private copy of the accounting ledger —
/// nothing under this route reads or writes the real accounts, cards, loans, or properties.
/// </summary>
[ApiController]
[Route("api/v1/projections")]
[Authorize]
public class ProjectionsController : ControllerBase
{
    private readonly IProjectionService _projectionService;

    public ProjectionsController(IProjectionService projectionService)
    {
        _projectionService = projectionService;
    }

    /// <summary>Returns all projections for the authenticated user, newest first.</summary>
    /// <response code="200">List of projection summaries.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ProjectionSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<ProjectionSummaryDto>>> GetAll()
    {
        var projections = await _projectionService.GetAllAsync(GetUserId());
        return Ok(projections);
    }

    /// <summary>Returns one projection with its editable ledger and every saved snapshot.</summary>
    /// <response code="200">Projection found.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Projection not found or belongs to another user.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ProjectionDetailResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectionDetailResponseDto>> GetById(Guid id)
    {
        try
        {
            var projection = await _projectionService.GetByIdAsync(id, GetUserId());
            return Ok(projection);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>
    /// Creates a projection. The client sends a seed copy of the live Accounting tab as the
    /// starting ledger, so the projection opens showing the same numbers.
    /// </summary>
    /// <response code="201">Projection created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Validation error.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ProjectionDetailResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProjectionDetailResponseDto>> Create(
        [FromBody] CreateProjectionRequest request)
    {
        try
        {
            var created = await _projectionService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>Renames a projection or edits its short description.</summary>
    /// <response code="200">Projection updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Projection not found or belongs to another user.</response>
    /// <response code="422">Validation error.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ProjectionSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProjectionSummaryDto>> Update(
        Guid id, [FromBody] UpdateProjectionRequest request)
    {
        try
        {
            var updated = await _projectionService.UpdateAsync(id, GetUserId(), request);
            return Ok(updated);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a projection and every snapshot inside it.</summary>
    /// <response code="204">Projection deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Projection not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _projectionService.DeleteAsync(id, GetUserId());
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>
    /// Overwrites the projection's editable ledger with the current state of its accounting view.
    /// Only ever writes inside the projection.
    /// </summary>
    /// <response code="204">Workspace saved.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Projection not found or belongs to another user.</response>
    [HttpPut("{id:guid}/workspace")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveWorkspace(
        Guid id, [FromBody] SaveProjectionWorkspaceRequest request)
    {
        try
        {
            await _projectionService.SaveWorkspaceAsync(id, GetUserId(), request);
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>
    /// Freezes the ledger at a chosen date as a Projected or Realized point on the chart.
    /// </summary>
    /// <response code="201">Snapshot saved.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Projection not found or belongs to another user.</response>
    /// <response code="422">Validation error.</response>
    [HttpPost("{id:guid}/snapshots")]
    [ProducesResponseType(typeof(ProjectionSnapshotResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProjectionSnapshotResponseDto>> AddSnapshot(
        Guid id, [FromBody] CreateProjectionSnapshotRequest request)
    {
        try
        {
            var saved = await _projectionService.AddSnapshotAsync(id, GetUserId(), request);
            return CreatedAtAction(nameof(GetById), new { id }, saved);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a single point from a projection's chart.</summary>
    /// <response code="204">Snapshot deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Projection or snapshot not found, or belongs to another user.</response>
    [HttpDelete("{id:guid}/snapshots/{snapshotId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSnapshot(Guid id, Guid snapshotId)
    {
        try
        {
            await _projectionService.DeleteSnapshotAsync(id, snapshotId, GetUserId());
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
