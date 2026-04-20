namespace PropertyManager.Api.Security;

/// <summary>
/// BCrypt password hashes. Supports legacy plaintext in DB until the user logs in or password is reset (then upgraded).
/// </summary>
public static class PasswordHashing
{
    public static string Hash(string plainTextPassword)
    {
        return BCrypt.Net.BCrypt.HashPassword(plainTextPassword);
    }

    /// <summary>
    /// Verifies plain password against a BCrypt hash, or legacy plaintext stored value (demo / pre-migration rows).
    /// </summary>
    public static bool Verify(string plainTextPassword, string storedHashOrPlain)
    {
        if (string.IsNullOrEmpty(storedHashOrPlain)) return false;
        if (IsBcryptFormat(storedHashOrPlain))
            return BCrypt.Net.BCrypt.Verify(plainTextPassword, storedHashOrPlain);
        return string.Equals(plainTextPassword, storedHashOrPlain, StringComparison.Ordinal);
    }

    public static bool IsBcryptFormat(string? value) =>
        value is { Length: >= 4 } && value.StartsWith("$2", StringComparison.Ordinal);
}
