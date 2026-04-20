using PropertyManager.Api.Models;

namespace PropertyManager.Api.Services;

public interface IDataStore
{
    IReadOnlyList<User> Users { get; }
    IReadOnlyList<MaintenanceRequest> Requests { get; }
    IReadOnlyList<NotificationItem> Notifications { get; }
    IReadOnlyList<Bill> Bills { get; }
    IReadOnlyList<Building> Buildings { get; }
    MaintenanceRequest? GetRequestById(string id);
    MaintenanceRequest AddRequest(int createdByUserId, string title, string description, string priority, string[]? photoUrls);
    bool MarkBillPaidIfExists(string billId, string? paymentMethod = null);
    bool TryAssignTechnician(string requestId, string assignedTechnician);
    /// <summary>When the name matches a technician with a profile, returns a reason if assignment must be blocked (expired license/insurance).</summary>
    string? GetTechnicianAssignmentBlockReason(string technicianName);
    bool TryUpdatePriority(string requestId, string priority);
    bool TryUpdateRequestStatus(string requestId, string status);
    bool TryApproveMaintenanceRequest(string requestId);
    bool TryDeclineMaintenanceRequest(string requestId, string? reason);
    bool TryCompleteMaintenanceWithoutCharge(string requestId);
    bool TrySetResidentFeedback(string requestId, int residentUserId, string? feedback);
    bool TrySetAdminResidentResponse(string requestId, string? message);
    bool TryTechnicianUpdateStatus(string requestId, string technicianName, string status, string? completionNotes);
    bool TrySetTechnicianInvoice(string requestId, string technicianName, TechnicianInvoiceSubmit submit);

    bool TrySetTechnicianPayout(string requestId, TechnicianPayoutSubmit submit);
    Bill? TryCreateResidentBillForMaintenance(string requestId, decimal amount, string type, DateOnly dueDate);
    bool TryMarkNotificationRead(int notificationId, int currentUserId, bool isAdmin);
    bool TryMarkNotificationUnread(int notificationId, int currentUserId, bool isAdmin);
    void MarkAllNotificationsRead(int currentUserId, bool isAdmin);
    /// <summary>Creates one in-app notification per resident. BuildingId null = all residents.</summary>
    int BroadcastAnnouncementToResidents(int? buildingId, string message);
    Building AddBuilding(string name, string address);
    Building? UpdateBuilding(int id, string name, string address);
    bool TryDeleteBuilding(int id);
}
