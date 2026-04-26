using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IAccountService
{
    Task<IEnumerable<AccountResponseDto>> GetAllAsync(Guid userId);
    Task<AccountResponseDto> GetByIdAsync(Guid id, Guid userId);
    Task<AccountResponseDto> CreateAsync(Guid userId, CreateAccountRequest request);
    Task<AccountResponseDto> UpdateAsync(Guid id, Guid userId, UpdateAccountRequest request);
    Task SoftDeleteAsync(Guid id, Guid userId);
}
