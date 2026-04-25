**✦ BABYLON WEALTH ✦**

**Railway Deployment Guide**

*From local machine to live URL --- step by step.*

  --------------------- --------------------------------- ----------------
  **Platform**          **What it hosts**                 **Cost**

  Railway               ASP.NET Core API + PostgreSQL     Free tier /
                        database                          \~\$5/mo

  Vercel                React frontend (static build)     Free forever

  GitHub                Source code --- triggers          Free
                        auto-deploys                      
  --------------------- --------------------------------- ----------------

> *Prerequisites: GitHub account, Railway account (railway.app), Vercel
> account (vercel.com), Node 20+, .NET 8 SDK, Git installed locally.*

**PHASE 1 --- Repository & Cloud Setup (Days 1--2)**

+-----------------------------------------------------------------------+
| **Day 1 --- GitHub Repo + Railway Project**                           |
|                                                                       |
| *Goal: Railway project created, GitHub repo connected, PostgreSQL     |
| provisioned*                                                          |
+-----------------------------------------------------------------------+

**Step 1 --- Push your code to GitHub**

If your project isn\'t on GitHub yet, initialize and push it now.

cd /path/to/BabylonWealth

git init

git add .

git commit -m \"Initial commit --- Babylon Wealth v1\"

git branch -M main

git remote add origin
https://github.com/YOUR_USERNAME/babylon-wealth.git

git push -u origin main

**Step 2 --- Create a Railway account and project**

- Go to railway.app and sign in with GitHub

- Click New Project → Deploy from GitHub repo

- Select your babylon-wealth repository

- Railway will auto-detect it. Do NOT let it deploy yet --- click
  Configure first

**Step 3 --- Add a PostgreSQL database**

- Inside your Railway project, click + New → Database → Add PostgreSQL

- Railway provisions a managed PostgreSQL instance in under 60 seconds

- Click on the PostgreSQL service → Variables tab

- Copy the DATABASE_URL value --- you will need this in Day 2

> *Railway\'s DATABASE_URL format:
> postgresql://USER:PASSWORD@HOST:PORT/railway --- this is the
> connection string your API will use in production.*

**Step 4 --- Note your Railway environment variables panel**

In your Railway project, select your API service → Variables tab. This
is where you will paste all secrets in Day 2. Leave it open.

+-----------------------------------------------------------------------+
| **Day 2 --- PostgreSQL Connection + EF Core Migration**               |
|                                                                       |
| *Goal: API connects to Railway PostgreSQL, migrations applied,        |
| database ready*                                                       |
+-----------------------------------------------------------------------+

**Step 1 --- Install Npgsql EF Core provider**

In your BabylonWealth.Infrastructure project:

dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL

**Step 2 --- Swap the database provider**

In Infrastructure/Extensions/InfrastructureExtensions.cs, change:

// REMOVE:

options.UseSqlite(connectionString)

// REPLACE WITH:

options.UseNpgsql(connectionString)

**Step 3 --- Update appsettings files**

In appsettings.Development.json (local dev --- points to local Postgres
or remains SQLite for local):

\"ConnectionStrings\": {

\"DefaultConnection\":
\"Host=localhost;Database=babylonwealth;Username=postgres;Password=yourpassword\"

}

In appsettings.json (production --- reads from environment variable):

\"ConnectionStrings\": {

\"DefaultConnection\": \"\"

}

**Step 4 --- Update Program.cs to prefer environment variable**

Make the connection string read from the environment first, falling back
to appsettings:

var connectionString =

Environment.GetEnvironmentVariable(\"DATABASE_URL\")

?? builder.Configuration.GetConnectionString(\"DefaultConnection\");

> *Railway injects DATABASE_URL automatically from the linked PostgreSQL
> service. You do not need to copy it manually --- just reference the
> variable name.*

**Step 5 --- Regenerate migrations for PostgreSQL**

SQLite and PostgreSQL have different column types. Drop your existing
migrations and regenerate:

cd BabylonWealth.Infrastructure

dotnet ef migrations remove \--project . \--startup-project
../BabylonWealth.API

dotnet ef migrations add InitialCreate \--project . \--startup-project
../BabylonWealth.API

> If you have existing SQLite data you want to preserve, use pgloader
> after this step. Otherwise, starting fresh is the cleanest path.

**Step 6 --- Set Railway environment variables**

In Railway → your API service → Variables, add:

  --------------------------- -------------------------------------------
  **Variable Name**           **Value**

  DATABASE_URL                \$(RAILWAY_POSTGRES_URL) --- Railway
                              auto-links this

  ASPNETCORE_ENVIRONMENT      Production

  JWT\_\_SecretKey            your-long-random-secret-key-min-32-chars

  JWT\_\_Issuer               BabylonWealth

  JWT\_\_Audience             BabylonWealth

  ASPNETCORE_URLS             http://+:8080
  --------------------------- -------------------------------------------

**Step 7 --- Apply migrations on Railway**

Add this to your Program.cs before app.Run() --- it auto-migrates on
startup:

using (var scope = app.Services.CreateScope())

{

var db = scope.ServiceProvider.GetRequiredService\<BabylonDbContext\>();

db.Database.Migrate();

}

> This is safe to run on every startup --- EF Core\'s Migrate() is
> idempotent. It only applies migrations that haven\'t been applied yet.

**PHASE 2 --- API Deployment (Days 3--4)**

+-----------------------------------------------------------------------+
| **Day 3 --- Dockerfile + Railway Build Config**                       |
|                                                                       |
| *Goal: API builds successfully in Railway\'s cloud environment*       |
+-----------------------------------------------------------------------+

**Step 1 --- Create a Dockerfile in the solution root**

Railway can use a Dockerfile or its own .NET buildpack. A Dockerfile
gives you more control:

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /app

COPY . .

RUN dotnet restore BabylonWealth.API/BabylonWealth.API.csproj

RUN dotnet publish BabylonWealth.API/BabylonWealth.API.csproj \\

-c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

COPY \--from=build /app/publish .

EXPOSE 8080

ENTRYPOINT \[\"dotnet\", \"BabylonWealth.API.dll\"\]

**Step 2 --- Add a .dockerignore**

In the solution root, create .dockerignore to keep the image small:

\*\*/bin

\*\*/obj

\*\*/.git

\*\*/node_modules

\*\*/\*.md

**Step 3 --- Configure Railway to use the Dockerfile**

- In Railway → your API service → Settings → Build

- Set Builder to Dockerfile

- Set Dockerfile Path to ./Dockerfile (solution root)

- Set Start Command to: dotnet BabylonWealth.API.dll

**Step 4 --- Set the port**

Railway routes external traffic to the port defined in the
ASPNETCORE_URLS environment variable. Verify you added
ASPNETCORE_URLS=http://+:8080 in Day 2.

**Step 5 --- Commit and push**

git add Dockerfile .dockerignore

git commit -m \"Add Dockerfile for Railway deployment\"

git push

Railway auto-triggers a build on every push to main. Watch the build
logs in the Railway dashboard.

+-----------------------------------------------------------------------+
| **Day 4 --- API Live + Swagger Verification**                         |
|                                                                       |
| *Goal: API is live at a Railway URL, Swagger accessible, database     |
| connected*                                                            |
+-----------------------------------------------------------------------+

**Step 1 --- Watch the build logs**

- In Railway → your API service → Deployments tab, click the active
  build

- Watch for: Restore succeeded, Build succeeded, Publish succeeded

- Watch for: Applying migration\... lines from the auto-migrate code

- Final line should be: Now listening on: http://\[::\]:8080

**Step 2 --- Get your Railway public URL**

- In Railway → your API service → Settings → Networking

- Click Generate Domain --- Railway gives you a URL like:
  babylon-wealth-api.up.railway.app

- This is your production API base URL

**Step 3 --- Test Swagger**

Navigate to:

https://YOUR-APP.up.railway.app/swagger

You should see the full Swagger UI. Test the auth endpoints:

- POST /api/v1/auth/register --- create a test account

- POST /api/v1/auth/login --- get a JWT back

- Authorize in Swagger (lock icon) → paste the JWT

- GET /api/v1/networth/current --- should return 0 values (empty
  database)

**Step 4 --- Verify the database**

- In Railway → PostgreSQL service → Data tab, you can browse tables

- Confirm all tables exist: Users, BankAccounts, CreditCards, Banks,
  etc.

- Confirm the Banks table has \~40 rows (seeder ran on startup)

> If the build fails, the most common causes are: missing environment
> variable (check ASPNETCORE_URLS), wrong Dockerfile path in settings,
> or a migration error. Check build logs line by line.

**PHASE 3 --- Frontend Deployment (Days 5--6)**

+-----------------------------------------------------------------------+
| **Day 5 --- CORS + API URL Config + Vercel Setup**                    |
|                                                                       |
| *Goal: React app builds with the production API URL wired in*         |
+-----------------------------------------------------------------------+

**Step 1 --- Update CORS in the API**

Your API currently allows localhost:5173. Add the Vercel production URL.
In Program.cs or ServiceExtensions.cs:

builder.Services.AddCors(options =\>

{

options.AddPolicy(\"AllowFrontend\", policy =\>

{

policy.WithOrigins(

\"http://localhost:5173\",

\"https://babylon-wealth.vercel.app\",

Environment.GetEnvironmentVariable(\"FRONTEND_URL\") ?? \"\"

)

.AllowAnyHeader()

.AllowAnyMethod()

.AllowCredentials();

});

});

> *Add FRONTEND_URL as a Railway environment variable after you get your
> Vercel URL on Day 6. This way you don\'t hardcode the URL.*

**Step 2 --- Create environment files for React**

In your React project root, create two files:

.env.development --- used when running npm run dev locally:

VITE_API_BASE_URL=http://localhost:5000/api/v1

.env.production --- used when Vercel builds npm run build:

VITE_API_BASE_URL=https://YOUR-APP.up.railway.app/api/v1

**Step 3 --- Update src/api/client.ts to use the env variable**

import axios from \'axios\';

const apiClient = axios.create({

baseURL: import.meta.env.VITE_API_BASE_URL,

});

**Step 4 --- Add .env files to .gitignore**

Never commit secrets to GitHub. Add to .gitignore:

.env.local

.env.production

Instead, you will paste the production value directly into Vercel\'s
dashboard in Day 6.

**Step 5 --- Create vercel.json in the React project root**

This tells Vercel how to handle React Router client-side routing
(prevents 404 on page refresh):

{

\"rewrites\": \[{ \"source\": \"/(.\*)\", \"destination\": \"/\" }\]

}

**Step 6 --- Commit everything**

git add .

git commit -m \"Add production env config, CORS update, vercel.json\"

git push

+-----------------------------------------------------------------------+
| **Day 6 --- Vercel Deployment + End-to-End Test**                     |
|                                                                       |
| *Goal: Full app live --- React on Vercel talking to API on Railway*   |
+-----------------------------------------------------------------------+

**Step 1 --- Deploy React to Vercel**

- Go to vercel.com → Add New Project → Import your GitHub repo

- Vercel auto-detects Vite. Confirm: Framework Preset = Vite

- Set Root Directory to your React folder (e.g. babylon-wealth-client)

- Under Environment Variables, add: VITE_API_BASE_URL =
  https://YOUR-APP.up.railway.app/api/v1

- Click Deploy --- Vercel builds and deploys in \~60 seconds

**Step 2 --- Get your Vercel URL**

Vercel gives you a URL like: babylon-wealth.vercel.app

**Step 3 --- Update Railway with the Vercel URL**

- In Railway → API service → Variables

- Add: FRONTEND_URL = https://babylon-wealth.vercel.app

- Railway auto-redeploys the API with the updated CORS config

**Step 4 --- Full end-to-end test**

Open https://babylon-wealth.vercel.app and run through this checklist:

  --------------------------- -------------------------------------------
  **Test**                    **Expected Result**

  Navigate to the app         Login page loads with Babylon theme

  Register a new account      Redirected to home screen --- River tab

  Add a bank account in       Row appears, net worth updates on River tab
  Ledger                      

  Add an income source        Income tab shows annual total + Arkad
                              savings target

  Run a property analysis     Metrics display --- cap rate, cash flow,
                              deal signal

  Add a net worth annotation  Flag appears on the chart

  Refresh the page            JWT persists from localStorage, user stays
                              logged in

  Logout and log back in      All data still present from database
  --------------------------- -------------------------------------------

> If you see CORS errors in the browser console, double check: (1)
> FRONTEND_URL in Railway matches your Vercel URL exactly including
> https://, (2) AllowCredentials() is set, (3) the API redeployed after
> you added FRONTEND_URL.

**PHASE 4 --- Polish & Reliability (Day 7)**

+-----------------------------------------------------------------------+
| **Day 7 --- Custom Domain + Health Checks + Monitoring**              |
|                                                                       |
| *Goal: App running reliably with a proper domain and basic            |
| observability*                                                        |
+-----------------------------------------------------------------------+

**Step 1 --- Add a health check endpoint (optional but recommended)**

In Program.cs, add a lightweight health check that Railway can ping:

app.MapGet(\"/health\", () =\> Results.Ok(new { status = \"healthy\",
timestamp = DateTime.UtcNow }));

In Railway → your API service → Settings → Health Check Path, set:
/health

**Step 2 --- Custom domain on Vercel (optional)**

- In Vercel → your project → Settings → Domains

- Add your domain (e.g. babylon.yourdomain.com)

- Vercel gives you CNAME records to add at your DNS registrar

- DNS propagation takes 5--30 minutes

- Update VITE_API_BASE_URL in Vercel environment variables if needed

- Update FRONTEND_URL in Railway to match your new domain

**Step 3 --- Custom domain on Railway (optional)**

- In Railway → API service → Settings → Networking → Custom Domain

- Add api.yourdomain.com

- Add the provided CNAME at your DNS registrar

- Update VITE_API_BASE_URL in Vercel to use the new API domain

**Step 4 --- Set up Railway auto-deploy from main branch**

- In Railway → your API service → Settings → Source

- Confirm: Deploy on Push is enabled for the main branch

- Every git push to main now triggers a Railway build and zero-downtime
  deploy

**Step 5 --- Set up Vercel auto-deploy**

- Vercel auto-deploys from main by default --- nothing to configure

- PRs also get preview deployments --- useful for testing changes before
  merging

**Step 6 --- Secrets hygiene check**

Verify none of the following are committed to your GitHub repo:

- JWT secret key

- DATABASE_URL or any connection string with credentials

- .env.production file

All secrets should live only in Railway Variables and Vercel Environment
Variables.

**Step 7 --- Final smoke test + celebrate**

Push a trivial commit (update README) and confirm:

- Railway builds and deploys the API automatically

- Vercel rebuilds and deploys the frontend automatically

- The live app reflects the change within \~2 minutes of the push

> Your Babylon Wealth app is now live. River is growing. ✦

**Quick Reference**

**Environment Variables --- Railway (API)**

  ------------------------ ------------------------- ------------------------------------------
  **Variable**             **Description**           **Example Value**

  DATABASE_URL             Auto-injected by Railway  postgresql://user:pass@host:5432/railway
                           from PostgreSQL service   

  ASPNETCORE_ENVIRONMENT   Switches config profiles  Production

  ASPNETCORE_URLS          Port binding --- must     http://+:8080
                           match Railway\'s router   

  JWT\_\_SecretKey         Must be 32+ characters,   your-super-secret-key-here
                           random                    

  JWT\_\_Issuer            JWT issuer claim          BabylonWealth

  JWT\_\_Audience          JWT audience claim        BabylonWealth

  FRONTEND_URL             Vercel URL --- injected   https://babylon-wealth.vercel.app
                           into CORS allowed origins 
  ------------------------ ------------------------- ------------------------------------------

**Environment Variables --- Vercel (React)**

  --------------------------- -------------------------------------------
  **Variable**                **Value**

  VITE_API_BASE_URL           https://YOUR-APP.up.railway.app/api/v1
  --------------------------- -------------------------------------------

**Common Issues & Fixes**

  ------------------ --------------------- ------------------------------
  **Symptom**        **Likely Cause**      **Fix**

  Build fails:       Dockerfile path is    Verify Dockerfile path in
  \'Cannot find      wrong                 Railway settings
  project\'                                

  CORS error in      FRONTEND_URL not set  Add/update FRONTEND_URL in
  browser            or mismatched         Railway → redeploy

  401 on all API     JWT secret mismatch   Confirm JWT\_\_SecretKey
  calls              or missing            matches what tokens were
                                           signed with

  Database tables    Migrate() not running Verify auto-migrate code is in
  missing            on startup            Program.cs before app.Run()

  Page refresh gives Vercel doesn\'t know  Confirm vercel.json rewrite
  404                about React Router    rule is committed

  App not updating   Branch mismatch       Verify Railway/Vercel are
  after push                               watching the \'main\' branch

  Snapshot           API sleeping on free  Upgrade to Railway Hobby plan
  background service tier                  (\~\$5/mo) for 24/7 uptime
  not firing                               
  ------------------ --------------------- ------------------------------

**Deployment Checklist**

1.  GitHub repo pushed with Dockerfile and vercel.json

2.  Railway project created with PostgreSQL service attached

3.  All Railway environment variables set (especially JWT\_\_SecretKey)

4.  API deployed --- Swagger accessible at railway URL

5.  Bank seeder ran --- Banks table has \~40 rows

6.  React deployed to Vercel with VITE_API_BASE_URL set

7.  FRONTEND_URL added to Railway --- CORS working

8.  End-to-end test: register, add account, check River tab

9.  Auto-deploy verified: push to main → live in \~2 min

10. No secrets committed to GitHub

***✦ A part of all you earn is yours to keep. ✦***

Babylon Wealth --- Railway Deployment Guide v1.0
