namespace PropertyManager.Api.Models.Dtos;

public sealed class DashboardDto
{
    public required int OpenRequests { get; init; }
    public required int CompletedThisMonth { get; init; }
    public required int ActiveServiceProviders { get; init; }
}
