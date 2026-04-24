using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IBudgetCategoryRepository : IBaseRepository<BudgetCategory, Guid>
{
    /// <summary>
    /// Returns categories in DisplayOrder sequence — matches the UI sort order.
    /// </summary>
    Task<IEnumerable<BudgetCategory>> GetByDisplayOrderAsync(Guid userId);

    /// <summary>
    /// Sum of all TargetPercentage values for the user.
    /// The service enforces this never exceeds 1.0 (100%).
    /// Excludes the category being updated so the validation is accurate during edits.
    /// </summary>
    Task<decimal> GetTotalPercentageAsync(Guid userId, Guid? excludeCategoryId = null);

    /// <summary>
    /// Checks whether the user already has any budget categories.
    /// Used on first registration to decide whether to seed defaults.
    /// </summary>
    Task<bool> HasCategoriesAsync(Guid userId);
}
