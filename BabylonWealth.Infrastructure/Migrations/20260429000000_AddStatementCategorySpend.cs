using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BabylonWealth.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatementCategorySpend : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "NecessitiesSpend",
                table: "StatementImports",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TravelSpend",
                table: "StatementImports",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SavingsSpend",
                table: "StatementImports",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShoppingSpend",
                table: "StatementImports",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OtherSpend",
                table: "StatementImports",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "NecessitiesSpend", table: "StatementImports");
            migrationBuilder.DropColumn(name: "TravelSpend",       table: "StatementImports");
            migrationBuilder.DropColumn(name: "SavingsSpend",      table: "StatementImports");
            migrationBuilder.DropColumn(name: "ShoppingSpend",     table: "StatementImports");
            migrationBuilder.DropColumn(name: "OtherSpend",        table: "StatementImports");
        }
    }
}
