using BabylonWealth.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class IncomeSourceConfiguration : IEntityTypeConfiguration<IncomeSource>
{
    public void Configure(EntityTypeBuilder<IncomeSource> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(i => i.AnnualAmount)
            .HasPrecision(18, 2);

        builder.Property(i => i.Type)
            .HasConversion<string>()
            .HasMaxLength(50);

        // IsActive lets users deactivate old jobs without deleting history
        builder.Property(i => i.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.HasOne(i => i.User)
            .WithMany()
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
