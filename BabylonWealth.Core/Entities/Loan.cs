using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class Loan : BaseEntity<Guid>
{
    public Guid UserId { get; private set; }
    public string CustomLabel { get; private set; } = string.Empty;
    public string? LenderName { get; private set; }
    public decimal Balance { get; private set; }
    public decimal InterestRate { get; private set; }
    public LoanType LoanType { get; private set; }
    public Dictionary<string, string>? CustomFields { get; private set; }

    private Loan() { }

    public static Loan Create(Guid userId, string customLabel, decimal balance, decimal interestRate, LoanType loanType, string? lenderName = null)
    {
        return new Loan
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CustomLabel = customLabel,
            Balance = balance,
            InterestRate = interestRate,
            LoanType = loanType,
            LenderName = lenderName
        };
    }

    public void UpdateBalance(decimal balance)
    {
        Balance = balance;
        Touch();
    }
}