using PropertyManager.Api.Helpers;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class HttpUrlHelperTests
{
    [Fact]
    public void TryNormalizeHttpUrl_rejects_http_without_host() =>
        Assert.False(HttpUrlHelper.TryNormalizeHttpUrl("https:///only-path", out _));

    [Fact]
    public void TryNormalizeHttpUrl_shortens_very_long_inputs()
    {
        var longPath = "https://example.com/p/" + new string('a', 2100);
        Assert.True(HttpUrlHelper.TryNormalizeHttpUrl(longPath, out var n));
        Assert.NotNull(n);
        Assert.Equal(2000, n!.Length);
    }

    [Theory]
    [InlineData("https://example.com/path", "https://example.com/path")]
    [InlineData("  http://localhost:5076/  ", "http://localhost:5076/")]
    public void TryNormalizeHttpUrl_accepts_http_https(string input, string expectedPrefix)
    {
        Assert.True(HttpUrlHelper.TryNormalizeHttpUrl(input, out var n));
        Assert.NotNull(n);
        Assert.StartsWith(expectedPrefix, n, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("not-a-url")]
    [InlineData("ftp://example.com")]
    [InlineData("//nohost")]
    public void TryNormalizeHttpUrl_rejects(string? input) =>
        Assert.False(HttpUrlHelper.TryNormalizeHttpUrl(input, out _));

    [Fact]
    public void TryNormalizeHttpUrl_accepts_trailing_padded_path()
    {
        var path = "https://ex.example/aa" + new string('b', 50);
        Assert.True(HttpUrlHelper.TryNormalizeHttpUrl(path, out var n));
        Assert.Equal(path, n);
    }
}
