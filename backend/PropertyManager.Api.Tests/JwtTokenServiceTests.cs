using Microsoft.Extensions.Configuration;
using PropertyManager.Api.Models;
using PropertyManager.Api.Services;
using System.IdentityModel.Tokens.Jwt;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class JwtTokenServiceTests
{
    [Fact]
    public void Create_emits_parsable_jwt_with_expected_claims()
    {
        var key = "0123456789abcdef0123456789abcdef";
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key,
                ["Jwt:Issuer"] = "test-iss",
                ["Jwt:Audience"] = "test-aud",
            })
            .Build();
        var svc = new JwtTokenService(cfg);
        var user = new User
        {
            Id = 5,
            Name = "A",
            Email = "a@b.c",
            Password = "p",
            Role = "Resident",
            Unit = "U1",
            ProfileStatus = "submitted"
        };
        var token = svc.Create(user);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        Assert.Equal("5", jwt.Subject);
        Assert.Contains(jwt.Claims, c => c is { Type: "profile_status", Value: "submitted" });
    }

    [Fact]
    public void Create_omits_profile_status_when_empty()
    {
        var key = "0123456789abcdef0123456789abcdef";
        var cfg = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key,
                ["Jwt:Issuer"] = "i",
                ["Jwt:Audience"] = "a",
            })
            .Build();
        var user = new User
        {
            Id = 1,
            Name = "N",
            Email = "e@e",
            Password = "p",
            Role = "Admin",
            Unit = "x",
        };
        var token = new JwtTokenService(cfg).Create(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.DoesNotContain(jwt.Claims, c => c.Type == "profile_status");
    }
}
