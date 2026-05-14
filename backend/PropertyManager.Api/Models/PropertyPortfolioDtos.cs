namespace PropertyManager.Api.Models;

public sealed class BuildingImageDto
{
    public required int Id { get; init; }
    public required int BuildingId { get; init; }
    public required string ImageUrl { get; init; }
    public string? Caption { get; init; }
    public int SortOrder { get; init; }
}

public sealed class BuildingImageWriteRequest
{
    public required string ImageUrl { get; init; }
    public string? Caption { get; init; }
    public int SortOrder { get; init; }
}

public sealed class OccupancyListItemDto
{
    public required int Id { get; init; }
    public required int UnitId { get; init; }
    public required string UnitCode { get; init; }
    public required int BuildingId { get; init; }
    public required string BuildingName { get; init; }
    public required int UserId { get; init; }
    public required string UserName { get; init; }
    public required string UserEmail { get; init; }
    public required DateOnly StartedAt { get; init; }
    public DateOnly? EndedAt { get; init; }
    public DateOnly? LeaseEndDate { get; init; }
    public int? DaysInUnit { get; init; }
}

public sealed class AssignOccupancyRequest
{
    public required int UserId { get; init; }
    public required DateOnly StartedAt { get; init; }
    public DateOnly? LeaseEndDate { get; init; }
}

public sealed class EndOccupancyRequest
{
    public DateOnly? EndedAt { get; init; }
}

public sealed class ResidentPickerDto
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public int? BuildingId { get; init; }
}

public sealed class PropertyOverviewDto
{
    public required int? BuildingId { get; init; }
    public required string? BuildingName { get; init; }
    public int UnitsTotal { get; init; }
    public int UnitsWithCurrentOccupant { get; init; }
    public int BuildingImagesCount { get; init; }
    public int OpenMaintenanceRequests { get; init; }
    public List<OccupancyListItemDto> CurrentOccupancies { get; init; } = [];
}
