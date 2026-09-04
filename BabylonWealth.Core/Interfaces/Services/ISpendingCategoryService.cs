using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface ISpendingCategoryService
{
    /// <summary>Returns all spending categories for the user, sorted by DisplayOrder. Lazily seeds defaults on first call.</summary>
    Task<IEnumerable<SpendingCategoryResponseDto>> GetAllAsync(Guid userId);

    /// <summary>Creates a new spending category. Throws ValidationException if the name is already in use.</summary>
    Task<SpendingCategoryResponseDto> CreateAsync(Guid userId, CreateSpendingCategoryRequest request);

    /// <summary>Seeds a starter set of categories for a user with none yet. No-op if the user already has categories.</summary>
    Task SeedDefaultCategoriesAsync(Guid userId);
}
