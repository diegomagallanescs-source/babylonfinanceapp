using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class AccountService : IAccountService
{
    private readonly IAccountRepository _accountRepo;

    public AccountService(IAccountRepository accountRepo)
    {
        _accountRepo = accountRepo;
    }

    public async Task<IEnumerable<AccountResponseDto>> GetAllAsync(Guid userId)
    {
        var accounts = await _accountRepo.GetAllByUserAsync(userId);
        return accounts.Select(ToDto);
    }

    public async Task<AccountResponseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var account = await _accountRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(BankAccount), id);
        return ToDto(account);
    }

    public async Task<AccountResponseDto> CreateAsync(Guid userId, CreateAccountRequest request)
    {
        var account = BankAccount.Create(
            userId,
            request.BankId,
            request.CustomLabel,
            request.Balance,
            request.AccountType);

        account.BudgetCategoryId = request.BudgetCategoryId;

        if (request.Notes is not null)
            account.UpdateNotes(request.Notes);

        var created = await _accountRepo.CreateAsync(account);

        // Re-fetch with Bank navigation property populated
        var withBank = await _accountRepo.GetByIdAsync(created.Id, userId);
        return ToDto(withBank!);
    }

    public async Task<AccountResponseDto> UpdateAsync(Guid id, Guid userId, UpdateAccountRequest request)
    {
        var account = await _accountRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(BankAccount), id);

        if (request.CustomLabel is not null)
            account.UpdateLabel(request.CustomLabel);

        if (request.Balance is not null)
            account.UpdateBalance(request.Balance.Value);

        if (request.Notes is not null)
            account.UpdateNotes(request.Notes);

        if (request.BudgetCategoryId is not null)
            account.BudgetCategoryId = request.BudgetCategoryId;

        await _accountRepo.UpdateAsync(account);
        return ToDto(account);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        var exists = await _accountRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(BankAccount), id);

        await _accountRepo.SoftDeleteAsync(id, userId);
    }

    public async Task ReorderAsync(Guid userId, ReorderAccountsRequest request)
    {
        var updates = request.OrderedIds.Select((id, index) => (id, index));
        await _accountRepo.ReorderAsync(userId, updates);
    }

    private static AccountResponseDto ToDto(BankAccount a) => new()
    {
        Id = a.Id,
        BankId = a.BankId,
        BankName = a.Bank?.Name ?? string.Empty,
        BankLogoUrl = a.Bank?.LogoUrl,
        CustomLabel = a.CustomLabel,
        Balance = a.Balance,
        AccountType = a.AccountType,
        BudgetCategoryId = a.BudgetCategoryId,
        Notes = a.Notes,
        CreatedAt = a.CreatedAt,
        UpdatedAt = a.UpdatedAt
    };
}
