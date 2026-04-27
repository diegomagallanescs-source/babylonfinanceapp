namespace BabylonWealth.Core.Interfaces.Services;

public interface IMonthlyBudgetSnapshotService
{
    /// <summary>Returns true if no budget snapshot has been recorded for this user/month/year yet.</summary>
    Task<bool> ShouldTakeBudgetSnapshotAsync(Guid userId, int month, int year);

    /// <summary>
    /// Computes spending analytics for the given month and persists a MonthlyBudgetSnapshot.
    /// Idempotent — silently skips if a snapshot already exists for this month.
    /// </summary>
    Task TakeBudgetSnapshotAsync(Guid userId, int month, int year);
}
