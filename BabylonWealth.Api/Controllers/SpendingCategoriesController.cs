using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Category list for the Spending tab's manual purchase tracker — separate from budget allocation categories.</summary>
[ApiController]
[Route("api/v1/spending-categories")]
[Authorize]
public class SpendingCategoriesController : ControllerBase
{
    private readonly ISpendingCategoryService _categoryService;

    public SpendingCategoriesController(ISpendingCategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    /// <summary>Returns all spending categories for the user, seeding a starter set on first call.</summary>
    /// <response code="200">List of spending categories.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SpendingCategoryResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<SpendingCategoryResponseDto>>> GetAll()
    {
        var categories = await _categoryService.GetAllAsync(GetUserId());
        return Ok(categories);
    }

    /// <summary>Creates a new spending category.</summary>
    /// <response code="201">Category created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">A category with this name already exists.</response>
    [HttpPost]
    [ProducesResponseType(typeof(SpendingCategoryResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<SpendingCategoryResponseDto>> Create([FromBody] CreateSpendingCategoryRequest request)
    {
        try
        {
            var category = await _categoryService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetAll), new { }, category);
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
