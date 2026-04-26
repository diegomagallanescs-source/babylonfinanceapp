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
    private readonly ISnapshotService _snapshotService;

    public NetWorthController(INetWorthService netWorthService, ISnapshotService snapshotService)
    {
        _netWorthService = netWorthService;
        _snapshotService = snapshotService;
    }

    [HttpGet("current")]
    public async Task<ActionResult<NetWorthResponseDto>> GetCurrent()
    {
        var userId = GetUserId();
        var result = await _netWorthService.ComputeAsync(userId);
        return Ok(result);
    }

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<NetWorthHistoryPointDto>>> GetHistory(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var userId = GetUserId();
        var effectiveFrom = DateTime.SpecifyKind(from ?? DateTime.UtcNow.AddYears(-1), DateTimeKind.Utc);
        var effectiveTo   = DateTime.SpecifyKind(to   ?? DateTime.UtcNow,             DateTimeKind.Utc);
        var history = await _snapshotService.GetHistoryAsync(userId, effectiveFrom, effectiveTo);
        return Ok(history);
    }

    [HttpPost("snapshot")]
    public async Task<ActionResult<NetWorthHistoryPointDto>> TakeSnapshot()
    {
        var userId = GetUserId();
        var snapshot = await _snapshotService.TakeSnapshotAsync(userId);
        return Ok(new NetWorthHistoryPointDto
        {
            SnapshotDate   = snapshot.SnapshotDate,
            LiquidNetWorth = snapshot.LiquidNetWorth,
            TotalNetWorth  = snapshot.TotalNetWorth,
            Annotation     = snapshot.Annotation
        });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
