using System.Runtime.Serialization;

namespace BabylonWealth.Core.Enums;

public enum AnnotationCategory
{
    [EnumMember(Value = "Income")]     Income,
    [EnumMember(Value = "Expense")]    Expense,
    [EnumMember(Value = "Investment")] Investment,
    [EnumMember(Value = "Milestone")]  Milestone,
    [EnumMember(Value = "Note")]       Note
}
