using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Bank account management.</summary>
[ApiController]
[Route("api/v1/accounts")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>Returns all bank accounts for the authenticated user. Soft-deleted records are excluded.</summary>
    /// <response code="200">List of accounts.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AccountResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<AccountResponseDto>>> GetAll()
    {
        var userId = GetUserId();
        var accounts = await _accountService.GetAllAsync(userId);
        return Ok(accounts);
    }

    /// <summary>Returns a single bank account by ID.</summary>
    /// <response code="200">Account found.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Account not found or belongs to another user.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AccountResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountResponseDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        try
        {
            var account = await _accountService.GetByIdAsync(id, userId);
            return Ok(account);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Creates a new bank account for the authenticated user.</summary>
    /// <response code="201">Account created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost]
    [ProducesResponseType(typeof(AccountResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AccountResponseDto>> Create([FromBody] CreateAccountRequest request)
    {
        var userId = GetUserId();
        var account = await _accountService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = account.Id }, account);
    }

    /// <summary>Updates an existing bank account.</summary>
    /// <response code="200">Account updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Account not found or belongs to another user.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AccountResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountResponseDto>> Update(Guid id, [FromBody] UpdateAccountRequest request)
    {
        var userId = GetUserId();
        try
        {
            var account = await _accountService.UpdateAsync(id, userId, request);
            return Ok(account);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a bank account. The record is retained in the database with IsDeleted = true.</summary>
    /// <response code="204">Account deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Account not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        try
        {
            await _accountService.SoftDeleteAsync(id, userId);
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
