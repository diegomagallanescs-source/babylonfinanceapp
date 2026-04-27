using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

public record PropertyResponseDto
{
    public Guid Id { get; init; }
    public string Address { get; init; } = string.Empty;
    public decimal PurchasePrice { get; init; }
    public decimal CurrentEstimatedValue { get; init; }
    public decimal LoanBalance { get; init; }
    public decimal Equity { get; init; }
    public decimal InterestRate { get; init; }
    public LoanProductType LoanType { get; init; }
    public decimal MonthlyRent { get; init; }
    public decimal MonthlyExpenses { get; init; }
    public decimal MonthlyCashFlow { get; init; }
    public DateTime? LastValueUpdateDate { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
