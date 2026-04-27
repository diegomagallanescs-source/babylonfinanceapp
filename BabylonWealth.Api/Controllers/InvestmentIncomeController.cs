using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Passive income tracking — dividends, interest, rental income received, and similar events.</summary>
[ApiController]
[Route("api/v1/investmentincome")]
[Authorize]
public class InvestmentIncomeController : ControllerBase
{
    private readonly IPassiveIncomeService _passiveIncomeService;

    public InvestmentIncomeController(IPassiveIncomeService passiveIncomeService)
    {
        _passiveIncomeService = passiveIncomeService;
    }

    /// <summary>Returns all passive income entries. Soft-deleted records are excluded.</summary>
    /// <response code="200">List of passive income entries.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<InvestmentIncomeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<InvestmentIncomeResponseDto>>> GetAll()
    {
        var entries = await _passiveIncomeService.GetAllAsync(GetUserId());
        return Ok(entries);
    }

    /// <summary>Records a new passive income event.</summary>
    /// <response code="201">Entry created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost]
    [ProducesResponseType(typeof(InvestmentIncomeResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<InvestmentIncomeResponseDto>> Create(
        [FromBody] CreateInvestmentIncomeRequest request)
    {
        var entry = await _passiveIncomeService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetAll), entry);
    }

    /// <summary>Returns a rolled-up summary of passive income (trailing 12 months, by type, vs. monthly expenses).</summary>
    /// <response code="200">Passive income summary.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(PassiveIncomeSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PassiveIncomeSummaryDto>> GetSummary()
    {
        var summary = await _passiveIncomeService.GetSummaryAsync(GetUserId());
        return Ok(summary);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
