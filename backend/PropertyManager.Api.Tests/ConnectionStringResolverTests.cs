using Microsoft.Extensions.Configuration;
using PropertyManager.Api.Helpers;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class ConnectionStringResolverTests
{
    [Fact]
    public void Resolve_uses_connection_string_key()
    {
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=db;Database=x;"
            })
            .Build();
        Assert.Equal("Host=db;Database=x;", ConnectionStringResolver.Resolve(cfg));
    }

    [Fact]
    public void Resolve_falls_back_to_database_url()
    {
        var previous = Environment.GetEnvironmentVariable("DATABASE_URL");
        try
        {
            var cfg = new ConfigurationBuilder().AddInMemoryCollection().Build();
            Environment.SetEnvironmentVariable("DATABASE_URL", "postgres://u:p@h.example:5432/mydb");
            var cs = ConnectionStringResolver.Resolve(cfg);
            Assert.Contains("Host=h.example", cs, StringComparison.Ordinal);
            Assert.Contains("Database=mydb", cs, StringComparison.Ordinal);
            Assert.Contains("Username=u", cs, StringComparison.Ordinal);
        }
        finally
        {
            if (previous is null)
                Environment.SetEnvironmentVariable("DATABASE_URL", null);
            else
                Environment.SetEnvironmentVariable("DATABASE_URL", previous);
        }
    }

    [Fact]
    public void Resolve_throws_when_nothing_configured()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection().Build();
        var previous = Environment.GetEnvironmentVariable("DATABASE_URL");
        try
        {
            Environment.SetEnvironmentVariable("DATABASE_URL", null);
            Assert.Throws<InvalidOperationException>(() => ConnectionStringResolver.Resolve(cfg));
        }
        finally
        {
            if (previous is not null)
                Environment.SetEnvironmentVariable("DATABASE_URL", previous);
        }
    }

    [Fact]
    public void ParsePostgresUrl_default_port_and_escaping()
    {
        var cs = ConnectionStringResolver.ParsePostgresUrl("postgres://user%40x:sec%2Fret@dbhost/myapp");
        Assert.Contains("Port=5432", cs, StringComparison.Ordinal);
        Assert.Contains("Host=dbhost", cs, StringComparison.Ordinal);
        Assert.Contains("Database=myapp", cs, StringComparison.Ordinal);
    }
}
