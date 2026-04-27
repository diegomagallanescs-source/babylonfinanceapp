using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class CheckingStatementImportService : ICheckingStatementImportService
{
    private readonly ICheckingStatementImportRepository _checkingRepo;
    private readonly IStatementImportRepository _creditCardRepo;

    public CheckingStatementImportService(
        ICheckingStatementImportRepository checkingRepo,
        IStatementImportRepository creditCardRepo)
    {
        _checkingRepo = checkingRepo;
        _creditCardRepo = creditCardRepo;
    }

    public async Task<CheckingStatementSummaryDto> SaveAsync(Guid userId, SaveCheckingStatementRequest request)
    {
        Validate(request);

        var entity = CheckingStatementImport.Create(
            userId,
            request.Month,
            request.Year,
            request.TotalMoneyIn,
            request.TotalMoneyOut,
            request.TransactionCount,
            request.AccountsIncluded,
            request.Notes);

        var saved = await _checkingRepo.CreateAsync(entity);
        return MapToDto(saved);
    }

    public async Task<CheckingStatementSummaryDto> UpdateAsync(Guid id, Guid userId, SaveCheckingStatementRequest request)
    {
        Validate(request);

        var entity = await _checkingRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("CheckingStatementImport", id);

        entity.Update(request.TotalMoneyIn, request.TotalMoneyOut, request.TransactionCount, request.AccountsIncluded, request.Notes);
        await _checkingRepo.UpdateAsync(entity);
        return MapToDto(entity);
    }

    public async Task<IEnumerable<CheckingStatementSummaryDto>> GetHistoryAsync(Guid userId)
    {
        var records = await _checkingRepo.GetHistoryAsync(userId);
        return records.Select(MapToDto);
    }

    public async Task<IEnumerable<AnnualFinancialSummaryDto>> GetAnnualSummaryAsync(Guid userId)
    {
        var checkingRecords    = (await _checkingRepo.GetHistoryAsync(userId)).ToList();
        var creditCardRecords  = (await _creditCardRepo.GetHistoryAsync(userId)).ToList();

        // Collect all years that appear in either dataset
        var years = checkingRecords.Select(c => c.Year)
            .Union(creditCardRecords.Select(s => s.Year))
            .Distinct()
            .OrderBy(y => y);

        return years.Select(year =>
        {
            var checkingYear  = checkingRecords.Where(c => c.Year == year).ToList();
            var creditYear    = creditCardRecords.Where(s => s.Year == year).ToList();

            var totalIn       = checkingYear.Sum(c => c.TotalMoneyIn);
            var totalCheckOut = checkingYear.Sum(c => c.TotalMoneyOut);
            var totalCC       = creditYear.Sum(s => s.TotalSpend);

            return new AnnualFinancialSummaryDto
            {
                Year                    = year,
                TotalMoneyIn            = Math.Round(totalIn, 2),
                TotalCheckingOut        = Math.Round(totalCheckOut, 2),
                TotalCreditCardSpend    = Math.Round(totalCC, 2),
                NetSavings              = Math.Round(totalIn - totalCC, 2),
                CheckingMonthsRecorded  = checkingYear.Count,
                CreditCardMonthsRecorded = creditYear.Count,
            };
        });
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _checkingRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("CheckingStatementImport", id);

        await _checkingRepo.SoftDeleteAsync(id, userId);
    }

    private static void Validate(SaveCheckingStatementRequest request)
    {
        if (request.Month < 1 || request.Month > 12)
            throw new ValidationException("Month must be between 1 and 12.");

        if (request.Year < 2000 || request.Year > 2100)
            throw new ValidationException("Year is out of valid range.");

        if (request.TransactionCount <= 0)
            throw new ValidationException("No transactions detected — the PDF could not be parsed correctly. Data was not saved.");

        if (request.TotalMoneyIn <= 0 && request.TotalMoneyOut <= 0)
            throw new ValidationException("Both Money In and Money Out are zero — the PDF could not be parsed correctly. Data was not saved.");
    }

    private static CheckingStatementSummaryDto MapToDto(CheckingStatementImport e) => new()
    {
        Id               = e.Id,
        Month            = e.Month,
        Year             = e.Year,
        TotalMoneyIn     = e.TotalMoneyIn,
        TotalMoneyOut    = e.TotalMoneyOut,
        NetFlow          = e.TotalMoneyIn - e.TotalMoneyOut,
        TransactionCount = e.TransactionCount,
        AccountsIncluded = e.AccountsIncluded,
        Notes            = e.Notes,
        CreatedAt        = e.CreatedAt,
    };
}
