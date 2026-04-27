using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class StatementImportConfiguration : IEntityTypeConfiguration<StatementImport>
{
    public void Configure(EntityTypeBuilder<StatementImport> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Month).IsRequired();
        builder.Property(s => s.Year).IsRequired();

        builder.Property(s => s.TotalSpend)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.TransactionCount).IsRequired();

        builder.Property(s => s.AccountsIncluded)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.Notes)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.HasIndex(s => new { s.UserId, s.Year, s.Month });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
