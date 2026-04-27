using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>Bank search — typeahead lookup backed by a seeded list of ~40 institutions.</summary>
[ApiController]
[Route("api/v1/banks")]
[Authorize]
public class BanksController : ControllerBase
{
    private readonly IBankRepository _bankRepository;

    public BanksController(IBankRepository bankRepository)
    {
        _bankRepository = bankRepository;
    }

    /// <summary>
    /// Searches the seeded bank list by name or alias. Returns up to 8 matches.
    /// Requires at least 2 characters; returns an empty array for shorter queries.
    /// </summary>
    /// <param name="q">Search term (minimum 2 characters).</param>
    /// <response code="200">Up to 8 matching banks.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("search")]
    [ProducesResponseType(typeof(IEnumerable<BankSearchResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<BankSearchResultDto>>> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<BankSearchResultDto>());

        var banks = await _bankRepository.SearchAsync(q, maxResults: 8);

        var results = banks.Select(b => new BankSearchResultDto
        {
            Id = b.Id,
            Name = b.Name,
            LogoUrl = b.LogoUrl ?? string.Empty
        });

        return Ok(results);
    }
}
