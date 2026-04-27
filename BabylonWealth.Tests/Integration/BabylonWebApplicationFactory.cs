using Babylon.Api;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace BabylonWealth.Tests.Integration;

/// <summary>
/// Spins up the full ASP.NET Core pipeline with an EF Core in-memory database.
/// Npgsql is replaced so tests run without a real PostgreSQL instance.
/// The SnapshotBackgroundService is removed — it is irrelevant to request-level tests.
/// </summary>
public class BabylonWebApplicationFactory : WebApplicationFactory<Program>
{
    // Each factory instance gets its own isolated database so parallel test
    // classes cannot share state.
    private readonly string _dbName = $"BabylonTest_{Guid.NewGuid()}";

    // Save and restore DATABASE_URL so we don't permanently mutate the process env.
    private readonly string? _originalDatabaseUrl;

    public BabylonWebApplicationFactory()
    {
        // AddInfrastructure checks DATABASE_URL before IConfiguration. Setting a
        // placeholder here prevents the "No connection string found" throw that would
        // otherwise happen before ConfigureTestServices can replace the DbContext.
        // The actual connection string is irrelevant — the DbContext is swapped below.
        _originalDatabaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        Environment.SetEnvironmentVariable("DATABASE_URL", "Host=localhost;Database=test_placeholder;");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // ConfigureTestServices runs AFTER Program.cs registers all services,
        // so we can safely remove the Npgsql DbContext and replace it here.
        builder.ConfigureTestServices(services =>
        {
            // ── Replace PostgreSQL DbContext with in-memory ────────────────────
            services.RemoveAll<DbContextOptions<BabylonDbContext>>();
            services.RemoveAll<BabylonDbContext>();
            services.AddDbContext<BabylonDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            // ── Remove the background snapshot service ─────────────────────────
            // It tries to iterate all users and take NW snapshots on startup.
            // Irrelevant to the HTTP scenarios under test and adds log noise.
            services.RemoveAll<IHostedService>();
        });
    }

    protected override void Dispose(bool disposing)
    {
        // Restore the original DATABASE_URL so other tests or processes are unaffected.
        Environment.SetEnvironmentVariable("DATABASE_URL", _originalDatabaseUrl);
        base.Dispose(disposing);
    }
}
