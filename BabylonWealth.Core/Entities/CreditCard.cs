using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

public class CreditCard : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public Guid? BankId { get; set; }
    public Bank? Bank { get; set; }
    public string CustomLabel { get; private set; } = string.Empty;
    public decimal Balance { get; private set; }
    public decimal CreditLimit { get; private set; }
    public decimal APR { get; private set; }
    public CardType CardType { get; private set; }
    public string? Notes { get; private set; }
    public Dictionary<string, string>? CustomFields { get; private set; }

    private CreditCard() { }

    public static CreditCard Create(Guid userId, Guid? bankId, string customLabel, decimal balance, decimal creditLimit, decimal apr, CardType cardType)
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

    public void UpdateLabel(string customLabel) { CustomLabel = customLabel; Touch(); }
    public void UpdateBalance(decimal balance) { Balance = balance; Touch(); }
    public void UpdateCreditLimit(decimal creditLimit) { CreditLimit = creditLimit; Touch(); }
    public void UpdateAPR(decimal apr) { APR = apr; Touch(); }
    public void UpdateCardType(CardType cardType) { CardType = cardType; Touch(); }
    public void UpdateNotes(string? notes) { Notes = notes; Touch(); }
}