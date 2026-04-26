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
[Route("api/v1/creditcards")]
[Authorize]
public class CreditCardsController : ControllerBase
{
    private readonly ICreditCardService _creditCardService;

    public CreditCardsController(ICreditCardService creditCardService)
    {
        _creditCardService = creditCardService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CreditCardResponseDto>>> GetAll([FromQuery] CardType? type)
    {
        var userId = GetUserId();
        var cards = type.HasValue
            ? await _creditCardService.GetByCardTypeAsync(userId, type.Value)
            : await _creditCardService.GetAllAsync(userId);
        return Ok(cards);
    }

    [HttpGet("{id:guid}")]
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

    [HttpPost]
    public async Task<ActionResult<CreditCardResponseDto>> Create([FromBody] CreateCreditCardRequest request)
    {
        var userId = GetUserId();
        var card = await _creditCardService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = card.Id }, card);
    }

    [HttpPut("{id:guid}")]
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

    [HttpDelete("{id:guid}")]
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
