namespace PropertyManager.Api.Models;

public sealed class TechnicianSiteUpdateHistoryEntry
{
    public DateTimeOffset At { get; init; }
    public string? SiteUpdate { get; init; }
    public string? MaterialsUsed { get; init; }
    public DateOnly? ExpectedReturnDate { get; init; }
    public string? OfficeNotes { get; init; }
}
