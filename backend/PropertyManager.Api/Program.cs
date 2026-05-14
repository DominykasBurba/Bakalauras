using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
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
if (!builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddHostedService<BillDueReminderHostedService>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "local-dev-key-change-this";
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
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

if (!app.Environment.IsEnvironment("Testing"))
{
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

        if (app.Environment.IsDevelopment())
        {
            try
            {
                var csb = new NpgsqlConnectionStringBuilder(ConnectionStringResolver.Resolve(configuration));
                var userCount = db.Users.AsNoTracking().Count();
                var sample = db.Users.AsNoTracking().OrderBy(u => u.Id).Take(5).Select(u => u.Email).ToList();
                logger.LogInformation(
                    "PostgreSQL: database {Database} on {Host}:{Port}; Users={UserCount}; Sample emails: {Sample}",
                    csb.Database,
                    csb.Host,
                    csb.Port,
                    userCount,
                    sample.Count == 0 ? "(none)" : string.Join(", ", sample));
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not log PostgreSQL login diagnostics.");
            }
        }
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

if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))
    app.UseHttpsRedirection();

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
