using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IPendingItemService
{
    Task<IEnumerable<PendingItemResponseDto>> GetAllAsync(Guid userId);
    Task<IEnumerable<PendingItemResponseDto>> GetPendingOnlyAsync(Guid userId);
    Task<PendingItemResponseDto> GetByIdAsync(Guid id, Guid userId);
    Task<PendingItemResponseDto> CreateAsync(Guid userId, CreatePendingItemRequest request);
    Task SoftDeleteAsync(Guid id, Guid userId);
    Task SettleAsync(Guid id, Guid userId);
}
