using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class IncomeSource : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public IncomeType Type { get; private set; }
    public decimal AnnualAmount { get; private set; }
    public bool IsActive { get; private set; }

    private IncomeSource() { }

    public static IncomeSource Create(Guid userId, string name, IncomeType type, decimal annualAmount)
    {
        return new IncomeSource
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Type = type,
            AnnualAmount = annualAmount,
            IsActive = true
        };
    }

    public void UpdateAmount(decimal amount)
    {
        AnnualAmount = amount;
        Touch();
    }

    public void Deactivate()
    {
        IsActive = false;
        Touch();
    }
}