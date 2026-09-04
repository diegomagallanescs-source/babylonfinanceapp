using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface ISpendingCategoryRepository : IBaseRepository<SpendingCategory, Guid>
{
    /// <summary>Returns categories in DisplayOrder sequence — matches the UI dropdown order.</summary>
    Task<IEnumerable<SpendingCategory>> GetByDisplayOrderAsync(Guid userId);

    /// <summary>Checks whether the user already has any spending categories. Used to decide whether to seed defaults.</summary>
    Task<bool> HasCategoriesAsync(Guid userId);
}
