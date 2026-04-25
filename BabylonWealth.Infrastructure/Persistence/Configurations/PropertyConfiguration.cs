using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Address)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(p => p.PurchasePrice)
            .HasPrecision(18, 2);

        builder.Property(p => p.CurrentEstimatedValue)
            .HasPrecision(18, 2);

        builder.Property(p => p.LoanBalance)
            .HasPrecision(18, 2);

        // e.g. 0.065 for 6.5%
        builder.Property(p => p.InterestRate)
            .HasPrecision(6, 4);

        builder.Property(p => p.MonthlyRent)
            .HasPrecision(18, 2);

        builder.Property(p => p.MonthlyExpenses)
            .HasPrecision(18, 2);

        builder.Property(p => p.LoanType)
            .HasConversion<string>()
            .HasMaxLength(50);

        // Tracks when the user last updated the estimated value
        builder.Property(p => p.LastValueUpdatedAt)
            .IsRequired(false);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
