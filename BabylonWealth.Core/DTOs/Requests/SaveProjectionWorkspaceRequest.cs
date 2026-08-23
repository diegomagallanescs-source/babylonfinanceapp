using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.DTOs.Requests;

public class SaveProjectionWorkspaceRequest
{
    public ProjectionStateDto State { get; set; } = new();
}
