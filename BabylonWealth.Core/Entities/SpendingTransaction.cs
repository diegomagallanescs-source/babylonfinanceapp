namespace BabylonWealth.Core.Entities;

public class SpendingTransaction : BaseEntity<Guid>
{
    public Guid UserId { get; private set; }
    public Guid? AccountId { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal Amount { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public DateTime TransactionDate { get; private set; }

    private SpendingTransaction() { }

    public static SpendingTransaction Create(Guid userId, Guid categoryId, decimal amount, string description, DateTime transactionDate, Guid? accountId = null)
    {
        return new SpendingTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CategoryId = categoryId,
            Amount = amount,
            Description = description,
            TransactionDate = transactionDate,
            AccountId = accountId
        };
    }
}