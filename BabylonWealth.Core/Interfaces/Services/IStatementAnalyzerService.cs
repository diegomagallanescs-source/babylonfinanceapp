using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface IStatementAnalyzerService
{
    StatementAnalysisResponseDto Analyze(IEnumerable<(Stream stream, string fileName)> pdfInputs);
}
