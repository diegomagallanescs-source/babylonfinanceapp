using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IUserService
{
    Task<UserProfileResponseDto> GetProfileAsync(Guid userId);
    Task<UserProfileResponseDto> UpdateProfileAsync(Guid userId, UpdateUserRequest request);
}
