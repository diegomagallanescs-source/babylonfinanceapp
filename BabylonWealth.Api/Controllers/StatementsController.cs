using System.Security.Claims;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabylonWealth.Api.Controllers;

/// <summary>PDF bank statement analysis and monthly spending history.</summary>
[ApiController]
[Route("api/v1/statements")]
[Authorize]
public class StatementsController : ControllerBase
{
    private readonly IStatementAnalyzerService _analyzer;
    private readonly ICheckingStatementAnalyzerService _checkingAnalyzer;
    private readonly IStatementImportService _importService;
    private readonly ICheckingStatementImportService _checkingImportService;

    public StatementsController(
        IStatementAnalyzerService analyzer,
        ICheckingStatementAnalyzerService checkingAnalyzer,
        IStatementImportService importService,
        ICheckingStatementImportService checkingImportService)
    {
        _analyzer = analyzer;
        _checkingAnalyzer = checkingAnalyzer;
        _importService = importService;
        _checkingImportService = checkingImportService;
    }

    /// <summary>
    /// Stateless — accepts 1–10 PDF credit card statements and returns a pooled spending analysis.
    /// Nothing is written to the database. The user can then choose to save the monthly total.
    /// </summary>
    /// <response code="200">Spending analysis result.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">No files provided, or a file is not a valid PDF.</response>
    [HttpPost("analyze")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [ProducesResponseType(typeof(StatementAnalysisResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public ActionResult<StatementAnalysisResponseDto> Analyze([FromForm] IFormFileCollection files)
    {
        if (files == null || files.Count == 0)
            return UnprocessableEntity(new { error = "At least one PDF file is required." });

        var pdfInputs = new List<(Stream stream, string fileName)>();

        foreach (var file in files)
        {
            if (!IsPdf(file))
                return UnprocessableEntity(new { error = $"'{file.FileName}' is not a PDF file." });

            pdfInputs.Add((file.OpenReadStream(), file.FileName));
        }

        var result = _analyzer.Analyze(pdfInputs);
        return Ok(result);
    }

    /// <summary>
    /// Stateless — accepts 1–5 checking account PDFs (Chase, SoFi, BofA) and returns a pooled
    /// Money In / Money Out analysis. Nothing is written to the database.
    /// </summary>
    /// <response code="200">Checking analysis result.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">No files provided, or a file is not a valid PDF.</response>
    [HttpPost("analyze-checking")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [ProducesResponseType(typeof(CheckingStatementResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public ActionResult<CheckingStatementResponseDto> AnalyzeChecking([FromForm] IFormFileCollection files)
    {
        if (files == null || files.Count == 0)
            return UnprocessableEntity(new { error = "At least one PDF file is required." });

        var pdfInputs = new List<(Stream stream, string fileName)>();
        foreach (var file in files)
        {
            if (!IsPdf(file))
                return UnprocessableEntity(new { error = $"'{file.FileName}' is not a PDF file." });
            pdfInputs.Add((file.OpenReadStream(), file.FileName));
        }

        var result = _checkingAnalyzer.Analyze(pdfInputs);
        return Ok(result);
    }

    /// <summary>Persists just the monthly total credit card spend for historical chart display.</summary>
    /// <response code="201">Monthly summary saved.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Duplicate month/year entry already exists.</response>
    [HttpPost("save")]
    [ProducesResponseType(typeof(StatementSummaryResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<StatementSummaryResponseDto>> Save(
        [FromBody] SaveStatementSummaryRequest request)
    {
        var userId = GetUserId();
        try
        {
            var saved = await _importService.SaveAsync(userId, request);
            return CreatedAtAction(nameof(GetHistory), new { }, saved);
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>Returns all saved monthly credit card totals for the spend-over-time chart.</summary>
    /// <response code="200">List of monthly summaries.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IEnumerable<StatementSummaryResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<StatementSummaryResponseDto>>> GetHistory()
    {
        var userId = GetUserId();
        var history = await _importService.GetHistoryAsync(userId);
        return Ok(history);
    }

    /// <summary>Updates an existing monthly credit-card summary with new totals from a re-upload.</summary>
    /// <response code="200">Summary updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Summary not found or belongs to another user.</response>
    /// <response code="422">Validation error.</response>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(StatementSummaryResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<StatementSummaryResponseDto>> Update(
        Guid id, [FromBody] SaveStatementSummaryRequest request)
    {
        var userId = GetUserId();
        try
        {
            var updated = await _importService.UpdateAsync(id, userId, request);
            return Ok(updated);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a saved monthly credit card summary.</summary>
    /// <response code="204">Summary deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Summary not found or belongs to another user.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        try
        {
            await _importService.DeleteAsync(id, userId);
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    /// <summary>Persists a monthly checking account summary (Money In + Money Out) to the database.</summary>
    /// <response code="201">Checking summary saved.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="422">Duplicate month/year entry already exists.</response>
    [HttpPost("checking/save")]
    [ProducesResponseType(typeof(CheckingStatementSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CheckingStatementSummaryDto>> SaveChecking(
        [FromBody] SaveCheckingStatementRequest request)
    {
        var userId = GetUserId();
        try
        {
            var saved = await _checkingImportService.SaveAsync(userId, request);
            return CreatedAtAction(nameof(GetCheckingHistory), new { }, saved);
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>Returns all saved monthly checking summaries for the Money In / Money Out chart.</summary>
    /// <response code="200">List of checking summaries.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("checking/history")]
    [ProducesResponseType(typeof(IEnumerable<CheckingStatementSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<CheckingStatementSummaryDto>>> GetCheckingHistory()
    {
        var history = await _checkingImportService.GetHistoryAsync(GetUserId());
        return Ok(history);
    }

    /// <summary>
    /// Returns per-year totals: Money In (checking), Money Out (checking), Credit Card Spend,
    /// and Net Savings — combining both checking and credit card statement history.
    /// </summary>
    /// <response code="200">Annual financial summary.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    [HttpGet("annual-summary")]
    [ProducesResponseType(typeof(IEnumerable<AnnualFinancialSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<AnnualFinancialSummaryDto>>> GetAnnualSummary()
    {
        var summary = await _checkingImportService.GetAnnualSummaryAsync(GetUserId());
        return Ok(summary);
    }

    /// <summary>Updates an existing monthly checking summary with new totals from a re-upload.</summary>
    /// <response code="200">Checking summary updated.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Summary not found or belongs to another user.</response>
    /// <response code="422">Validation error.</response>
    [HttpPut("checking/{id:guid}")]
    [ProducesResponseType(typeof(CheckingStatementSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CheckingStatementSummaryDto>> UpdateChecking(
        Guid id, [FromBody] SaveCheckingStatementRequest request)
    {
        var userId = GetUserId();
        try
        {
            var updated = await _checkingImportService.UpdateAsync(id, userId, request);
            return Ok(updated);
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
        catch (ValidationException e)
        {
            return UnprocessableEntity(new { error = e.Message });
        }
    }

    /// <summary>Soft-deletes a saved checking monthly summary.</summary>
    /// <response code="204">Checking summary deleted.</response>
    /// <response code="401">Missing or invalid JWT.</response>
    /// <response code="404">Summary not found or belongs to another user.</response>
    [HttpDelete("checking/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteChecking(Guid id)
    {
        try
        {
            await _checkingImportService.DeleteAsync(id, GetUserId());
            return NoContent();
        }
        catch (NotFoundException e)
        {
            return NotFound(new { error = e.Message });
        }
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static bool IsPdf(IFormFile file) =>
        file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase) ||
        file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
}
