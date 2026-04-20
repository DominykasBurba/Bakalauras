namespace PropertyManager.Api.Models.Dtos;

/// <summary>Payload for creating or updating a building (admin). Counts are computed from units, occupancies, and maintenance.</summary>
public sealed class BuildingWriteRequest
{
    public required string Name { get; init; }
    public required string Address { get; init; }
}
