using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class PendingItemConfiguration : IEntityTypeConfiguration<PendingItem>
{
    public void Configure(EntityTypeBuilder<PendingItem> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Description)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(p => p.Counterparty)
            .HasMaxLength(200);

        // Positive = owed to user, negative = user owes.
        // Both directions use the same column — the sign is the meaning.
        builder.Property(p => p.Amount)
            .HasPrecision(18, 2);

        builder.Property(p => p.Status)
            .HasConversion<string>()
            .HasMaxLength(50);

        // SettledAt is null until the item is settled — index helps filter active items fast
        builder.Property(p => p.SettledAt)
            .IsRequired(false);

        builder.HasIndex(p => new { p.UserId, p.Status });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
