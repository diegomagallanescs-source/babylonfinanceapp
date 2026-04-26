using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class CreditCardService : ICreditCardService
{
    private readonly ICreditCardRepository _cardRepo;

    public CreditCardService(ICreditCardRepository cardRepo)
    {
        _cardRepo = cardRepo;
    }

    public async Task<IEnumerable<CreditCardResponseDto>> GetAllAsync(Guid userId)
    {
        var cards = await _cardRepo.GetAllByUserAsync(userId);
        return cards.Select(ToDto);
    }

    public async Task<IEnumerable<CreditCardResponseDto>> GetByCardTypeAsync(Guid userId, CardType type)
    {
        var cards = await _cardRepo.GetByCardTypeAsync(userId, type);
        return cards.Select(ToDto);
    }

    public async Task<CreditCardResponseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var card = await _cardRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(CreditCard), id);
        return ToDto(card);
    }

    public async Task<CreditCardResponseDto> CreateAsync(Guid userId, CreateCreditCardRequest request)
    {
        var card = CreditCard.Create(
            userId,
            request.BankId,
            request.CustomLabel,
            request.Balance,
            request.CreditLimit,
            request.APR,
            request.CardType);

        if (request.Notes is not null)
            card.UpdateNotes(request.Notes);

        var created = await _cardRepo.CreateAsync(card);

        // Re-fetch with Bank navigation property populated
        var withBank = await _cardRepo.GetByIdAsync(created.Id, userId);
        return ToDto(withBank!);
    }

    public async Task<CreditCardResponseDto> UpdateAsync(Guid id, Guid userId, UpdateCreditCardRequest request)
    {
        var card = await _cardRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(CreditCard), id);

        if (request.CustomLabel is not null)
            card.UpdateLabel(request.CustomLabel);

        if (request.Balance is not null)
            card.UpdateBalance(request.Balance.Value);

        if (request.CreditLimit is not null)
            card.UpdateCreditLimit(request.CreditLimit.Value);

        if (request.APR is not null)
            card.UpdateAPR(request.APR.Value);

        if (request.CardType is not null)
            card.UpdateCardType(request.CardType.Value);

        if (request.Notes is not null)
            card.UpdateNotes(request.Notes);

        await _cardRepo.UpdateAsync(card);
        return ToDto(card);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        _ = await _cardRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(CreditCard), id);

        await _cardRepo.SoftDeleteAsync(id, userId);
    }

    private static CreditCardResponseDto ToDto(CreditCard c) => new()
    {
        Id = c.Id,
        BankId = c.BankId,
        BankName = c.Bank?.Name ?? string.Empty,
        BankLogoUrl = c.Bank?.LogoUrl,
        CustomLabel = c.CustomLabel,
        Balance = c.Balance,
        CreditLimit = c.CreditLimit,
        APR = c.APR,
        CardType = c.CardType,
        UtilizationRate = c.CreditLimit > 0 ? Math.Round(c.Balance / c.CreditLimit * 100, 2) : 0m,
        Notes = c.Notes,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };
}
