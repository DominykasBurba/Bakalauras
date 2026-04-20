using Microsoft.Extensions.Configuration;

namespace PropertyManager.Api.Helpers;

public static class ConnectionStringResolver
{
    public static string Resolve(IConfiguration configuration)
    {
        var cs = configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(cs))
            return cs;

        var url = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (!string.IsNullOrWhiteSpace(url))
            return ParsePostgresUrl(url);

        throw new InvalidOperationException(
            "Database not configured. Set ConnectionStrings:DefaultConnection in appsettings.json or DATABASE_URL environment variable.");
    }

    public static string ParsePostgresUrl(string url)
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo[0]);
        var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var db = uri.AbsolutePath.TrimStart('/');
        var port = uri.Port > 0 ? uri.Port : 5432;
        return $"Host={uri.Host};Port={port};Database={db};Username={user};Password={pass};SSL Mode=Disable";
    }
}
