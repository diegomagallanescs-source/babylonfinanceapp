using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Real estate portfolio management and deal analysis.</summary>
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

    /// <summary>Returns all saved properties for the authenticated user. Soft-deleted records are excluded.</summary>
    /// <response code="200">List of properties.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PropertyResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<PropertyResponseDto>>> GetAll()
    {
        var properties = await _propertyService.GetAllAsync(GetUserId());
        return Ok(properties);
    }

    /// <summary>Returns a single saved property.</summary>
    /// <response code="200">Property found.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Property not found or belongs to another user.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PropertyResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// <response code="201">Property created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost]
    [ProducesResponseType(typeof(PropertyResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PropertyResponseDto>> Create([FromBody] CreatePropertyRequest request)
    {
        var property = await _propertyService.CreateAsync(GetUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = property.Id }, property);
    }

    /// <summary>Updates an existing saved property.</summary>
    /// <response code="200">Property updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Property not found or belongs to another user.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(PropertyResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// <response code="204">Property deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Property not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// Deal signal: Green = cash flow positive AND cap rate ≥ 5%; Yellow = cash flow positive OR cap rate ≥ 4%; Red = otherwise.
    /// </summary>
    /// <response code="200">Deal analysis result.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(PropertyAnalysisResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PropertyAnalysisResponseDto>> Analyze(
        [FromBody] PropertyAnalysisRequestDto request)
    {
        var result = await _analyzer.AnalyzeAsync(request);
        return Ok(result);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
