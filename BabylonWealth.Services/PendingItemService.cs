using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class PendingItemService : IPendingItemService
{
    private readonly IPendingItemRepository _pendingRepo;

    public PendingItemService(IPendingItemRepository pendingRepo)
    {
        _pendingRepo = pendingRepo;
    }

    public async Task<IEnumerable<PendingItemResponseDto>> GetAllAsync(Guid userId)
    {
        var items = await _pendingRepo.GetAllByUserAsync(userId);
        return items.Select(ToDto);
    }

    public async Task<IEnumerable<PendingItemResponseDto>> GetPendingOnlyAsync(Guid userId)
    {
        var items = await _pendingRepo.GetPendingOnlyAsync(userId);
        return items.Select(ToDto);
    }

    public async Task<PendingItemResponseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var item = await _pendingRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(PendingItem), id);
        return ToDto(item);
    }

    public async Task<PendingItemResponseDto> CreateAsync(Guid userId, CreatePendingItemRequest request)
    {
        var item = PendingItem.Create(
            userId,
            request.Description,
            request.Amount,
            request.Counterparty,
            request.DueDate);

        var created = await _pendingRepo.CreateAsync(item);
        return ToDto(created);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        _ = await _pendingRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(PendingItem), id);

        await _pendingRepo.SoftDeleteAsync(id, userId);
    }

    public async Task SettleAsync(Guid id, Guid userId)
    {
        var item = await _pendingRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(PendingItem), id);

        if (item.Status == PendingItemStatus.Settled)
            throw new ValidationException("Item is already settled.");

        await _pendingRepo.SettleAsync(id, userId);
    }

    private static PendingItemResponseDto ToDto(PendingItem p) => new()
    {
        Id = p.Id,
        Description = p.Description,
        Counterparty = p.Counterparty,
        Amount = p.Amount,
        DueDate = p.DueDate,
        Status = p.Status,
        SettledAt = p.SettledAt,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
