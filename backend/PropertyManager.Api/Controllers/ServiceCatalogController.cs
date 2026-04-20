using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/admin/service-catalog")]
[Authorize(Roles = "Admin")]
public sealed class ServiceCatalogController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceCatalogItemDto>>> List(CancellationToken cancellationToken)
    {
        var rows = await db.ServiceCatalogItems.AsNoTracking()
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);
        var assignmentMap = await LoadAssignmentsByCatalogIdAsync(cancellationToken);
        return Ok(rows.Select(e =>
        {
            var (count, assigned) = assignmentMap.GetValueOrDefault(e.Id, (0, Array.Empty<ServiceCatalogTechnicianSummaryDto>()));
            return Map(e, count, assigned);
        }).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ServiceCatalogItemDto>> Create(
        [FromBody] ServiceCatalogWriteRequest body,
        CancellationToken cancellationToken)
    {
        var name = body.Name?.Trim() ?? "";
        if (name.Length == 0)
            return BadRequest("Name is required.");
        if (name.Length > 200)
            return BadRequest("Name must be at most 200 characters.");

        var desc = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim();
        if (desc is { Length: > 2000 })
            return BadRequest("Description must be at most 2000 characters.");

        var entity = new ServiceCatalogItemEntity
        {
            Name = name,
            Description = desc,
            SortOrder = body.SortOrder ?? 0,
            CreatedAt = DateTime.UtcNow,
        };
        db.ServiceCatalogItems.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/admin/service-catalog/{entity.Id}", Map(entity, 0, Array.Empty<ServiceCatalogTechnicianSummaryDto>()));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ServiceCatalogItemDto>> Update(
        int id,
        [FromBody] ServiceCatalogWriteRequest body,
        CancellationToken cancellationToken)
    {
        var entity = await db.ServiceCatalogItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
            return NotFound();

        var name = body.Name?.Trim() ?? "";
        if (name.Length == 0)
            return BadRequest("Name is required.");
        if (name.Length > 200)
            return BadRequest("Name must be at most 200 characters.");

        var desc = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim();
        if (desc is { Length: > 2000 })
            return BadRequest("Description must be at most 2000 characters.");

        entity.Name = name;
        entity.Description = desc;
        if (body.SortOrder.HasValue)
            entity.SortOrder = body.SortOrder.Value;
        await db.SaveChangesAsync(cancellationToken);
        var assignmentMap = await LoadAssignmentsByCatalogIdAsync(cancellationToken);
        var (count, summaries) = assignmentMap.GetValueOrDefault(id, (0, Array.Empty<ServiceCatalogTechnicianSummaryDto>()));
        return Ok(Map(entity, count, summaries));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var entity = await db.ServiceCatalogItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
            return NotFound();
        db.ServiceCatalogItems.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static ServiceCatalogItemDto Map(
        ServiceCatalogItemEntity e,
        int techniciansAssigned,
        IReadOnlyList<ServiceCatalogTechnicianSummaryDto> assignedTechnicians) =>
        new(
            e.Id,
            e.Name.Trim(),
            string.IsNullOrWhiteSpace(e.Description) ? null : e.Description.Trim(),
            e.SortOrder,
            e.CreatedAt,
            techniciansAssigned,
            assignedTechnicians);

    private async Task<Dictionary<int, (int Count, IReadOnlyList<ServiceCatalogTechnicianSummaryDto> Assigned)>> LoadAssignmentsByCatalogIdAsync(
        CancellationToken cancellationToken)
    {
        var linkRows = await (
            from l in db.TechnicianServiceCatalogLinks.AsNoTracking()
            join u in db.Users.AsNoTracking() on l.UserId equals u.Id
            join p in db.TechnicianProfiles.AsNoTracking() on u.Id equals p.UserId into pg
            from p in pg.DefaultIfEmpty()
            select new
            {
                l.CatalogItemId,
                l.UserId,
                Name = u.Name.Trim(),
                Email = u.Email.Trim(),
                CompanyName = p != null ? p.CompanyName : null,
            }).ToListAsync(cancellationToken);

        return linkRows
            .GroupBy(x => x.CatalogItemId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var list = g
                        .OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                        .Select(x => new ServiceCatalogTechnicianSummaryDto(
                            x.UserId,
                            x.Name,
                            x.Email,
                            string.IsNullOrWhiteSpace(x.CompanyName) ? null : x.CompanyName.Trim()))
                        .ToList();
                    return (list.Count, (IReadOnlyList<ServiceCatalogTechnicianSummaryDto>)list);
                });
    }
}

public sealed record ServiceCatalogTechnicianSummaryDto(
    int UserId,
    string Name,
    string Email,
    string? CompanyName);

public sealed record ServiceCatalogItemDto(
    int Id,
    string Name,
    string? Description,
    int SortOrder,
    DateTime CreatedAt,
    int TechniciansAssigned,
    IReadOnlyList<ServiceCatalogTechnicianSummaryDto> AssignedTechnicians);

public sealed record ServiceCatalogWriteRequest(string? Name, string? Description, int? SortOrder);
