using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Interfaces.Services;

public interface ICreditCardService
{
    Task<IEnumerable<CreditCardResponseDto>> GetAllAsync(Guid userId);
    Task<IEnumerable<CreditCardResponseDto>> GetByCardTypeAsync(Guid userId, CardType type);
    Task<CreditCardResponseDto> GetByIdAsync(Guid id, Guid userId);
    Task<CreditCardResponseDto> CreateAsync(Guid userId, CreateCreditCardRequest request);
    Task<CreditCardResponseDto> UpdateAsync(Guid id, Guid userId, UpdateCreditCardRequest request);
    Task SoftDeleteAsync(Guid id, Guid userId);
}
