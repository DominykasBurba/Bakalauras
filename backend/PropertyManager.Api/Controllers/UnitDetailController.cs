using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Models;
using System.Text.Json;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/units/{unitId:int}")]
public sealed class UnitDetailController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(int unitId, CancellationToken cancellationToken)
    {
        var u = await db.Units.AsNoTracking().FirstOrDefaultAsync(x => x.Id == unitId, cancellationToken);
        if (u is null)
            return NotFound();
        var active = await (
            from o in db.Occupancies.AsNoTracking()
            join usr in db.Users.AsNoTracking() on o.UserId equals usr.Id
            where o.UnitId == unitId && o.EndedAt == null
            select new { usr.Name, usr.Email }
        ).FirstOrDefaultAsync(cancellationToken);
        return Ok(MapUnit(u, active?.Name, active?.Email));
    }

    [HttpPut]
    public async Task<IActionResult> Update(int unitId, [FromBody] UnitWriteRequest body, CancellationToken cancellationToken)
    {
        var entity = await db.Units.FirstOrDefaultAsync(x => x.Id == unitId, cancellationToken);
        if (entity is null)
            return NotFound();
        if (string.IsNullOrWhiteSpace(body.UnitCode))
            return BadRequest("Unit code is required.");

        var code = body.UnitCode.Trim();
        if (await db.Units.AnyAsync(
                u => u.BuildingId == entity.BuildingId && u.UnitCode == code && u.Id != unitId,
                cancellationToken))
            return Conflict("A unit with this code already exists in this building.");

        entity.UnitCode = code;
        entity.Floor = string.IsNullOrWhiteSpace(body.Floor) ? null : body.Floor.Trim();
        entity.AreaSqm = body.AreaSqm;
        entity.Notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim();
        entity.PhotoUrlsJson = JsonSerializer.Serialize(body.PhotoUrls ?? []);
        await db.SaveChangesAsync(cancellationToken);
        var active = await (
            from o in db.Occupancies.AsNoTracking()
            join usr in db.Users.AsNoTracking() on o.UserId equals usr.Id
            where o.UnitId == unitId && o.EndedAt == null
            select new { usr.Name, usr.Email }
        ).FirstOrDefaultAsync(cancellationToken);
        return Ok(MapUnit(entity, active?.Name, active?.Email));
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(int unitId, CancellationToken cancellationToken)
    {
        var entity = await db.Units.FirstOrDefaultAsync(x => x.Id == unitId, cancellationToken);
        if (entity is null)
            return NotFound();
        if (await db.Occupancies.AnyAsync(o => o.UnitId == unitId, cancellationToken))
            return Conflict("Remove or end all occupancies for this unit before deleting it.");

        foreach (var user in await db.Users.Where(u => u.UnitId == unitId).ToListAsync(cancellationToken))
        {
            user.UnitId = null;
        }

        db.Units.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static UnitDto MapUnit(UnitEntity u, string? currentOccupantName = null, string? currentOccupantEmail = null) =>
        new()
        {
            Id = u.Id,
            BuildingId = u.BuildingId,
            UnitCode = u.UnitCode,
            Floor = u.Floor,
            AreaSqm = u.AreaSqm,
            Notes = u.Notes,
            PhotoUrls = DeserializePhotos(u.PhotoUrlsJson),
            CurrentOccupantName = currentOccupantName,
            CurrentOccupantEmail = currentOccupantEmail,
        };

    private static List<string> DeserializePhotos(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
