using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

[ApiController]
[Route("api/v1/properties")]
[Authorize]
public class PropertiesController : ControllerBase
{
    private readonly IPropertyService _propertyService;
    private readonly IPropertyAnalyzerService _analyzer;

    public PropertiesController(IPropertyService propertyService, IPropertyAnalyzerService analyzer)
    {
        _propertyService = propertyService;
        _analyzer = analyzer;
    }

    /// <summary>Returns all saved properties for the authenticated user.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PropertyResponseDto>>> GetAll()
    {
        var properties = await _propertyService.GetAllAsync(GetUserId());
        return Ok(properties);
    }

    /// <summary>Returns a single saved property.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PropertyResponseDto>> GetById(Guid id)
    {
        try
        {
            var property = await _propertyService.GetByIdAsync(id, GetUserId());
            return Ok(property);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Saves a property to the user's portfolio.</summary>
    [HttpPost]
    public async Task<ActionResult<PropertyResponseDto>> Create([FromBody] CreatePropertyRequest request)
    {
        var property = await _propertyService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = property.Id }, property);
    }

    /// <summary>Updates an existing saved property.</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PropertyResponseDto>> Update(Guid id, [FromBody] UpdatePropertyRequest request)
    {
        try
        {
            var property = await _propertyService.UpdateAsync(id, GetUserId(), request);
            return Ok(property);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a saved property.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _propertyService.DeleteAsync(id, GetUserId());
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>
    /// Stateless deal analyzer — runs mortgage math, cash flow, cap rate, DSCR, and deal signal.
    /// Nothing is written to the database. The frontend can call this on every keystroke.
    /// </summary>
    [HttpPost("analyze")]
    public async Task<ActionResult<PropertyAnalysisResponseDto>> Analyze(
        [FromBody] PropertyAnalysisRequestDto request)
    {
        var result = await _analyzer.AnalyzeAsync(request);
        return Ok(result);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
