using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models.Dtos;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Resident")]
[Route("api/resident")]
public sealed class ResidentProfileController(AppDbContext db) : ControllerBase
{
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (u is null)
            return NotFound();
        return Ok(new ResidentProfileResponse
        {
            ProfileStatus = u.ProfileStatus,
            Phone = u.Phone,
            EmergencyContactName = u.EmergencyContactName,
            EmergencyContactPhone = u.EmergencyContactPhone,
            AboutMe = u.AboutMe,
            AdminComment = u.AdminComment,
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] ResidentProfileWriteRequest body, CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (u is null)
            return NotFound();

        if (u.ProfileStatus is not (ResidentProfileStatus.PendingProfile or ResidentProfileStatus.Declined))
            return BadRequest("Profile can only be submitted when your account is new or after a declined review.");

        if (string.IsNullOrWhiteSpace(body.Phone))
            return BadRequest("Phone is required.");
        if (string.IsNullOrWhiteSpace(body.EmergencyContactName))
            return BadRequest("Emergency contact name is required.");
        if (string.IsNullOrWhiteSpace(body.EmergencyContactPhone))
            return BadRequest("Emergency contact phone is required.");

        u.Phone = body.Phone.Trim();
        u.EmergencyContactName = body.EmergencyContactName.Trim();
        u.EmergencyContactPhone = body.EmergencyContactPhone.Trim();
        u.AboutMe = string.IsNullOrWhiteSpace(body.AboutMe) ? null : body.AboutMe.Trim();
        u.ProfileStatus = ResidentProfileStatus.PendingReview;
        u.ProfileSubmittedAt = DateTime.UtcNow;
        u.AdminComment = null;
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new ResidentProfileResponse
        {
            ProfileStatus = u.ProfileStatus,
            Phone = u.Phone,
            EmergencyContactName = u.EmergencyContactName,
            EmergencyContactPhone = u.EmergencyContactPhone,
            AboutMe = u.AboutMe,
            AdminComment = u.AdminComment,
        });
    }
}
