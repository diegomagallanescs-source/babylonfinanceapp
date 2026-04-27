using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Loan management — student loans, auto loans, personal loans, and other liabilities.</summary>
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

    /// <summary>Returns all loans for the authenticated user. Optionally filter by loan type.</summary>
    /// <param name="type">Optional loan type filter.</param>
    /// <response code="200">List of loans.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<LoanResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<LoanResponseDto>>> GetAll([FromQuery] LoanType? type)
    {
        var userId = GetUserId();
        var loans = type.HasValue
            ? await _loanService.GetByLoanTypeAsync(userId, type.Value)
            : await _loanService.GetAllAsync(userId);
        return Ok(loans);
    }

    /// <summary>Returns a single loan by ID.</summary>
    /// <response code="200">Loan found.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Loan not found or belongs to another user.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(LoanResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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

    /// <summary>Returns a rolled-up summary of all loans (total balance by type).</summary>
    /// <response code="200">Loan summary.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(LoanSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoanSummaryDto>> GetSummary()
    {
        var userId = GetUserId();
        var summary = await _loanService.GetSummaryAsync(userId);
        return Ok(summary);
    }

    /// <summary>Creates a new loan. Balance is stored as a positive number and displayed as negative in net worth.</summary>
    /// <response code="201">Loan created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost]
    [ProducesResponseType(typeof(LoanResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoanResponseDto>> Create([FromBody] CreateLoanRequest request)
    {
        var userId = GetUserId();
        var loan = await _loanService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = loan.Id }, loan);
    }

    /// <summary>Updates an existing loan.</summary>
    /// <response code="200">Loan updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Loan not found or belongs to another user.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(LoanResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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

    /// <summary>Soft-deletes a loan.</summary>
    /// <response code="204">Loan deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Loan not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
