using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models;
using PropertyManager.Api.Models.Dtos;
using PropertyManager.Api.Services;

namespace PropertyManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(IDataStore dataStore) : ControllerBase
{
    [HttpGet("summary")]
    public ActionResult<DashboardDto> GetSummary([FromQuery] int? buildingId)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        IEnumerable<MaintenanceRequest> reqs = dataStore.Requests;
        if (User.IsInRole("Admin") && buildingId is int bid)
            reqs = reqs.Where(r => r.BuildingId == bid);
        else if (!User.IsInRole("Admin"))
            reqs = reqs.Where(r => r.CreatedByUserId == userId);

        var list = reqs.ToList();
        var openRequests = list.Count(r => !MaintenanceWorkflow.IsTerminal(r.Status));
        var completedThisMonth = list.Count(r =>
            MaintenanceWorkflow.IsTerminal(r.Status) &&
            r.DateCreated.Month == DateTime.UtcNow.Month &&
            r.DateCreated.Year == DateTime.UtcNow.Year);

        return Ok(new DashboardDto
        {
            OpenRequests = openRequests,
            CompletedThisMonth = completedThisMonth,
            ActiveServiceProviders = 8
        });
    }

    [HttpGet("notifications")]
    public IActionResult GetNotifications([FromQuery] int? buildingId)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        if (User.IsInRole("Admin"))
        {
            var list = dataStore.Notifications.OrderByDescending(n => n.Id).ToList();
            if (buildingId is int bid)
                list = list.Where(n => n.BuildingId == bid).ToList();
            return Ok(list);
        }

        return Ok(dataStore.Notifications.Where(n => n.UserId == userId).OrderByDescending(n => n.Id).ToList());
    }

    [HttpPatch("notifications/{id:int}/read")]
    public IActionResult MarkNotificationRead(int id)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        if (!dataStore.TryMarkNotificationRead(id, userId, User.IsInRole("Admin")))
            return NotFound();

        return NoContent();
    }

    [HttpPatch("notifications/{id:int}/unread")]
    public IActionResult MarkNotificationUnread(int id)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        if (!dataStore.TryMarkNotificationUnread(id, userId, User.IsInRole("Admin")))
            return NotFound();

        return NoContent();
    }

    [HttpPost("notifications/read-all")]
    public IActionResult MarkAllNotificationsRead()
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        dataStore.MarkAllNotificationsRead(userId, User.IsInRole("Admin"));
        return NoContent();
    }
}
