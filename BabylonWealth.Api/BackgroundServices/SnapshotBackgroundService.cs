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
        var budgetSnapshotService = scope.ServiceProvider.GetRequiredService<IMonthlyBudgetSnapshotService>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var users = userManager.Users.ToList();
        var now = DateTime.UtcNow;
        var isFirstSundayOfMonth = now.DayOfWeek == DayOfWeek.Sunday && now.Day <= 7;

        foreach (var user in users)
        {
            if (ct.IsCancellationRequested) break;

            await TryTakeDailySnapshotAsync(snapshotService, user.Id);

            if (isFirstSundayOfMonth)
                await TryTakeMonthlyBudgetSnapshotAsync(budgetSnapshotService, user.Id, now);
        }
    }

    private async Task TryTakeDailySnapshotAsync(ISnapshotService snapshotService, Guid userId)
    {
        try
        {
            var should = await snapshotService.ShouldTakeSnapshotAsync(userId);
            if (!should) return;

            await snapshotService.TakeSnapshotAsync(userId);
            _logger.LogInformation("Daily net worth snapshot taken for user {UserId}.", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to take daily snapshot for user {UserId}.", userId);
        }
    }

    private async Task TryTakeMonthlyBudgetSnapshotAsync(IMonthlyBudgetSnapshotService budgetSnapshotService, Guid userId, DateTime now)
    {
        // Snapshot the previous month — the current month is still in progress.
        var targetMonth = now.Month == 1 ? 12 : now.Month - 1;
        var targetYear  = now.Month == 1 ? now.Year - 1 : now.Year;

        try
        {
            var should = await budgetSnapshotService.ShouldTakeBudgetSnapshotAsync(userId, targetMonth, targetYear);
            if (!should) return;

            await budgetSnapshotService.TakeBudgetSnapshotAsync(userId, targetMonth, targetYear);
            _logger.LogInformation(
                "Monthly budget snapshot taken for user {UserId} ({Month}/{Year}).",
                userId, targetMonth, targetYear);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to take monthly budget snapshot for user {UserId} ({Month}/{Year}).", userId, targetMonth, targetYear);
        }
    }
}
