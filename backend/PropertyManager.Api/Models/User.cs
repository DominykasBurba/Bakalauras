namespace PropertyManager.Api.Models;

public sealed class User
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public required string Password { get; init; }
    public required string Role { get; init; }
    public required string Unit { get; init; }
    public string? ProfileStatus { get; init; }
}
