using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface ICheckingStatementImportRepository : IBaseRepository<CheckingStatementImport, Guid>
{
    Task<IEnumerable<CheckingStatementImport>> GetHistoryAsync(Guid userId);
}
