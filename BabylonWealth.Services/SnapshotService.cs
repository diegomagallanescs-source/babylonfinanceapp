using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class SnapshotService : ISnapshotService
{
    private readonly INetWorthService _netWorthService;
    private readonly INetWorthRepository _netWorthRepo;

    public SnapshotService(INetWorthService netWorthService, INetWorthRepository netWorthRepo)
    {
        _netWorthService = netWorthService;
        _netWorthRepo = netWorthRepo;
    }

    public async Task<NetWorthSnapshot> TakeSnapshotAsync(Guid userId)
    {
        var lastDate = await _netWorthRepo.GetLastSnapshotDateAsync(userId);
        if (lastDate.HasValue && lastDate.Value.Date == DateTime.UtcNow.Date)
        {
            var existing = await _netWorthRepo.GetLatestSnapshotAsync(userId);
            return existing!;
        }

        var nw = await _netWorthService.ComputeAsync(userId);

        var snapshot = NetWorthSnapshot.Create(
            userId,
            nw.LiquidNetWorth,
            nw.TotalNetWorth,
            nw.TotalAssets,
            nw.TotalLiabilities,
            nw.TotalCreditUsed,
            nw.TotalCreditLimit,
            nw.PendingItemsNet);

        return await _netWorthRepo.CreateAsync(snapshot);
    }

    public async Task<bool> ShouldTakeSnapshotAsync(Guid userId)
    {
        var lastDate = await _netWorthRepo.GetLastSnapshotDateAsync(userId);
        if (lastDate is null) return true;
        return lastDate.Value.Date < DateTime.UtcNow.Date;
    }

    public async Task AnnotateSnapshotAsync(Guid userId, DateTime annotationDate, string text)
    {
        var target = await FindClosestSnapshotAsync(userId, annotationDate);
        if (target is null) return;
        await _netWorthRepo.AnnotateAsync(target.Id, userId, text);
    }

    public async Task ClearAnnotationAsync(Guid userId, DateTime annotationDate)
    {
        var target = await FindClosestSnapshotAsync(userId, annotationDate);
        if (target is null) return;
        await _netWorthRepo.AnnotateAsync(target.Id, userId, string.Empty);
    }

    /// <summary>
    /// Finds the snapshot that should hold an annotation for the given date:
    ///   1. Exact UTC date match if one exists.
    ///   2. Otherwise the nearest prior snapshot.
    ///   3. Otherwise the earliest snapshot (if the date is older than every snapshot).
    /// </summary>
    private async Task<NetWorthSnapshot?> FindClosestSnapshotAsync(Guid userId, DateTime annotationDate)
    {
        var all = (await _netWorthRepo.GetAllByUserAsync(userId)).ToList();
        if (all.Count == 0) return null;

        var exact = all.FirstOrDefault(s => s.SnapshotDate.Date == annotationDate.Date);
        if (exact is not null) return exact;

        var prior = all
            .Where(s => s.SnapshotDate.Date <= annotationDate.Date)
            .OrderByDescending(s => s.SnapshotDate)
            .FirstOrDefault();
        if (prior is not null) return prior;

        return all.OrderBy(s => s.SnapshotDate).First();
    }

    public async Task<IEnumerable<NetWorthHistoryPointDto>> GetHistoryAsync(Guid userId, DateTime from, DateTime to)
    {
        var snapshots = await _netWorthRepo.GetHistoryAsync(userId, from, to);
        return snapshots.Select(s => new NetWorthHistoryPointDto
        {
            Id             = s.Id,
            SnapshotDate   = s.SnapshotDate,
            LiquidNetWorth = s.LiquidNetWorth,
            TotalNetWorth  = s.TotalNetWorth,
            Annotation     = string.IsNullOrEmpty(s.Annotation) ? null : s.Annotation
        });
    }

    public async Task DeleteSnapshotAsync(Guid userId, Guid snapshotId)
    {
        var snapshot = await _netWorthRepo.GetByIdAsync(snapshotId, userId);
        if (snapshot is null) return;
        await _netWorthRepo.SoftDeleteAsync(snapshotId, userId);
    }

    public async Task UpdateSnapshotAsync(Guid userId, Guid snapshotId, decimal liquidNetWorth, decimal totalNetWorth, DateTime snapshotDate)
    {
        var snapshot = await _netWorthRepo.GetByIdAsync(snapshotId, userId);
        if (snapshot is null) return;
        snapshot.Update(liquidNetWorth, totalNetWorth, DateTime.SpecifyKind(snapshotDate, DateTimeKind.Utc));
        await _netWorthRepo.UpdateAsync(snapshot);
    }
}
