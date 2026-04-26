using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

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

    [HttpGet]
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

    [HttpPost]
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

    [HttpDelete("{id:guid}")]
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

    [HttpGet("analytics")]
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

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
