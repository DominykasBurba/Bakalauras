using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/dashboard/property-overview")]
public sealed class PropertyOverviewController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? buildingId, CancellationToken cancellationToken)
    {
        if (buildingId is int bid && !await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == bid, cancellationToken))
            return NotFound("Building not found.");

        BuildingEntity? building = null;
        if (buildingId is int b)
            building = await db.Buildings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == b, cancellationToken);

        var unitsQ = db.Units.AsNoTracking();
        if (buildingId is int ub)
            unitsQ = unitsQ.Where(u => u.BuildingId == ub);
        var unitsTotal = await unitsQ.CountAsync(cancellationToken);

        var unitIds = await unitsQ.Select(u => u.Id).ToListAsync(cancellationToken);
        var withCurrent = unitIds.Count == 0
            ? 0
            : await db.Occupancies.AsNoTracking()
                .Where(o => unitIds.Contains(o.UnitId) && o.EndedAt == null)
                .Select(o => o.UnitId)
                .Distinct()
                .CountAsync(cancellationToken);

        var imgQ = db.BuildingImages.AsNoTracking();
        if (buildingId is int ib)
            imgQ = imgQ.Where(i => i.BuildingId == ib);
        var imgCount = await imgQ.CountAsync(cancellationToken);

        var completedLc = MaintenanceWorkflow.Completed.ToLowerInvariant();
        var declinedLc = MaintenanceWorkflow.Declined.ToLowerInvariant();
        var reqQ = db.MaintenanceRequests.AsNoTracking().Where(r =>
            r.Status.ToLower() != completedLc && r.Status.ToLower() != declinedLc);
        if (buildingId is int rb)
            reqQ = reqQ.Where(r => r.BuildingId == rb);
        var openReq = await reqQ.CountAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var occQ =
            from o in db.Occupancies.AsNoTracking()
            join u in db.Units.AsNoTracking() on o.UnitId equals u.Id
            join bd in db.Buildings.AsNoTracking() on u.BuildingId equals bd.Id
            join usr in db.Users.AsNoTracking() on o.UserId equals usr.Id
            where o.EndedAt == null && (buildingId == null || bd.Id == buildingId)
            select new { o, u, b = bd, usr };

        var currentRows = await occQ.ToListAsync(cancellationToken);
        var current = currentRows.Select(x => new OccupancyListItemDto
        {
            Id = x.o.Id,
            UnitId = x.u.Id,
            UnitCode = x.u.UnitCode,
            BuildingId = x.b.Id,
            BuildingName = x.b.Name,
            UserId = x.usr.Id,
            UserName = x.usr.Name,
            UserEmail = x.usr.Email,
            StartedAt = x.o.StartedAt,
            EndedAt = x.o.EndedAt,
            LeaseEndDate = x.o.LeaseEndDate,
            DaysInUnit = today.DayNumber - x.o.StartedAt.DayNumber,
        }).ToList();

        var dto = new PropertyOverviewDto
        {
            BuildingId = buildingId,
            BuildingName = building?.Name,
            UnitsTotal = unitsTotal,
            UnitsWithCurrentOccupant = withCurrent,
            BuildingImagesCount = imgCount,
            OpenMaintenanceRequests = openReq,
            CurrentOccupancies = current,
        };

        return Ok(dto);
    }
}
