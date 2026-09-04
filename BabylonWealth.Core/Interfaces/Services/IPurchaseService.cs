using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IPurchaseService
{
    /// <summary>All purchases for a given month — the primary query for the Spending tab.</summary>
    Task<IEnumerable<PurchaseResponseDto>> GetByMonthAsync(Guid userId, int month, int year);

    /// <summary>
    /// Creates an immutable purchase entry.
    /// Purchases cannot be edited after creation — soft delete and re-enter to correct.
    /// </summary>
    Task<PurchaseResponseDto> CreateAsync(Guid userId, CreatePurchaseRequest request);

    /// <summary>Soft deletes a purchase. Use this + CreateAsync to correct a mistake.</summary>
    Task SoftDeleteAsync(Guid id, Guid userId);

    /// <summary>Soft-deletes every purchase in the given month.</summary>
    Task DeleteByMonthAsync(Guid userId, int month, int year);

    /// <summary>Monthly spend broken down by category for a date range — feeds the Spending tab's chart.</summary>
    Task<IEnumerable<PurchaseTrendPointDto>> GetMonthlyTrendByCategoryAsync(Guid userId, DateTime from, DateTime to);
}
