namespace BabylonWealth.Core.Entities;

public class SpendingCategory : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public string Color { get; private set; } = "#C9A84C";
    public int DisplayOrder { get; private set; }

    private SpendingCategory() { }

    public static SpendingCategory Create(Guid userId, string name, string color, int displayOrder)
    {
        return new SpendingCategory
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Color = color,
            DisplayOrder = displayOrder
        };
    }
}
