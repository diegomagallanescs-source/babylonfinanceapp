using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>
/// Spending transactions and budget analytics.
/// Transactions are immutable — soft-delete and re-enter to correct a mistake.
/// </summary>
[ApiController]
[Route("api/v1/spending")]
[Authorize]
public class SpendingController : ControllerBase
{
    private readonly ISpendingService _spendingService;
    private readonly IBudgetAnalyticsService _analyticsService;

    public SpendingController(ISpendingService spendingService, IBudgetAnalyticsService analyticsService)
    {
        _spendingService = spendingService;
        _analyticsService = analyticsService;
    }

    /// <summary>Returns all spending transactions for the given month and year.</summary>
    /// <param name="month">Month (1–12).</param>
    /// <param name="year">Year (2000–2100).</param>
    /// <response code="200">List of transactions.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Month or year is out of valid range.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SpendingTransactionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<IEnumerable<SpendingTransactionResponseDto>>> GetByMonth(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        if (month < 1 || month > 12)
            return UnprocessableEntity(new { error = "Month must be between 1 and 12." });

        if (year < 2000 || year > 2100)
            return UnprocessableEntity(new { error = "Year is out of valid range." });

        var userId = GetUserId();
        var transactions = await _spendingService.GetByMonthAsync(userId, month, year);
        return Ok(transactions);
    }

    /// <summary>Records a new spending transaction. Transactions are immutable — there is no PUT endpoint.</summary>
    /// <response code="201">Transaction created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Referenced budget category not found.</response>
    [HttpPost]
    [ProducesResponseType(typeof(SpendingTransactionResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SpendingTransactionResponseDto>> Create(
        [FromBody] CreateSpendingTransactionRequest request)
    {
        var userId = GetUserId();
        try
        {
            var transaction = await _spendingService.CreateAsync(userId, request);
            return CreatedAtAction(nameof(GetByMonth), new { }, transaction);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a spending transaction. Use this to correct a mistake — re-enter the correct amount.</summary>
    /// <response code="204">Transaction deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Transaction not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        try
        {
            await _spendingService.SoftDeleteAsync(id, userId);
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Returns budget analytics for the given month — actual vs. target spend per category.</summary>
    /// <param name="month">Month (1–12).</param>
    /// <param name="year">Year (2000–2100).</param>
    /// <response code="200">Monthly budget analytics.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Month or year is out of valid range.</response>
    [HttpGet("analytics")]
    [ProducesResponseType(typeof(BudgetAnalyticsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<BudgetAnalyticsResponseDto>> GetAnalytics(
        [FromQuery] int month,
        [FromQuery] int year)
    {
        if (month < 1 || month > 12)
            return UnprocessableEntity(new { error = "Month must be between 1 and 12." });

        if (year < 2000 || year > 2100)
            return UnprocessableEntity(new { error = "Year is out of valid range." });

        var userId = GetUserId();
        var analytics = await _analyticsService.GetMonthlyAnalyticsAsync(userId, month, year);
        return Ok(analytics);
    }

    /// <summary>Returns monthly spending totals between two dates — used by the home screen money-flow chart.</summary>
    /// <param name="from">Range start (UTC). Defaults to one year ago.</param>
    /// <param name="to">Range end (UTC). Defaults to now.</param>
    /// <response code="200">List of monthly totals.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("trend")]
    [ProducesResponseType(typeof(IEnumerable<SpendingTrendPointDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<SpendingTrendPointDto>>> GetTrend(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userId = GetUserId();
        var effectiveFrom = DateTime.SpecifyKind(from ?? DateTime.UtcNow.AddYears(-1), DateTimeKind.Utc);
        var effectiveTo   = DateTime.SpecifyKind(to   ?? DateTime.UtcNow,             DateTimeKind.Utc);
        var trend = await _spendingService.GetMonthlyTrendAsync(userId, effectiveFrom, effectiveTo);
        return Ok(trend);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
