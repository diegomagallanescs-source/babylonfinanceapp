using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Budget category management. All categories for a user must sum to exactly 100%.</summary>
[ApiController]
[Route("api/v1/budget/categories")]
[Authorize]
public class BudgetCategoriesController : ControllerBase
{
    private readonly IBudgetCategoryService _budgetService;

    public BudgetCategoriesController(IBudgetCategoryService budgetService)
    {
        _budgetService = budgetService;
    }

    /// <summary>Returns all budget categories for the authenticated user. Soft-deleted records are excluded.</summary>
    /// <response code="200">List of budget categories.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<BudgetCategoryResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<BudgetCategoryResponseDto>>> GetAll()
    {
        var categories = await _budgetService.GetAllAsync(GetUserId());
        return Ok(categories);
    }

    /// <summary>
    /// Creates a new budget category. All categories (including this one) must sum to exactly 100% —
    /// returns 422 if the invariant would be violated.
    /// </summary>
    /// <response code="201">Category created.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Category percentages would exceed 100%.</response>
    [HttpPost]
    [ProducesResponseType(typeof(BudgetCategoryResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<BudgetCategoryResponseDto>> Create([FromBody] CreateBudgetCategoryRequest request)
    {
        try
        {
            var category = await _budgetService.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetAll), new { }, category);
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>
    /// Updates an existing budget category. All categories must still sum to exactly 100% after the update.
    /// </summary>
    /// <response code="200">Category updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Category not found or belongs to another user.</response>
    /// <response code="422">Updated percentages would violate the 100% invariant.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(BudgetCategoryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<BudgetCategoryResponseDto>> Update(Guid id, [FromBody] UpdateBudgetCategoryRequest request)
    {
        try
        {
            var category = await _budgetService.UpdateAsync(id, GetUserId(), request);
            return Ok(category);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
