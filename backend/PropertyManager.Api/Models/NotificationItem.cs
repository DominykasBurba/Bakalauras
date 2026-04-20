namespace PropertyManager.Api.Models;

public sealed class NotificationItem
{
    public required int Id { get; init; }
    public int UserId { get; init; }
    public required string Message { get; init; }
    public required string RelativeTime { get; init; }
    public bool IsRead { get; init; }
    public int? BuildingId { get; init; }
    /// <summary>UpcomingMaintenance, General, or null for legacy rows.</summary>
    public string? Category { get; init; }
}
