using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class NetWorthService : INetWorthService
{
    private readonly IAccountRepository _accountRepo;
    private readonly IInvestmentRepository _investmentRepo;
    private readonly ICreditCardRepository _creditCardRepo;
    private readonly ILoanRepository _loanRepo;
    private readonly IPendingItemRepository _pendingItemRepo;
    private readonly IPropertyRepository _propertyRepo;

    public NetWorthService(
        IAccountRepository accountRepo,
        IInvestmentRepository investmentRepo,
        ICreditCardRepository creditCardRepo,
        ILoanRepository loanRepo,
        IPendingItemRepository pendingItemRepo,
        IPropertyRepository propertyRepo)
    {
        _accountRepo = accountRepo;
        _investmentRepo = investmentRepo;
        _creditCardRepo = creditCardRepo;
        _loanRepo = loanRepo;
        _pendingItemRepo = pendingItemRepo;
        _propertyRepo = propertyRepo;
    }

    public async Task<NetWorthResponseDto> ComputeAsync(Guid userId)
    {
        // Sequential awaits required — all repos share the same scoped DbContext,
        // which does not support concurrent operations.
        var accountBalance  = await _accountRepo.GetTotalBalanceAsync(userId);
        var investmentValue = await _investmentRepo.GetTotalValueAsync(userId);
        var creditUsed      = await _creditCardRepo.GetTotalBalanceAsync(userId);
        var creditLimit     = await _creditCardRepo.GetTotalCreditLimitAsync(userId);
        var loanBalance     = await _loanRepo.GetTotalOutstandingBalanceAsync(userId);
        var pendingNet      = await _pendingItemRepo.GetNetPendingAmountAsync(userId);
        var propertyEquity  = await _propertyRepo.GetTotalEquityAsync(userId);
        var hasProperties   = await _propertyRepo.HasPropertiesAsync(userId);

        // Pending items with positive net are assets (owed to user); negative are liabilities.
        var pendingAsset     = pendingNet > 0 ? pendingNet : 0m;
        var pendingLiability = pendingNet < 0 ? -pendingNet : 0m;

        var totalAssets      = accountBalance + investmentValue + pendingAsset;
        var totalLiabilities = creditUsed + loanBalance + pendingLiability;
        var liquidNetWorth   = totalAssets - totalLiabilities;
        var totalNetWorth    = liquidNetWorth + propertyEquity;

        decimal? creditUtilizationPercent = creditLimit > 0
            ? Math.Round(creditUsed / creditLimit * 100, 2)
            : null;

        return new NetWorthResponseDto
        {
            LiquidNetWorth           = liquidNetWorth,
            TotalNetWorth            = totalNetWorth,
            TotalAssets              = totalAssets,
            TotalLiabilities         = totalLiabilities,
            TotalCreditUsed          = creditUsed,
            TotalCreditLimit         = creditLimit,
            CreditUtilizationPercent = creditUtilizationPercent,
            PendingItemsNet          = pendingNet,
            PropertyEquity           = propertyEquity,
            HasProperties            = hasProperties,
            ComputedAt               = DateTime.UtcNow
        };
    }

    public async Task<decimal> ComputeLiquidAsync(Guid userId)
    {
        var result = await ComputeAsync(userId);
        return result.LiquidNetWorth;
    }
}
