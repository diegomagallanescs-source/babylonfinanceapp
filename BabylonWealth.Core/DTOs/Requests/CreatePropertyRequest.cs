using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public record CreatePropertyRequest
{
    public string Address { get; init; } = string.Empty;
    public decimal PurchasePrice { get; init; }
    public decimal CurrentEstimatedValue { get; init; }
    public decimal LoanBalance { get; init; }
    public decimal InterestRate { get; init; }             // e.g. 0.07 for 7%
    public LoanProductType LoanType { get; init; }
    public decimal MonthlyRent { get; init; }
    public decimal MonthlyExpenses { get; init; }
}
