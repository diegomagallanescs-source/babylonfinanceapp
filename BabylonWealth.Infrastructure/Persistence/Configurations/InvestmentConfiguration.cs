using System.Text.Json;
using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class InvestmentConfiguration : IEntityTypeConfiguration<Investment>
{
    public void Configure(EntityTypeBuilder<Investment> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.CustomLabel)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(i => i.CurrentValue)
            .HasPrecision(18, 2);

        // Ticker is optional — not all investments have one (e.g. a savings bond)
        builder.Property(i => i.Ticker)
            .HasMaxLength(20);

        builder.Property(i => i.InvestmentType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.Bank)
            .WithMany()
            .HasForeignKey(i => i.BankId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.Property(i => i.CustomFields)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new()
            )
            .HasColumnType("jsonb");
    }
}
