using BabylonWealth.Core.Interfaces.Services;
using Microsoft.Extensions.DependencyInjection;

namespace BabylonWealth.Services.Extensions;

public static class ServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<ICreditCardService, CreditCardService>();
        services.AddScoped<ILoanService, LoanService>();
        services.AddScoped<IInvestmentService, InvestmentService>();
        services.AddScoped<IPendingItemService, PendingItemService>();
        services.AddScoped<INetWorthService, NetWorthService>();
        services.AddScoped<ISnapshotService, SnapshotService>();
        services.AddScoped<IAnnotationService, AnnotationService>();
        services.AddScoped<IIncomeService, IncomeService>();
        services.AddScoped<IBudgetCategoryService, BudgetCategoryService>();
        services.AddScoped<ISpendingService, SpendingService>();
        services.AddScoped<IBudgetAnalyticsService, BudgetAnalyticsService>();
        services.AddScoped<IPassiveIncomeService, PassiveIncomeService>();
        services.AddScoped<IMonthlyBudgetSnapshotService, MonthlyBudgetSnapshotService>();
        services.AddScoped<IPropertyAnalyzerService, PropertyAnalyzerService>();
        services.AddScoped<IStatementAnalyzerService, StatementAnalyzerService>();
        services.AddScoped<ICheckingStatementAnalyzerService, CheckingStatementAnalyzerService>();
        services.AddScoped<IStatementImportService, StatementImportService>();
        services.AddScoped<ICheckingStatementImportService, CheckingStatementImportService>();
        return services;
    }
}
