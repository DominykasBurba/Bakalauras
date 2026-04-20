using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models;
using PropertyManager.Api.Services;

namespace PropertyManager.Api.Controllers;

public sealed class CreateMaintenanceRequest
{
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string Priority { get; init; }
    public string[]? PhotoUrls { get; init; }
}

public sealed class AssignTechnicianRequest
{
    public required string AssignedTechnician { get; init; }
}

public sealed class UpdatePriorityRequest
{
    public required string Priority { get; init; }
}

public sealed class UpdateStatusRequest
{
    public required string Status { get; init; }
}

public sealed class ResidentFeedbackRequest
{
    public string? Feedback { get; init; }
}

public sealed class AdminResidentResponseRequest
{
    public string? Message { get; init; }
}

public sealed class DeclineMaintenanceRequestBody
{
    public string? Reason { get; init; }
}

public sealed class TechnicianStatusRequest
{
    public required string Status { get; init; }
    public string? CompletionNotes { get; init; }
}

public sealed class TechnicianInvoiceRequest
{
    public required string InvoiceUrl { get; init; }
    public decimal? Amount { get; init; }
    public string? Notes { get; init; }
    public List<TechnicianInvoiceLineItem>? LineItems { get; init; }
    public decimal? TaxRatePercent { get; init; }
    public string? PurchaseOrderRef { get; init; }
    public List<string>? WorkPhotoUrls { get; init; }
    public string? SignatureAcknowledgment { get; init; }
}

public sealed class TechnicianPayoutRequest
{
    public string? Status { get; init; }
    public decimal? ApprovedAmount { get; init; }
    public DateTimeOffset? PaidAt { get; init; }
    public string? Notes { get; init; }
}

public sealed class ResidentChargeRequest
{
    public required decimal Amount { get; init; }
    public string? Type { get; init; }
    public DateOnly? DueDate { get; init; }
}

public sealed class ResidentChargeResponse
{
    public required Bill Bill { get; init; }
    public required MaintenanceRequest Request { get; init; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaintenanceRequestsController(IDataStore dataStore) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll()
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        if (User.IsInRole("Admin"))
            return Ok(dataStore.Requests);

        if (User.IsInRole("Technician"))
        {
            var name = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrWhiteSpace(name))
                return Ok(Array.Empty<MaintenanceRequest>());
            return Ok(dataStore.Requests
                .Where(r => string.Equals(
                    (r.AssignedTechnician ?? "").Trim(),
                    name.Trim(),
                    StringComparison.OrdinalIgnoreCase))
                .ToList());
        }

        return Ok(dataStore.Requests.Where(r => r.CreatedByUserId == userId).ToList());
    }

    /// <summary>Get one request. Residents: own only. Technicians: assigned to them (name match). Admins: any.</summary>
    [HttpGet("{id}")]
    public IActionResult GetById(string id)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        var req = dataStore.GetRequestById(id);
        if (req is null)
            return NotFound();

        if (User.IsInRole("Admin"))
            return Ok(req);

        if (User.IsInRole("Technician"))
        {
            var name = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrWhiteSpace(name) ||
                !string.Equals(
                    (req.AssignedTechnician ?? "").Trim(),
                    name.Trim(),
                    StringComparison.OrdinalIgnoreCase))
                return NotFound();
            return Ok(req);
        }

        if (req.CreatedByUserId != userId)
            return NotFound();

        return Ok(req);
    }

    [HttpPost]
    [Authorize(Roles = "Resident")]
    [RequestSizeLimit(60_000_000)]
    public IActionResult Create([FromBody] CreateMaintenanceRequest request)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();

        var created = dataStore.AddRequest(userId, request.Title, request.Description, request.Priority, request.PhotoUrls);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id}/technician")]
    [Authorize(Roles = "Admin")]
    public IActionResult AssignTechnician(string id, [FromBody] AssignTechnicianRequest body)
    {
        var assigningName = string.IsNullOrWhiteSpace(body.AssignedTechnician)
            ? "Not assigned"
            : body.AssignedTechnician.Trim();

        if (!string.Equals(assigningName, "Not assigned", StringComparison.OrdinalIgnoreCase))
        {
            var block = dataStore.GetTechnicianAssignmentBlockReason(assigningName);
            if (block is not null)
                return BadRequest(block);
        }

        if (!dataStore.TryAssignTechnician(id, body.AssignedTechnician))
            return dataStore.GetRequestById(id) is null
                ? NotFound()
                : BadRequest("Could not update assignment.");
        var updated = dataStore.GetRequestById(id);
        return Ok(updated);
    }

    /// <summary>Admin: set triage priority (Low / Medium / High).</summary>
    [HttpPatch("{id}/priority")]
    [Authorize(Roles = "Admin")]
    public IActionResult UpdatePriority(string id, [FromBody] UpdatePriorityRequest body)
    {
        if (!dataStore.TryUpdatePriority(id, body.Priority))
            return BadRequest(
                "Invalid priority (use Low, Medium, or High), request not found, or priority cannot be changed until the request is approved.");
        return Ok(dataStore.GetRequestById(id));
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public IActionResult UpdateStatus(string id, [FromBody] UpdateStatusRequest body)
    {
        if (MaintenanceWorkflow.CanonicalStatus(body.Status) is null)
            return BadRequest("Invalid status.");

        if (!dataStore.TryUpdateRequestStatus(id, body.Status))
            return BadRequest("Invalid transition for the current status, or request not found.");

        var updated = dataStore.GetRequestById(id);
        return Ok(updated);
    }

    /// <summary>Admin: approve a resident-submitted request (Requested → Registered).</summary>
    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin")]
    public IActionResult Approve(string id)
    {
        if (!dataStore.TryApproveMaintenanceRequest(id))
            return BadRequest("Request is not pending approval, or was not found.");
        return Ok(dataStore.GetRequestById(id));
    }

    /// <summary>Admin: decline a resident-submitted request (Requested → Declined).</summary>
    [HttpPost("{id}/decline")]
    [Authorize(Roles = "Admin")]
    public IActionResult Decline(string id, [FromBody] DeclineMaintenanceRequestBody? body)
    {
        if (!dataStore.TryDeclineMaintenanceRequest(id, body?.Reason))
            return BadRequest("Request is not pending approval, or was not found.");
        return Ok(dataStore.GetRequestById(id));
    }

    /// <summary>Admin: close work order with no tenant charge (Solved → Completed).</summary>
    [HttpPost("{id}/complete-without-charge")]
    [Authorize(Roles = "Admin")]
    public IActionResult CompleteWithoutCharge(string id)
    {
        if (!dataStore.TryCompleteMaintenanceWithoutCharge(id))
            return BadRequest("Request must be Solved with no maintenance bill, or was not found.");
        return Ok(dataStore.GetRequestById(id));
    }

    /// <summary>Resident: comment after the technician finishes (Solved / Unpaid / Completed).</summary>
    [HttpPatch("{id}/resident-feedback")]
    [Authorize(Roles = "Resident")]
    public IActionResult SetResidentFeedback(string id, [FromBody] ResidentFeedbackRequest body)
    {
        if (!ClaimsHelper.TryGetUserId(User, out var userId))
            return Unauthorized();
        if (!dataStore.TrySetResidentFeedback(id, userId, body.Feedback))
            return BadRequest(
                "Feedback can only be set on your own requests after the work is finished (Solved or later).");
        var updated = dataStore.GetRequestById(id);
        return Ok(updated);
    }

    /// <summary>Admin: reply to the resident (notification) and store on the work order.</summary>
    [HttpPatch("{id}/admin-resident-response")]
    [Authorize(Roles = "Admin")]
    public IActionResult SetAdminResidentResponse(string id, [FromBody] AdminResidentResponseRequest body)
    {
        if (!dataStore.TrySetAdminResidentResponse(id, body.Message))
            return BadRequest("Could not save reply (request not found or not in a post-work state).");
        return Ok(dataStore.GetRequestById(id));
    }

    /// <summary>Technician: In Progress, or Solved (vendor invoice URL required; may finish from Registered or In Progress).</summary>
    [HttpPatch("{id}/technician-status")]
    [Authorize(Roles = "Technician")]
    public IActionResult TechnicianUpdateStatus(string id, [FromBody] TechnicianStatusRequest body)
    {
        var name = User.FindFirst(ClaimTypes.Name)?.Value;
        if (string.IsNullOrWhiteSpace(name))
            return Unauthorized();
        if (!dataStore.TryTechnicianUpdateStatus(id, name, body.Status, body.CompletionNotes))
            return BadRequest("Cannot update this request (not assigned to you, already completed, or invalid status).");
        var updated = dataStore.GetRequestById(id);
        return Ok(updated);
    }

    /// <summary>Technician: attach vendor invoice link (and optional amount/notes) for the office.</summary>
    [HttpPatch("{id}/technician-invoice")]
    [Authorize(Roles = "Technician")]
    public IActionResult SetTechnicianInvoice(string id, [FromBody] TechnicianInvoiceRequest body)
    {
        var name = User.FindFirst(ClaimTypes.Name)?.Value;
        if (string.IsNullOrWhiteSpace(name))
            return Unauthorized();
        var submit = new TechnicianInvoiceSubmit
        {
            InvoiceUrl = body.InvoiceUrl,
            Amount = body.Amount,
            Notes = body.Notes,
            LineItems = body.LineItems,
            TaxRatePercent = body.TaxRatePercent,
            PurchaseOrderRef = body.PurchaseOrderRef,
            WorkPhotoUrls = body.WorkPhotoUrls,
            SignatureAcknowledgment = body.SignatureAcknowledgment,
        };
        if (!dataStore.TrySetTechnicianInvoice(id, name, submit))
            return BadRequest(
                "Could not save invoice (you must be assigned, provide a non-empty invoice URL, and amounts must be valid).");
        var updated = dataStore.GetRequestById(id);
        return Ok(updated);
    }

    /// <summary>Admin: record vendor payment status (accounts payable — not money movement in this app).</summary>
    [HttpPatch("{id}/technician-payout")]
    [Authorize(Roles = "Admin")]
    public IActionResult SetTechnicianPayout(string id, [FromBody] TechnicianPayoutRequest body)
    {
        var submit = new TechnicianPayoutSubmit
        {
            Status = body.Status,
            ApprovedAmount = body.ApprovedAmount,
            PaidAt = body.PaidAt,
            Notes = body.Notes,
        };
        if (!dataStore.TrySetTechnicianPayout(id, submit))
            return BadRequest("Could not update payout (invalid request id or values).");
        var updated = dataStore.GetRequestById(id);
        return Ok(updated);
    }

    /// <summary>Admin: bill the resident who submitted the request for tenant-caused damage (one bill per work order).</summary>
    [HttpPost("{id}/resident-charge")]
    [Authorize(Roles = "Admin")]
    public IActionResult CreateResidentCharge(string id, [FromBody] ResidentChargeRequest body)
    {
        var due = body.DueDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30));
        var type = string.IsNullOrWhiteSpace(body.Type) ? "Maintenance / tenant damage" : body.Type.Trim();
        var bill = dataStore.TryCreateResidentBillForMaintenance(id, body.Amount, type, due);
        if (bill is null)
            return BadRequest(
                "Could not create bill (request not found, submitter is not a resident, a bill already exists for this work order, or amount is invalid).");
        var request = dataStore.GetRequestById(id);
        return Ok(new ResidentChargeResponse { Bill = bill, Request = request! });
    }
}
