using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class ProjectionConfiguration : IEntityTypeConfiguration<Projection>
{
    public void Configure(EntityTypeBuilder<Projection> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(p => p.Description)
            .HasMaxLength(300)
            .IsRequired(false);

        // jsonb rather than text — adding a field to the ledger shape needs no migration.
        builder.Property(p => p.WorkspaceStateJson)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.HasIndex(p => p.UserId);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
