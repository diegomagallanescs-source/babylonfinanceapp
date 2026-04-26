using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IInvestmentService
{
    Task<IEnumerable<InvestmentResponseDto>> GetAllAsync(Guid userId);
    Task<IEnumerable<InvestmentResponseDto>> GetByTypeAsync(Guid userId, InvestmentType type);
    Task<InvestmentResponseDto> GetByIdAsync(Guid id, Guid userId);
    Task<InvestmentResponseDto> CreateAsync(Guid userId, CreateInvestmentRequest request);
    Task<InvestmentResponseDto> UpdateAsync(Guid id, Guid userId, UpdateInvestmentRequest request);
    Task SoftDeleteAsync(Guid id, Guid userId);
    Task<InvestmentSummaryDto> GetSummaryAsync(Guid userId);
}
