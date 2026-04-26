using System.Security.Claims;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

[ApiController]
[Route("api/v1/networth")]
[Authorize]
public class NetWorthController : ControllerBase
{
    private readonly INetWorthService _netWorthService;

    public NetWorthController(INetWorthService netWorthService)
    {
        _netWorthService = netWorthService;
    }

    [HttpGet("current")]
    public async Task<ActionResult<NetWorthResponseDto>> GetCurrent()
    {
        var userId = GetUserId();
        var result = await _netWorthService.ComputeAsync(userId);
        return Ok(result);
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
