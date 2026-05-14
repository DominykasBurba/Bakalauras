using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/admin/technicians")]
[Authorize(Roles = "Admin")]
public sealed class AdminTechniciansController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TechnicianDirectoryRowDto>>> List(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var techs = await db.Users.AsNoTracking()
            .Where(u => u.Role == "Technician")
            .OrderBy(u => u.Name)
            .ToListAsync(cancellationToken);

        var profiles = await db.TechnicianProfiles.AsNoTracking()
            .ToDictionaryAsync(p => p.UserId, cancellationToken);

        var techIds = techs.Select(t => t.Id).ToList();

        var catalogByUser = new Dictionary<int, List<string>>();
        if (techIds.Count > 0)
        {
            var linkRows = await db.TechnicianServiceCatalogLinks.AsNoTracking()
                .Where(l => techIds.Contains(l.UserId))
                .ToListAsync(cancellationToken);
            var catIds = linkRows.Select(l => l.CatalogItemId).Distinct().ToList();
            var catNamesById = catIds.Count == 0
                ? new Dictionary<int, string>()
                : await db.ServiceCatalogItems.AsNoTracking()
                    .Where(c => catIds.Contains(c.Id))
                    .ToDictionaryAsync(c => c.Id, c => c.Name.Trim(), cancellationToken);

            foreach (var l in linkRows)
            {
                if (!catNamesById.TryGetValue(l.CatalogItemId, out var nm))
                    continue;
                if (!catalogByUser.TryGetValue(l.UserId, out var list))
                {
                    list = [];
                    catalogByUser[l.UserId] = list;
                }

                list.Add(nm);
            }

            foreach (var kv in catalogByUser)
                kv.Value.Sort(StringComparer.OrdinalIgnoreCase);
        }

        Dictionary<int, List<string>> offeredByUser = [];
        Dictionary<int, int> pendingOfferedByUser = [];
        if (techIds.Count > 0)
        {
            var offeredRows = await db.TechnicianOfferedServices.AsNoTracking()
                .Where(s => techIds.Contains(s.UserId))
                .OrderBy(s => s.UserId).ThenBy(s => s.SortOrder).ThenBy(s => s.Id)
                .ToListAsync(cancellationToken);
            offeredByUser = offeredRows
                .GroupBy(s => s.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => g
                        .Where(s => string.Equals(s.ReviewStatus, OfferedServiceReviewStatus.Approved, StringComparison.OrdinalIgnoreCase))
                        .Select(s => s.Title.Trim())
                        .ToList());
            pendingOfferedByUser = offeredRows
                .GroupBy(s => s.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Count(s => string.Equals(s.ReviewStatus, OfferedServiceReviewStatus.PendingReview, StringComparison.OrdinalIgnoreCase)));
        }

        var rows = new List<TechnicianDirectoryRowDto>();
        foreach (var u in techs)
        {
            profiles.TryGetValue(u.Id, out var prof);
            var (active, completed) = await CountJobsForTechnicianAsync(u.Name, cancellationToken);
            var health = TechnicianCompliance.ComplianceHealth(prof, today);
            var catalogNames = (IReadOnlyList<string>)(catalogByUser.GetValueOrDefault(u.Id) ?? []);
            var offeredTitles = (IReadOnlyList<string>)(offeredByUser.GetValueOrDefault(u.Id) ?? []);
            var pendingOffered = pendingOfferedByUser.GetValueOrDefault(u.Id, 0);
            rows.Add(new TechnicianDirectoryRowDto(
                u.Id,
                u.Name,
                u.Email.Trim(),
                u.Unit?.Trim(),
                active,
                completed,
                health,
                catalogNames,
                offeredTitles,
                pendingOffered));
        }

        return Ok(rows);
    }

    [HttpGet("names")]
    public async Task<ActionResult<IReadOnlyList<TechnicianNameOptionDto>>> Names(
        [FromQuery] int? catalogItemId,
        CancellationToken cancellationToken)
    {
        var q = db.Users.AsNoTracking().Where(u => u.Role == "Technician");
        if (catalogItemId.HasValue && catalogItemId.Value > 0)
        {
            var cid = catalogItemId.Value;
            q = q.Where(u => db.TechnicianServiceCatalogLinks.Any(
                l => l.UserId == u.Id && l.CatalogItemId == cid));
        }

        var list = await q.OrderBy(u => u.Name)
            .Select(u => new TechnicianNameOptionDto(u.Id, u.Name.Trim()))
            .ToListAsync(cancellationToken);
        return Ok(list);
    }

    [HttpGet("{userId:int}")]
    public async Task<ActionResult<TechnicianDetailDto>> GetById(int userId, CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || !string.Equals(user.Role, "Technician", StringComparison.OrdinalIgnoreCase))
            return NotFound();

        var profile = await db.TechnicianProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        var services = await db.TechnicianOfferedServices.AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

        var (active, completed) = await CountJobsForTechnicianAsync(user.Name, cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var catalog = await GetCatalogForUserAsync(userId, cancellationToken);
        var nameDict = await BuildCatalogNameDictAsync(services, cancellationToken);
        var offeredResponses = services.Select(s => OfferedServiceMapper.ToResponse(s, nameDict)).ToList();
        var approvedOfferedCount = services.Count(s =>
            string.Equals(s.ReviewStatus, OfferedServiceReviewStatus.Approved, StringComparison.OrdinalIgnoreCase));

        return Ok(new TechnicianDetailDto(
            user.Id,
            user.Name.Trim(),
            user.Email.Trim(),
            user.Unit?.Trim(),
            MapProfile(profile),
            offeredResponses,
            catalog,
            new TechnicianMetricsDto(active, completed),
            TechnicianCompliance.BuildWarnings(profile, today, approvedOfferedCount, true)));
    }

    [HttpPut("{userId:int}/catalog-services")]
    public async Task<IActionResult> PutCatalogServices(
        int userId,
        [FromBody] TechnicianCatalogServicesWriteRequest body,
        CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || !string.Equals(user.Role, "Technician", StringComparison.OrdinalIgnoreCase))
            return NotFound();

        var ids = body.CatalogItemIds?.Distinct().ToList() ?? [];
        if (ids.Count > 0)
        {
            var validCount = await db.ServiceCatalogItems.AsNoTracking()
                .CountAsync(c => ids.Contains(c.Id), cancellationToken);
            if (validCount != ids.Count)
                return BadRequest("One or more catalog item ids are invalid.");
        }

        var existing = await db.TechnicianServiceCatalogLinks
            .Where(l => l.UserId == userId)
            .ToListAsync(cancellationToken);
        db.TechnicianServiceCatalogLinks.RemoveRange(existing);
        foreach (var cid in ids)
        {
            db.TechnicianServiceCatalogLinks.Add(new TechnicianServiceCatalogLinkEntity
            {
                UserId = userId,
                CatalogItemId = cid,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPut("{userId:int}/profile")]
    public async Task<ActionResult<TechnicianProfileDto>> UpsertProfile(
        int userId,
        [FromBody] TechnicianProfileWriteRequest body,
        CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || !string.Equals(user.Role, "Technician", StringComparison.OrdinalIgnoreCase))
            return NotFound();

        var entity = await db.TechnicianProfiles.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        if (entity is null)
        {
            entity = new TechnicianProfileEntity { UserId = userId };
            db.TechnicianProfiles.Add(entity);
        }

        entity.CompanyName = NullIfEmpty(body.CompanyName);
        entity.ContractorType = NullIfEmpty(body.ContractorType);
        entity.LicenseNumber = NullIfEmpty(body.LicenseNumber);
        entity.LicenseExpiry = body.LicenseExpiry;
        entity.CoiExpiry = body.CoiExpiry;
        entity.WorkersCompExpiry = body.WorkersCompExpiry;
        if (body.W9OnFile.HasValue) entity.W9OnFile = body.W9OnFile.Value;
        if (body.BackgroundCheckOnFile.HasValue) entity.BackgroundCheckOnFile = body.BackgroundCheckOnFile.Value;
        if (body.AfterHoursOnCall.HasValue) entity.AfterHoursOnCall = body.AfterHoursOnCall.Value;
        if (body.PoRequired.HasValue) entity.PoRequired = body.PoRequired.Value;
        entity.BillingEmail = NullIfEmpty(body.BillingEmail);
        entity.BillingPhone = NullIfEmpty(body.BillingPhone);
        entity.RateNotes = NullIfEmpty(body.RateNotes);
        entity.ServiceAreaNotes = NullIfEmpty(body.ServiceAreaNotes);
        entity.InternalNotes = NullIfEmpty(body.InternalNotes);
        entity.AdditionalInsuredEntity = NullIfEmpty(body.AdditionalInsuredEntity);
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        var fresh = await db.TechnicianProfiles.AsNoTracking().FirstAsync(p => p.UserId == userId, cancellationToken);
        return Ok(MapProfile(fresh)!);
    }

    [HttpGet("assignment-context")]
    public async Task<ActionResult<TechnicianAssignmentContextDto>> AssignmentContext(
        [FromQuery] string? name,
        CancellationToken cancellationToken)
    {
        var raw = name?.Trim() ?? "";
        if (raw.Length == 0 || string.Equals(raw, "Not assigned", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new TechnicianAssignmentContextDto(
                null,
                null,
                null,
                [],
                [],
                new TechnicianMetricsDto(0, 0),
                ["Choose a technician to see offered services, compliance, and workload."],
                null));
        }

        var user = await db.Users.AsNoTracking()
            .Where(u => u.Role == "Technician")
            .ToListAsync(cancellationToken);
        var match = user.FirstOrDefault(u => string.Equals(u.Name.Trim(), raw, StringComparison.OrdinalIgnoreCase));
        if (match is null)
        {
            return Ok(new TechnicianAssignmentContextDto(
                null,
                raw,
                null,
                [],
                [],
                new TechnicianMetricsDto(0, 0),
                TechnicianCompliance.BuildWarnings(null, DateOnly.FromDateTime(DateTime.UtcNow), 0, false),
                null));
        }

        var profile = await db.TechnicianProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == match.Id, cancellationToken);
        var services = await db.TechnicianOfferedServices.AsNoTracking()
            .Where(s => s.UserId == match.Id)
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);

        var approvedOffered = services
            .Where(s => string.Equals(s.ReviewStatus, OfferedServiceReviewStatus.Approved, StringComparison.OrdinalIgnoreCase))
            .ToList();
        var nameDict = await BuildCatalogNameDictAsync(approvedOffered, cancellationToken);
        var offeredForAssignment = approvedOffered.Select(s => OfferedServiceMapper.ToResponse(s, nameDict)).ToList();

        var (active, completed) = await CountJobsForTechnicianAsync(match.Name, cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var warnings = TechnicianCompliance.BuildWarnings(profile, today, approvedOffered.Count, true);
        var assignmentBlockReason = TechnicianCompliance.GetAssignmentBlockReason(profile, today);
        var catalog = await GetCatalogForUserAsync(match.Id, cancellationToken);

        return Ok(new TechnicianAssignmentContextDto(
            match.Id,
            match.Name.Trim(),
            MapProfile(profile),
            offeredForAssignment,
            catalog,
            new TechnicianMetricsDto(active, completed),
            warnings,
            assignmentBlockReason));
    }

    [HttpPut("{userId:int}/offered-services/{id:int}/review")]
    public async Task<ActionResult<OfferedServiceResponse>> ReviewOfferedService(
        int userId,
        int id,
        [FromBody] OfferedServiceAdminReviewRequest body,
        CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || !string.Equals(user.Role, "Technician", StringComparison.OrdinalIgnoreCase))
            return NotFound();

        var entity = await db.TechnicianOfferedServices.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);
        if (entity is null)
            return NotFound();

        var decision = body.Decision?.Trim().ToLowerInvariant() ?? "";
        if (decision == "approve")
        {
            entity.ReviewStatus = OfferedServiceReviewStatus.Approved;
            entity.AdminReviewNote = null;
            if (body.CatalogItemId is > 0)
            {
                var catalogExists = await db.ServiceCatalogItems.AsNoTracking()
                    .AnyAsync(c => c.Id == body.CatalogItemId.Value, cancellationToken);
                if (!catalogExists)
                    return BadRequest("Unknown office catalog service.");
                entity.MappedCatalogItemId = body.CatalogItemId.Value;
                var hasLink = await db.TechnicianServiceCatalogLinks.AsNoTracking()
                    .AnyAsync(l => l.UserId == userId && l.CatalogItemId == body.CatalogItemId.Value, cancellationToken);
                if (!hasLink)
                {
                    db.TechnicianServiceCatalogLinks.Add(new TechnicianServiceCatalogLinkEntity
                    {
                        UserId = userId,
                        CatalogItemId = body.CatalogItemId.Value,
                    });
                }
            }
        }
        else if (decision == "reject")
        {
            entity.ReviewStatus = OfferedServiceReviewStatus.Rejected;
            entity.AdminReviewNote = string.IsNullOrWhiteSpace(body.Note) ? null : body.Note.Trim();
            entity.MappedCatalogItemId = null;
        }
        else
        {
            return BadRequest("Decision must be approve or reject.");
        }

        await db.SaveChangesAsync(cancellationToken);
        var fresh = await db.TechnicianOfferedServices.AsNoTracking().FirstAsync(x => x.Id == id, cancellationToken);
        var dict = await BuildCatalogNameDictAsync(new[] { fresh }, cancellationToken);
        return Ok(OfferedServiceMapper.ToResponse(fresh, dict));
    }

    private async Task<Dictionary<int, string>> BuildCatalogNameDictAsync(
        IEnumerable<TechnicianOfferedServiceEntity> services,
        CancellationToken cancellationToken)
    {
        var ids = services.Select(s => s.MappedCatalogItemId).Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<int, string>();

        return await db.ServiceCatalogItems.AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.Name.Trim(), cancellationToken);
    }

    private async Task<IReadOnlyList<ServiceCatalogItemDto>> GetCatalogForUserAsync(int userId, CancellationToken cancellationToken)
    {
        var ids = await db.TechnicianServiceCatalogLinks.AsNoTracking()
            .Where(l => l.UserId == userId)
            .Select(l => l.CatalogItemId)
            .ToListAsync(cancellationToken);
        if (ids.Count == 0)
            return Array.Empty<ServiceCatalogItemDto>();

        var items = await db.ServiceCatalogItems.AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);
        return items.Select(MapCatalogItem).ToList();
    }

    private static ServiceCatalogItemDto MapCatalogItem(ServiceCatalogItemEntity e) =>
        new(
            e.Id,
            e.Name.Trim(),
            string.IsNullOrWhiteSpace(e.Description) ? null : e.Description.Trim(),
            e.SortOrder,
            e.CreatedAt,
            0,
            Array.Empty<ServiceCatalogTechnicianSummaryDto>());

    private async Task<(int Active, int Completed)> CountJobsForTechnicianAsync(string technicianName, CancellationToken cancellationToken)
    {
        var needle = technicianName.Trim().ToLowerInvariant();
        var statuses = await db.MaintenanceRequests.AsNoTracking()
            .Where(r => r.AssignedTechnician != null &&
                        r.AssignedTechnician.Trim().ToLower() == needle)
            .Select(r => r.Status)
            .ToListAsync(cancellationToken);

        var completed = statuses.Count(s => string.Equals(s, MaintenanceWorkflow.Completed, StringComparison.OrdinalIgnoreCase));
        var active = statuses.Count - completed;
        return (active, completed);
    }

    private static string? NullIfEmpty(string? s)
    {
        var t = s?.Trim();
        return string.IsNullOrEmpty(t) ? null : t;
    }

    private static TechnicianProfileDto? MapProfile(TechnicianProfileEntity? p)
    {
        if (p is null) return null;
        return new TechnicianProfileDto(
            p.UserId,
            p.CompanyName,
            p.ContractorType,
            p.LicenseNumber,
            p.LicenseExpiry,
            p.CoiExpiry,
            p.WorkersCompExpiry,
            p.W9OnFile,
            p.BackgroundCheckOnFile,
            p.AfterHoursOnCall,
            p.PoRequired,
            p.BillingEmail,
            p.BillingPhone,
            p.RateNotes,
            p.ServiceAreaNotes,
            p.InternalNotes,
            p.AdditionalInsuredEntity,
            p.UpdatedAt);
    }
}

public sealed record TechnicianNameOptionDto(int UserId, string Name);

public sealed record TechnicianDirectoryRowDto(
    int UserId,
    string Name,
    string Email,
    string? UnitLabel,
    int ActiveJobs,
    int CompletedJobs,
    string ComplianceHealth,
    IReadOnlyList<string> CatalogServiceNames,
    IReadOnlyList<string> OfferedServiceTitles,
    int PendingOfferedReviewCount);

public sealed record TechnicianMetricsDto(int ActiveJobs, int CompletedJobs);

public sealed record TechnicianProfileDto(
    int UserId,
    string? CompanyName,
    string? ContractorType,
    string? LicenseNumber,
    DateOnly? LicenseExpiry,
    DateOnly? CoiExpiry,
    DateOnly? WorkersCompExpiry,
    bool W9OnFile,
    bool BackgroundCheckOnFile,
    bool AfterHoursOnCall,
    bool PoRequired,
    string? BillingEmail,
    string? BillingPhone,
    string? RateNotes,
    string? ServiceAreaNotes,
    string? InternalNotes,
    string? AdditionalInsuredEntity,
    DateTimeOffset UpdatedAt);

public sealed record TechnicianProfileWriteRequest(
    string? CompanyName,
    string? ContractorType,
    string? LicenseNumber,
    DateOnly? LicenseExpiry,
    DateOnly? CoiExpiry,
    DateOnly? WorkersCompExpiry,
    bool? W9OnFile,
    bool? BackgroundCheckOnFile,
    bool? AfterHoursOnCall,
    bool? PoRequired,
    string? BillingEmail,
    string? BillingPhone,
    string? RateNotes,
    string? ServiceAreaNotes,
    string? InternalNotes,
    string? AdditionalInsuredEntity);

public sealed record TechnicianDetailDto(
    int UserId,
    string Name,
    string Email,
    string? UnitLabel,
    TechnicianProfileDto? Profile,
    IReadOnlyList<OfferedServiceResponse> OfferedServices,
    IReadOnlyList<ServiceCatalogItemDto> CatalogServices,
    TechnicianMetricsDto Metrics,
    IReadOnlyList<string> ComplianceWarnings);

public sealed record TechnicianCatalogServicesWriteRequest(IReadOnlyList<int>? CatalogItemIds);

public sealed record TechnicianAssignmentContextDto(
    int? UserId,
    string? Name,
    TechnicianProfileDto? Profile,
    IReadOnlyList<OfferedServiceResponse> OfferedServices,
    IReadOnlyList<ServiceCatalogItemDto> CatalogServices,
    TechnicianMetricsDto Metrics,
    IReadOnlyList<string> Warnings,
    string? AssignmentBlockReason);
