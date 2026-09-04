using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Persistence;

public class BabylonDbContext : IdentityDbContext<ApplicationUser, Microsoft.AspNetCore.Identity.IdentityRole<Guid>, Guid>
{
    public BabylonDbContext(DbContextOptions<BabylonDbContext> options) : base(options) { }

    // ââ Reference data ââââââââââââââââââââââââââââââââââââââââââââ
    public DbSet<Bank> Banks => Set<Bank>();

    // ââ Ledger entities âââââââââââââââââââââââââââââââââââââââââââ
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<CreditCard> CreditCards => Set<CreditCard>();
    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<Investment> Investments => Set<Investment>();
    public DbSet<PendingItem> PendingItems => Set<PendingItem>();

    // ââ Income & spending âââââââââââââââââââââââââââââââââââââââââ
    public DbSet<IncomeSource> IncomeSources => Set<IncomeSource>();
    public DbSet<InvestmentIncome> InvestmentIncomes => Set<InvestmentIncome>();
    public DbSet<BudgetCategory> BudgetCategories => Set<BudgetCategory>();
    public DbSet<SpendingTransaction> SpendingTransactions => Set<SpendingTransaction>();
    public DbSet<SpendingCategory> SpendingCategories => Set<SpendingCategory>();
    public DbSet<Purchase> Purchases => Set<Purchase>();

    // ââ Net worth history âââââââââââââââââââââââââââââââââââââââââ
    public DbSet<NetWorthSnapshot> NetWorthSnapshots => Set<NetWorthSnapshot>();
    public DbSet<NetWorthAnnotation> NetWorthAnnotations => Set<NetWorthAnnotation>();
    public DbSet<MonthlyBudgetSnapshot> MonthlyBudgetSnapshots => Set<MonthlyBudgetSnapshot>();

    // ââ Real estate âââââââââââââââââââââââââââââââââââââââââââââââ
    public DbSet<Property> Properties => Set<Property>();

    // ââ Statement imports âââââââââââââââââââââââââââââââââââââââââ
    public DbSet<StatementImport> StatementImports => Set<StatementImport>();
    public DbSet<CheckingStatementImport> CheckingStatementImports => Set<CheckingStatementImport>();

    // ── Projections ──────────────────────────────────────
    public DbSet<Projection> Projections => Set<Projection>();
    public DbSet<ProjectionSnapshot> ProjectionSnapshots => Set<ProjectionSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BabylonDbContext).Assembly);

        // ââ Global soft-delete query filters ââââââââââââââââââââââ
        // AspNetUsers (ApplicationUser) is excluded â Identity manages its own lifecycle.
        // Bank is excluded â seeded reference data is never soft-deleted.
        modelBuilder.Entity<BankAccount>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<CreditCard>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Loan>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Investment>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<PendingItem>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<IncomeSource>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<InvestmentIncome>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<BudgetCategory>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<SpendingTransaction>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<SpendingCategory>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Purchase>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<NetWorthSnapshot>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<NetWorthAnnotation>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<MonthlyBudgetSnapshot>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Property>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<StatementImport>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<CheckingStatementImport>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Projection>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<ProjectionSnapshot>().HasQueryFilter(e => !e.IsDeleted);
    }
}
