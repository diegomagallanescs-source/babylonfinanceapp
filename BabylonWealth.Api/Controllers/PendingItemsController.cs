using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

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

    /// <summary>Returns all pending items (Pending + Settled). Use ?status=pending for active only.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PendingItemResponseDto>>> GetAll([FromQuery] bool pendingOnly = false)
    {
        var userId = GetUserId();
        var items = pendingOnly
            ? await _pendingService.GetPendingOnlyAsync(userId)
            : await _pendingService.GetAllAsync(userId);
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
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

    [HttpPost]
    public async Task<ActionResult<PendingItemResponseDto>> Create([FromBody] CreatePendingItemRequest request)
    {
        var userId = GetUserId();
        var item = await _pendingService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpDelete("{id:guid}")]
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
    [HttpPatch("{id:guid}/settle")]
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
