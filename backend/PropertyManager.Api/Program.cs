using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen(options => options.EnableAnnotations());
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        // Dev: Vite may use 5174+ if 5173 is taken; any localhost origin avoids "Failed to fetch" from CORS.
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(static origin =>
                origin is not null &&
                (origin.StartsWith("http://localhost:", StringComparison.Ordinal) ||
                 origin.StartsWith("http://127.0.0.1:", StringComparison.Ordinal)));
        }
        else
        {
            policy.WithOrigins("http://localhost:5173");
        }

        policy.AllowAnyHeader().AllowAnyMethod();
    });
});

var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<IDataStore, PostgresDataStore>();
builder.Services.AddSingleton<JwtTokenService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "local-dev-key-change-this";
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep JWT claim types as issued (e.g. "sub") so User claims match JwtTokenService.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = signingKey,
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.Name,
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Ensure DB schema for optional notification category (idempotent; no-op if psql migration already applied).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    try
    {
        db.Database.ExecuteSqlRaw(
            """ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(80) NULL;""");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Could not ensure notifications.category column exists.");
    }

    foreach (var sql in PropertyPortfolioMigration.SqlStatements)
    {
        try
        {
            db.Database.ExecuteSqlRaw(sql);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Property portfolio DDL step skipped or failed: {Sql}", sql[..Math.Min(80, sql.Length)]);
        }
    }

    if (app.Environment.IsDevelopment())
        DevelopmentDatabaseBootstrap.ApplyDevelopmentSeedIfEmpty(db, configuration, app.Environment, logger);

    if (app.Environment.IsDevelopment() && db.Buildings.AsNoTracking().Any())
    {
        foreach (var sql in DemoPortfolioSeed.SqlStatements)
        {
            try
            {
                db.Database.ExecuteSqlRaw(sql);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Demo portfolio seed step skipped or failed");
            }
        }

        logger.LogInformation("Demo portfolio seed checked (development).");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Property Manager API v1");
    });
}

// In dev the SPA calls http://localhost:5076. HTTPS redirection would 307 to another origin/port
// and browsers drop the Authorization header on that redirect → 401 on every API call.
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
