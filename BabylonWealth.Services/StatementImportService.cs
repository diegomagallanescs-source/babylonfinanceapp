using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class StatementImportService : IStatementImportService
{
    private readonly IStatementImportRepository _repo;

    public StatementImportService(IStatementImportRepository repo)
    {
        _repo = repo;
    }

    public async Task<StatementSummaryResponseDto> SaveAsync(Guid userId, SaveStatementSummaryRequest request)
    {
        Validate(request);

        var entity = StatementImport.Create(
            userId,
            request.Month,
            request.Year,
            request.TotalSpend,
            request.TransactionCount,
            request.AccountsIncluded,
            request.Notes,
            request.NecessitiesSpend,
            request.TravelSpend,
            request.SavingsSpend,
            request.ShoppingSpend,
            request.InvestmentsSpend,
            request.OtherSpend,
            request.IsYearEnd);

        var saved = await _repo.CreateAsync(entity);
        return MapToDto(saved);
    }

    public async Task<StatementSummaryResponseDto> UpdateAsync(Guid id, Guid userId, SaveStatementSummaryRequest request)
    {
        Validate(request);

        var entity = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("StatementImport", id);

        entity.Update(
            request.TotalSpend,
            request.TransactionCount,
            request.AccountsIncluded,
            request.Notes,
            request.NecessitiesSpend,
            request.TravelSpend,
            request.SavingsSpend,
            request.ShoppingSpend,
            request.InvestmentsSpend,
            request.OtherSpend);
        await _repo.UpdateAsync(entity);
        return MapToDto(entity);
    }

    public async Task<IEnumerable<StatementSummaryResponseDto>> GetHistoryAsync(Guid userId)
    {
        var records = await _repo.GetHistoryAsync(userId);
        return records.Select(MapToDto);
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        var entity = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("StatementImport", id);

        await _repo.SoftDeleteAsync(id, userId);
    }

    public async Task DeleteByYearAsync(Guid userId, int year)
    {
        await _repo.DeleteByYearAsync(userId, year);
    }

    private static void Validate(SaveStatementSummaryRequest request)
    {
        if (request.Month < 1 || request.Month > 12)
            throw new ValidationException("Month must be between 1 and 12.");

        if (request.Year < 2000 || request.Year > 2100)
            throw new ValidationException("Year is out of valid range.");

        if (request.TransactionCount <= 0)
            throw new ValidationException("No transactions detected — the PDF could not be parsed correctly. Data was not saved.");

        if (request.TotalSpend <= 0)
            throw new ValidationException("Total spend is zero or negative — the PDF could not be parsed correctly. Data was not saved.");
    }

    private static StatementSummaryResponseDto MapToDto(StatementImport entity) =>
        new()
        {
            Id = entity.Id,
            Month = entity.Month,
            Year = entity.Year,
            TotalSpend = entity.TotalSpend,
            TransactionCount = entity.TransactionCount,
            AccountsIncluded = entity.AccountsIncluded,
            Notes = entity.Notes,
            CreatedAt = entity.CreatedAt,
            NecessitiesSpend = entity.NecessitiesSpend,
            TravelSpend = entity.TravelSpend,
            SavingsSpend = entity.SavingsSpend,
            ShoppingSpend = entity.ShoppingSpend,
            InvestmentsSpend = entity.InvestmentsSpend,
            OtherSpend = entity.OtherSpend,
        };
}
