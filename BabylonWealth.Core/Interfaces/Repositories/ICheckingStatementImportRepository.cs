using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface ICheckingStatementImportRepository : IBaseRepository<CheckingStatementImport, Guid>
{
    Task<IEnumerable<CheckingStatementImport>> GetHistoryAsync(Guid userId);
    Task<IEnumerable<CheckingStatementImport>> GetYearEndHistoryAsync(Guid userId);
    Task<CheckingStatementImport?> GetByMonthYearAsync(Guid userId, int month, int year);
    Task DeleteByYearAsync(Guid userId, int year);
}
