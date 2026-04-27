using System.Security.Claims;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Net worth — live computation and snapshot history.</summary>
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

    /// <summary>
    /// Computes the current net worth live from all account balances.
    /// Net worth is never stored — only snapshots are persisted.
    /// Returns both Liquid NW (cash + investments − debts) and Total NW (adds property equity).
    /// </summary>
    /// <response code="200">Current net worth breakdown.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("current")]
    [ProducesResponseType(typeof(NetWorthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NetWorthResponseDto>> GetCurrent()
    {
        var userId = GetUserId();
        var result = await _netWorthService.ComputeAsync(userId);
        return Ok(result);
    }

    /// <summary>Returns the net worth snapshot history within the given date range. Defaults to the past year.</summary>
    /// <param name="from">Range start (UTC). Defaults to one year ago.</param>
    /// <param name="to">Range end (UTC). Defaults to now.</param>
    /// <response code="200">List of historical net worth snapshots.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IEnumerable<NetWorthHistoryPointDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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

    /// <summary>
    /// Manually takes a net worth snapshot at the current moment.
    /// The background service also runs this automatically every two weeks on Sundays.
    /// </summary>
    /// <response code="200">Snapshot created and returned.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpPost("snapshot")]
    [ProducesResponseType(typeof(NetWorthHistoryPointDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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
