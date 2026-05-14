using PropertyManager.Api.Security;
using Xunit;

namespace PropertyManager.Api.Tests;

public sealed class PasswordHashingTests
{
    [Fact]
    public void Hash_produces_bcrypt_string()
    {
        var h = PasswordHashing.Hash("secret1");
        Assert.StartsWith("$2", h, StringComparison.Ordinal);
        Assert.True(PasswordHashing.IsBcryptFormat(h));
    }

    [Fact]
    public void Verify_matches_bcrypt_hash()
    {
        var h = PasswordHashing.Hash("my-password");
        Assert.True(PasswordHashing.Verify("my-password", h));
        Assert.False(PasswordHashing.Verify("other", h));
    }

    [Theory]
    [InlineData("plain", "plain", true)]
    [InlineData("a", "b", false)]
    public void Verify_plaintext_fallback_for_legacy_storage(string plain, string stored, bool ok) =>
        Assert.Equal(ok, PasswordHashing.Verify(plain, stored));

    [Fact]
    public void Verify_null_stored_fails() =>
        Assert.False(PasswordHashing.Verify("x", null!));

    [Fact]
    public void Verify_empty_stored_fails() =>
        Assert.False(PasswordHashing.Verify("x", ""));

    [Theory]
    [InlineData("ab")]
    [InlineData("$1x")]
    public void IsBcryptFormat_false_for_short_or_wrong_prefix(string? s) =>
        Assert.False(PasswordHashing.IsBcryptFormat(s));
}
