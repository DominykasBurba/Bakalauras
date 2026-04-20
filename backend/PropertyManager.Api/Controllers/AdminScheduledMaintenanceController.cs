using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Models.Dtos;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/scheduled-maintenance")]
public sealed class AdminScheduledMaintenanceController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? buildingId, CancellationToken cancellationToken)
    {
        var q = db.ScheduledMaintenance.AsNoTracking().AsQueryable();
        if (buildingId is int bid)
            q = q.Where(s => s.BuildingId == bid);

        var items = await q.OrderByDescending(s => s.CreatedAt).ToListAsync(cancellationToken);
        var names = await db.Buildings.AsNoTracking()
            .ToDictionaryAsync(b => b.Id, b => b.Name, cancellationToken);

        var list = items.Select(s => new ScheduledMaintenanceDto
        {
            Id = s.Id,
            BuildingId = s.BuildingId,
            BuildingName = names.TryGetValue(s.BuildingId, out var n) ? n : null,
            Title = s.Title,
            Description = s.Description,
            ScheduledDate = s.ScheduledDate,
            TimeWindow = s.TimeWindow,
            CreatedAt = s.CreatedAt,
        }).ToList();

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateScheduledMaintenanceRequest body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(body.Title))
            return BadRequest("Title is required.");
        if (body.ScheduledDate == default)
            return BadRequest("Scheduled date is required.");

        if (!await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == body.BuildingId, cancellationToken))
            return NotFound("Building not found.");

        var entity = new ScheduledMaintenanceEntity
        {
            BuildingId = body.BuildingId,
            Title = body.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim(),
            ScheduledDate = body.ScheduledDate,
            TimeWindow = string.IsNullOrWhiteSpace(body.TimeWindow) ? null : body.TimeWindow.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        db.ScheduledMaintenance.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/admin/scheduled-maintenance/{entity.Id}", new { entity.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateScheduledMaintenanceRequest body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(body.Title))
            return BadRequest("Title is required.");
        if (body.ScheduledDate == default)
            return BadRequest("Scheduled date is required.");

        if (!await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == body.BuildingId, cancellationToken))
            return NotFound("Building not found.");

        var entity = await db.ScheduledMaintenance.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (entity is null)
            return NotFound();

        entity.BuildingId = body.BuildingId;
        entity.Title = body.Title.Trim();
        entity.Description = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim();
        entity.ScheduledDate = body.ScheduledDate;
        entity.TimeWindow = string.IsNullOrWhiteSpace(body.TimeWindow) ? null : body.TimeWindow.Trim();

        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var entity = await db.ScheduledMaintenance.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (entity is null)
            return NotFound();
        db.ScheduledMaintenance.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
