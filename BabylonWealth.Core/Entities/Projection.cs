namespace BabylonWealth.Core.Entities;

/// <summary>
/// A named "what-if" workspace. Holds its own private copy of the accounting ledger
/// (WorkspaceStateJson) that the user edits freely — nothing here ever touches the
/// real accounts on the Accounting tab.
/// </summary>
public class Projection : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    /// <summary>Serialized ProjectionStateDto — the current editable ledger for this projection.</summary>
    public string WorkspaceStateJson { get; private set; } = "{}";

    private Projection() { }

    public static Projection Create(Guid userId, string name, string? description, string workspaceStateJson)
    {
        return new Projection
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Description = description,
            WorkspaceStateJson = workspaceStateJson
        };
    }

    public void UpdateDetails(string name, string? description)
    {
        Name = name;
        Description = description;
        Touch();
    }

    public void UpdateWorkspace(string workspaceStateJson)
    {
        WorkspaceStateJson = workspaceStateJson;
        Touch();
    }
}
