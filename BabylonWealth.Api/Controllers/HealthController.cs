using BabylonWealth.Core.Interfaces.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Health and DI wiring checks. No authentication required.</summary>
[ApiController]
[Route("api/v1/health")]
public class HealthController : ControllerBase
{
    private readonly IAccountRepository _accounts;
    private readonly IBankRepository _banks;
    private readonly ISpendingRepository _spending;
    private readonly INetWorthRepository _netWorth;

    public HealthController(
        IAccountRepository accounts,
        IBankRepository banks,
        ISpendingRepository spending,
        INetWorthRepository netWorth)
    {
        _accounts = accounts;
        _banks = banks;
        _spending = spending;
        _netWorth = netWorth;
    }

    /// <summary>Returns a simple liveness check. Used by Railway health probes and load balancers.</summary>
    /// <response code="200">API is running.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new { status = "healthy" });

    /// <summary>
    /// Verifies the DI container resolves the full repository → DbContext object graph.
    /// Returns the concrete type names so it is clear which implementations were injected.
    /// No database query is made — this is a pure DI wiring check.
    /// </summary>
    /// <response code="200">DI wiring is healthy.</response>
    [HttpGet("di")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult DiCheck() => Ok(new
    {
        status = "ok",
        resolvedTypes = new
        {
            accountRepository  = _accounts.GetType().Name,
            bankRepository     = _banks.GetType().Name,
            spendingRepository = _spending.GetType().Name,
            netWorthRepository = _netWorth.GetType().Name,
        }
    });
}
