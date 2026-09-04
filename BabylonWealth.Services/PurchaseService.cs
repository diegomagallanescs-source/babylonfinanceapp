using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class PurchaseService : IPurchaseService
{
    private readonly IPurchaseRepository _purchaseRepo;
    private readonly ISpendingCategoryRepository _categoryRepo;

    public PurchaseService(IPurchaseRepository purchaseRepo, ISpendingCategoryRepository categoryRepo)
    {
        _purchaseRepo = purchaseRepo;
        _categoryRepo = categoryRepo;
    }

    public async Task<IEnumerable<PurchaseResponseDto>> GetByMonthAsync(Guid userId, int month, int year)
    {
        var purchases = await _purchaseRepo.GetByMonthAsync(userId, month, year);
        return purchases.Select(ToDto);
    }

    public async Task<PurchaseResponseDto> CreateAsync(Guid userId, CreatePurchaseRequest request)
    {
        var category = await _categoryRepo.GetByIdAsync(request.SpendingCategoryId, userId)
            ?? throw new NotFoundException(nameof(SpendingCategory), request.SpendingCategoryId);

        var purchase = Purchase.Create(
            userId,
            request.SpendingCategoryId,
            request.Amount,
            request.Description,
            request.PurchaseDate);

        await _purchaseRepo.CreateAsync(purchase);

        // Re-attach navigation property so ToDto can read it without a round-trip
        purchase.SpendingCategory = category;
        return ToDto(purchase);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        _ = await _purchaseRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Purchase), id);

        await _purchaseRepo.SoftDeleteAsync(id, userId);
    }

    public async Task DeleteByMonthAsync(Guid userId, int month, int year)
    {
        await _purchaseRepo.DeleteByMonthAsync(userId, month, year);
    }

    public async Task<IEnumerable<PurchaseTrendPointDto>> GetMonthlyTrendByCategoryAsync(Guid userId, DateTime from, DateTime to)
    {
        var rows = await _purchaseRepo.GetMonthlyTrendByCategoryAsync(userId, from, to);

        return rows
            .GroupBy(r => (r.Year, r.Month))
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new PurchaseTrendPointDto
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Categories = g.Select(r => new PurchaseCategoryAmountDto
                {
                    CategoryId = r.CategoryId,
                    CategoryName = r.CategoryName,
                    CategoryColor = r.CategoryColor,
                    Amount = r.Total
                }).ToList()
            });
    }

    private static PurchaseResponseDto ToDto(Purchase p) => new()
    {
        Id = p.Id,
        CategoryId = p.SpendingCategoryId,
        CategoryName = p.SpendingCategory?.Name ?? string.Empty,
        CategoryColor = p.SpendingCategory?.Color ?? string.Empty,
        Amount = p.Amount,
        Description = p.Description,
        PurchaseDate = p.PurchaseDate,
        CreatedAt = p.CreatedAt
    };
}
