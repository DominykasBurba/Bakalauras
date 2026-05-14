namespace PropertyManager.Api.Models.Dtos;

public sealed class BuildingWriteRequest
{
    public required string Name { get; init; }
    public required string Address { get; init; }
}
