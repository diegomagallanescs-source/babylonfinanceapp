using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

public interface ICheckingStatementAnalyzerService
{
    CheckingStatementResponseDto Analyze(IEnumerable<(Stream stream, string fileName)> pdfInputs);
}
