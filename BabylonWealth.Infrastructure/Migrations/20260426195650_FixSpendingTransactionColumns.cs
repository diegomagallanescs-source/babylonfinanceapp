using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BabylonWealth.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSpendingTransactionColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "SpendingTransactions");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "SpendingTransactions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AccountId",
                table: "SpendingTransactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "SpendingTransactions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }
    }
}
