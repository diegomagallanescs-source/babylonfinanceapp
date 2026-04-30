using System.Reflection;
using System.Text.Json.Serialization;
using BabylonWealth.Api.BackgroundServices;
using BabylonWealth.Api.Middleware;
using BabylonWealth.Infrastructure.Extensions;
using BabylonWealth.Infrastructure.Persistence;
using BabylonWealth.Infrastructure.Seeders;
using Microsoft.EntityFrameworkCore;
using BabylonWealth.Services.Extensions;
using Microsoft.OpenApi.Models;

namespace Babylon.Api
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers()
                .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo { Title = "Babylon Wealth API", Version = "v1" });

                // Add the JWT lock button to Swagger UI
                var scheme = new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Paste your JWT here (without the 'Bearer ' prefix)."
                };
                options.AddSecurityDefinition("Bearer", scheme);
                options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });

                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
                options.IncludeXmlComments(xmlPath);
            });
            builder.Services.AddInfrastructure(builder.Configuration);
            builder.Services.AddApplicationServices();
            builder.Services.AddHostedService<SnapshotBackgroundService>();

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("FrontendPolicy", policy =>
                {
                    var configured = builder.Configuration
                        .GetSection("AllowedOrigins")
                        .Get<string[]>() ?? [];
                    var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
                    var allowedOrigins = string.IsNullOrEmpty(frontendUrl)
                        ? configured
                        : [.. configured, frontendUrl];
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            var app = builder.Build();

            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<BabylonDbContext>();
                db.Database.Migrate();
            }

            await BankSeeder.SeedAsync(app.Services);

            app.UseCors("FrontendPolicy");
            app.UseMiddleware<ErrorHandlingMiddleware>();

            app.UseSwagger();
            app.UseSwaggerUI();

            if (app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            app.Run();
        }
    }
}