using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class CreditCard : BaseEntity<Guid>
{
    public Guid UserId { get; private set; }
    public Guid BankId { get; private set; }
    public string CustomLabel { get; private set; } = string.Empty;
    public decimal Balance { get; private set; }
    public decimal CreditLimit { get; private set; }
    public decimal APR { get; private set; }
    public CardType CardType { get; private set; }
    public string? Notes { get; private set; }
    public Dictionary<string, string>? CustomFields { get; private set; }

    private CreditCard() { }

    public static CreditCard Create(Guid userId, Guid bankId, string customLabel, decimal balance, decimal creditLimit, decimal apr, CardType cardType)
    {
        return new CreditCard
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BankId = bankId,
            CustomLabel = customLabel,
            Balance = balance,
            CreditLimit = creditLimit,
            APR = apr,
            CardType = cardType
        };
    }

    public void UpdateBalance(decimal balance)
    {
        Balance = balance;
        Touch();
    }
}