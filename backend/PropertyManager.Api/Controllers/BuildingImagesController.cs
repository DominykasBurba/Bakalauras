using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Models;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/buildings/{buildingId:int}/images")]
public sealed class BuildingImagesListController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(int buildingId, CancellationToken cancellationToken)
    {
        if (!await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == buildingId, cancellationToken))
            return NotFound("Building not found.");

        var list = await db.BuildingImages.AsNoTracking()
            .Where(i => i.BuildingId == buildingId)
            .OrderBy(i => i.SortOrder)
            .ThenBy(i => i.Id)
            .ToListAsync(cancellationToken);
        return Ok(list.Select(Map).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create(int buildingId, [FromBody] BuildingImageWriteRequest body, CancellationToken cancellationToken)
    {
        if (!await db.Buildings.AsNoTracking().AnyAsync(b => b.Id == buildingId, cancellationToken))
            return NotFound("Building not found.");
        if (string.IsNullOrWhiteSpace(body.ImageUrl))
            return BadRequest("Image URL is required.");

        var entity = new BuildingImageEntity
        {
            BuildingId = buildingId,
            ImageUrl = body.ImageUrl.Trim(),
            Caption = string.IsNullOrWhiteSpace(body.Caption) ? null : body.Caption.Trim(),
            SortOrder = body.SortOrder,
        };
        db.BuildingImages.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/building-images/{entity.Id}", Map(entity));
    }

    private static BuildingImageDto Map(BuildingImageEntity i) =>
        new()
        {
            Id = i.Id,
            BuildingId = i.BuildingId,
            ImageUrl = i.ImageUrl,
            Caption = i.Caption,
            SortOrder = i.SortOrder,
        };
}

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/building-images/{imageId:int}")]
public sealed class BuildingImageDetailController(AppDbContext db) : ControllerBase
{
    [HttpDelete]
    public async Task<IActionResult> Delete(int imageId, CancellationToken cancellationToken)
    {
        var entity = await db.BuildingImages.FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);
        if (entity is null)
            return NotFound();
        db.BuildingImages.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
