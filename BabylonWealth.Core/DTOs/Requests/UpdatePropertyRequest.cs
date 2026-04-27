using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public record UpdatePropertyRequest
{
    public string Address { get; init; } = string.Empty;
    public decimal PurchasePrice { get; init; }
    public decimal CurrentEstimatedValue { get; init; }
    public decimal LoanBalance { get; init; }
    public decimal InterestRate { get; init; }
    public LoanProductType LoanType { get; init; }
    public decimal MonthlyRent { get; init; }
    public decimal MonthlyExpenses { get; init; }
}
