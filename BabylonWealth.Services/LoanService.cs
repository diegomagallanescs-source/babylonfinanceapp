using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class LoanService : ILoanService
{
    private readonly ILoanRepository _loanRepo;

    public LoanService(ILoanRepository loanRepo)
    {
        _loanRepo = loanRepo;
    }

    public async Task<IEnumerable<LoanResponseDto>> GetAllAsync(Guid userId)
    {
        var loans = await _loanRepo.GetAllByUserAsync(userId);
        return loans.Select(ToDto);
    }

    public async Task<IEnumerable<LoanResponseDto>> GetByLoanTypeAsync(Guid userId, LoanType type)
    {
        var loans = await _loanRepo.GetByLoanTypeAsync(userId, type);
        return loans.Select(ToDto);
    }

    public async Task<LoanResponseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var loan = await _loanRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Loan), id);
        return ToDto(loan);
    }

    public async Task<LoanResponseDto> CreateAsync(Guid userId, CreateLoanRequest request)
    {
        var loan = Loan.Create(
            userId,
            request.CustomLabel,
            request.Balance,
            request.InterestRate,
            request.LoanType,
            request.LenderName);

        var created = await _loanRepo.CreateAsync(loan);
        return ToDto(created);
    }

    public async Task<LoanResponseDto> UpdateAsync(Guid id, Guid userId, UpdateLoanRequest request)
    {
        var loan = await _loanRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Loan), id);

        loan.Update(request.CustomLabel, request.LenderName, request.Balance, request.InterestRate, request.LoanType);

        await _loanRepo.UpdateAsync(loan);
        return ToDto(loan);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        _ = await _loanRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Loan), id);

        await _loanRepo.SoftDeleteAsync(id, userId);
    }

    public async Task<LoanSummaryDto> GetSummaryAsync(Guid userId)
    {
        var loans = await _loanRepo.GetAllByUserAsync(userId);
        var loanList = loans.ToList();
        var total = await _loanRepo.GetTotalOutstandingBalanceAsync(userId);

        return new LoanSummaryDto
        {
            TotalOutstanding = total,
            LoanCount = loanList.Count
        };
    }

    // Balance is stored positive; flip sign so the caller sees a liability.
    private static LoanResponseDto ToDto(Loan l) => new()
    {
        Id = l.Id,
        CustomLabel = l.CustomLabel,
        LenderName = l.LenderName,
        Balance = -l.Balance,
        InterestRate = l.InterestRate,
        LoanType = l.LoanType,
        CreatedAt = l.CreatedAt,
        UpdatedAt = l.UpdatedAt
    };
}
