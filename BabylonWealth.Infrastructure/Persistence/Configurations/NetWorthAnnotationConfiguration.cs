using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class NetWorthAnnotationConfiguration : IEntityTypeConfiguration<NetWorthAnnotation>
{
    public void Configure(EntityTypeBuilder<NetWorthAnnotation> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Text)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(a => a.AnnotationDate)
            .IsRequired();

        // Optional FK to a snapshot — annotations can exist on dates with no snapshot
        builder.HasOne(a => a.Snapshot)
            .WithMany()
            .HasForeignKey(a => a.SnapshotId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // One annotation per user per date — enforced at DB level
        builder.HasIndex(a => new { a.UserId, a.AnnotationDate })
            .IsUnique();
    }
}
