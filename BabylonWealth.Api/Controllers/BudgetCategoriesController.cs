using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BudgetCategoryResponseDto>>> GetAll()
    {
        var categories = await _budgetService.GetAllAsync(GetUserId());
        return Ok(categories);
    }

    [HttpPost]
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

    [HttpPut("{id:guid}")]
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
