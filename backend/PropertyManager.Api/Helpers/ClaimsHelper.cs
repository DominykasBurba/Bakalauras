using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace PropertyManager.Api.Helpers;

public static class ClaimsHelper
{
    public static bool TryGetUserId(ClaimsPrincipal user, out int userId)
    {
        userId = default;
        // JwtBearer maps JWT "sub" to ClaimTypes.NameIdentifier by default.
        var sub = user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(sub, out userId);
    }
}
