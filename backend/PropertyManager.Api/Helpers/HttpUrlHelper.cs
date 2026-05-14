using System.Diagnostics.CodeAnalysis;

namespace PropertyManager.Api.Helpers;

public static class HttpUrlHelper
{
    public static bool TryNormalizeHttpUrl(string? input, [NotNullWhen(true)] out string? normalized)
    {
        normalized = null;
        if (string.IsNullOrWhiteSpace(input))
            return false;
        var t = input.Trim();
        if (t.Length > 2000)
            t = t[..2000];
        if (!Uri.TryCreate(t, UriKind.Absolute, out var uri))
            return false;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return false;
        if (string.IsNullOrEmpty(uri.Host))
            return false;
        normalized = uri.ToString();
        return true;
    }
}
