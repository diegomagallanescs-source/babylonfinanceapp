using System.Text.Json;
using BabylonWealth.Core.Entities;
using BabylonWealth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class BankAccountConfiguration : IEntityTypeConfiguration<BankAccount>
{
    public void Configure(EntityTypeBuilder<BankAccount> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.CustomLabel)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.Balance)
            .HasPrecision(18, 2);

        builder.Property(a => a.Notes)
            .HasMaxLength(1000);

        // Enum as string
        builder.Property(a => a.AccountType)
            .HasConversion<string>()
            .HasMaxLength(50);

        // Relationship: many accounts → one user
        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Relationship: many accounts → one bank (optional — user might not pick from seeded list)
        builder.HasOne(a => a.Bank)
            .WithMany()
            .HasForeignKey(a => a.BankId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        // Relationship: many accounts → one budget category (optional)
        builder.HasOne(a => a.BudgetCategory)
            .WithMany()
            .HasForeignKey(a => a.BudgetCategoryId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        // jsonb column — arbitrary key-value metadata without schema changes.
        // Explicit value converter keeps this working for both Npgsql and InMemory providers.
        builder.Property(a => a.CustomFields)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new()
            )
            .HasColumnType("jsonb");
    }
}
