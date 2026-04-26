using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<IncomeResponseDto>>> GetAll()
    {
        var userId = GetUserId();
        var sources = await _incomeService.GetAllAsync(userId);
        return Ok(sources);
    }

    [HttpPost]
    public async Task<ActionResult<IncomeResponseDto>> Create([FromBody] CreateIncomeRequest request)
    {
        var userId = GetUserId();
        var source = await _incomeService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetAll), new { }, source);
    }

    [HttpPut("{id:guid}")]
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

    [HttpDelete("{id:guid}")]
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
