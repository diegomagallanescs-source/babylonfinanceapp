namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>
/// A full copy of the accounting ledger, private to one projection.
/// Row ids are client-generated strings, not entity keys — these rows are scratch data
/// that lives only inside a projection and never maps back to a real account.
/// </summary>
public class ProjectionStateDto
{
    public List<ProjectionAccountDto> Accounts { get; set; } = new();
    public List<ProjectionInvestmentDto> Investments { get; set; } = new();
    public List<ProjectionCreditCardDto> CreditCards { get; set; } = new();
    public List<ProjectionLoanDto> Loans { get; set; } = new();
    public List<ProjectionPendingItemDto> PendingItems { get; set; } = new();
    public List<ProjectionPropertyDto> Properties { get; set; } = new();
}

public class ProjectionAccountDto
{
    public string Id { get; set; } = string.Empty;
    public string? BankId { get; set; }
    public string? BankName { get; set; }
    public string? BankLogoUrl { get; set; }
    public string CustomLabel { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public string AccountType { get; set; } = string.Empty;
    public string? BudgetCategoryId { get; set; }
}

public class ProjectionInvestmentDto
{
    public string Id { get; set; } = string.Empty;
    public string? BankId { get; set; }
    public string? BankName { get; set; }
    public string? BankLogoUrl { get; set; }
    public string CustomLabel { get; set; } = string.Empty;
    public decimal CurrentValue { get; set; }
    public string? Ticker { get; set; }
    public string InvestmentType { get; set; } = string.Empty;
}

public class ProjectionCreditCardDto
{
    public string Id { get; set; } = string.Empty;
    public string? BankId { get; set; }
    public string? BankName { get; set; }
    public string? BankLogoUrl { get; set; }
    public string CustomLabel { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal Apr { get; set; }
    public string CardType { get; set; } = string.Empty;
}

public class ProjectionLoanDto
{
    public string Id { get; set; } = string.Empty;
    public string CustomLabel { get; set; } = string.Empty;
    public string LenderName { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal InterestRate { get; set; }
    public string LoanType { get; set; } = string.Empty;
}

public class ProjectionPendingItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Counterparty { get; set; }
    public decimal Amount { get; set; }
    /// <summary>ISO date string (yyyy-MM-dd) — kept as text so no timezone shifting occurs.</summary>
    public string? DueDate { get; set; }
    public string Status { get; set; } = "Pending";
}

public class ProjectionPropertyDto
{
    public string Id { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal PurchasePrice { get; set; }
    public decimal CurrentEstimatedValue { get; set; }
    public decimal LoanBalance { get; set; }
    public decimal InterestRate { get; set; }
    public string LoanType { get; set; } = string.Empty;
    public decimal MonthlyRent { get; set; }
    public decimal MonthlyExpenses { get; set; }
}
