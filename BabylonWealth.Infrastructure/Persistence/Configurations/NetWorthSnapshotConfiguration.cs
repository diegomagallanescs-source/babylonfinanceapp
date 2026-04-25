using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class NetWorthSnapshotConfiguration : IEntityTypeConfiguration<NetWorthSnapshot>
{
    public void Configure(EntityTypeBuilder<NetWorthSnapshot> builder)
    {
        builder.HasKey(n => n.Id);

        builder.Property(n => n.LiquidNetWorth)
            .HasPrecision(18, 2);

        builder.Property(n => n.TotalNetWorth)
            .HasPrecision(18, 2);

        builder.Property(n => n.TotalAssets)
            .HasPrecision(18, 2);

        builder.Property(n => n.TotalLiabilities)
            .HasPrecision(18, 2);

        builder.Property(n => n.TotalCreditUsed)
            .HasPrecision(18, 2);

        builder.Property(n => n.TotalCreditLimit)
            .HasPrecision(18, 2);

        builder.Property(n => n.TotalPending)
            .HasPrecision(18, 2);

        builder.Property(n => n.Annotation)
            .HasMaxLength(1000);

        // Index on UserId + SnapshotDate — history queries always filter by both
        builder.HasIndex(n => new { n.UserId, n.SnapshotDate });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
