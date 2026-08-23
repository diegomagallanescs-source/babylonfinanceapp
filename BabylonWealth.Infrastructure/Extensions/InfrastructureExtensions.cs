using System.Text;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;
using BabylonWealth.Infrastructure.Identity;
using BabylonWealth.Infrastructure.Persistence;
using BabylonWealth.Infrastructure.Repositories;
using BabylonWealth.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BabylonWealth.Infrastructure.Extensions;

public static class InfrastructureExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── Database ──────────────────────────────────────────────
        // Reads DATABASE_URL from environment first (Railway injects this in production).
        // Railway provides a postgresql:// URI; Npgsql requires key-value format, so convert.
        // Falls back to the connection string in appsettings.Development.json locally.
        var rawConnection =
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("No database connection string found.");

        var connectionString = ParseConnectionString(rawConnection);

        services.AddDbContext<BabylonDbContext>(options =>
            options.UseNpgsql(connectionString));

        // ── ASP.NET Core Identity ─────────────────────────────────
        // AddIdentity registers: UserManager, SignInManager, RoleManager + password hashing.
        // Tokens and lockout policies are configured here — Identity handles all the security
        // complexity so we don't have to: bcrypt, lockout, password complexity, etc.
        services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireUppercase = false;
            options.Password.RequireNonAlphanumeric = false;

            options.User.RequireUniqueEmail = true;

            // Disable lockout for now — can enable in production
            options.Lockout.AllowedForNewUsers = false;
        })
        .AddEntityFrameworkStores<BabylonDbContext>()
        .AddDefaultTokenProviders();

        // ── JWT Bearer Authentication ─────────────────────────────
        // JWT is stateless: the token itself is proof of identity.
        // The server never stores session state — it just validates the signature.
        var secretKey = configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey is not configured.");

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secretKey))
                };
            });

        // ── Services ──────────────────────────────────────────────
        services.AddScoped<JwtService>();
        services.AddScoped<IUserService, UserService>();

        // ── Repositories ──────────────────────────────────────────
        // Scoped = one instance per HTTP request. The DI container builds the full
        // object graph automatically: Controller → IXRepository → XRepository → BabylonDbContext.
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<IBankRepository, BankRepository>();
        services.AddScoped<IBudgetCategoryRepository, BudgetCategoryRepository>();
        services.AddScoped<ICreditCardRepository, CreditCardRepository>();
        services.AddScoped<IIncomeRepository, IncomeRepository>();
        services.AddScoped<IInvestmentRepository, InvestmentRepository>();
        services.AddScoped<IInvestmentIncomeRepository, InvestmentIncomeRepository>();
        services.AddScoped<ILoanRepository, LoanRepository>();
        services.AddScoped<INetWorthRepository, NetWorthRepository>();
        services.AddScoped<IAnnotationRepository, AnnotationRepository>();
        services.AddScoped<IPendingItemRepository, PendingItemRepository>();
        services.AddScoped<IPropertyRepository, PropertyRepository>();
        services.AddScoped<ISpendingRepository, SpendingRepository>();
        services.AddScoped<IMonthlyBudgetSnapshotRepository, MonthlyBudgetSnapshotRepository>();
        services.AddScoped<IStatementImportRepository, StatementImportRepository>();
        services.AddScoped<ICheckingStatementImportRepository, CheckingStatementImportRepository>();
        services.AddScoped<IProjectionRepository, ProjectionRepository>();
        services.AddScoped<IProjectionSnapshotRepository, ProjectionSnapshotRepository>();

        return services;
    }

    private static string ParseConnectionString(string value)
    {
        if (!value.StartsWith("postgresql://") && !value.StartsWith("postgres://"))
            return value;

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);
        return $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
    }
}
