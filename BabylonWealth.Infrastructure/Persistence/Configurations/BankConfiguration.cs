using BabylonWealth.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class BankConfiguration : IEntityTypeConfiguration<Bank>
{
    public void Configure(EntityTypeBuilder<Bank> builder)
    {
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(b => b.Name)
            .IsUnique();

        builder.Property(b => b.LogoUrl)
            .HasMaxLength(1024);

        builder.Property(b => b.SearchAliases)
            .HasMaxLength(500);

        builder.Property(b => b.CountryCode)
            .HasMaxLength(2)
            .HasDefaultValue("US");

        // Enum stored as string — adding new BankType values never corrupts existing rows
        builder.Property(b => b.Type)
            .HasConversion<string>()
            .HasMaxLength(50);
    }
}
