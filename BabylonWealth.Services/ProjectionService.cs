using System.Text.Json;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

/// <summary>
/// Owns everything under the Projections tab. A projection carries its own private copy of the
/// ledger, so this service never reads or writes the real account tables — the seed ledger
/// arrives from the client and every later edit is stored back as opaque JSON.
/// </summary>
public class ProjectionService : IProjectionService
{
    private readonly IProjectionRepository _repo;
    private readonly IProjectionSnapshotRepository _snapshotRepo;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public ProjectionService(IProjectionRepository repo, IProjectionSnapshotRepository snapshotRepo)
    {
        _repo = repo;
        _snapshotRepo = snapshotRepo;
    }

    public async Task<IEnumerable<ProjectionSummaryDto>> GetAllAsync(Guid userId)
    {
        var projections = await _repo.GetAllOrderedAsync(userId);
        var snapshots = (await _snapshotRepo.GetAllForUserAsync(userId)).ToList();

        return projections.Select(p =>
        {
            var mine = snapshots.Where(s => s.ProjectionId == p.Id).ToList();
            return BuildSummary(p, mine);
        });
    }

    public async Task<ProjectionDetailResponseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var projection = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("Projection", id);

        var snapshots = await _snapshotRepo.GetByProjectionAsync(userId, id);

        return new ProjectionDetailResponseDto
        {
            Id = projection.Id,
            Name = projection.Name,
            Description = projection.Description,
            Workspace = Deserialize(projection.WorkspaceStateJson),
            Snapshots = snapshots.Select(MapSnapshot).ToList(),
            CreatedAt = projection.CreatedAt,
            UpdatedAt = projection.UpdatedAt
        };
    }

    public async Task<ProjectionDetailResponseDto> CreateAsync(Guid userId, CreateProjectionRequest request)
    {
        ValidateDetails(request.Name, request.Description);

        var state = Normalize(request.State ?? new ProjectionStateDto());
        var entity = Projection.Create(userId, request.Name.Trim(), Trim(request.Description), Serialize(state));
        var saved = await _repo.CreateAsync(entity);

        return new ProjectionDetailResponseDto
        {
            Id = saved.Id,
            Name = saved.Name,
            Description = saved.Description,
            Workspace = state,
            Snapshots = new List<ProjectionSnapshotResponseDto>(),
            CreatedAt = saved.CreatedAt,
            UpdatedAt = saved.UpdatedAt
        };
    }

    public async Task<ProjectionSummaryDto> UpdateAsync(Guid id, Guid userId, UpdateProjectionRequest request)
    {
        ValidateDetails(request.Name, request.Description);

        var projection = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("Projection", id);

        projection.UpdateDetails(request.Name.Trim(), Trim(request.Description));
        await _repo.UpdateAsync(projection);

        var snapshots = (await _snapshotRepo.GetByProjectionAsync(userId, id)).ToList();
        return BuildSummary(projection, snapshots);
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        _ = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("Projection", id);

        // Snapshots first — otherwise they stay live and keep showing up in GetAllForUserAsync.
        await _snapshotRepo.SoftDeleteByProjectionAsync(userId, id);
        await _repo.SoftDeleteAsync(id, userId);
    }

    public async Task SaveWorkspaceAsync(Guid id, Guid userId, SaveProjectionWorkspaceRequest request)
    {
        var projection = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("Projection", id);

        projection.UpdateWorkspace(Serialize(request.State ?? new ProjectionStateDto()));
        await _repo.UpdateAsync(projection);
    }

    public async Task<ProjectionSnapshotResponseDto> AddSnapshotAsync(
        Guid id, Guid userId, CreateProjectionSnapshotRequest request)
    {
        var projection = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("Projection", id);

        if (request.SnapshotDate == default)
            throw new ValidationException("A snapshot date is required.");

        if (request.Notes is { Length: > 1000 })
            throw new ValidationException("Notes must be 1000 characters or fewer.");

        // Falls back to the stored workspace so a snapshot can be taken without resending the ledger.
        var state = Normalize(request.State ?? Deserialize(projection.WorkspaceStateJson));
        var totals = ComputeNetWorth(state);
        var date = NormalizeDate(request.SnapshotDate);
        var stateJson = Serialize(state);

        // One point per date per line: re-saving the same date and kind moves that point rather
        // than hiding a duplicate behind it that the chart could never surface.
        var existing = await _snapshotRepo.GetByDateAndKindAsync(userId, id, date, request.Kind);
        if (existing is not null)
        {
            existing.Update(
                date,
                request.Kind,
                Trim(request.Notes),
                totals.Liquid,
                totals.Total,
                totals.Assets,
                totals.Liabilities,
                stateJson);

            await _snapshotRepo.UpdateAsync(existing);
            return MapSnapshot(existing);
        }

        var entity = ProjectionSnapshot.Create(
            userId,
            id,
            date,
            request.Kind,
            Trim(request.Notes),
            totals.Liquid,
            totals.Total,
            totals.Assets,
            totals.Liabilities,
            stateJson);

        var saved = await _snapshotRepo.CreateAsync(entity);
        return MapSnapshot(saved);
    }

    public async Task DeleteSnapshotAsync(Guid id, Guid snapshotId, Guid userId)
    {
        _ = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException("Projection", id);

        var snapshot = await _snapshotRepo.GetByIdAsync(snapshotId, userId);
        if (snapshot is null || snapshot.ProjectionId != id)
            throw new NotFoundException("ProjectionSnapshot", snapshotId);

        await _snapshotRepo.SoftDeleteAsync(snapshotId, userId);
    }

    // ── Net worth ─────────────────────────────────────────────────

    /// <summary>
    /// Mirrors NetWorthService.ComputeAsync, but sums the projection ledger instead of the
    /// database. Pending items count toward net worth only while they are still Pending.
    /// </summary>
    public static (decimal Assets, decimal Liabilities, decimal Liquid, decimal Total) ComputeNetWorth(
        ProjectionStateDto state)
    {
        var accountBalance = state.Accounts.Sum(a => a.Balance);
        var investmentValue = state.Investments.Sum(i => i.CurrentValue);
        var creditUsed = state.CreditCards.Sum(c => c.Balance);
        var loanBalance = state.Loans.Sum(l => l.Balance);

        var pendingNet = state.PendingItems
            .Where(p => !string.Equals(p.Status, "Settled", StringComparison.OrdinalIgnoreCase))
            .Sum(p => p.Amount);

        var propertyEquity = state.Properties.Sum(p => p.CurrentEstimatedValue - p.LoanBalance);

        var pendingAsset = pendingNet > 0 ? pendingNet : 0m;
        var pendingLiability = pendingNet < 0 ? -pendingNet : 0m;

        var assets = accountBalance + investmentValue + pendingAsset;
        var liabilities = creditUsed + loanBalance + pendingLiability;
        var liquid = assets - liabilities;

        return (assets, liabilities, liquid, liquid + propertyEquity);
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static ProjectionSummaryDto BuildSummary(Projection p, List<ProjectionSnapshot> snapshots)
    {
        var latest = snapshots.OrderByDescending(s => s.SnapshotDate).FirstOrDefault();

        return new ProjectionSummaryDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            SnapshotCount = snapshots.Count,
            ProjectedCount = snapshots.Count(s => s.Kind == ProjectionSnapshotKind.Projected),
            RealizedCount = snapshots.Count(s => s.Kind == ProjectionSnapshotKind.Realized),
            LatestSnapshotDate = latest?.SnapshotDate,
            LatestTotalNetWorth = latest?.TotalNetWorth,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };
    }

    private static void ValidateDetails(string? name, string? description)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationException("A projection name is required.");

        if (name.Trim().Length > 120)
            throw new ValidationException("Projection name must be 120 characters or fewer.");

        if (description is { Length: > 300 })
            throw new ValidationException("Description must be 300 characters or fewer.");
    }

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Npgsql rejects non-UTC DateTimes on timestamptz columns; the picker sends a plain date.</summary>
    private static DateTime NormalizeDate(DateTime date) =>
        DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

    /// <summary>
    /// A projection ledger carries debt as a positive number, matching NetWorthService. The
    /// /loans endpoint negates the balance for display, so a ledger seeded from it arrives with
    /// negative loans that subtract from liabilities instead of adding to them. Applied on every
    /// read and write so no path can reintroduce the wrong sign. Idempotent.
    /// </summary>
    private static ProjectionStateDto Normalize(ProjectionStateDto state)
    {
        foreach (var loan in state.Loans)
            loan.Balance = Math.Abs(loan.Balance);

        return state;
    }

    private static string Serialize(ProjectionStateDto state) =>
        JsonSerializer.Serialize(Normalize(state), JsonOptions);

    private static ProjectionStateDto Deserialize(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new ProjectionStateDto();
        return Normalize(JsonSerializer.Deserialize<ProjectionStateDto>(json, JsonOptions) ?? new ProjectionStateDto());
    }

    private static ProjectionSnapshotResponseDto MapSnapshot(ProjectionSnapshot s) =>
        new()
        {
            Id = s.Id,
            ProjectionId = s.ProjectionId,
            SnapshotDate = s.SnapshotDate,
            Kind = s.Kind,
            Notes = s.Notes,
            LiquidNetWorth = s.LiquidNetWorth,
            TotalNetWorth = s.TotalNetWorth,
            TotalAssets = s.TotalAssets,
            TotalLiabilities = s.TotalLiabilities,
            State = Deserialize(s.StateJson),
            CreatedAt = s.CreatedAt
        };
}
