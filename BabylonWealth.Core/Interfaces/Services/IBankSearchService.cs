using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

/// <summary>
/// Provides bank search for the Ledger tab's autocomplete dropdown.
/// Wraps IBankRepository with formatting and result-shaping logic.
///
/// Kept as a separate service (rather than calling the repository directly from the controller)
/// so that future enhancements — fuzzy matching, external logo CDN lookups, caching —
/// can be added here without touching the controller or the repository.
/// </summary>
public interface IBankSearchService
{
    /// <summary>
    /// Case-insensitive search across bank Name and SearchAliases.
    /// Returns up to 10 results by default. Results include logo URLs.
    /// Called by GET /api/v1/banks/search?q={query}
    /// </summary>
    Task<IEnumerable<BankSearchResultDto>> SearchAsync(string query, int maxResults = 10);
}
