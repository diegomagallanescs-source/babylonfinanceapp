using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class BudgetCategoryService : IBudgetCategoryService
{
    private readonly IBudgetCategoryRepository _repo;

    public BudgetCategoryService(IBudgetCategoryRepository repo)
    {
        _repo = repo;
    }

    public async Task<IEnumerable<BudgetCategoryResponseDto>> GetAllAsync(Guid userId)
    {
        var categories = await _repo.GetByDisplayOrderAsync(userId);
        return categories.Select(ToDto);
    }

    public async Task<BudgetCategoryResponseDto> CreateAsync(Guid userId, CreateBudgetCategoryRequest request)
    {
        var existingTotal = await _repo.GetTotalPercentageAsync(userId);

        if (existingTotal + request.TargetPercentage > 1.0m)
            throw new ValidationException(
                $"Adding {request.TargetPercentage:P0} would bring the total to {existingTotal + request.TargetPercentage:P0}. Budget categories must not exceed 100%.");

        var all = await _repo.GetByDisplayOrderAsync(userId);
        var nextOrder = all.Any() ? all.Max(c => c.DisplayOrder) + 1 : 1;

        var category = BudgetCategory.Create(userId, request.Name, request.TargetPercentage, request.Color, nextOrder);
        await _repo.CreateAsync(category);
        return ToDto(category);
    }

    public async Task<BudgetCategoryResponseDto> UpdateAsync(Guid id, Guid userId, UpdateBudgetCategoryRequest request)
    {
        var category = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(BudgetCategory), id);

        if (request.TargetPercentage.HasValue)
        {
            var otherTotal = await _repo.GetTotalPercentageAsync(userId, excludeCategoryId: id);

            if (otherTotal + request.TargetPercentage.Value > 1.0m)
                throw new ValidationException(
                    $"Setting {request.TargetPercentage.Value:P0} would bring the total to {otherTotal + request.TargetPercentage.Value:P0}. Budget categories must not exceed 100%.");
        }

        category.Update(
            request.Name ?? category.Name,
            request.TargetPercentage ?? category.TargetPercentage,
            request.Color ?? category.Color);

        await _repo.UpdateAsync(category);
        return ToDto(category);
    }

    public async Task SeedDefaultCategoriesAsync(Guid userId)
    {
        if (await _repo.HasCategoriesAsync(userId))
            return;

        (string Name, decimal Percentage, string Color, int Order)[] defaults =
        [
            ("Necessities", 0.50m, "#E05555", 1),
            ("Investing",   0.15m, "#4CAF7D", 2),
            ("Travel",      0.15m, "#C9A84C", 3),
            ("Savings",     0.10m, "#1B7A6E", 4),
            ("Shopping",    0.10m, "#8A8070", 5),
        ];

        foreach (var (name, pct, color, order) in defaults)
            await _repo.CreateAsync(BudgetCategory.Create(userId, name, pct, color, order));
    }

    private static BudgetCategoryResponseDto ToDto(BudgetCategory c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        TargetPercentage = c.TargetPercentage,
        Color = c.Color,
        DisplayOrder = c.DisplayOrder,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };
}
