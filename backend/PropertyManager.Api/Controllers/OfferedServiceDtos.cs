namespace PropertyManager.Api.Controllers;

/// <summary>Technician self-listed capability (technician CRUD + admin review).</summary>
public sealed record OfferedServiceResponse(
    int Id,
    string Title,
    string? Description,
    int SortOrder,
    DateTime CreatedAt,
    string ReviewStatus,
    string? AdminReviewNote,
    int? MappedCatalogItemId,
    string? MappedCatalogName);

public sealed record OfferedServiceWriteRequest(string? Title, string? Description, int? SortOrder);

/// <summary>Admin: approve (optionally link to office catalog) or reject.</summary>
public sealed record OfferedServiceAdminReviewRequest(
    /// <summary>approve | reject</summary>
    string? Decision,
    /// <summary>When approving: if set, map to this catalog row and add the technician to that office catalog assignment.</summary>
    int? CatalogItemId,
    /// <summary>When rejecting — optional message to the technician.</summary>
    string? Note);
