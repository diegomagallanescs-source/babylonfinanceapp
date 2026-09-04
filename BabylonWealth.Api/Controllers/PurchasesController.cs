using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>
/// Manual purchase entries for the Spending tab.
/// Standalone from /spending (SpendingTransaction) — entirely separate data, no shared effect on
/// account balances, net worth, or the Home tab's Money Flow chart.
/// Purchases are immutable — soft-delete and re-enter to correct a mistake.
/// </summary>
[ApiController]
[Route("api/v1/purchases")]
[Authorize]
public class PurchasesController : ControllerBase
{
    private readonly IPurchaseService _purchaseService;

    public PurchasesController(IPurchaseService purchaseService)
    {
        _purchaseService = purchaseService;
    }

    /// <summary>Returns all purchases for the given month and year.</summary>
    /// <param name="month">Month (1–12).</param>
    /// <param name="year">Year (2000–2100).</param>
    /// <response code="200">List of purchases.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Month or year is out of valid range.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PurchaseResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<IEnumerable<PurchaseResponseDto>>> GetByMonth(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        if (month < 1 || month > 12)
            return UnprocessableEntity(new { error = "Month must be between 1 and 12." });

        if (year < 2000 || year > 2100)
            return UnprocessableEntity(new { error = "Year is out of valid range." });

        var purchases = await _purchaseService.GetByMonthAsync(GetUserId(), month, year);
        return Ok(purchases);
    }

    /// <summary>Records a new purchase. Purchases are immutable — there is no PUT endpoint.</summary>
    /// <response code="201">Purchase created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Referenced spending category not found.</response>
    [HttpPost]
    [ProducesResponseType(typeof(PurchaseResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseResponseDto>> Create([FromBody] CreatePurchaseRequest request)
    {
        try
        {
            var purchase = await _purchaseService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetByMonth), new { }, purchase);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes every purchase in the given month.</summary>
    /// <param name="month">Month (1–12).</param>
    /// <param name="year">Year (2000–2100).</param>
    /// <response code="204">Month deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Month or year is out of valid range.</response>
    [HttpDelete("month")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> DeleteByMonth([FromQuery] int month, [FromQuery] int year)
    {
        if (month < 1 || month > 12)
            return UnprocessableEntity(new { error = "Month must be between 1 and 12." });

        if (year < 2000 || year > 2100)
            return UnprocessableEntity(new { error = "Year is out of valid range." });

        await _purchaseService.DeleteByMonthAsync(GetUserId(), month, year);
        return NoContent();
    }

    /// <summary>Soft-deletes a single purchase. Use this to correct a mistake — re-enter the correct amount.</summary>
    /// <response code="204">Purchase deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Purchase not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _purchaseService.SoftDeleteAsync(id, GetUserId());
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Returns monthly spend broken down by category between two dates — feeds the Spending tab's chart.</summary>
    /// <param name="from">Range start (UTC). Defaults to one year ago.</param>
    /// <param name="to">Range end (UTC). Defaults to now.</param>
    /// <response code="200">List of monthly category breakdowns.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("trend/by-category")]
    [ProducesResponseType(typeof(IEnumerable<PurchaseTrendPointDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<PurchaseTrendPointDto>>> GetTrendByCategory(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var effectiveFrom = DateTime.SpecifyKind(from ?? DateTime.UtcNow.AddYears(-1), DateTimeKind.Utc);
        var effectiveTo   = DateTime.SpecifyKind(to   ?? DateTime.UtcNow,             DateTimeKind.Utc);
        var trend = await _purchaseService.GetMonthlyTrendByCategoryAsync(GetUserId(), effectiveFrom, effectiveTo);
        return Ok(trend);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
