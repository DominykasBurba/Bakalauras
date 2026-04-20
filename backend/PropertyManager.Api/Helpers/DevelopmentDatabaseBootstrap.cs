using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using PropertyManager.Api.Data;

namespace PropertyManager.Api.Helpers;

/// <summary>
/// In Development, applies <c>database/seed.sql</c> when the <c>buildings</c> table is empty.
/// Demo portfolio units/images/occupancies (<see cref="DemoPortfolioSeed"/>) expect buildings and users from that file.
/// </summary>
public static class DevelopmentDatabaseBootstrap
{
    public static void ApplyDevelopmentSeedIfEmpty(
        AppDbContext db,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger logger)
    {
        if (!environment.IsDevelopment())
            return;

        if (db.Buildings.AsNoTracking().Any())
            return;

        var contentRoot = environment.ContentRootPath;
        var seedPath = Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "database", "seed.sql"));
        if (!File.Exists(seedPath))
        {
            logger.LogWarning(
                "No buildings in the database and seed file was not found at {Path}. " +
                "Apply database/schema.sql then database/seed.sql manually, or add buildings under Buildings.",
                seedPath);
            return;
        }

        var sql = File.ReadAllText(seedPath);
        try
        {
            var connectionString = ConnectionStringResolver.Resolve(configuration);
            using var conn = new NpgsqlConnection(connectionString);
            conn.Open();
            using var cmd = new NpgsqlCommand(sql, conn) { CommandTimeout = 120 };
            cmd.ExecuteNonQuery();
            logger.LogInformation("Applied development seed from {Path}.", seedPath);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to apply development seed from {Path}. Run database/seed.sql manually against your Postgres DB.",
                seedPath);
        }
    }
}
