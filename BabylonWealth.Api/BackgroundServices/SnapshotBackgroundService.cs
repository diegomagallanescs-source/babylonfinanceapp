using BabylonWealth.Core.Interfaces.Services;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BabylonWealth.Api.BackgroundServices;

public class SnapshotBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SnapshotBackgroundService> _logger;

    public SnapshotBackgroundService(IServiceProvider serviceProvider, ILogger<SnapshotBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SnapshotBackgroundService started. Interval: {Interval}h.", Interval.TotalHours);

        // Yield immediately so startup is not blocked.
        await Task.Yield();

        while (!stoppingToken.IsCancellationRequested)
        {
            await RunTickAsync(stoppingToken);
            await Task.Delay(Interval, stoppingToken).ConfigureAwait(false);
        }
    }

    private async Task RunTickAsync(CancellationToken ct)
    {
        // BackgroundService must create its own DI scope — it lives outside the
        // request pipeline and cannot use the request-scoped DbContext directly.
        using var scope = _serviceProvider.CreateScope();
        var snapshotService = scope.ServiceProvider.GetRequiredService<ISnapshotService>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var users = userManager.Users.ToList();

        foreach (var user in users)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                var should = await snapshotService.ShouldTakeSnapshotAsync(user.Id);
                if (!should) continue;

                await snapshotService.TakeSnapshotAsync(user.Id);
                _logger.LogInformation("Snapshot taken for user {UserId}.", user.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to take snapshot for user {UserId}.", user.Id);
            }
        }
    }
}
