using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>
/// Pending item management — money owed to or by the user.
/// Pending items with Status = Pending are included in net worth calculations; Settled items are excluded.
/// </summary>
[ApiController]
[Route("api/v1/pending")]
[Authorize]
public class PendingItemsController : ControllerBase
{
    private readonly IPendingItemService _pendingService;

    public PendingItemsController(IPendingItemService pendingService)
    {
        _pendingService = pendingService;
    }

    /// <summary>Returns all pending items (Pending + Settled). Pass ?pendingOnly=true to return active items only.</summary>
    /// <param name="pendingOnly">When true, returns only items with Status = Pending.</param>
    /// <response code="200">List of pending items.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PendingItemResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<PendingItemResponseDto>>> GetAll([FromQuery] bool pendingOnly = false)
    {
        var userId = GetUserId();
        var items = pendingOnly
            ? await _pendingService.GetPendingOnlyAsync(userId)
            : await _pendingService.GetAllAsync(userId);
        return Ok(items);
    }

    /// <summary>Returns a single pending item by ID.</summary>
    /// <response code="200">Pending item found.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Item not found or belongs to another user.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PendingItemResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PendingItemResponseDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        try
        {
            var item = await _pendingService.GetByIdAsync(id, userId);
            return Ok(item);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>
    /// Creates a new pending item. Amount sign convention: positive = owed TO you (asset); negative = you owe (liability).
    /// </summary>
    /// <response code="201">Pending item created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost]
    [ProducesResponseType(typeof(PendingItemResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PendingItemResponseDto>> Create([FromBody] CreatePendingItemRequest request)
    {
        var userId = GetUserId();
        var item = await _pendingService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    /// <summary>Soft-deletes a pending item.</summary>
    /// <response code="204">Item deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Item not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        try
        {
            await _pendingService.SoftDeleteAsync(id, userId);
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>
    /// State transition: Pending → Settled.
    /// PATCH is correct here — we are updating one field (Status), not replacing the resource.
    /// After settling, the item is excluded from net worth calculations.
    /// </summary>
    /// <response code="204">Item settled.</response>
    /// <response code="400">Item is already settled.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Item not found or belongs to another user.</response>
    [HttpPatch("{id:guid}/settle")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Settle(Guid id)
    {
        var userId = GetUserId();
        try
        {
            await _pendingService.SettleAsync(id, userId);
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
        catch (ValidationException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
