using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IBudgetCategoryService
{
    /// <summary>Returns all categories for the user, sorted by DisplayOrder.</summary>
    Task<IEnumerable<BudgetCategoryResponseDto>> GetAllAsync(Guid userId);

    /// <summary>
    /// Creates a new budget category.
    /// Throws ValidationException if adding this percentage would exceed 100%.
    /// </summary>
    Task<BudgetCategoryResponseDto> CreateAsync(Guid userId, CreateBudgetCategoryRequest request);

    /// <summary>
    /// Updates an existing category.
    /// Throws NotFoundException if the category doesn't belong to the user.
    /// Throws ValidationException if the new percentage would push the total over 100%.
    /// </summary>
    Task<BudgetCategoryResponseDto> UpdateAsync(Guid id, Guid userId, UpdateBudgetCategoryRequest request);

    /// <summary>
    /// Seeds the five default Arkad categories for a brand-new user.
    /// No-op if the user already has categories.
    /// </summary>
    Task SeedDefaultCategoriesAsync(Guid userId);
}
