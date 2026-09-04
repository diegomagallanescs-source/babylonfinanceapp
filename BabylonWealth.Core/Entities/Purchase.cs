namespace BabylonWealth.Core.Entities;

/// <summary>
/// A single manually-entered purchase on the Spending tab.
/// Standalone from SpendingTransaction — has no bank account link and no bearing on
/// account balances, net worth, or the Home tab's Money Flow chart.
/// </summary>
public class Purchase : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public Guid SpendingCategoryId { get; private set; }
    public decimal Amount { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public DateTime PurchaseDate { get; private set; }

    public SpendingCategory SpendingCategory { get; set; } = null!;

    private Purchase() { }

    public static Purchase Create(
        Guid userId,
        Guid spendingCategoryId,
        decimal amount,
        string? description,
        DateTime purchaseDate)
    {
        return new Purchase
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SpendingCategoryId = spendingCategoryId,
            Amount = amount,
            Description = description ?? string.Empty,
            PurchaseDate = DateTime.SpecifyKind(purchaseDate, DateTimeKind.Utc)
        };
    }
}
