using BabylonWealth.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BabylonWealth.Infrastructure.Persistence.Configurations;

public class LoanConfiguration : IEntityTypeConfiguration<Loan>
{
    public void Configure(EntityTypeBuilder<Loan> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.CustomLabel)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(l => l.LenderName)
            .HasMaxLength(200);

        // Stored positive — negated in the DTO when displayed as a liability
        builder.Property(l => l.Balance)
            .HasPrecision(18, 2);

        // e.g. 0.115 for 11.5%
        builder.Property(l => l.InterestRate)
            .HasPrecision(6, 4);

        builder.Property(l => l.LoanType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(l => l.CustomFields)
            .HasColumnType("jsonb");
    }
}
