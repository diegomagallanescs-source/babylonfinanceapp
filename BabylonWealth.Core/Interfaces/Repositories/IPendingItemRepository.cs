using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IPendingItemRepository : IBaseRepository<PendingItem, Guid>
{
    /// <summary>Returns only Status = Pending items. Settled items are excluded from all NW calculations.</summary>
    Task<IEnumerable<PendingItem>> GetPendingOnlyAsync(Guid userId);

    /// <summary>
    /// Marks the item as Settled and sets SettledAt = now.
    /// After this, the item is excluded from GetPendingOnlyAsync and net worth computation.
    /// </summary>
    Task SettleAsync(Guid id, Guid userId);

    /// <summary>
    /// Net sum of all pending amounts (positive = owed to user, negative = user owes).
    /// Added directly to liquid net worth.
    /// </summary>
    Task<decimal> GetNetPendingAmountAsync(Guid userId);
}
