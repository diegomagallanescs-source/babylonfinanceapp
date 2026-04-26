namespace BabylonWealth.Core.Entities;

public class SpendingTransaction : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public Guid BudgetCategoryId { get; private set; }
    public Guid? BankAccountId { get; private set; }
    public decimal Amount { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public DateTime TransactionDate { get; private set; }

    public BudgetCategory BudgetCategory { get; set; } = null!;
    public BankAccount? BankAccount { get; set; }

    private SpendingTransaction() { }

    public static SpendingTransaction Create(
        Guid userId,
        Guid budgetCategoryId,
        decimal amount,
        string description,
        DateTime transactionDate,
        Guid? bankAccountId = null)
    {
        return new SpendingTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BudgetCategoryId = budgetCategoryId,
            Amount = amount,
            Description = description,
            TransactionDate = transactionDate,
            BankAccountId = bankAccountId
        };
    }
}