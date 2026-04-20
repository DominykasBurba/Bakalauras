namespace PropertyManager.Api.Models.Dtos;

public sealed class ScheduledMaintenanceDto
{
    public int Id { get; init; }
    public int BuildingId { get; init; }
    public string? BuildingName { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }
    public DateOnly ScheduledDate { get; init; }
    public string? TimeWindow { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class CreateScheduledMaintenanceRequest
{
    public int BuildingId { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }
    public DateOnly ScheduledDate { get; init; }
    public string? TimeWindow { get; init; }
}
