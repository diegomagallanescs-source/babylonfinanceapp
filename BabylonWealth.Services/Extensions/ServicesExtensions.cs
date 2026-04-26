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
        return services;
    }
}
