namespace BabylonWealth.Core.Entities;

public class CheckingStatementImport : BaseEntity<Guid>
{
    public Guid UserId { get; private set; }
    public int Month { get; private set; }
    public int Year { get; private set; }
    public decimal TotalMoneyIn { get; private set; }
    public decimal TotalMoneyOut { get; private set; }
    public int TransactionCount { get; private set; }
    public string AccountsIncluded { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    /// <summary>JSON array of {Name, Amount} income category items, e.g. [{"Name":"Employment","Amount":5000}].</summary>
    public string? IncomeCategoriesJson { get; private set; }

    private CheckingStatementImport() { }

    public static CheckingStatementImport Create(
        Guid userId,
        int month,
        int year,
        decimal totalMoneyIn,
        decimal totalMoneyOut,
        int transactionCount,
        string accountsIncluded,
        string? notes = null,
        string? incomeCategoriesJson = null)
    {
        return new CheckingStatementImport
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Month = month,
            Year = year,
            TotalMoneyIn = totalMoneyIn,
            TotalMoneyOut = totalMoneyOut,
            TransactionCount = transactionCount,
            AccountsIncluded = accountsIncluded,
            Notes = notes,
            IncomeCategoriesJson = incomeCategoriesJson,
        };
    }

    public void Update(
        decimal totalMoneyIn,
        decimal totalMoneyOut,
        int transactionCount,
        string accountsIncluded,
        string? notes,
        string? incomeCategoriesJson)
    {
        TotalMoneyIn = totalMoneyIn;
        TotalMoneyOut = totalMoneyOut;
        TransactionCount = transactionCount;
        AccountsIncluded = accountsIncluded;
        Notes = notes;
        IncomeCategoriesJson = incomeCategoriesJson;
        Touch();
    }
}
