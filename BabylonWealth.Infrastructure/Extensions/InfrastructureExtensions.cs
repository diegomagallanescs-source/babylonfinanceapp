using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BabylonWealth.Infrastructure.Extensions;

/// <summary>
/// Registers everything the Infrastructure layer provides into the DI container.
/// Called once from Program.cs — the API project never references EF Core or Npgsql directly.
/// All that complexity stays inside Infrastructure.
/// </summary>
public static class InfrastructureExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── Database ──────────────────────────────────────────────
        // Reads DATABASE_URL from environment first (Railway injects this in production).
        // Falls back to the connection string in appsettings.Development.json locally.
        var connectionString =
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("No database connection string found.");

        services.AddDbContext<BabylonDbContext>(options =>
            options.UseNpgsql(connectionString));

        // ── Repositories ──────────────────────────────────────────
        // Registered as Scoped: one instance per HTTP request.
        // The controller gets the same repository instance as the service it calls —
        // they share the same DbContext and therefore the same transaction.
        // (Repositories will be added here in Day 6 as they're implemented)

        return services;
    }
}