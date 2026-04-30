namespace BabylonWealth.Core.DTOs.Requests;

public class ReorderAccountsRequest
{
    /// <summary>Account IDs in the desired display order, index 0 = top.</summary>
    public List<Guid> OrderedIds { get; set; } = [];
}
