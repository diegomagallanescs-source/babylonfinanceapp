using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface ICheckingStatementImportService
{
    Task<CheckingStatementSummaryDto> SaveAsync(Guid userId, SaveCheckingStatementRequest request);
    Task<CheckingStatementSummaryDto> UpdateAsync(Guid id, Guid userId, SaveCheckingStatementRequest request);
    Task<IEnumerable<CheckingStatementSummaryDto>> GetHistoryAsync(Guid userId);
    Task<IEnumerable<AnnualFinancialSummaryDto>> GetAnnualSummaryAsync(Guid userId);
    Task DeleteAsync(Guid id, Guid userId);
}
