using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Income source management — salary, freelance, rental, and other earned income.</summary>
[ApiController]
[Route("api/v1/income")]
[Authorize]
public class IncomeController : ControllerBase
{
    private readonly IIncomeService _incomeService;

    public IncomeController(IIncomeService incomeService)
    {
        _incomeService = incomeService;
    }

    /// <summary>Returns all active and inactive income sources. Soft-deleted records are excluded.</summary>
    /// <response code="200">List of income sources.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<IncomeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<IncomeResponseDto>>> GetAll()
    {
        var userId = GetUserId();
        var sources = await _incomeService.GetAllAsync(userId);
        return Ok(sources);
    }

    /// <summary>Creates a new income source.</summary>
    /// <response code="201">Income source created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost]
    [ProducesResponseType(typeof(IncomeResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IncomeResponseDto>> Create([FromBody] CreateIncomeRequest request)
    {
        var userId = GetUserId();
        var source = await _incomeService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetAll), new { }, source);
    }

    /// <summary>Updates an existing income source.</summary>
    /// <response code="200">Income source updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Income source not found or belongs to another user.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(IncomeResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IncomeResponseDto>> Update(Guid id, [FromBody] UpdateIncomeRequest request)
    {
        var userId = GetUserId();
        try
        {
            var source = await _incomeService.UpdateAsync(id, userId, request);
            return Ok(source);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes an income source.</summary>
    /// <response code="204">Income source deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Income source not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        try
        {
            await _incomeService.SoftDeleteAsync(id, userId);
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
