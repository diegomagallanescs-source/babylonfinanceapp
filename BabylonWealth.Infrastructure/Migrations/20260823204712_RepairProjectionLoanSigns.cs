using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BabylonWealth.Infrastructure.Migrations
{
    /// <summary>
    /// Data repair, no schema change.
    ///
    /// A projection ledger carries debt as a positive number, matching NetWorthService. New
    /// projections were seeded from GET /loans, which negates the balance for display, so seeded
    /// loans landed negative and subtracted from liabilities instead of adding to them. Every
    /// affected projection understated its liabilities — and overstated its net worth — by twice
    /// the loan total, in the workspace and in every snapshot saved from it.
    ///
    /// This flips those stored balances back to positive and recomputes the snapshot money
    /// columns from the corrected ledger, using the same formula as ProjectionService
    /// .ComputeNetWorth. Projections with no loans, or already-correct ones, are untouched.
    /// </summary>
    public partial class RepairProjectionLoanSigns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Editable ledgers ──────────────────────────────────────────
            migrationBuilder.Sql("""
                UPDATE "Projections" p
                SET "WorkspaceStateJson" = jsonb_set(
                        p."WorkspaceStateJson",
                        '{loans}',
                        COALESCE((
                            SELECT jsonb_agg(
                                       jsonb_set(l, '{balance}', to_jsonb(abs((l->>'balance')::numeric)))
                                       ORDER BY ord)
                            FROM jsonb_array_elements(p."WorkspaceStateJson"->'loans') WITH ORDINALITY AS t(l, ord)
                        ), '[]'::jsonb))
                WHERE jsonb_typeof(p."WorkspaceStateJson"->'loans') = 'array'
                  AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(p."WorkspaceStateJson"->'loans') l
                        WHERE (l->>'balance')::numeric < 0);
                """);

            // ── 2. Frozen ledgers on each chart point ────────────────────────
            migrationBuilder.Sql("""
                UPDATE "ProjectionSnapshots" s
                SET "StateJson" = jsonb_set(
                        s."StateJson",
                        '{loans}',
                        COALESCE((
                            SELECT jsonb_agg(
                                       jsonb_set(l, '{balance}', to_jsonb(abs((l->>'balance')::numeric)))
                                       ORDER BY ord)
                            FROM jsonb_array_elements(s."StateJson"->'loans') WITH ORDINALITY AS t(l, ord)
                        ), '[]'::jsonb))
                WHERE jsonb_typeof(s."StateJson"->'loans') = 'array'
                  AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(s."StateJson"->'loans') l
                        WHERE (l->>'balance')::numeric < 0);
                """);

            // ── 3. Recompute the plotted figures from the corrected ledgers ──
            // Mirrors ProjectionService.ComputeNetWorth: pending items count only while Pending,
            // a positive net is an asset and a negative one a liability, and property equity
            // lifts total net worth without touching the liquid figure.
            migrationBuilder.Sql("""
                UPDATE "ProjectionSnapshots" s
                SET "TotalAssets"      = c.assets,
                    "TotalLiabilities" = c.liabilities,
                    "LiquidNetWorth"   = c.assets - c.liabilities,
                    "TotalNetWorth"    = c.assets - c.liabilities + c.equity
                FROM (
                    SELECT s2."Id" AS id,
                           v.cash + v.investments + GREATEST(v.pending, 0)  AS assets,
                           v.cards + v.loans + GREATEST(-v.pending, 0)      AS liabilities,
                           v.equity
                    FROM "ProjectionSnapshots" s2,
                    LATERAL (
                        SELECT
                            COALESCE((SELECT SUM((e->>'balance')::numeric)
                                      FROM jsonb_array_elements(COALESCE(s2."StateJson"->'accounts', '[]'::jsonb)) e), 0)     AS cash,
                            COALESCE((SELECT SUM((e->>'currentValue')::numeric)
                                      FROM jsonb_array_elements(COALESCE(s2."StateJson"->'investments', '[]'::jsonb)) e), 0)  AS investments,
                            COALESCE((SELECT SUM((e->>'balance')::numeric)
                                      FROM jsonb_array_elements(COALESCE(s2."StateJson"->'creditCards', '[]'::jsonb)) e), 0)  AS cards,
                            COALESCE((SELECT SUM((e->>'balance')::numeric)
                                      FROM jsonb_array_elements(COALESCE(s2."StateJson"->'loans', '[]'::jsonb)) e), 0)        AS loans,
                            -- lower() so this matches ComputeNetWorth, which compares the status
                            -- case-insensitively.
                            COALESCE((SELECT SUM((e->>'amount')::numeric)
                                      FROM jsonb_array_elements(COALESCE(s2."StateJson"->'pendingItems', '[]'::jsonb)) e
                                      WHERE lower(COALESCE(e->>'status', 'Pending')) <> 'settled'), 0)                        AS pending,
                            COALESCE((SELECT SUM((e->>'currentEstimatedValue')::numeric - (e->>'loanBalance')::numeric)
                                      FROM jsonb_array_elements(COALESCE(s2."StateJson"->'properties', '[]'::jsonb)) e), 0)   AS equity
                    ) v
                    WHERE jsonb_typeof(s2."StateJson") = 'object'
                ) c
                WHERE s."Id" = c.id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Deliberately empty. The old values were wrong; re-negating them would only
            // restore the miscalculation, and the original signs are not recoverable anyway.
        }
    }
}
