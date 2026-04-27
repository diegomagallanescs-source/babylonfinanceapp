using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IStatementImportRepository : IBaseRepository<StatementImport, Guid>
{
    Task<IEnumerable<StatementImport>> GetHistoryAsync(Guid userId);
    Task<StatementImport?> GetByMonthYearAsync(Guid userId, int month, int year);
}
