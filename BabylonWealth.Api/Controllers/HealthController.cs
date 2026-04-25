using BabylonWealth.Core.Interfaces.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

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

    /// <summary>
    /// Verifies the DI container resolves the full repository → DbContext object graph.
    /// Returns the concrete type names so it's clear which implementations were injected.
    /// No database query is made — this is a pure DI wiring check.
    /// </summary>
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "healthy" });

    [HttpGet("di")]
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
