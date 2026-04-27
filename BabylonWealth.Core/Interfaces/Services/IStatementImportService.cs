using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IStatementImportService
{
    Task<StatementSummaryResponseDto> SaveAsync(Guid userId, SaveStatementSummaryRequest request);
    Task<IEnumerable<StatementSummaryResponseDto>> GetHistoryAsync(Guid userId);
    Task DeleteAsync(Guid id, Guid userId);
}
