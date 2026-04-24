namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>Single result from GET /api/v1/banks/search?q= — powers the autocomplete dropdown.</summary>
public record BankSearchResultDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;

    /// <summary>CDN URL for the bank logo. Frontend renders this as a small img tag in the Ledger row.</summary>
    public string LogoUrl { get; init; } = string.Empty;
}
