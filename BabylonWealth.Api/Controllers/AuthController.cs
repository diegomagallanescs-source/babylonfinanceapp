using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Authentication — register and login. No JWT required.</summary>
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly JwtService _jwtService;
    private readonly IBudgetCategoryService _budgetCategoryService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        JwtService jwtService,
        IBudgetCategoryService budgetCategoryService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtService = jwtService;
        _budgetCategoryService = budgetCategoryService;
    }

    /// <summary>Creates a new user account and returns a JWT. Default budget categories are seeded automatically.</summary>
    /// <response code="200">Registration successful. JWT token returned.</response>
    /// <response code="400">Validation errors (e.g. email already taken, weak password).</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return BadRequest(new { errors });
        }

        await _budgetCategoryService.SeedDefaultCategoriesAsync(user.Id);

        var (token, expiresAt) = _jwtService.GenerateToken(user);

        return Ok(new AuthResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            UserId = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName
        });
    }

    /// <summary>Validates credentials and returns a JWT.</summary>
    /// <response code="200">Login successful. JWT token returned.</response>
    /// <response code="401">Invalid email or password.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user is null)
            return Unauthorized(new { error = "Invalid email or password." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);

        if (!result.Succeeded)
            return Unauthorized(new { error = "Invalid email or password." });

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var (token, expiresAt) = _jwtService.GenerateToken(user);

        return Ok(new AuthResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            UserId = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName
        });
    }
}
