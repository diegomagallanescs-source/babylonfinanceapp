using BabylonWealth.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class InvestmentIncomeConfiguration : IEntityTypeConfiguration<InvestmentIncome>
{
    public void Configure(EntityTypeBuilder<InvestmentIncome> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.SourceName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(i => i.Amount)
            .HasPrecision(18, 2);

        builder.Property(i => i.Type)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(i => i.Notes)
            .HasMaxLength(500);

        // Composite index on UserId + ReceivedDate powers the monthly aggregation queries
        builder.HasIndex(i => new { i.UserId, i.ReceivedDate });

        builder.HasOne(i => i.User)
            .WithMany()
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
