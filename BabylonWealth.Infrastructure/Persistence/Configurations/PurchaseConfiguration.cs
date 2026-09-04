using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class PurchaseConfiguration : IEntityTypeConfiguration<Purchase>
{
    public void Configure(EntityTypeBuilder<Purchase> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Description)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(p => p.Amount)
            .HasPrecision(18, 2);

        // Composite index — GetByMonthAsync is the hottest query on this table
        builder.HasIndex(p => new { p.UserId, p.PurchaseDate });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Category is required — every purchase must be categorized
        builder.HasOne(p => p.SpendingCategory)
            .WithMany()
            .HasForeignKey(p => p.SpendingCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
