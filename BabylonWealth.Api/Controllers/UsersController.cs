using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>User profile management.</summary>
[ApiController]
[Route("api/v1/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>Returns the profile of the currently authenticated user.</summary>
    /// <response code="200">User profile.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserProfileResponseDto>> GetMe()
    {
        var profile = await _userService.GetProfileAsync(GetUserId());
        return Ok(profile);
    }

    /// <summary>Updates the display name of the currently authenticated user.</summary>
    /// <response code="200">Updated user profile.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserProfileResponseDto>> UpdateMe([FromBody] UpdateUserRequest request)
    {
        var profile = await _userService.UpdateProfileAsync(GetUserId(), request);
        return Ok(profile);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
