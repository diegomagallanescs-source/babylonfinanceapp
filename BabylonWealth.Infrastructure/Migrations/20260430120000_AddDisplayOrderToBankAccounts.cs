using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BabylonWealth.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDisplayOrderToBankAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "BankAccounts",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "BankAccounts");
        }
    }
}
