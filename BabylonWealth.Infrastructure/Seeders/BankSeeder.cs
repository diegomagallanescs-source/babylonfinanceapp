using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BabylonWealth.Infrastructure.Seeders;

public static class BankSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<BabylonDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<BabylonDbContext>>();

        if (await context.Banks.AnyAsync())
            return;

        logger.LogInformation("Seeding banks table...");

        const string clearbit = "https://logo.clearbit.com";

        var banks = new List<Bank>
        {
            // ── Major US Banks ────────────────────────────────────────────────────
            Bank.Create("Chase",                      BankType.Both,     $"{clearbit}/chase.com",                  "jpmorgan,jp morgan,jpmc"),
            Bank.Create("Bank of America",            BankType.Both,     $"{clearbit}/bankofamerica.com",          "boa,bofa,bankofamerica"),
            Bank.Create("Wells Fargo",                BankType.Both,     $"{clearbit}/wellsfargo.com",             "wf,wells"),
            Bank.Create("Citibank",                   BankType.Both,     $"{clearbit}/citibank.com",               "citi,citigroup"),
            Bank.Create("US Bank",                    BankType.Both,     $"{clearbit}/usbank.com",                 "usbank,us bancorp"),
            Bank.Create("PNC Bank",                   BankType.Both,     $"{clearbit}/pnc.com",                    "pnc"),
            Bank.Create("TD Bank",                    BankType.Both,     $"{clearbit}/td.com",                     "td,toronto dominion"),
            Bank.Create("Truist",                     BankType.Both,     $"{clearbit}/truist.com",                 "bb&t,suntrust"),
            Bank.Create("Capital One",                BankType.Both,     $"{clearbit}/capitalone.com",             "cap1,capitalone,cap one"),
            Bank.Create("Regions Bank",               BankType.Both,     $"{clearbit}/regions.com",                "regions"),
            Bank.Create("Fifth Third Bank",           BankType.Both,     $"{clearbit}/53.com",                     "53,fifth third"),
            Bank.Create("KeyBank",                    BankType.Both,     $"{clearbit}/key.com",                    "key bank,keycorp"),
            Bank.Create("BMO Harris",                 BankType.Both,     $"{clearbit}/bmoharris.com",              "bmo,harris bank"),
            Bank.Create("Santander",                  BankType.Both,     $"{clearbit}/santander.com",              "santander us"),
            Bank.Create("M&T Bank",                   BankType.Both,     $"{clearbit}/mtb.com",                    "m and t,manufacturers traders"),
            Bank.Create("HSBC",                       BankType.Both,     $"{clearbit}/hsbc.com",                   "hongkong shanghai banking"),

            // ── Credit Cards / Charge Cards ──────────────────────────────────────
            Bank.Create("American Express",           BankType.Both,     $"{clearbit}/americanexpress.com",        "amex,americanexpress"),
            Bank.Create("Discover",                   BankType.Both,     $"{clearbit}/discover.com",               "discover card"),

            // ── Online / Neo Banks ────────────────────────────────────────────────
            Bank.Create("SoFi",                       BankType.Both,     $"{clearbit}/sofi.com",                   "social finance"),
            Bank.Create("Ally Bank",                  BankType.Personal, $"{clearbit}/ally.com",                   "ally financial"),
            Bank.Create("Marcus by Goldman Sachs",    BankType.Personal, $"{clearbit}/marcus.com",                 "marcus,goldman sachs savings"),
            Bank.Create("USAA",                       BankType.Personal, $"{clearbit}/usaa.com",                   "united services automobile"),
            Bank.Create("Navy Federal Credit Union",  BankType.Personal, $"{clearbit}/navyfederal.org",            "nfcu,navy federal"),
            Bank.Create("Chime",                      BankType.Personal, $"{clearbit}/chime.com",                  "chime bank"),

            // ── Brokerages & Investment Platforms ────────────────────────────────
            Bank.Create("Fidelity",                   BankType.Both,     $"{clearbit}/fidelity.com",               "fidelity investments"),
            Bank.Create("Vanguard",                   BankType.Both,     $"{clearbit}/vanguard.com",               "vanguard group"),
            Bank.Create("Charles Schwab",             BankType.Both,     $"{clearbit}/schwab.com",                 "schwab"),
            Bank.Create("TD Ameritrade",              BankType.Both,     $"{clearbit}/tdameritrade.com",           "tda,ameritrade"),
            Bank.Create("E*TRADE",                    BankType.Both,     $"{clearbit}/etrade.com",                 "etrade,morgan stanley etrade"),
            Bank.Create("Merrill Lynch",              BankType.Both,     $"{clearbit}/ml.com",                     "merrill,merrill edge,bank of america merrill"),
            Bank.Create("Interactive Brokers",        BankType.Both,     $"{clearbit}/interactivebrokers.com",     "ibkr,ib,interactivebrokers"),
            Bank.Create("Robinhood",                  BankType.Personal, $"{clearbit}/robinhood.com",              "rh"),
            Bank.Create("Wealthfront",                BankType.Personal, $"{clearbit}/wealthfront.com",            "wf robo"),
            Bank.Create("Betterment",                 BankType.Personal, $"{clearbit}/betterment.com",             "betterment invest"),
        };

        context.Banks.AddRange(banks);
        await context.SaveChangesAsync();

        logger.LogInformation("Seeded {Count} banks successfully.", banks.Count);
    }
}
