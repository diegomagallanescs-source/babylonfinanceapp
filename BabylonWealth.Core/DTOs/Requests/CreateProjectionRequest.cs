using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.DTOs.Requests;

public class CreateProjectionRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>
    /// Seed ledger for the new projection — the client sends a copy of the live Accounting tab
    /// so the first view matches it exactly. Omit for an empty workspace.
    /// </summary>
    public ProjectionStateDto? State { get; set; }
}
