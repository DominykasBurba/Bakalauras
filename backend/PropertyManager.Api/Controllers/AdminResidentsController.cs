using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Models;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/residents")]
public sealed class AdminResidentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? buildingId, CancellationToken cancellationToken)
    {
        var q = db.Users.AsNoTracking().Where(u => u.Role == "Resident");
        if (buildingId is int bid)
            q = q.Where(u => u.BuildingId == bid);

        var list = await q.OrderBy(u => u.Name).Select(u => new ResidentPickerDto
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            BuildingId = u.BuildingId,
        }).ToListAsync(cancellationToken);

        return Ok(list);
    }
}
