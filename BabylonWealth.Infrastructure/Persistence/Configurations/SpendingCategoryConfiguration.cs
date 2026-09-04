using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class SpendingCategoryConfiguration : IEntityTypeConfiguration<SpendingCategory>
{
    public void Configure(EntityTypeBuilder<SpendingCategory> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Color)
            .HasMaxLength(7); // hex string e.g. #C9A84C

        builder.Property(c => c.DisplayOrder)
            .IsRequired();

        builder.HasIndex(c => new { c.UserId, c.Name }).IsUnique();

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
