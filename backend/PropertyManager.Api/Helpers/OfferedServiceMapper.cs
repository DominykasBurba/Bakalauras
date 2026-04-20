using PropertyManager.Api.Controllers;
using PropertyManager.Api.Data;

namespace PropertyManager.Api.Helpers;

public static class OfferedServiceMapper
{
    public static OfferedServiceResponse ToResponse(
        TechnicianOfferedServiceEntity e,
        IReadOnlyDictionary<int, string> catalogNames)
    {
        string? mappedName = null;
        if (e.MappedCatalogItemId is { } mid && catalogNames.TryGetValue(mid, out var nm))
            mappedName = nm;
        return new OfferedServiceResponse(
            e.Id,
            e.Title.Trim(),
            string.IsNullOrWhiteSpace(e.Description) ? null : e.Description.Trim(),
            e.SortOrder,
            e.CreatedAt,
            e.ReviewStatus.Trim(),
            string.IsNullOrWhiteSpace(e.AdminReviewNote) ? null : e.AdminReviewNote.Trim(),
            e.MappedCatalogItemId,
            mappedName);
    }
}
