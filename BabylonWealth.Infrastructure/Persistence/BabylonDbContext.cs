using BabylonWealth.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Persistence;

/// <summary>
/// The single EF Core DbContext for the entire application.
/// All entity access flows through here — no raw SQL, no second DbContext.
///
/// Two things this class is responsible for:
///   1. Declaring every DbSet so EF Core knows which tables to manage.
///   2. Applying all entity configurations (via ApplyConfigurationsFromAssembly)
///      and the global soft-delete query filter so deleted records are
///      automatically excluded from every query without any caller needing to
///      remember to add .Where(e => !e.IsDeleted).
/// </summary>
public class BabylonDbContext : DbContext
{
    public BabylonDbContext(DbContextOptions<BabylonDbContext> options) : base(options) { }

    // ── User ──────────────────────────────────────────────────────
    public DbSet<User> Users => Set<User>();

    // ── Reference data ────────────────────────────────────────────
    public DbSet<Bank> Banks => Set<Bank>();

    // ── Ledger entities ───────────────────────────────────────────
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<CreditCard> CreditCards => Set<CreditCard>();
    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<Investment> Investments => Set<Investment>();
    public DbSet<PendingItem> PendingItems => Set<PendingItem>();

    // ── Income & spending ─────────────────────────────────────────
    public DbSet<IncomeSource> IncomeSources => Set<IncomeSource>();
    public DbSet<InvestmentIncome> InvestmentIncomes => Set<InvestmentIncome>();
    public DbSet<BudgetCategory> BudgetCategories => Set<BudgetCategory>();
    public DbSet<SpendingTransaction> SpendingTransactions => Set<SpendingTransaction>();

    // ── Net worth history ─────────────────────────────────────────
    public DbSet<NetWorthSnapshot> NetWorthSnapshots => Set<NetWorthSnapshot>();
    public DbSet<NetWorthAnnotation> NetWorthAnnotations => Set<NetWorthAnnotation>();

    // ── Real estate ───────────────────────────────────────────────
    public DbSet<Property> Properties => Set<Property>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Scans this assembly for every class that implements IEntityTypeConfiguration<T>
        // and applies them all. This keeps OnModelCreating clean — one line instead of hundreds.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BabylonDbContext).Assembly);

        // ── Global soft-delete query filter ───────────────────────
        // Applied to every entity that extends BaseEntity.
        // After this, every query automatically appends WHERE "IsDeleted" = false.
        // No repository method ever needs to manually filter on IsDeleted.
        //
        // IMPORTANT: if you ever need to query soft-deleted records (e.g. audit logs),
        // use .IgnoreQueryFilters() on that specific query.
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<BankAccount>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<CreditCard>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Loan>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Investment>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<PendingItem>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<IncomeSource>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<InvestmentIncome>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<BudgetCategory>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<SpendingTransaction>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<NetWorthSnapshot>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<NetWorthAnnotation>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Property>().HasQueryFilter(e => !e.IsDeleted);
        // Note: Bank intentionally excluded — seeded reference data is never soft-deleted.
    }
}