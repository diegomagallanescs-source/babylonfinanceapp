using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Interfaces.Services;

public interface ILoanService
{
    Task<IEnumerable<LoanResponseDto>> GetAllAsync(Guid userId);
    Task<IEnumerable<LoanResponseDto>> GetByLoanTypeAsync(Guid userId, LoanType type);
    Task<LoanResponseDto> GetByIdAsync(Guid id, Guid userId);
    Task<LoanResponseDto> CreateAsync(Guid userId, CreateLoanRequest request);
    Task<LoanResponseDto> UpdateAsync(Guid id, Guid userId, UpdateLoanRequest request);
    Task SoftDeleteAsync(Guid id, Guid userId);
    Task<LoanSummaryDto> GetSummaryAsync(Guid userId);
}
