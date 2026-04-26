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
[Route("api/v1/loans")]
[Authorize]
public class LoansController : ControllerBase
{
    private readonly ILoanService _loanService;

    public LoansController(ILoanService loanService)
    {
        _loanService = loanService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LoanResponseDto>>> GetAll([FromQuery] LoanType? type)
    {
        var userId = GetUserId();
        var loans = type.HasValue
            ? await _loanService.GetByLoanTypeAsync(userId, type.Value)
            : await _loanService.GetAllAsync(userId);
        return Ok(loans);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LoanResponseDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        try
        {
            var loan = await _loanService.GetByIdAsync(id, userId);
            return Ok(loan);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    [HttpGet("summary")]
    public async Task<ActionResult<LoanSummaryDto>> GetSummary()
    {
        var userId = GetUserId();
        var summary = await _loanService.GetSummaryAsync(userId);
        return Ok(summary);
    }

    [HttpPost]
    public async Task<ActionResult<LoanResponseDto>> Create([FromBody] CreateLoanRequest request)
    {
        var userId = GetUserId();
        var loan = await _loanService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = loan.Id }, loan);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LoanResponseDto>> Update(Guid id, [FromBody] UpdateLoanRequest request)
    {
        var userId = GetUserId();
        try
        {
            var loan = await _loanService.UpdateAsync(id, userId, request);
            return Ok(loan);
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
            await _loanService.SoftDeleteAsync(id, userId);
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
