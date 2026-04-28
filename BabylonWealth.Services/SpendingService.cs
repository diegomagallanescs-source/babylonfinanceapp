using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class SpendingService : ISpendingService
{
    private readonly ISpendingRepository _spendingRepo;
    private readonly IBudgetCategoryRepository _categoryRepo;

    public SpendingService(ISpendingRepository spendingRepo, IBudgetCategoryRepository categoryRepo)
    {
        _spendingRepo = spendingRepo;
        _categoryRepo = categoryRepo;
    }

    public async Task<IEnumerable<SpendingTransactionResponseDto>> GetByMonthAsync(Guid userId, int month, int year)
    {
        var transactions = await _spendingRepo.GetByMonthAsync(userId, month, year);
        return transactions.Select(ToDto);
    }

    public async Task<SpendingTransactionResponseDto> CreateAsync(Guid userId, CreateSpendingTransactionRequest request)
    {
        var category = await _categoryRepo.GetByIdAsync(request.CategoryId, userId)
            ?? throw new NotFoundException(nameof(BudgetCategory), request.CategoryId);

        var transaction = SpendingTransaction.Create(
            userId,
            request.CategoryId,
            request.Amount,
            request.Description,
            request.TransactionDate,
            request.AccountId);

        await _spendingRepo.CreateAsync(transaction);

        // Re-attach navigation property so ToDto can read it without a round-trip
        transaction.BudgetCategory = category;
        return ToDto(transaction);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        _ = await _spendingRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(SpendingTransaction), id);

        await _spendingRepo.SoftDeleteAsync(id, userId);
    }

    public async Task<IEnumerable<SpendingTransactionResponseDto>> GetByAccountAsync(Guid userId, Guid accountId)
    {
        var transactions = await _spendingRepo.GetByAccountAsync(userId, accountId);
        return transactions.Select(ToDto);
    }

    public async Task<IEnumerable<SpendingTransactionResponseDto>> GetByCategoryAsync(Guid userId, Guid categoryId)
    {
        var transactions = await _spendingRepo.GetByCategoryAsync(userId, categoryId);
        return transactions.Select(ToDto);
    }

    public async Task<IEnumerable<SpendingTrendPointDto>> GetMonthlyTrendAsync(Guid userId, DateTime from, DateTime to)
    {
        var rows = await _spendingRepo.GetMonthlyTrendAsync(userId, from, to);
        return rows.Select(r => new SpendingTrendPointDto { Year = r.Year, Month = r.Month, Total = r.Total });
    }

    private static SpendingTransactionResponseDto ToDto(SpendingTransaction t) => new()
    {
        Id = t.Id,
        CategoryId = t.BudgetCategoryId,
        CategoryName = t.BudgetCategory?.Name ?? string.Empty,
        CategoryColor = t.BudgetCategory?.Color ?? string.Empty,
        Amount = t.Amount,
        Description = t.Description,
        TransactionDate = t.TransactionDate,
        AccountId = t.BankAccountId,
        AccountLabel = t.BankAccount?.CustomLabel,
        CreatedAt = t.CreatedAt
    };
}
