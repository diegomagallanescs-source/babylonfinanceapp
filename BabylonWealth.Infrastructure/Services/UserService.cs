using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace BabylonWealth.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UserService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<UserProfileResponseDto> GetProfileAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException(nameof(ApplicationUser), userId);

        return MapToDto(user);
    }

    public async Task<UserProfileResponseDto> UpdateProfileAsync(Guid userId, UpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException(nameof(ApplicationUser), userId);

        user.FirstName = request.FirstName;
        user.UpdatedAt = DateTime.UtcNow;

        await _userManager.UpdateAsync(user);

        return MapToDto(user);
    }

    private static UserProfileResponseDto MapToDto(ApplicationUser user) => new()
    {
        Id = user.Id,
        Email = user.Email!,
        FirstName = user.FirstName,
        CreatedAt = user.CreatedAt
    };
}
