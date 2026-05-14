using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models.Dtos;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/scheduled-maintenance")]
[Authorize]
public sealed class ScheduledMaintenanceController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListMine(CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        if (User.IsInRole("Admin"))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                "Admins should use GET /api/admin/scheduled-maintenance.");
        }

        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (u is null)
            return Unauthorized();
        if (u.BuildingId is not int bid)
            return Ok(Array.Empty<ScheduledMaintenanceDto>());

        var buildingName = await db.Buildings.AsNoTracking()
            .Where(b => b.Id == bid)
            .Select(b => b.Name)
            .FirstOrDefaultAsync(cancellationToken);

        var rows = await db.ScheduledMaintenance.AsNoTracking()
            .Where(s => s.BuildingId == bid)
            .OrderBy(s => s.ScheduledDate)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

        var list = rows.Select(s => new ScheduledMaintenanceDto
        {
            Id = s.Id,
            BuildingId = s.BuildingId,
            BuildingName = string.IsNullOrEmpty(buildingName) ? null : buildingName,
            Title = s.Title,
            Description = s.Description,
            ScheduledDate = s.ScheduledDate,
            TimeWindow = s.TimeWindow,
            CreatedAt = s.CreatedAt,
        }).ToList();

        return Ok(list);
    }
}
