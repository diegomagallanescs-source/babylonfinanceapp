using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Credit card management.</summary>
[ApiController]
[Route("api/v1/creditcards")]
[Authorize]
public class CreditCardsController : ControllerBase
{
    private readonly ICreditCardService _creditCardService;

    public CreditCardsController(ICreditCardService creditCardService)
    {
        _creditCardService = creditCardService;
    }

    /// <summary>Returns all credit cards for the authenticated user. Optionally filter by card type (Personal/Business).</summary>
    /// <param name="type">Optional card type filter.</param>
    /// <response code="200">List of credit cards.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CreditCardResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<CreditCardResponseDto>>> GetAll([FromQuery] CardType? type)
    {
        var userId = GetUserId();
        var cards = type.HasValue
            ? await _creditCardService.GetByCardTypeAsync(userId, type.Value)
            : await _creditCardService.GetAllAsync(userId);
        return Ok(cards);
    }

    /// <summary>Returns a single credit card by ID.</summary>
    /// <response code="200">Credit card found.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Credit card not found or belongs to another user.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CreditCardResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CreditCardResponseDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        try
        {
            var card = await _creditCardService.GetByIdAsync(id, userId);
            return Ok(card);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Creates a new credit card for the authenticated user.</summary>
    /// <response code="201">Credit card created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost]
    [ProducesResponseType(typeof(CreditCardResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CreditCardResponseDto>> Create([FromBody] CreateCreditCardRequest request)
    {
        var userId = GetUserId();
        var card = await _creditCardService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = card.Id }, card);
    }

    /// <summary>Updates an existing credit card.</summary>
    /// <response code="200">Credit card updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Credit card not found or belongs to another user.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CreditCardResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CreditCardResponseDto>> Update(Guid id, [FromBody] UpdateCreditCardRequest request)
    {
        var userId = GetUserId();
        try
        {
            var card = await _creditCardService.UpdateAsync(id, userId, request);
            return Ok(card);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a credit card. The record is retained in the database with IsDeleted = true.</summary>
    /// <response code="204">Credit card deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Credit card not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        try
        {
            await _creditCardService.SoftDeleteAsync(id, userId);
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
