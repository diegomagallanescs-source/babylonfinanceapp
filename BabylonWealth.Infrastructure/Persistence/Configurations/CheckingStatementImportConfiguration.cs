using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class CheckingStatementImportConfiguration : IEntityTypeConfiguration<CheckingStatementImport>
{
    public void Configure(EntityTypeBuilder<CheckingStatementImport> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Month).IsRequired();
        builder.Property(c => c.Year).IsRequired();

        builder.Property(c => c.TotalMoneyIn)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(c => c.TotalMoneyOut)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(c => c.TransactionCount).IsRequired();

        builder.Property(c => c.AccountsIncluded)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.Notes)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.HasIndex(c => new { c.UserId, c.Year, c.Month });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
