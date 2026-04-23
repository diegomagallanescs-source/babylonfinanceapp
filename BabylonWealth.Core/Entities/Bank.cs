using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class Bank : BaseEntity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string? LogoUrl { get; private set; }
    public BankType Type { get; private set; }
    public string? SearchAliases { get; private set; }
    public string CountryCode { get; private set; } = "US";

    private Bank() { }

    public static Bank Create(string name, BankType type, string? logoUrl = null, string? searchAliases = null)
    {
        return new Bank
        {
            Id = Guid.NewGuid(),
            Name = name,
            Type = type,
            LogoUrl = logoUrl,
            SearchAliases = searchAliases
        };
    }
}