using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class Property : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Address { get; private set; } = string.Empty;
    public decimal PurchasePrice { get; private set; }
    public decimal CurrentEstimatedValue { get; private set; }
    public decimal LoanBalance { get; private set; }
    public decimal InterestRate { get; private set; }
    public LoanProductType LoanType { get; private set; }
    public decimal MonthlyRent { get; private set; }
    public decimal MonthlyExpenses { get; private set; }
    public DateTime? LastValueUpdateDate { get; private set; }
    public DateTime? LastValueUpdatedAt { get; set; }

    public decimal Equity => CurrentEstimatedValue - LoanBalance;

    private Property() { }

    public static Property Create(Guid userId, string address, decimal purchasePrice, decimal currentEstimatedValue, decimal loanBalance, decimal interestRate, LoanProductType loanType, decimal monthlyRent, decimal monthlyExpenses)
    {
        return new Property
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Address = address,
            PurchasePrice = purchasePrice,
            CurrentEstimatedValue = currentEstimatedValue,
            LoanBalance = loanBalance,
            InterestRate = interestRate,
            LoanType = loanType,
            MonthlyRent = monthlyRent,
            MonthlyExpenses = monthlyExpenses,
            LastValueUpdateDate = DateTime.UtcNow
        };
    }

    public void UpdateEstimatedValue(decimal value)
    {
        CurrentEstimatedValue = value;
        LastValueUpdateDate = DateTime.UtcNow;
        Touch();
    }

    public void UpdateLoanBalance(decimal balance)
    {
        LoanBalance = balance;
        Touch();
    }

    public void UpdateRent(decimal rent)
    {
        MonthlyRent = rent;
        Touch();
    }
}