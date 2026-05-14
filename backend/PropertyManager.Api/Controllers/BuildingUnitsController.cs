using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Models;
using System.Text.Json;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/buildings/{buildingId:int}/units")]
public sealed class BuildingUnitsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(int buildingId, CancellationToken cancellationToken)
    {
        if (!await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == buildingId, cancellationToken))
            return NotFound("Building not found.");

        var list = await db.Units.AsNoTracking()
            .Where(u => u.BuildingId == buildingId)
            .OrderBy(u => u.UnitCode)
            .ToListAsync(cancellationToken);

        var activeRows = await (
            from o in db.Occupancies.AsNoTracking()
            join u in db.Units.AsNoTracking() on o.UnitId equals u.Id
            join usr in db.Users.AsNoTracking() on o.UserId equals usr.Id
            where u.BuildingId == buildingId && o.EndedAt == null
            select new { o.UnitId, usr.Name, usr.Email }
        ).ToListAsync(cancellationToken);
        var activeByUnit = activeRows
            .GroupBy(x => x.UnitId)
            .ToDictionary(g => g.Key, g => (g.First().Name, g.First().Email));

        return Ok(list.Select(u =>
        {
            if (activeByUnit.TryGetValue(u.Id, out var occ))
                return MapUnit(u, occ.Name, occ.Email);
            return MapUnit(u);
        }).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create(int buildingId, [FromBody] UnitWriteRequest body, CancellationToken cancellationToken)
    {
        if (!await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == buildingId, cancellationToken))
            return NotFound("Building not found.");
        if (string.IsNullOrWhiteSpace(body.UnitCode))
            return BadRequest("Unit code is required.");

        var code = body.UnitCode.Trim();
        if (await db.Units.AnyAsync(u => u.BuildingId == buildingId && u.UnitCode == code, cancellationToken))
            return Conflict("A unit with this code already exists in this building.");

        var entity = new UnitEntity
        {
            BuildingId = buildingId,
            UnitCode = code,
            Floor = string.IsNullOrWhiteSpace(body.Floor) ? null : body.Floor.Trim(),
            AreaSqm = body.AreaSqm,
            Notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim(),
            PhotoUrlsJson = JsonSerializer.Serialize(body.PhotoUrls ?? []),
        };
        db.Units.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/units/{entity.Id}", MapUnit(entity));
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
