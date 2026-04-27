using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IPropertyService
{
    Task<IEnumerable<PropertyResponseDto>> GetAllAsync(Guid userId);
    Task<PropertyResponseDto> GetByIdAsync(Guid id, Guid userId);
    Task<PropertyResponseDto> CreateAsync(Guid userId, CreatePropertyRequest request);
    Task<PropertyResponseDto> UpdateAsync(Guid id, Guid userId, UpdatePropertyRequest request);
    Task DeleteAsync(Guid id, Guid userId);
}
