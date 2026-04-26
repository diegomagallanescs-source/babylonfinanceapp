using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IIncomeService
{
    Task<IEnumerable<IncomeResponseDto>> GetAllAsync(Guid userId);
    Task<IncomeResponseDto> CreateAsync(Guid userId, CreateIncomeRequest request);
    Task<IncomeResponseDto> UpdateAsync(Guid id, Guid userId, UpdateIncomeRequest request);
    Task SoftDeleteAsync(Guid id, Guid userId);
    Task<decimal> GetAnnualTotalAsync(Guid userId);
}
