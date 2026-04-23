using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class Investment : BaseEntity<Guid>
{
    public Guid UserId { get; private set; }
    public Guid BankId { get; private set; }
    public string CustomLabel { get; private set; } = string.Empty;
    public decimal CurrentValue { get; private set; }
    public string? Ticker { get; private set; }
    public InvestmentType InvestmentType { get; private set; }
    public Dictionary<string, string>? CustomFields { get; private set; }

    private Investment() { }

    public static Investment Create(Guid userId, Guid bankId, string customLabel, decimal currentValue, InvestmentType investmentType, string? ticker = null)
    {
        return new Investment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BankId = bankId,
            CustomLabel = customLabel,
            CurrentValue = currentValue,
            InvestmentType = investmentType,
            Ticker = ticker
        };
    }

    public void UpdateValue(decimal value)
    {
        CurrentValue = value;
        Touch();
    }
}