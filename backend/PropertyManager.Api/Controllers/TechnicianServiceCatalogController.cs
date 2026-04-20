using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;

namespace PropertyManager.Api.Controllers;

/// <summary>Technician: read-only list of catalog services assigned by admin.</summary>
[ApiController]
[Route("api/technician/service-catalog")]
[Authorize(Roles = "Technician")]
public sealed class TechnicianServiceCatalogController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceCatalogItemDto>>> ListMine(CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        var ids = await db.TechnicianServiceCatalogLinks.AsNoTracking()
            .Where(l => l.UserId == userId)
            .Select(l => l.CatalogItemId)
            .ToListAsync(cancellationToken);

        if (ids.Count == 0)
            return Ok(Array.Empty<ServiceCatalogItemDto>());

        var items = await db.ServiceCatalogItems.AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);

        return Ok(items.Select(Map).ToList());
    }

    private static ServiceCatalogItemDto Map(ServiceCatalogItemEntity e) =>
        new(
            e.Id,
            e.Name.Trim(),
            string.IsNullOrWhiteSpace(e.Description) ? null : e.Description.Trim(),
            e.SortOrder,
            e.CreatedAt,
            0,
            Array.Empty<ServiceCatalogTechnicianSummaryDto>());
}
