using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models;
using PropertyManager.Api.Models.Dtos;
using PropertyManager.Api.Security;
using PropertyManager.Api.Services;
using Swashbuckle.AspNetCore.Annotations;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(AppDbContext db, JwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("login")]
    [SwaggerOperation(Summary = "Login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
            return Unauthorized(new { message = "Invalid credentials" });

        var emailNorm = request.Email.Trim().ToLowerInvariant();
        var entity = await db.Users.FirstOrDefaultAsync(
            u => u.Email.ToLower() == emailNorm,
            cancellationToken);

        if (entity is null || !PasswordHashing.Verify(request.Password, entity.Password))
            return Unauthorized(new { message = "Invalid credentials" });

        if (!PasswordHashing.IsBcryptFormat(entity.Password))
        {
            entity.Password = PasswordHashing.Hash(request.Password);
            await db.SaveChangesAsync(cancellationToken);
        }

        var user = MapToUser(entity);
        return Ok(new LoginResponse
        {
            Token = jwtTokenService.Create(user),
            Name = user.Name,
            Role = user.Role,
            Unit = user.Unit,
            UserId = user.Id,
            ProfileStatus = user.ProfileStatus,
        });
    }

    [HttpGet("session")]
    [Authorize]
    public async Task<ActionResult<SessionResponse>> Session(CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (u is null)
            return Unauthorized();

        string? buildingName = null;
        if (u.BuildingId is int bid)
        {
            buildingName = await db.Buildings.AsNoTracking()
                .Where(b => b.Id == bid)
                .Select(b => b.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return Ok(new SessionResponse
        {
            UserId = u.Id,
            Email = u.Email,
            Name = u.Name,
            Role = u.Role,
            Unit = u.Unit,
            BuildingId = u.BuildingId,
            BuildingName = string.IsNullOrWhiteSpace(buildingName) ? null : buildingName.Trim(),
            UnitId = u.UnitId,
            ProfileStatus = u.Role.Equals("Resident", StringComparison.OrdinalIgnoreCase) ? u.ProfileStatus : null,
            Phone = u.Phone,
            EmergencyContactName = u.EmergencyContactName,
            EmergencyContactPhone = u.EmergencyContactPhone,
            AboutMe = u.AboutMe,
            AdminComment = u.AdminComment,
            ProfileSubmittedAt = u.ProfileSubmittedAt,
            ProfileReviewedAt = u.ProfileReviewedAt,
        });
    }

    [HttpPut("password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest body, CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        if (string.IsNullOrWhiteSpace(body.NewPassword) || body.NewPassword.Length < 8)
            return BadRequest("New password must be at least 8 characters.");
        if (string.IsNullOrEmpty(body.CurrentPassword))
            return BadRequest("Current password is required.");

        var entity = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (entity is null)
            return Unauthorized();
        if (!PasswordHashing.Verify(body.CurrentPassword, entity.Password))
            return BadRequest("Current password is incorrect.");
        if (string.Equals(body.NewPassword, body.CurrentPassword, StringComparison.Ordinal))
            return BadRequest("New password must be different from your current password.");

        entity.Password = PasswordHashing.Hash(body.NewPassword);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static User MapToUser(UserEntity u) =>
        new()
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Password = u.Password,
            Role = u.Role,
            Unit = u.Unit,
            ProfileStatus = u.Role.Equals("Resident", StringComparison.OrdinalIgnoreCase) ? u.ProfileStatus : null,
        };
}
