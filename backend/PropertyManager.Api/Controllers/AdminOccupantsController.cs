using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Models.Dtos;
using PropertyManager.Api.Security;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/occupants")]
public sealed class AdminOccupantsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? buildingId, [FromQuery] string? name, CancellationToken cancellationToken)
    {
        var q = db.Users.AsNoTracking().Where(u => u.Role == "Resident");
        if (buildingId is int bid)
            q = q.Where(u => u.BuildingId == bid);
        if (!string.IsNullOrWhiteSpace(name))
        {
            var term = name.Trim().ToLowerInvariant();
            q = q.Where(u => u.Name.ToLower().Contains(term));
        }

        var users = await q.OrderBy(u => u.Name).ToListAsync(cancellationToken);
        var buildingNames = await db.Buildings.AsNoTracking().ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken);

        var rows = users.Select(u =>
        {
            string? bname = null;
            if (u.BuildingId is int bid && buildingNames.TryGetValue(bid, out var n))
                bname = n;
            return new OccupantAdminRowDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                BuildingId = u.BuildingId,
                BuildingName = bname,
                UnitId = u.UnitId,
                UnitLine = string.IsNullOrWhiteSpace(u.Unit) ? null : u.Unit.Trim(),
                ProfileStatus = u.ProfileStatus,
                AdminComment = u.AdminComment,
                ProfileSubmittedAt = u.ProfileSubmittedAt,
                ProfileReviewedAt = u.ProfileReviewedAt,
            };
        }).ToList();

        return Ok(rows);
    }

    [HttpGet("{userId:int}")]
    public async Task<IActionResult> Get(int userId, CancellationToken cancellationToken)
    {
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId && x.Role == "Resident", cancellationToken);
        if (u is null)
            return NotFound();

        string? bname = null;
        if (u.BuildingId is int bid)
        {
            bname = await db.Buildings.AsNoTracking().Where(b => b.Id == bid).Select(b => b.Name).FirstOrDefaultAsync(cancellationToken);
        }

        return Ok(new OccupantAdminDetailDto
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            BuildingId = u.BuildingId,
            BuildingName = string.IsNullOrEmpty(bname) ? null : bname,
            UnitId = u.UnitId,
            UnitLine = string.IsNullOrWhiteSpace(u.Unit) ? null : u.Unit.Trim(),
            ProfileStatus = u.ProfileStatus,
            AdminComment = u.AdminComment,
            ProfileSubmittedAt = u.ProfileSubmittedAt,
            ProfileReviewedAt = u.ProfileReviewedAt,
            Phone = u.Phone,
            EmergencyContactName = u.EmergencyContactName,
            EmergencyContactPhone = u.EmergencyContactPhone,
            AboutMe = u.AboutMe,
        });
    }

    [HttpPut("{userId:int}")]
    public async Task<IActionResult> Update(int userId, [FromBody] UpdateOccupantRequest body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(body.Name) || string.IsNullOrWhiteSpace(body.Email))
            return BadRequest("Name and email are required.");

        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.Role == "Resident", cancellationToken);
        if (u is null)
            return NotFound();

        var email = body.Email.Trim();
        if (await db.Users.AnyAsync(x => x.Id != userId && x.Email.ToLower() == email.ToLower(), cancellationToken))
            return Conflict("A user with this email already exists.");

        if (body.BuildingId is int bid && !await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == bid, cancellationToken))
            return NotFound("Building not found.");

        u.Name = body.Name.Trim();
        u.Email = email;
        u.BuildingId = body.BuildingId;
        if (!string.IsNullOrEmpty(body.Password))
            u.Password = PasswordHashing.Hash(body.Password);

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { u.Id, u.Name, u.Email, u.BuildingId });
    }

    [HttpDelete("{userId:int}")]
    public async Task<IActionResult> Delete(int userId, CancellationToken cancellationToken)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.Role == "Resident", cancellationToken);
        if (u is null)
            return NotFound();

        db.Users.Remove(u);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOccupantRequest body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Name) || string.IsNullOrWhiteSpace(body.Password))
            return BadRequest("Email, name, and password are required.");
        var email = body.Email.Trim();
        if (await db.Users.AnyAsync(u => u.Email.ToLower() == email.ToLower(), cancellationToken))
            return Conflict("A user with this email already exists.");

        if (body.BuildingId is int bid && !await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == bid, cancellationToken))
            return NotFound("Building not found.");

        var entity = new UserEntity
        {
            Name = body.Name.Trim(),
            Email = email,
            Password = PasswordHashing.Hash(body.Password),
            Role = "Resident",
            Unit = "",
            BuildingId = body.BuildingId,
            UnitId = null,
            ProfileStatus = ResidentProfileStatus.PendingProfile,
        };
        db.Users.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        return Created($"/api/admin/occupants", new { entity.Id, entity.Email });
    }

    [HttpPost("{userId:int}/approve")]
    public async Task<IActionResult> Approve(int userId, CancellationToken cancellationToken)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.Role == "Resident", cancellationToken);
        if (u is null)
            return NotFound();
        if (u.ProfileStatus != ResidentProfileStatus.PendingReview)
            return BadRequest("Only profiles pending review can be approved.");

        u.ProfileStatus = ResidentProfileStatus.Approved;
        u.ProfileReviewedAt = DateTime.UtcNow;
        u.AdminComment = null;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { u.Id, u.ProfileStatus });
    }

    [HttpPost("{userId:int}/decline")]
    public async Task<IActionResult> Decline(int userId, [FromBody] DeclineOccupantRequest body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(body.Comment))
            return BadRequest("A comment is required when declining.");

        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == userId && x.Role == "Resident", cancellationToken);
        if (u is null)
            return NotFound();
        if (u.ProfileStatus != ResidentProfileStatus.PendingReview)
            return BadRequest("Only profiles pending review can be declined.");

        u.ProfileStatus = ResidentProfileStatus.Declined;
        u.AdminComment = body.Comment.Trim();
        u.ProfileReviewedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { u.Id, u.ProfileStatus, u.AdminComment });
    }
}
