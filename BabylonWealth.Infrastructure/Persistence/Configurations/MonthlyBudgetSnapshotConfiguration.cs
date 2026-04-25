using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class MonthlyBudgetSnapshotConfiguration : IEntityTypeConfiguration<MonthlyBudgetSnapshot>
{
    public void Configure(EntityTypeBuilder<MonthlyBudgetSnapshot> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.TotalIncome).HasPrecision(18, 2);
        builder.Property(m => m.TotalSpending).HasPrecision(18, 2);
        builder.Property(m => m.TotalInvested).HasPrecision(18, 2);
        builder.Property(m => m.SavingsRate).HasPrecision(6, 4);

        // One snapshot per user per month — enforced at DB level
        builder.HasIndex(m => new { m.UserId, m.Year, m.Month }).IsUnique();

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
