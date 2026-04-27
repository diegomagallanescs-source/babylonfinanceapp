namespace BabylonWealth.Core.DTOs.Responses;

public record CheckingStatementSummaryDto
{
    public Guid Id { get; init; }
    public int Month { get; init; }
    public int Year { get; init; }
    public decimal TotalMoneyIn { get; init; }
    public decimal TotalMoneyOut { get; init; }
    public decimal NetFlow { get; init; }
    public int TransactionCount { get; init; }
    public string AccountsIncluded { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record AnnualFinancialSummaryDto
{
    public int Year { get; init; }
    /// <summary>Sum of TotalMoneyIn from all saved checking statements for this year.</summary>
    public decimal TotalMoneyIn { get; init; }
    /// <summary>Sum of TotalMoneyOut from all saved checking statements for this year.</summary>
    public decimal TotalCheckingOut { get; init; }
    /// <summary>Sum of credit-card spend (StatementImport) saved for this year.</summary>
    public decimal TotalCreditCardSpend { get; init; }
    /// <summary>TotalMoneyIn - TotalCreditCardSpend — real money spent on purchases.</summary>
    public decimal NetSavings { get; init; }
    public int CheckingMonthsRecorded { get; init; }
    public int CreditCardMonthsRecorded { get; init; }
}
