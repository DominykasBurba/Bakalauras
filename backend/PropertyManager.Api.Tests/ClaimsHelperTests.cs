using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using PropertyManager.Api.Helpers;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class ClaimsHelperTests
{
    [Fact]
    public void TryGetUserId_reads_Jwt_sub()
    {
        var p = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(JwtRegisteredClaimNames.Sub, "42")]));
        Assert.True(ClaimsHelper.TryGetUserId(p, out var id));
        Assert.Equal(42, id);
    }

    [Fact]
    public void TryGetUserId_falls_back_to_name_identifier()
    {
        var p = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "7")]));
        Assert.True(ClaimsHelper.TryGetUserId(p, out var id));
        Assert.Equal(7, id);
    }

    [Fact]
    public void TryGetUserId_sub_takes_precedence_over_name_identifier()
    {
        var p = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(JwtRegisteredClaimNames.Sub, "1"),
            new Claim(ClaimTypes.NameIdentifier, "99")
        ]));
        Assert.True(ClaimsHelper.TryGetUserId(p, out var id));
        Assert.Equal(1, id);
    }

    [Fact]
    public void TryGetUserId_false_when_no_sub()
    {
        var p = new ClaimsPrincipal(new ClaimsIdentity());
        Assert.False(ClaimsHelper.TryGetUserId(p, out _));
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("")]
    public void TryGetUserId_false_when_sub_not_int(string subValue)
    {
        var p = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(JwtRegisteredClaimNames.Sub, subValue)]));
        Assert.False(ClaimsHelper.TryGetUserId(p, out _));
    }
}
