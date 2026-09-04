using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class SpendingCategoryService : ISpendingCategoryService
{
    private readonly ISpendingCategoryRepository _repo;

    public SpendingCategoryService(ISpendingCategoryRepository repo)
    {
        _repo = repo;
    }

    public async Task<IEnumerable<SpendingCategoryResponseDto>> GetAllAsync(Guid userId)
    {
        await SeedDefaultCategoriesAsync(userId);
        var categories = await _repo.GetByDisplayOrderAsync(userId);
        return categories.Select(ToDto);
    }

    public async Task<SpendingCategoryResponseDto> CreateAsync(Guid userId, CreateSpendingCategoryRequest request)
    {
        var all = (await _repo.GetByDisplayOrderAsync(userId)).ToList();

        if (all.Any(c => c.Name.Equals(request.Name, StringComparison.OrdinalIgnoreCase)))
            throw new ValidationException($"A category named '{request.Name}' already exists.");

        var nextOrder = all.Count != 0 ? all.Max(c => c.DisplayOrder) + 1 : 1;

        var category = SpendingCategory.Create(userId, request.Name, request.Color, nextOrder);
        await _repo.CreateAsync(category);
        return ToDto(category);
    }

    public async Task SeedDefaultCategoriesAsync(Guid userId)
    {
        if (await _repo.HasCategoriesAsync(userId))
            return;

        (string Name, string Color, int Order)[] defaults =
        [
            ("Groceries",      "#E05555", 1),
            ("Restaurant",     "#C9A84C", 2),
            ("Shopping",       "#8A8070", 3),
            ("Entertainment",  "#A084DC", 4),
            ("Transportation", "#6C7DDB", 5),
            ("Health",         "#4CAF7D", 6),
            ("Other",          "#1B7A6E", 7),
        ];

        foreach (var (name, color, order) in defaults)
            await _repo.CreateAsync(SpendingCategory.Create(userId, name, color, order));
    }

    private static SpendingCategoryResponseDto ToDto(SpendingCategory c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Color = c.Color,
        DisplayOrder = c.DisplayOrder,
        CreatedAt = c.CreatedAt
    };
}
