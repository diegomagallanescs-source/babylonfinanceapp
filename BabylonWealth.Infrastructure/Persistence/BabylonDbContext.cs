using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Persistence;

public class BabylonDbContext : IdentityDbContext<ApplicationUser, Microsoft.AspNetCore.Identity.IdentityRole<Guid>, Guid>
{
    public BabylonDbContext(DbContextOptions<BabylonDbContext> options) : base(options) { }

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
    public DbSet<MonthlyBudgetSnapshot> MonthlyBudgetSnapshots => Set<MonthlyBudgetSnapshot>();

    // ── Real estate ───────────────────────────────────────────────
    public DbSet<Property> Properties => Set<Property>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BabylonDbContext).Assembly);

        // ── Global soft-delete query filters ──────────────────────
        // AspNetUsers (ApplicationUser) is excluded — Identity manages its own lifecycle.
        // Bank is excluded — seeded reference data is never soft-deleted.
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
        modelBuilder.Entity<MonthlyBudgetSnapshot>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Property>().HasQueryFilter(e => !e.IsDeleted);
    }
}
