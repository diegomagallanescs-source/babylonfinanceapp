namespace BabylonWealth.Core.Entities;

public class MonthlyBudgetSnapshot : BaseEntity<Guid>
{
    public Guid UserId { get; private set; }
    public int Month { get; private set; }
    public int Year { get; private set; }
    public decimal TotalIncome { get; private set; }
    public decimal TotalSpending { get; private set; }
    public decimal TotalInvested { get; private set; }
    public decimal SavingsRate { get; private set; }

    private MonthlyBudgetSnapshot() { }

    public static MonthlyBudgetSnapshot Create(Guid userId, int month, int year, decimal totalIncome, decimal totalSpending, decimal totalInvested)
    {
        return new MonthlyBudgetSnapshot
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Month = month,
            Year = year,
            TotalIncome = totalIncome,
            TotalSpending = totalSpending,
            TotalInvested = totalInvested,
            SavingsRate = totalIncome > 0 ? totalInvested / totalIncome : 0
        };
    }
}