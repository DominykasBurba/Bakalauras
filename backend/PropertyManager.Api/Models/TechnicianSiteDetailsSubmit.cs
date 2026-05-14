namespace PropertyManager.Api.Models;

public sealed class TechnicianSiteDetailsSubmit
{
    public string SiteUpdate { get; init; } = "";
    public string MaterialsUsed { get; init; } = "";
    public string ExpectedReturnDate { get; init; } = "";
    public string OfficeNotes { get; init; } = "";
}
