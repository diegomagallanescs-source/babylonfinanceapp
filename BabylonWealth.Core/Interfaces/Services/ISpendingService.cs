using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface ISpendingService
{
    /// <summary>All transactions for a given month — the primary query for the Spending tab.</summary>
    Task<IEnumerable<SpendingTransactionResponseDto>> GetByMonthAsync(Guid userId, int month, int year);

    /// <summary>
    /// Creates an immutable spending transaction.
    /// Transactions cannot be edited after creation — soft delete and re-enter to correct.
    /// </summary>
    Task<SpendingTransactionResponseDto> CreateAsync(Guid userId, CreateSpendingTransactionRequest request);

    /// <summary>
    /// Soft deletes a transaction. Use this + CreateAsync to correct a mistake.
    /// Preserves the audit trail — nothing is ever hard deleted.
    /// </summary>
    Task SoftDeleteAsync(Guid id, Guid userId);

    Task<IEnumerable<SpendingTransactionResponseDto>> GetByAccountAsync(Guid userId, Guid accountId);
    Task<IEnumerable<SpendingTransactionResponseDto>> GetByCategoryAsync(Guid userId, Guid categoryId);
}
