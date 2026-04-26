using BabylonWealth.Core.Entities;

namespace BabylonWealth.Tests.Helpers;

public static class EntityFactory
{
    public static BudgetCategory MakeBudgetCategory(
        Guid userId,
        string name = "Necessities",
        decimal targetPercentage = 0.50m,
        string color = "#E05555",
        int displayOrder = 1)
    {
        return BudgetCategory.Create(userId, name, targetPercentage, color, displayOrder);
    }
}
