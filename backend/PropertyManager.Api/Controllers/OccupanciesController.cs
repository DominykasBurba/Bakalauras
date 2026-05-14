using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PropertyManager.Api.Data;
using PropertyManager.Api.Models;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
public sealed class OccupanciesController(AppDbContext db) : ControllerBase
{
    [HttpGet("api/occupancies")]
    public async Task<IActionResult> List([FromQuery] int? buildingId, [FromQuery] bool? currentOnly, CancellationToken cancellationToken)
    {
        var onlyOpen = currentOnly == true;
        var rows = await (
            from o in db.Occupancies.AsNoTracking()
            join u in db.Units.AsNoTracking() on o.UnitId equals u.Id
            join b in db.Buildings.AsNoTracking() on u.BuildingId equals b.Id
            join usr in db.Users.AsNoTracking() on o.UserId equals usr.Id
            where (buildingId == null || b.Id == buildingId) &&
                  (!onlyOpen || o.EndedAt == null)
            select new { o, u, b, usr }).ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var list = rows
            .OrderByDescending(x => x.o.EndedAt == null)
            .ThenByDescending(x => x.o.StartedAt)
            .Select(x => Map(x.o, x.u, x.b, x.usr, today))
            .ToList();
        return Ok(list);
    }

    [HttpPost("api/units/{unitId:int}/occupancies")]
    public async Task<IActionResult> Assign(int unitId, [FromBody] AssignOccupancyRequest body, CancellationToken cancellationToken)
    {
        var unit = await db.Units.FirstOrDefaultAsync(u => u.Id == unitId, cancellationToken);
        if (unit is null)
            return NotFound("Unit not found.");

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == body.UserId, cancellationToken);
        if (user is null)
            return NotFound("User not found.");
        if (!string.Equals(user.Role, "Resident", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only residents can be assigned to a unit.");

        if (body.LeaseEndDate is DateOnly le && le < body.StartedAt)
            return BadRequest("Lease end must be on or after the start date.");

        var building = await db.Buildings.AsNoTracking().FirstAsync(b => b.Id == unit.BuildingId, cancellationToken);

        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var end = DateOnly.FromDateTime(DateTime.UtcNow);
            var toClose = await db.Occupancies
                .Where(o => o.EndedAt == null && (o.UnitId == unitId || o.UserId == body.UserId))
                .ToListAsync(cancellationToken);
            foreach (var o in toClose)
                o.EndedAt = end;

            var occ = new OccupancyEntity
            {
                UnitId = unitId,
                UserId = body.UserId,
                StartedAt = body.StartedAt,
                EndedAt = null,
                LeaseEndDate = body.LeaseEndDate,
            };
            db.Occupancies.Add(occ);

            user.BuildingId = unit.BuildingId;
            user.UnitId = unitId;
            user.Unit = $"{building.Name}, Unit {unit.UnitCode}";

            await db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            return Ok(Map(occ, unit, building, user, today));
        }
        catch (DbUpdateException ex) when (IsPostgresUniqueViolation(ex))
        {
            await tx.RollbackAsync(cancellationToken);
            return Conflict("This resident already has an active occupancy. Refresh the page and try again.");
        }

    }

    private static bool IsPostgresUniqueViolation(DbUpdateException ex)
    {
        for (var e = ex.InnerException; e != null; e = e.InnerException)
        {
            if (e is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
                return true;
        }

        return false;
    }

    [HttpPost("api/occupancies/{occupancyId:int}/end")]
    public async Task<IActionResult> End(int occupancyId, [FromBody] EndOccupancyRequest? body, CancellationToken cancellationToken)
    {
        var occ = await db.Occupancies.FirstOrDefaultAsync(o => o.Id == occupancyId, cancellationToken);
        if (occ is null)
            return NotFound();
        if (occ.EndedAt != null)
            return BadRequest("This occupancy is already ended.");

        var end = body?.EndedAt ?? DateOnly.FromDateTime(DateTime.UtcNow);
        if (end < occ.StartedAt)
            return BadRequest("End date cannot be before the stay start date.");

        occ.EndedAt = end;
        occ.LeaseEndDate = null;

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == occ.UserId, cancellationToken);
        if (user?.UnitId == occ.UnitId)
        {
            user.UnitId = null;
            user.Unit = "";
        }

        await db.SaveChangesAsync(cancellationToken);

        var unit = await db.Units.AsNoTracking().FirstAsync(u => u.Id == occ.UnitId, cancellationToken);
        var building = await db.Buildings.AsNoTracking().FirstAsync(b => b.Id == unit.BuildingId, cancellationToken);
        var usr = await db.Users.AsNoTracking().FirstAsync(u => u.Id == occ.UserId, cancellationToken);
        return Ok(Map(occ, unit, building, usr, end));
    }

    private static OccupancyListItemDto Map(
        OccupancyEntity o,
        UnitEntity u,
        BuildingEntity b,
        UserEntity usr,
        DateOnly todayForCurrentDays)
    {
        int? days = o.EndedAt is null
            ? todayForCurrentDays.DayNumber - o.StartedAt.DayNumber
            : o.EndedAt.Value.DayNumber - o.StartedAt.DayNumber;

        return new OccupancyListItemDto
        {
            Id = o.Id,
            UnitId = u.Id,
            UnitCode = u.UnitCode,
            BuildingId = b.Id,
            BuildingName = b.Name,
            UserId = usr.Id,
            UserName = usr.Name,
            UserEmail = usr.Email,
            StartedAt = o.StartedAt,
            EndedAt = o.EndedAt,
            LeaseEndDate = o.EndedAt is null ? o.LeaseEndDate : null,
            DaysInUnit = days,
        };
    }
}
