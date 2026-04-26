using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

[ApiController]
[Route("api/v1/investments")]
[Authorize]
public class InvestmentsController : ControllerBase
{
    private readonly IInvestmentService _investmentService;

    public InvestmentsController(IInvestmentService investmentService)
    {
        _investmentService = investmentService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvestmentResponseDto>>> GetAll([FromQuery] InvestmentType? type)
    {
        var userId = GetUserId();
        var investments = type.HasValue
            ? await _investmentService.GetByTypeAsync(userId, type.Value)
            : await _investmentService.GetAllAsync(userId);
        return Ok(investments);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvestmentResponseDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        try
        {
            var investment = await _investmentService.GetByIdAsync(id, userId);
            return Ok(investment);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    [HttpGet("summary")]
    public async Task<ActionResult<InvestmentSummaryDto>> GetSummary()
    {
        var userId = GetUserId();
        var summary = await _investmentService.GetSummaryAsync(userId);
        return Ok(summary);
    }

    [HttpPost]
    public async Task<ActionResult<InvestmentResponseDto>> Create([FromBody] CreateInvestmentRequest request)
    {
        var userId = GetUserId();
        var investment = await _investmentService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = investment.Id }, investment);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<InvestmentResponseDto>> Update(Guid id, [FromBody] UpdateInvestmentRequest request)
    {
        var userId = GetUserId();
        try
        {
            var investment = await _investmentService.UpdateAsync(id, userId, request);
            return Ok(investment);
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
            await _investmentService.SoftDeleteAsync(id, userId);
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
