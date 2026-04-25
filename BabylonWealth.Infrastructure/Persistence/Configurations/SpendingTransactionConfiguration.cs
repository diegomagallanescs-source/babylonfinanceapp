using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class SpendingTransactionConfiguration : IEntityTypeConfiguration<SpendingTransaction>
{
    public void Configure(EntityTypeBuilder<SpendingTransaction> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Description)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(s => s.Amount)
            .HasPrecision(18, 2);

        // Composite index — GetByMonthAsync is the hottest query on this table
        builder.HasIndex(s => new { s.UserId, s.TransactionDate });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Category is required — every transaction must be categorized
        builder.HasOne(s => s.BudgetCategory)
            .WithMany()
            .HasForeignKey(s => s.BudgetCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Account is optional — user might log cash spending with no linked account
        builder.HasOne(s => s.BankAccount)
            .WithMany()
            .HasForeignKey(s => s.BankAccountId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
