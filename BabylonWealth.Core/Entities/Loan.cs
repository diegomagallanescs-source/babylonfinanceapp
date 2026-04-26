using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class Loan : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
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

    public void Update(string? customLabel, string? lenderName, decimal? balance, decimal? interestRate, LoanType? loanType)
    {
        if (customLabel is not null) CustomLabel = customLabel;
        if (lenderName is not null) LenderName = lenderName;
        if (balance is not null) Balance = balance.Value;
        if (interestRate is not null) InterestRate = interestRate.Value;
        if (loanType is not null) LoanType = loanType.Value;
        Touch();
    }
}