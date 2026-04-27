using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvestmentIncomeResponseDto>>> GetAll()
    {
        var entries = await _passiveIncomeService.GetAllAsync(GetUserId());
        return Ok(entries);
    }

    [HttpPost]
    public async Task<ActionResult<InvestmentIncomeResponseDto>> Create(
        [FromBody] CreateInvestmentIncomeRequest request)
    {
        var entry = await _passiveIncomeService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetAll), entry);
    }

    [HttpGet("summary")]
    public async Task<ActionResult<PassiveIncomeSummaryDto>> GetSummary()
    {
        var summary = await _passiveIncomeService.GetSummaryAsync(GetUserId());
        return Ok(summary);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
