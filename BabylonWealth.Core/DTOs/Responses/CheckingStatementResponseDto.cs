namespace BabylonWealth.Core.DTOs.Responses;

public record CheckingStatementResponseDto
{
    public string StatementPeriod { get; init; } = string.Empty;
    public int? InferredMonth { get; init; }
    public int? InferredYear { get; init; }
    public List<string> AccountsDetected { get; init; } = [];
    public decimal TotalMoneyIn { get; init; }
    public decimal TotalMoneyOut { get; init; }
    public decimal NetFlow { get; init; }
    public int TransactionCount { get; init; }
    public List<CheckingTransactionDto> Transactions { get; init; } = [];
    public List<CheckingFlowDto> MoneyInBreakdown { get; init; } = [];
    public List<CheckingFlowDto> MoneyOutBreakdown { get; init; } = [];
    public List<string> ParseWarnings { get; init; } = [];
}

public record CheckingTransactionDto
{
    public string Date { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string Direction { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string? AccountLast4 { get; init; }
    public string? SourceFile { get; init; }
}

public record CheckingFlowDto
{
    public string Category { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public int Count { get; init; }
    public decimal Percentage { get; init; }
}
