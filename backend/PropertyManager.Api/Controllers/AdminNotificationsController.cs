using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Services;

namespace PropertyManager.Api.Controllers;

public sealed class BroadcastNotificationRequest
{
    public required string Message { get; init; }
    /// <summary>When set, only residents assigned to this building. Omit or null for all residents.</summary>
    public int? BuildingId { get; init; }
}

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/notifications")]
public sealed class AdminNotificationsController(IDataStore dataStore, AppDbContext db) : ControllerBase
{
    [HttpPost("broadcast")]
    public IActionResult Broadcast([FromBody] BroadcastNotificationRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Message))
            return BadRequest("Message is required.");

        if (body.BuildingId is int bid)
        {
            if (!db.Buildings.AsNoTracking().Any(b => b.Id == bid))
                return NotFound("Building not found.");
        }

        var count = dataStore.BroadcastAnnouncementToResidents(body.BuildingId, body.Message);
        if (count == 0)
            return Ok(new { recipientCount = 0, warning = "No residents matched this scope." });

        return Ok(new { recipientCount = count });
    }
}
