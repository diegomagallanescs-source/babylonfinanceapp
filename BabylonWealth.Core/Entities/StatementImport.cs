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
    public bool IsYearEnd { get; private set; }

    // Optional per-category spend breakdown (manually entered by the user)
    public decimal? NecessitiesSpend { get; private set; }
    public decimal? TravelSpend { get; private set; }
    public decimal? SavingsSpend { get; private set; }
    public decimal? ShoppingSpend { get; private set; }
    public decimal? InvestmentsSpend { get; private set; }
    public decimal? OtherSpend { get; private set; }

    private StatementImport() { }

    public static StatementImport Create(
        Guid userId,
        int month,
        int year,
        decimal totalSpend,
        int transactionCount,
        string accountsIncluded,
        string? notes = null,
        decimal? necessitiesSpend = null,
        decimal? travelSpend = null,
        decimal? savingsSpend = null,
        decimal? shoppingSpend = null,
        decimal? investmentsSpend = null,
        decimal? otherSpend = null,
        bool isYearEnd = false)
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
            Notes = notes,
            IsYearEnd = isYearEnd,
            NecessitiesSpend = necessitiesSpend,
            TravelSpend = travelSpend,
            SavingsSpend = savingsSpend,
            ShoppingSpend = shoppingSpend,
            InvestmentsSpend = investmentsSpend,
            OtherSpend = otherSpend,
        };
    }

    public void Update(
        decimal totalSpend,
        int transactionCount,
        string accountsIncluded,
        string? notes,
        decimal? necessitiesSpend,
        decimal? travelSpend,
        decimal? savingsSpend,
        decimal? shoppingSpend,
        decimal? investmentsSpend,
        decimal? otherSpend)
    {
        TotalSpend = totalSpend;
        TransactionCount = transactionCount;
        AccountsIncluded = accountsIncluded;
        Notes = notes;
        NecessitiesSpend = necessitiesSpend;
        TravelSpend = travelSpend;
        SavingsSpend = savingsSpend;
        ShoppingSpend = shoppingSpend;
        InvestmentsSpend = investmentsSpend;
        OtherSpend = otherSpend;
        Touch();
    }
}
