namespace BabylonWealth.Core.Entities;

public class BudgetCategory : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Name { get; private set; } = string.Empty;
    public decimal TargetPercentage { get; private set; }
    public string Color { get; private set; } = "#C9A84C";
    public int DisplayOrder { get; private set; }
    public Guid? BankId { get; set; }
    public Bank? Bank { get; set; }

    private BudgetCategory() { }

    public static BudgetCategory Create(Guid userId, string name, decimal targetPercentage, string color, int displayOrder)
    {
        return new BudgetCategory
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            TargetPercentage = targetPercentage,
            Color = color,
            DisplayOrder = displayOrder
        };
    }

    public void Update(string name, decimal targetPercentage, string color)
    {
        Name = name;
        TargetPercentage = targetPercentage;
        Color = color;
        Touch();
    }
}