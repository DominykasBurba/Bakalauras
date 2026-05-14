using System.Linq;

namespace PropertyManager.Api.Models;

public static class MaintenanceRequestView
{
    public static MaintenanceRequest ForResident(MaintenanceRequest r) =>
        new()
        {
            Id = r.Id,
            CreatedByUserId = r.CreatedByUserId,
            BuildingId = r.BuildingId,
            BuildingName = r.BuildingName,
            SubmittedFromUnit = r.SubmittedFromUnit,
            Title = r.Title,
            Description = r.Description,
            Status = r.Status,
            Priority = r.Priority,
            DateCreated = r.DateCreated,
            AssignedTechnician = r.AssignedTechnician,
            AssignedTechnicianUserId = r.AssignedTechnicianUserId,
            PhotoUrls = r.PhotoUrls,
            ResidentFeedback = r.ResidentFeedback,
            AdminResponseToResident = r.AdminResponseToResident,
            AdminDeclineReason = r.AdminDeclineReason,
            TechnicianCompletionNotes = r.TechnicianCompletionNotes,
            TechnicianSiteUpdate = r.TechnicianSiteUpdate,
            TechnicianMaterialsUsed = r.TechnicianMaterialsUsed,
            TechnicianExpectedReturnDate = r.TechnicianExpectedReturnDate,
            TechnicianOfficeNotes = null,
            TechnicianSiteUpdateHistory = r.TechnicianSiteUpdateHistory
                .Select(e => new TechnicianSiteUpdateHistoryEntry
                {
                    At = e.At,
                    SiteUpdate = e.SiteUpdate,
                    MaterialsUsed = e.MaterialsUsed,
                    ExpectedReturnDate = e.ExpectedReturnDate,
                    OfficeNotes = null,
                })
                .ToList(),
            TechnicianInvoiceUrl = r.TechnicianInvoiceUrl,
            TechnicianInvoiceAmount = r.TechnicianInvoiceAmount,
            TechnicianInvoiceNotes = r.TechnicianInvoiceNotes,
            TechnicianInvoiceSubmittedAt = r.TechnicianInvoiceSubmittedAt,
            TechnicianInvoiceLineItems = r.TechnicianInvoiceLineItems,
            TechnicianInvoiceTaxRatePercent = r.TechnicianInvoiceTaxRatePercent,
            TechnicianInvoicePurchaseOrderRef = r.TechnicianInvoicePurchaseOrderRef,
            TechnicianWorkPhotoUrls = r.TechnicianWorkPhotoUrls,
            TechnicianSignatureAcknowledgment = r.TechnicianSignatureAcknowledgment,
            TechnicianPayoutStatus = r.TechnicianPayoutStatus,
            TechnicianPayoutApprovedAmount = r.TechnicianPayoutApprovedAmount,
            TechnicianPayoutPaidAt = r.TechnicianPayoutPaidAt,
            TechnicianPayoutNotes = r.TechnicianPayoutNotes,
            TechnicianInvoiceSubtotal = r.TechnicianInvoiceSubtotal,
            TechnicianInvoiceTaxAmount = r.TechnicianInvoiceTaxAmount,
            ResidentChargeBillId = r.ResidentChargeBillId,
            ResidentChargeNotificationSent = r.ResidentChargeNotificationSent,
            ResidentChargeAmount = r.ResidentChargeNotificationSent == true ? r.ResidentChargeAmount : null,
            ResidentChargeType = r.ResidentChargeNotificationSent == true ? r.ResidentChargeType : null,
            ResidentChargeDueDate = r.ResidentChargeNotificationSent == true ? r.ResidentChargeDueDate : null,
        };
}
