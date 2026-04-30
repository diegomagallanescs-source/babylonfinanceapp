using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class BankAccount : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public Guid BankId { get; private set; }
    public Bank? Bank { get; set; }
    public string CustomLabel { get; private set; } = string.Empty;
    public decimal Balance { get; private set; }
    public AccountType AccountType { get; private set; }
    public Guid? BudgetCategoryId { get; set; }
    public BudgetCategory? BudgetCategory { get; set; }
    public string? Notes { get; private set; }
    public Dictionary<string, string>? CustomFields { get; private set; }
    public int? DisplayOrder { get; set; }

    private BankAccount() { }

    public static BankAccount Create(Guid userId, Guid bankId, string customLabel, decimal balance, AccountType accountType)
    {
        return new BankAccount
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BankId = bankId,
            CustomLabel = customLabel,
            Balance = balance,
            AccountType = accountType
        };
    }

    public void UpdateBalance(decimal balance)
    {
        Balance = balance;
        Touch();
    }

    public void UpdateLabel(string label)
    {
        CustomLabel = label;
        Touch();
    }

    public void UpdateNotes(string? notes)
    {
        Notes = notes;
        Touch();
    }
}