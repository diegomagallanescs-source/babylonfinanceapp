using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class PendingItem : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public string Description { get; private set; } = string.Empty;
    public string? Counterparty { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime? DueDate { get; private set; }
    public PendingItemStatus Status { get; private set; }
    public DateTime? SettledAt { get; private set; }

    private PendingItem() { }

    public static PendingItem Create(Guid userId, string description, decimal amount, string? counterparty = null, DateTime? dueDate = null)
    {
        return new PendingItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Description = description,
            Amount = amount,
            Counterparty = counterparty,
            DueDate = dueDate,
            Status = PendingItemStatus.Pending
        };
    }

    public void Settle()
    {
        Status = PendingItemStatus.Settled;
        SettledAt = DateTime.UtcNow;
        Touch();
    }
}