using System.Text.Json;
using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class CreditCardConfiguration : IEntityTypeConfiguration<CreditCard>
{
    public void Configure(EntityTypeBuilder<CreditCard> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.CustomLabel)
            .IsRequired()
            .HasMaxLength(200);

        // Balance stored as positive — rendered negative in the DTO as a liability
        builder.Property(c => c.Balance)
            .HasPrecision(18, 2);

        builder.Property(c => c.CreditLimit)
            .HasPrecision(18, 2);

        // e.g. 0.2499 for 24.99% APR
        builder.Property(c => c.APR)
            .HasPrecision(6, 4);

        builder.Property(c => c.Notes)
            .HasMaxLength(1000);

        builder.Property(c => c.CardType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Bank)
            .WithMany()
            .HasForeignKey(c => c.BankId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.Property(c => c.CustomFields)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new()
            )
            .HasColumnType("jsonb");
    }
}
