using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class ProjectionSnapshotConfiguration : IEntityTypeConfiguration<ProjectionSnapshot>
{
    public void Configure(EntityTypeBuilder<ProjectionSnapshot> builder)
    {
        builder.HasKey(s => s.Id);

        // Stored as text so the two lines survive any future reordering of the enum.
        builder.Property(s => s.Kind)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(s => s.Notes)
            .HasMaxLength(1000)
            .IsRequired(false);

        builder.Property(s => s.LiquidNetWorth).HasPrecision(18, 2);
        builder.Property(s => s.TotalNetWorth).HasPrecision(18, 2);
        builder.Property(s => s.TotalAssets).HasPrecision(18, 2);
        builder.Property(s => s.TotalLiabilities).HasPrecision(18, 2);

        builder.Property(s => s.StateJson)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.HasIndex(s => new { s.UserId, s.ProjectionId, s.SnapshotDate });

        builder.HasOne<Projection>()
            .WithMany()
            .HasForeignKey(s => s.ProjectionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
