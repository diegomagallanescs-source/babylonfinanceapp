using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

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

    [HttpGet("search")]
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
