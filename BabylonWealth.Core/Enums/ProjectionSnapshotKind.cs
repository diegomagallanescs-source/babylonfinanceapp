using System.Runtime.Serialization;

namespace BabylonWealth.Core.Enums;

/// <summary>
/// Which line of a projection's chart a snapshot belongs to.
/// Projected = the future the user is modelling. Realized = what actually happened.
/// </summary>
public enum ProjectionSnapshotKind
{
    [EnumMember(Value = "Projected")] Projected,
    [EnumMember(Value = "Realized")]  Realized
}
