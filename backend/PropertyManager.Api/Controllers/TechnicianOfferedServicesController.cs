using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/technician/offered-services")]
[Authorize(Roles = "Technician")]
public sealed class TechnicianOfferedServicesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OfferedServiceResponse>>> ListMine(CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        var rows = await db.TechnicianOfferedServices.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

        var names = await ResolveMappedCatalogNamesAsync(rows, cancellationToken);
        return Ok(rows.Select(e => OfferedServiceMapper.ToResponse(e, names)).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<OfferedServiceResponse>> Create(
        [FromBody] OfferedServiceWriteRequest body,
        CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        var title = body.Title?.Trim() ?? "";
        if (title.Length == 0)
            return BadRequest("Title is required.");
        if (title.Length > 500)
            return BadRequest("Title must be at most 500 characters.");

        var desc = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim();
        if (desc != null && desc.Length > 4000)
            return BadRequest("Description must be at most 4000 characters.");

        var entity = new TechnicianOfferedServiceEntity
        {
            UserId = userId,
            Title = title,
            Description = desc,
            SortOrder = body.SortOrder ?? 0,
            CreatedAt = DateTime.UtcNow,
            ReviewStatus = OfferedServiceReviewStatus.PendingReview,
            AdminReviewNote = null,
            MappedCatalogItemId = null,
        };
        db.TechnicianOfferedServices.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return Created(
            $"/api/technician/offered-services/{entity.Id}",
            OfferedServiceMapper.ToResponse(entity, new Dictionary<int, string>()));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<OfferedServiceResponse>> Update(
        int id,
        [FromBody] OfferedServiceWriteRequest body,
        CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        var title = body.Title?.Trim() ?? "";
        if (title.Length == 0)
            return BadRequest("Title is required.");
        if (title.Length > 500)
            return BadRequest("Title must be at most 500 characters.");

        var desc = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description.Trim();
        if (desc != null && desc.Length > 4000)
            return BadRequest("Description must be at most 4000 characters.");

        var entity = await db.TechnicianOfferedServices.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null || entity.UserId != userId)
            return NotFound();

        entity.Title = title;
        entity.Description = desc;
        entity.SortOrder = body.SortOrder ?? entity.SortOrder;

        if (string.Equals(entity.ReviewStatus, OfferedServiceReviewStatus.Rejected, StringComparison.OrdinalIgnoreCase))
        {
            entity.ReviewStatus = OfferedServiceReviewStatus.PendingReview;
            entity.AdminReviewNote = null;
        }

        await db.SaveChangesAsync(cancellationToken);
        var names = await ResolveMappedCatalogNamesAsync([entity], cancellationToken);
        return Ok(OfferedServiceMapper.ToResponse(entity, names));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        var entity = await db.TechnicianOfferedServices.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null || entity.UserId != userId)
            return NotFound();

        db.TechnicianOfferedServices.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<Dictionary<int, string>> ResolveMappedCatalogNamesAsync(
        IReadOnlyList<TechnicianOfferedServiceEntity> rows,
        CancellationToken cancellationToken)
    {
        var ids = rows.Select(r => r.MappedCatalogItemId).Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<int, string>();

        return await db.ServiceCatalogItems.AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name.Trim(), cancellationToken);
    }

}
