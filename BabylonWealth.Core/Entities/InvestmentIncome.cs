using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class InvestmentIncome : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public string SourceName { get; private set; } = string.Empty;
    public InvestmentIncomeType Type { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime ReceivedDate { get; private set; }
    public Guid? AccountId { get; private set; }
    public string? Notes { get; private set; }

    private InvestmentIncome() { }

    public static InvestmentIncome Create(Guid userId, string sourceName, InvestmentIncomeType type, decimal amount, DateTime receivedDate)
    {
        return new InvestmentIncome
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SourceName = sourceName,
            Type = type,
            Amount = amount,
            ReceivedDate = receivedDate
        };
    }
}