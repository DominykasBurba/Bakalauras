namespace PropertyManager.Api.Security;

public static class PasswordHashing
{
    public static string Hash(string plainTextPassword)
    {
        return BCrypt.Net.BCrypt.HashPassword(plainTextPassword);
    }

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
