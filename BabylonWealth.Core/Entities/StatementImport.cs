namespace BabylonWealth.Core.Entities;

public class StatementImport : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public int Month { get; private set; }
    public int Year { get; private set; }
    public decimal TotalSpend { get; private set; }
    public int TransactionCount { get; private set; }
    public string AccountsIncluded { get; private set; } = string.Empty;
    public string? Notes { get; private set; }

    private StatementImport() { }

    public static StatementImport Create(
        Guid userId,
        int month,
        int year,
        decimal totalSpend,
        int transactionCount,
        string accountsIncluded,
        string? notes = null)
    {
        return new StatementImport
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Month = month,
            Year = year,
            TotalSpend = totalSpend,
            TransactionCount = transactionCount,
            AccountsIncluded = accountsIncluded,
            Notes = notes
        };
    }
}
