using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PropertyManager.Api.Data;
using PropertyManager.Api.Helpers;
using PropertyManager.Api.Models;

namespace PropertyManager.Api.Services;

public sealed class PostgresDataStore(AppDbContext db) : IDataStore
{
    private readonly AppDbContext _db = db;

    public IReadOnlyList<User> Users =>
        _db.Users.AsNoTracking().OrderBy(u => u.Id).Select(u => MapUser(u)).ToList();

    public IReadOnlyList<MaintenanceRequest> Requests
    {
        get
        {
            var ctx = LoadRequestLookupContext();
            return _db.MaintenanceRequests.AsNoTracking()
                .OrderByDescending(r => r.DateCreated).ThenBy(r => r.Id)
                .ToList()
                .Select(e => MapRequest(e, ctx))
                .ToList();
        }
    }

    public IReadOnlyList<NotificationItem> Notifications
    {
        get
        {
            var userBuildings = UserBuildingMap();
            return _db.Notifications.AsNoTracking().OrderByDescending(n => n.Id).ToList()
                .Select(n => MapNotification(n, userBuildings.GetValueOrDefault(n.UserId)))
                .ToList();
        }
    }

    public IReadOnlyList<Bill> Bills
    {
        get
        {
            var userBuildings = UserBuildingMap();
            return _db.Bills.AsNoTracking().OrderByDescending(b => b.DueDate).ToList()
                .Select(b => MapBill(b, userBuildings.GetValueOrDefault(b.UserId)))
                .ToList();
        }
    }

    private Dictionary<int, int?> UserBuildingMap() =>
        _db.Users.AsNoTracking().ToDictionary(u => u.Id, u => u.BuildingId);

    public IReadOnlyList<Building> Buildings => LoadBuildingsWithComputedStats();

    public MaintenanceRequest? GetRequestById(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;
        id = id.Trim();
        var entity = _db.MaintenanceRequests.AsNoTracking()
            .FirstOrDefault(r => r.Id.ToLower() == id.ToLower());
        if (entity is null)
            return null;
        var ctx = LoadRequestLookupContext();
        return MapRequest(entity, ctx);
    }

    public MaintenanceRequest AddRequest(int createdByUserId, string title, string description, string priority, string[]? photoUrls = null)
    {
        var nextNum = NextRequestNumber();
        var nextId = $"REQ-{nextNum:000}";
        var photos = photoUrls is { Length: > 0 } ? photoUrls : [];
        var creator = _db.Users.AsNoTracking().FirstOrDefault(u => u.Id == createdByUserId);
        var entity = new MaintenanceRequestEntity
        {
            Id = nextId,
            CreatedByUserId = createdByUserId,
            BuildingId = creator?.BuildingId,
            Title = title,
            Description = description,
            Status = MaintenanceWorkflow.Requested,
            Priority = priority,
            DateCreated = DateOnly.FromDateTime(DateTime.UtcNow),
            AssignedTechnician = "Not assigned",
            PhotoUrlsJson = JsonSerializer.Serialize(photos),
        };
        _db.MaintenanceRequests.Add(entity);
        var titleShort = title.Trim();
        if (titleShort.Length > 120)
            titleShort = titleShort[..120] + "…";
        _db.Notifications.Add(new NotificationEntity
        {
            UserId = createdByUserId,
            Message = $"Maintenance request {nextId} was submitted — pending approval.",
            RelativeTime = "just now",
            IsRead = false,
            Category = "MaintenanceStatus",
        });
        NotifyAllAdmins($"New maintenance request {nextId} pending approval: {titleShort}");
        _db.SaveChanges();
        var ctx = LoadRequestLookupContext();
        return MapRequest(entity, ctx);
    }

    /// <summary>Next REQ-### id based on max existing number (safe if rows are deleted).</summary>
    private int NextRequestNumber()
    {
        var ids = _db.MaintenanceRequests.AsNoTracking().Select(r => r.Id).ToList();
        var max = 0;
        foreach (var id in ids)
        {
            if (id.Length >= 4 && id.StartsWith("REQ-", StringComparison.OrdinalIgnoreCase) &&
                int.TryParse(id.AsSpan(4), out var n))
                max = Math.Max(max, n);
        }

        return max + 1;
    }

    public bool MarkBillPaidIfExists(string billId, string? paymentMethod = null)
    {
        var bill = _db.Bills.FirstOrDefault(b => b.BillId == billId);
        if (bill is null)
            return false;
        if (string.Equals(bill.Status, "Paid", StringComparison.OrdinalIgnoreCase))
        {
            CompleteMaintenanceAfterBillPaidIfNeeded(bill.MaintenanceRequestId);
            _db.SaveChanges();
            return true;
        }

        bill.Status = "Paid";
        bill.PaidAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentMethod))
            bill.PaymentMethod = paymentMethod.Trim();
        else if (string.IsNullOrWhiteSpace(bill.PaymentMethod))
            bill.PaymentMethod = "Stripe";

        CompleteMaintenanceAfterBillPaidIfNeeded(bill.MaintenanceRequestId);
        _db.SaveChanges();
        return true;
    }

    /// <summary>When a maintenance-linked bill is paid, move Unpaid → Completed and notify the resident.</summary>
    private void CompleteMaintenanceAfterBillPaidIfNeeded(string? maintenanceRequestId)
    {
        if (string.IsNullOrWhiteSpace(maintenanceRequestId))
            return;
        var idKey = maintenanceRequestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return;
        if (MaintenanceWorkflow.IsTerminal(req.Status))
            return;
        if (!string.Equals(req.Status, MaintenanceWorkflow.Unpaid, StringComparison.OrdinalIgnoreCase))
            return;
        var prev = req.Status;
        req.Status = MaintenanceWorkflow.Completed;
        NotifyResidentOfMaintenance(req, prev, MaintenanceWorkflow.Completed, "Payment received — thank you.");
    }

    public string? GetTechnicianAssignmentBlockReason(string technicianName)
    {
        if (string.IsNullOrWhiteSpace(technicianName))
            return null;
        var raw = technicianName.Trim();
        if (string.Equals(raw, "Not assigned", StringComparison.OrdinalIgnoreCase))
            return null;

        var technicians = _db.Users.AsNoTracking()
            .Where(u => u.Role == "Technician")
            .Select(u => new { u.Id, u.Name })
            .ToList();
        var match = technicians.FirstOrDefault(u =>
            string.Equals(u.Name.Trim(), raw, StringComparison.OrdinalIgnoreCase));
        if (match is null)
            return null;

        var profile = _db.TechnicianProfiles.AsNoTracking().FirstOrDefault(p => p.UserId == match.Id);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return TechnicianCompliance.GetAssignmentBlockReason(profile, today);
    }

    public bool TryAssignTechnician(string requestId, string assignedTechnician)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (string.Equals(req.Status, MaintenanceWorkflow.Declined, StringComparison.OrdinalIgnoreCase))
            return false;
        var assigningName = string.IsNullOrWhiteSpace(assignedTechnician)
            ? "Not assigned"
            : assignedTechnician.Trim();
        if (string.Equals(req.Status, MaintenanceWorkflow.Requested, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(assigningName, "Not assigned", StringComparison.OrdinalIgnoreCase))
            return false;
        if (!string.Equals(assigningName, "Not assigned", StringComparison.OrdinalIgnoreCase))
        {
            var block = GetTechnicianAssignmentBlockReason(assigningName);
            if (block is not null)
                return false;
        }
        req.AssignedTechnician = assigningName;
        if (!string.Equals(req.AssignedTechnician, "Not assigned", StringComparison.OrdinalIgnoreCase))
        {
            var titleShort = req.Title.Trim();
            if (titleShort.Length > 120)
                titleShort = titleShort[..120] + "…";
            NotifyTechnicianIfAssigned(req.AssignedTechnician,
                $"You were assigned to maintenance request {req.Id}: {titleShort}");
        }

        _db.SaveChanges();
        return true;
    }

    public bool TryUpdatePriority(string requestId, string priority)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var canonical = CanonicalPriority(priority);
        if (canonical is null)
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (string.Equals(req.Status, MaintenanceWorkflow.Declined, StringComparison.OrdinalIgnoreCase))
            return false;
        if (string.Equals(req.Status, MaintenanceWorkflow.Requested, StringComparison.OrdinalIgnoreCase))
            return false;
        req.Priority = canonical;
        _db.SaveChanges();
        return true;
    }

    private static string? CanonicalPriority(string priority)
    {
        var p = priority.Trim();
        if (p.Length == 0)
            return null;
        if (string.Equals(p, "Low", StringComparison.OrdinalIgnoreCase))
            return "Low";
        if (string.Equals(p, "Medium", StringComparison.OrdinalIgnoreCase))
            return "Medium";
        if (string.Equals(p, "High", StringComparison.OrdinalIgnoreCase))
            return "High";
        return null;
    }

    public bool TryApproveMaintenanceRequest(string requestId)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (!string.Equals(req.Status, MaintenanceWorkflow.Requested, StringComparison.OrdinalIgnoreCase))
            return false;
        var prev = req.Status;
        req.Status = MaintenanceWorkflow.Registered;
        NotifyResidentOfMaintenance(req, prev, MaintenanceWorkflow.Registered, "Your request was approved.");
        _db.SaveChanges();
        return true;
    }

    public bool TryDeclineMaintenanceRequest(string requestId, string? reason)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (!string.Equals(req.Status, MaintenanceWorkflow.Requested, StringComparison.OrdinalIgnoreCase))
            return false;
        var prev = req.Status;
        req.Status = MaintenanceWorkflow.Declined;
        var text = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (text is { Length: > 4000 })
            text = text[..4000];
        req.AdminDeclineReason = text;
        var extra = string.IsNullOrWhiteSpace(text)
            ? "The office will not proceed with this request."
            : $"Reason: {text}";
        NotifyResidentOfMaintenance(req, prev, MaintenanceWorkflow.Declined, extra);
        _db.SaveChanges();
        return true;
    }

    public bool TryCompleteMaintenanceWithoutCharge(string requestId)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (!string.Equals(req.Status, MaintenanceWorkflow.Solved, StringComparison.OrdinalIgnoreCase))
            return false;
        if (_db.Bills.Any(b =>
                b.MaintenanceRequestId != null &&
                EF.Functions.ILike(b.MaintenanceRequestId.Trim(), req.Id)))
            return false;
        var prev = req.Status;
        req.Status = MaintenanceWorkflow.Completed;
        NotifyResidentOfMaintenance(req, prev, MaintenanceWorkflow.Completed, "Closed — no tenant charge.");
        _db.SaveChanges();
        return true;
    }

    public bool TryUpdateRequestStatus(string requestId, string status)
    {
        if (string.IsNullOrWhiteSpace(requestId) || string.IsNullOrWhiteSpace(status))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        var next = MaintenanceWorkflow.CanonicalStatus(status);
        if (next is null)
            return false;
        if (!MaintenanceWorkflow.AdminCanTransition(req.Status, next))
            return false;
        var prev = req.Status;
        req.Status = next;
        NotifyResidentOfMaintenance(req, prev, req.Status);
        _db.SaveChanges();
        return true;
    }

    public bool TrySetResidentFeedback(string requestId, int residentUserId, string? feedback)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null || req.CreatedByUserId != residentUserId)
            return false;
        if (!MaintenanceWorkflow.ResidentCanSubmitPostWorkFeedback(req.Status))
            return false;
        var text = string.IsNullOrWhiteSpace(feedback) ? null : feedback.Trim();
        if (text is { Length: > 4000 })
            text = text[..4000];
        req.ResidentFeedback = text;
        _db.SaveChanges();
        if (!string.IsNullOrWhiteSpace(text))
        {
            var alert = $"Resident feedback on {req.Id}: {text}";
            if (alert.Length > 4000)
                alert = alert[..4000];
            NotifyAllAdmins(alert);
            _db.SaveChanges();
        }

        return true;
    }

    public bool TrySetAdminResidentResponse(string requestId, string? message)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (!MaintenanceWorkflow.ResidentCanSubmitPostWorkFeedback(req.Status))
            return false;
        var text = string.IsNullOrWhiteSpace(message) ? null : message.Trim();
        if (text is { Length: > 4000 })
            text = text[..4000];
        req.AdminResponseToResident = text;
        _db.SaveChanges();
        if (!string.IsNullOrWhiteSpace(text))
        {
            var n = $"Office reply on work order {req.Id}: {text}";
            if (n.Length > 4000)
                n = n[..4000];
            _db.Notifications.Add(new NotificationEntity
            {
                UserId = req.CreatedByUserId,
                Message = n,
                RelativeTime = "just now",
                IsRead = false,
                Category = "MaintenanceStatus",
            });
            _db.SaveChanges();
        }

        return true;
    }

    public bool TryTechnicianUpdateStatus(string requestId, string technicianName, string status, string? completionNotes)
    {
        if (string.IsNullOrWhiteSpace(requestId) || string.IsNullOrWhiteSpace(technicianName))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (!string.Equals(req.AssignedTechnician.Trim(), technicianName.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;
        if (MaintenanceWorkflow.IsTerminal(req.Status) ||
            string.Equals(req.Status, MaintenanceWorkflow.Unpaid, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(req.Status, MaintenanceWorkflow.Requested, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(req.Status, MaintenanceWorkflow.Solved, StringComparison.OrdinalIgnoreCase))
            return false;

        var normalized = status.Trim();
        if (string.Equals(normalized, MaintenanceWorkflow.InProgress, StringComparison.OrdinalIgnoreCase))
        {
            if (!string.Equals(req.Status, MaintenanceWorkflow.Registered, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(req.Status, MaintenanceWorkflow.InProgress, StringComparison.OrdinalIgnoreCase))
                return false;
            var prev = req.Status;
            req.Status = MaintenanceWorkflow.InProgress;
            NotifyResidentOfMaintenance(req, prev, MaintenanceWorkflow.InProgress);
            _db.SaveChanges();
            return true;
        }

        if (string.Equals(normalized, MaintenanceWorkflow.Solved, StringComparison.OrdinalIgnoreCase))
        {
            // Invoice must be on file; allow finishing from Registered or In Progress (no separate "In Progress" step required).
            if (!string.Equals(req.Status, MaintenanceWorkflow.InProgress, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(req.Status, MaintenanceWorkflow.Registered, StringComparison.OrdinalIgnoreCase))
                return false;
            if (string.IsNullOrWhiteSpace(req.TechnicianInvoiceUrl))
                return false;
            var notes = string.IsNullOrWhiteSpace(completionNotes) ? null : completionNotes.Trim();
            if (notes is { Length: > 4000 })
                notes = notes[..4000];
            req.TechnicianCompletionNotes = notes;
            var prevS = req.Status;
            req.Status = MaintenanceWorkflow.Solved;
            NotifyResidentOfMaintenance(req, prevS, MaintenanceWorkflow.Solved,
                "Work finished — management will finalize billing if needed.");
            _db.SaveChanges();
            return true;
        }

        return false;
    }

    public bool TrySetTechnicianInvoice(string requestId, string technicianName, TechnicianInvoiceSubmit submit)
    {
        if (string.IsNullOrWhiteSpace(requestId) || string.IsNullOrWhiteSpace(technicianName))
            return false;
        var invoiceUrl = submit.InvoiceUrl.Trim();
        if (invoiceUrl.Length > 2000)
            invoiceUrl = invoiceUrl[..2000];
        if (string.IsNullOrWhiteSpace(invoiceUrl))
            return false;

        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;
        if (string.Equals(req.AssignedTechnician.Trim(), "Not assigned", StringComparison.OrdinalIgnoreCase))
            return false;
        if (!string.Equals(req.AssignedTechnician.Trim(), technicianName.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;
        if (string.Equals(req.Status, MaintenanceWorkflow.Requested, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(req.Status, MaintenanceWorkflow.Solved, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(req.Status, MaintenanceWorkflow.Unpaid, StringComparison.OrdinalIgnoreCase) ||
            MaintenanceWorkflow.IsTerminal(req.Status))
            return false;

        var lineItems = NormalizeLineItems(submit.LineItems);
        if (lineItems is null)
            return false;

        decimal? taxRate = submit.TaxRatePercent;
        if (taxRate is < 0 or > 100)
            return false;

        if (submit.Amount is < 0 or > 999_999_999.99m)
            return false;

        decimal? computedTotal;
        if (lineItems.Count > 0)
        {
            var subtotal = lineItems.Sum(li => li.Quantity * li.UnitPrice);
            if (subtotal > 999_999_999.99m)
                return false;
            var tax = taxRate is decimal tr && tr > 0
                ? Math.Round(subtotal * (tr / 100m), 2, MidpointRounding.AwayFromZero)
                : 0m;
            computedTotal = Math.Round(subtotal + tax, 2, MidpointRounding.AwayFromZero);
        }
        else
            computedTotal = submit.Amount;

        var workPhotos = NormalizeWorkPhotoUrls(submit.WorkPhotoUrls);
        if (workPhotos is null)
            return false;

        var po = string.IsNullOrWhiteSpace(submit.PurchaseOrderRef)
            ? null
            : submit.PurchaseOrderRef.Trim();
        if (po is { Length: > 200 })
            po = po[..200];

        var sig = string.IsNullOrWhiteSpace(submit.SignatureAcknowledgment)
            ? null
            : submit.SignatureAcknowledgment.Trim();
        if (sig is { Length: > 500 })
            sig = sig[..500];

        req.TechnicianInvoiceUrl = invoiceUrl;
        req.TechnicianInvoiceAmount = computedTotal;
        var n = string.IsNullOrWhiteSpace(submit.Notes) ? null : submit.Notes.Trim();
        if (n is { Length: > 4000 })
            n = n[..4000];
        req.TechnicianInvoiceNotes = n;
        req.TechnicianInvoiceSubmittedAt = DateTimeOffset.UtcNow;
        req.TechnicianInvoiceLineItemsJson = JsonSerializer.Serialize(lineItems,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        req.TechnicianInvoiceTaxRatePercent = lineItems.Count > 0 ? taxRate : null;
        req.TechnicianInvoicePurchaseOrderRef = po;
        req.TechnicianWorkPhotoUrlsJson = JsonSerializer.Serialize(workPhotos);
        req.TechnicianSignatureAcknowledgment = sig;
        _db.SaveChanges();
        return true;
    }

    public bool TrySetTechnicianPayout(string requestId, TechnicianPayoutSubmit submit)
    {
        if (string.IsNullOrWhiteSpace(requestId))
            return false;
        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return false;

        if (!string.IsNullOrWhiteSpace(submit.Status))
        {
            var s = submit.Status.Trim();
            if (!string.Equals(s, "Pending", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(s, "Approved", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(s, "Paid", StringComparison.OrdinalIgnoreCase))
                return false;
            req.TechnicianPayoutStatus = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(s.ToLowerInvariant());
        }

        if (submit.ApprovedAmount.HasValue)
        {
            var a = submit.ApprovedAmount.Value;
            if (a < 0 || a > 999_999_999.99m)
                return false;
            req.TechnicianPayoutApprovedAmount = a;
        }

        if (submit.PaidAt.HasValue)
            req.TechnicianPayoutPaidAt = submit.PaidAt;

        if (submit.Notes is not null)
        {
            var pn = string.IsNullOrWhiteSpace(submit.Notes) ? null : submit.Notes.Trim();
            if (pn is { Length: > 4000 })
                pn = pn[..4000];
            req.TechnicianPayoutNotes = pn;
        }

        _db.SaveChanges();
        return true;
    }

    private static List<TechnicianInvoiceLineItem>? NormalizeLineItems(IReadOnlyList<TechnicianInvoiceLineItem>? raw)
    {
        if (raw is null || raw.Count == 0)
            return [];
        if (raw.Count > 50)
            return null;
        var list = new List<TechnicianInvoiceLineItem>(raw.Count);
        foreach (var li in raw)
        {
            var kind = string.IsNullOrWhiteSpace(li.Kind) ? "other" : li.Kind.Trim().ToLowerInvariant();
            if (kind != "labor" && kind != "part" && kind != "other")
                return null;
            var desc = string.IsNullOrWhiteSpace(li.Description) ? "Line item" : li.Description.Trim();
            if (desc.Length > 500)
                desc = desc[..500];
            if (li.Quantity < 0 || li.Quantity > 99_999)
                return null;
            if (li.UnitPrice < 0 || li.UnitPrice > 999_999_999.99m)
                return null;
            list.Add(new TechnicianInvoiceLineItem
            {
                Kind = kind,
                Description = desc,
                Quantity = decimal.Round(li.Quantity, 4, MidpointRounding.AwayFromZero),
                UnitPrice = decimal.Round(li.UnitPrice, 2, MidpointRounding.AwayFromZero),
            });
        }

        return list;
    }

    private static List<string>? NormalizeWorkPhotoUrls(IReadOnlyList<string>? urls)
    {
        if (urls is null || urls.Count == 0)
            return [];
        if (urls.Count > 20)
            return null;
        var list = new List<string>(urls.Count);
        foreach (var u in urls)
        {
            var t = u?.Trim() ?? "";
            if (t.Length == 0)
                continue;
            if (t.Length > 2000)
                return null;
            list.Add(t);
        }

        return list;
    }

    public Bill? TryCreateResidentBillForMaintenance(string requestId, decimal amount, string type, DateOnly dueDate)
    {
        if (string.IsNullOrWhiteSpace(requestId) || amount <= 0 || amount > 999_999_999.99m)
            return null;
        type = string.IsNullOrWhiteSpace(type) ? "Maintenance / tenant damage" : type.Trim();
        if (type.Length > 200)
            type = type[..200];

        var idKey = requestId.Trim().ToLowerInvariant();
        var req = _db.MaintenanceRequests.FirstOrDefault(r => r.Id.ToLower() == idKey);
        if (req is null)
            return null;
        if (!string.Equals(req.Status, MaintenanceWorkflow.Solved, StringComparison.OrdinalIgnoreCase))
            return null;

        if (_db.Bills.Any(b =>
                b.MaintenanceRequestId != null &&
                EF.Functions.ILike(b.MaintenanceRequestId.Trim(), req.Id)))
            return null;

        var residentUserId = req.CreatedByUserId;
        var user = _db.Users.FirstOrDefault(u => u.Id == residentUserId);
        if (user is null || !string.Equals(user.Role, "Resident", StringComparison.OrdinalIgnoreCase))
            return null;

        var billId = $"BILL-MR-{req.Id}";
        if (_db.Bills.Any(b => b.BillId == billId))
            return null;

        var prev = req.Status;
        req.Status = MaintenanceWorkflow.Unpaid;

        var billEntity = new BillEntity
        {
            BillId = billId,
            UserId = residentUserId,
            Type = type,
            Amount = amount,
            DueDate = dueDate,
            Status = "Unpaid",
            MaintenanceRequestId = req.Id,
        };
        _db.Bills.Add(billEntity);
        NotifyResidentOfMaintenance(req, prev, MaintenanceWorkflow.Unpaid,
            $"Bill {billId} for {amount:F2} USD — pay under Billing & Payments.");
        _db.SaveChanges();

        return MapBill(billEntity, user.BuildingId);
    }

    public bool TryMarkNotificationRead(int notificationId, int currentUserId, bool isAdmin)
    {
        var n = _db.Notifications.FirstOrDefault(x => x.Id == notificationId);
        if (n is null)
            return false;
        if (!isAdmin && n.UserId != currentUserId)
            return false;
        if (n.IsRead)
            return true;
        n.IsRead = true;
        _db.SaveChanges();
        return true;
    }

    public bool TryMarkNotificationUnread(int notificationId, int currentUserId, bool isAdmin)
    {
        var n = _db.Notifications.FirstOrDefault(x => x.Id == notificationId);
        if (n is null)
            return false;
        if (!isAdmin && n.UserId != currentUserId)
            return false;
        if (!n.IsRead)
            return true;
        n.IsRead = false;
        _db.SaveChanges();
        return true;
    }

    public void MarkAllNotificationsRead(int currentUserId, bool isAdmin)
    {
        IQueryable<NotificationEntity> query = _db.Notifications.Where(x => !x.IsRead);
        if (!isAdmin)
            query = query.Where(x => x.UserId == currentUserId);
        foreach (var n in query.ToList())
            n.IsRead = true;
        _db.SaveChanges();
    }

    public int BroadcastAnnouncementToResidents(int? buildingId, string message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return 0;
        var m = message.Trim();
        if (m.Length > 4000)
            m = m[..4000];

        IQueryable<UserEntity> q = _db.Users.Where(u => u.Role == "Resident");
        if (buildingId is int bid)
            q = q.Where(u => u.BuildingId == bid);

        var residents = q.ToList();
        foreach (var r in residents)
        {
            _db.Notifications.Add(new NotificationEntity
            {
                UserId = r.Id,
                Message = m,
                RelativeTime = "just now",
                IsRead = false,
                Category = "General",
            });
        }

        if (residents.Count > 0)
            _db.SaveChanges();
        return residents.Count;
    }

    private void NotifyResidentOfMaintenance(MaintenanceRequestEntity req, string previousStatus, string newStatus,
        string? extra = null)
    {
        var msg = $"Maintenance request {req.Id}: status is now {newStatus}.";
        if (!string.IsNullOrWhiteSpace(extra))
            msg += " " + extra.Trim();
        if (msg.Length > 4000)
            msg = msg[..4000];
        _db.Notifications.Add(new NotificationEntity
        {
            UserId = req.CreatedByUserId,
            Message = msg,
            RelativeTime = "just now",
            IsRead = false,
            Category = "MaintenanceStatus",
        });
    }

    private void NotifyAllAdmins(string message)
    {
        if (message.Length > 4000)
            message = message[..4000];
        foreach (var admin in _db.Users.Where(u => u.Role == "Admin").ToList())
        {
            _db.Notifications.Add(new NotificationEntity
            {
                UserId = admin.Id,
                Message = message,
                RelativeTime = "just now",
                IsRead = false,
                Category = "MaintenanceStatus",
            });
        }
    }

    private void NotifyTechnicianIfAssigned(string technicianName, string message)
    {
        if (string.IsNullOrWhiteSpace(technicianName) ||
            string.Equals(technicianName.Trim(), "Not assigned", StringComparison.OrdinalIgnoreCase))
            return;
        var needle = technicianName.Trim();
        var tech = _db.Users
            .Where(u => u.Role == "Technician")
            .ToList()
            .FirstOrDefault(u => string.Equals(u.Name.Trim(), needle, StringComparison.OrdinalIgnoreCase));
        if (tech is null)
            return;
        var m = message;
        if (m.Length > 4000)
            m = m[..4000];
        _db.Notifications.Add(new NotificationEntity
        {
            UserId = tech.Id,
            Message = m,
            RelativeTime = "just now",
            IsRead = false,
            Category = "MaintenanceStatus",
        });
    }

    private static User MapUser(UserEntity u) =>
        new()
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Password = u.Password,
            Role = u.Role,
            Unit = u.Unit,
            ProfileStatus = u.Role.Equals("Resident", StringComparison.OrdinalIgnoreCase) ? u.ProfileStatus : null,
        };

    private sealed record RequestLookupContext(
        IReadOnlyDictionary<int, string> BuildingNames,
        IReadOnlyDictionary<int, UserEntity> UsersById,
        IReadOnlyDictionary<string, string> BillIdByMaintenanceRequestId);

    private RequestLookupContext LoadRequestLookupContext()
    {
        var buildingNames = _db.Buildings.AsNoTracking().ToDictionary(b => b.Id, b => b.Name);
        var usersById = _db.Users.AsNoTracking().ToDictionary(u => u.Id, u => u);
        // Multiple bills can reference the same maintenance request (e.g. re-bills); keep first — do not use
        // ToDictionary on maintenance_request_id alone or duplicate keys throw and break all list endpoints.
        var billIdByReq = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var b in _db.Bills.AsNoTracking())
        {
            var mid = b.MaintenanceRequestId?.Trim();
            if (string.IsNullOrEmpty(mid))
                continue;
            if (!billIdByReq.ContainsKey(mid))
                billIdByReq[mid] = b.BillId;
        }

        return new RequestLookupContext(buildingNames, usersById, billIdByReq);
    }

    private static MaintenanceRequest MapRequest(MaintenanceRequestEntity r, RequestLookupContext ctx)
    {
        ctx.UsersById.TryGetValue(r.CreatedByUserId, out var creator);

        string? buildingName = null;
        if (r.BuildingId is int bid && ctx.BuildingNames.TryGetValue(bid, out var bn))
            buildingName = bn;
        else if (creator?.BuildingId is int ubid && ctx.BuildingNames.TryGetValue(ubid, out var bn2))
            buildingName = bn2;

        var unit = creator?.Unit?.Trim();
        if (string.IsNullOrEmpty(unit))
            unit = null;

        ctx.BillIdByMaintenanceRequestId.TryGetValue(r.Id.Trim(), out var residentBillId);

        var lineItems = DeserializeInvoiceLineItems(r.TechnicianInvoiceLineItemsJson);
        decimal? subtotal = null;
        decimal? taxAmount = null;
        if (lineItems.Count > 0)
        {
            subtotal = Math.Round(lineItems.Sum(li => li.Quantity * li.UnitPrice), 2, MidpointRounding.AwayFromZero);
            if (r.TechnicianInvoiceTaxRatePercent is decimal tr && tr > 0 && subtotal is decimal s)
                taxAmount = Math.Round(s * (tr / 100m), 2, MidpointRounding.AwayFromZero);
            else
                taxAmount = 0;
        }

        return new MaintenanceRequest
        {
            Id = r.Id ?? "",
            CreatedByUserId = r.CreatedByUserId,
            BuildingId = r.BuildingId,
            BuildingName = buildingName,
            SubmittedFromUnit = unit,
            Title = r.Title ?? "",
            Description = r.Description ?? "",
            Status = r.Status ?? "",
            Priority = r.Priority ?? "Medium",
            DateCreated = r.DateCreated,
            AssignedTechnician = r.AssignedTechnician,
            PhotoUrls = DeserializePhotos(r.PhotoUrlsJson),
            ResidentFeedback = string.IsNullOrWhiteSpace(r.ResidentFeedback) ? null : r.ResidentFeedback.Trim(),
            AdminResponseToResident = string.IsNullOrWhiteSpace(r.AdminResponseToResident)
                ? null
                : r.AdminResponseToResident.Trim(),
            AdminDeclineReason = string.IsNullOrWhiteSpace(r.AdminDeclineReason)
                ? null
                : r.AdminDeclineReason.Trim(),
            TechnicianCompletionNotes = string.IsNullOrWhiteSpace(r.TechnicianCompletionNotes)
                ? null
                : r.TechnicianCompletionNotes.Trim(),
            TechnicianInvoiceUrl = string.IsNullOrWhiteSpace(r.TechnicianInvoiceUrl)
                ? null
                : r.TechnicianInvoiceUrl.Trim(),
            TechnicianInvoiceAmount = r.TechnicianInvoiceAmount,
            TechnicianInvoiceNotes = string.IsNullOrWhiteSpace(r.TechnicianInvoiceNotes)
                ? null
                : r.TechnicianInvoiceNotes.Trim(),
            TechnicianInvoiceSubmittedAt = r.TechnicianInvoiceSubmittedAt,
            TechnicianInvoiceLineItems = lineItems,
            TechnicianInvoiceTaxRatePercent = r.TechnicianInvoiceTaxRatePercent,
            TechnicianInvoicePurchaseOrderRef = string.IsNullOrWhiteSpace(r.TechnicianInvoicePurchaseOrderRef)
                ? null
                : r.TechnicianInvoicePurchaseOrderRef.Trim(),
            TechnicianWorkPhotoUrls = DeserializePhotos(r.TechnicianWorkPhotoUrlsJson),
            TechnicianSignatureAcknowledgment = string.IsNullOrWhiteSpace(r.TechnicianSignatureAcknowledgment)
                ? null
                : r.TechnicianSignatureAcknowledgment.Trim(),
            TechnicianPayoutStatus = string.IsNullOrWhiteSpace(r.TechnicianPayoutStatus)
                ? null
                : r.TechnicianPayoutStatus.Trim(),
            TechnicianPayoutApprovedAmount = r.TechnicianPayoutApprovedAmount,
            TechnicianPayoutPaidAt = r.TechnicianPayoutPaidAt,
            TechnicianPayoutNotes = string.IsNullOrWhiteSpace(r.TechnicianPayoutNotes)
                ? null
                : r.TechnicianPayoutNotes.Trim(),
            TechnicianInvoiceSubtotal = subtotal,
            TechnicianInvoiceTaxAmount = taxAmount,
            ResidentChargeBillId = string.IsNullOrWhiteSpace(residentBillId) ? null : residentBillId.Trim(),
        };
    }

    private static IReadOnlyList<TechnicianInvoiceLineItem> DeserializeInvoiceLineItems(string json)
    {
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var list = JsonSerializer.Deserialize<List<TechnicianInvoiceLineItem>>(json, opts);
            return list ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<string> DeserializePhotos(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static NotificationItem MapNotification(NotificationEntity n, int? buildingId) =>
        new()
        {
            Id = n.Id,
            UserId = n.UserId,
            Message = n.Message,
            RelativeTime = n.RelativeTime,
            IsRead = n.IsRead,
            BuildingId = buildingId,
            Category = n.Category,
        };

    private static Bill MapBill(BillEntity b, int? buildingId) =>
        new()
        {
            BillId = b.BillId,
            UserId = b.UserId,
            BuildingId = buildingId,
            Type = b.Type,
            Amount = b.Amount,
            DueDate = b.DueDate,
            Status = b.Status,
            MaintenanceRequestId = string.IsNullOrWhiteSpace(b.MaintenanceRequestId)
                ? null
                : b.MaintenanceRequestId.Trim(),
            PaidAt = b.PaidAt,
            PaymentMethod = string.IsNullOrWhiteSpace(b.PaymentMethod) ? null : b.PaymentMethod.Trim(),
        };

    /// <summary>
    /// Building list stats are computed: rooms from <c>units</c>, occupancy from open <c>occupancies</c>,
    /// residents from distinct users in those occupancies, open requests from non-completed maintenance.
    /// Legacy columns on <c>buildings</c> are not used for API output.
    /// </summary>
    private List<Building> LoadBuildingsWithComputedStats()
    {
        var buildings = _db.Buildings.AsNoTracking().OrderBy(b => b.Id).ToList();
        if (buildings.Count == 0)
            return [];

        var ids = buildings.Select(b => b.Id).ToList();

        var totalByBuilding = _db.Units.AsNoTracking()
            .Where(u => ids.Contains(u.BuildingId))
            .GroupBy(u => u.BuildingId)
            .ToDictionary(g => g.Key, g => g.Count());

        var activeOccRows = (
            from o in _db.Occupancies.AsNoTracking()
            where o.EndedAt == null
            join u in _db.Units.AsNoTracking() on o.UnitId equals u.Id
            where ids.Contains(u.BuildingId)
            select new { u.BuildingId, UnitId = u.Id, o.UserId }
        ).ToList();

        var occupiedByBuilding = activeOccRows
            .GroupBy(x => x.BuildingId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.UnitId).Distinct().Count());

        var residentsByBuilding = activeOccRows
            .GroupBy(x => x.BuildingId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.UserId).Distinct().Count());

        // Terminal = Completed or Declined (case-insensitive). Cannot use MaintenanceWorkflow.IsTerminal here — EF cannot translate it to SQL.
        var openReqByBuilding = _db.MaintenanceRequests.AsNoTracking()
            .Where(r =>
                r.BuildingId != null &&
                ids.Contains(r.BuildingId.Value) &&
                !EF.Functions.ILike(r.Status, MaintenanceWorkflow.Completed) &&
                !EF.Functions.ILike(r.Status, MaintenanceWorkflow.Declined))
            .GroupBy(r => r.BuildingId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        return buildings.Select(b => new Building
        {
            Id = b.Id,
            Name = b.Name,
            Address = b.Address,
            TotalUnits = totalByBuilding.GetValueOrDefault(b.Id),
            OccupiedUnits = occupiedByBuilding.GetValueOrDefault(b.Id),
            Residents = residentsByBuilding.GetValueOrDefault(b.Id),
            OpenRequests = openReqByBuilding.GetValueOrDefault(b.Id),
        }).ToList();
    }

    public Building AddBuilding(string name, string address)
    {
        var entity = new BuildingEntity
        {
            Name = name.Trim(),
            Address = address.Trim(),
            TotalUnits = 0,
            OccupiedUnits = 0,
            ResidentsCount = 0,
            OpenRequests = 0,
        };
        _db.Buildings.Add(entity);
        _db.SaveChanges();
        return LoadBuildingsWithComputedStats().First(x => x.Id == entity.Id);
    }

    public Building? UpdateBuilding(int id, string name, string address)
    {
        var entity = _db.Buildings.FirstOrDefault(b => b.Id == id);
        if (entity is null)
            return null;
        entity.Name = name.Trim();
        entity.Address = address.Trim();
        _db.SaveChanges();
        return LoadBuildingsWithComputedStats().FirstOrDefault(x => x.Id == id);
    }

    public bool TryDeleteBuilding(int id)
    {
        var entity = _db.Buildings.FirstOrDefault(b => b.Id == id);
        if (entity is null)
            return false;
        _db.Buildings.Remove(entity);
        _db.SaveChanges();
        return true;
    }
}
