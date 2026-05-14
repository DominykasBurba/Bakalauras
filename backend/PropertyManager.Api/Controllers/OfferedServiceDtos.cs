namespace PropertyManager.Api.Controllers;

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

public sealed record OfferedServiceAdminReviewRequest(
    string? Decision,
    int? CatalogItemId,
    string? Note);

public sealed record PendingTechnicianOfferedServiceRow(
    int UserId,
    string TechnicianName,
    string TechnicianEmail,
    string? CompanyName,
    OfferedServiceResponse Service);
