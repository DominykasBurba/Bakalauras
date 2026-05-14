using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/admin/offered-services")]
[Authorize(Roles = "Admin")]
public sealed class AdminOfferedServicesController(AppDbContext db) : ControllerBase
{
    [HttpGet("pending-review")]
    public async Task<ActionResult<IReadOnlyList<PendingTechnicianOfferedServiceRow>>> ListPending(
        CancellationToken cancellationToken)
    {
        var rows = await db.TechnicianOfferedServices.AsNoTracking()
            .Where(s => s.ReviewStatus == OfferedServiceReviewStatus.PendingReview)
            .OrderByDescending(s => s.CreatedAt)
            .ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
            return Ok(Array.Empty<PendingTechnicianOfferedServiceRow>());

        var userIds = rows.Select(s => s.UserId).Distinct().ToList();
        var users = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u, cancellationToken);
        var profiles = await db.TechnicianProfiles.AsNoTracking()
            .Where(p => userIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, p => p, cancellationToken);
        var nameDict = await BuildCatalogNameDictForServicesAsync(rows, cancellationToken);

        var list = new List<PendingTechnicianOfferedServiceRow>(rows.Count);
        foreach (var e in rows)
        {
            if (!users.TryGetValue(e.UserId, out var u))
                continue;
            profiles.TryGetValue(e.UserId, out var prof);
            var company = prof?.CompanyName?.Trim();
            list.Add(new PendingTechnicianOfferedServiceRow(
                u.Id,
                u.Name.Trim(),
                u.Email.Trim(),
                string.IsNullOrEmpty(company) ? null : company,
                OfferedServiceMapper.ToResponse(e, nameDict)));
        }

        return Ok(list);
    }

    private async Task<Dictionary<int, string>> BuildCatalogNameDictForServicesAsync(
        IEnumerable<TechnicianOfferedServiceEntity> services,
        CancellationToken cancellationToken)
    {
        var ids = services
            .Select(s => s.MappedCatalogItemId)
            .Where(i => i.HasValue)
            .Select(i => i!.Value)
            .Distinct()
            .ToList();
        if (ids.Count == 0)
            return new Dictionary<int, string>();

        return await db.ServiceCatalogItems.AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name.Trim(), cancellationToken);
    }
}
