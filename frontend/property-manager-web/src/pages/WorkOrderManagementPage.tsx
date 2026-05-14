import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useLocation } from 'react-router-dom';
import { approveMaintenanceRequest, declineMaintenanceRequest, assignMaintenanceTechnician, completeMaintenanceWithoutCharge, getAdminServiceCatalog, getAdminTechnicianNames, getMaintenanceRequest, getTechnicianAssignmentContext, patchAdminResidentResponse, patchMaintenancePriority, patchResidentCompletionFeedback, patchTechnicianInvoice, patchTechnicianPayout, patchTechnicianMaintenanceStatus, patchTechnicianSiteDetails, patchResidentChargeFromMaintenance, postResidentChargeFromMaintenance, postResidentChargeSendToResident, updateMaintenanceRequestStatus, } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { isAdminRole, isTechnicianRole } from '../utils/auth';
import { formatRoomUnitLabel } from '../utils/unitLabel';
import { confirmDelete } from '../utils/confirmDelete';
import { normalizeHttpUrl } from '../utils/httpUrl';
import { WorkOrderCollapsibleCard } from '../components/WorkOrderCollapsibleCard';
import type { MaintenanceRequest, ServiceCatalogItem, TechnicianAssignmentContext, TechnicianSiteUpdateHistoryEntry, } from '../types';
type WorkOrderLocationState = {
    technicianBackPath?: string;
};
const SHOW_VENDOR_PAYMENT_AP_FORM = false;
function toDatetimeLocalValue(iso: string | undefined): string {
    if (!iso)
        return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function statusPillClass(status: string): string {
    return `status-pill ${status.toLowerCase().replace(/\s+/g, '-')}`;
}
function normalizePriorityLabel(p: string | undefined): 'Low' | 'Medium' | 'High' {
    const x = (p ?? '').trim().toLowerCase();
    if (x === 'low')
        return 'Low';
    if (x === 'high')
        return 'High';
    return 'Medium';
}
function residentFacingStatusLabel(status: string): string {
    switch (status.trim()) {
        case 'Unpaid':
            return 'Balance due';
        case 'Solved':
            return 'Work complete';
        case 'Completed':
            return 'Closed';
        default:
            return status;
    }
}
function residentPostWorkSummaryLine(r: MaintenanceRequest): string | null {
    if (!['Solved', 'Unpaid', 'Completed'].includes(r.status))
        return null;
    switch (r.status) {
        case 'Solved':
            return 'Maintenance is marked complete. Tell us how the visit went — you can update your note anytime.';
        case 'Unpaid':
            if (r.residentChargeBillId?.trim() && r.residentChargeNotificationSent !== true) {
                return 'Work on this request is finished. The office is finalizing your invoice; you will be notified when it is ready to pay.';
            }
            return 'Work on this request is finished.';
        case 'Completed':
            return 'This request is closed.';
        default:
            return null;
    }
}
function formatSiteHistoryAt(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
function SiteProgressHistoryList({ entries, showOfficeNotes, }: {
    entries: TechnicianSiteUpdateHistoryEntry[];
    showOfficeNotes: boolean;
}) {
    const ordered = [...entries].reverse();
    return (<ul className="work-order-site-history">
      {ordered.map((entry, idx) => (<li key={`${entry.at}-${idx}`} className="work-order-site-history-item">
          <div className="work-order-site-history-when muted small">{formatSiteHistoryAt(entry.at)}</div>
          {entry.siteUpdate?.trim() ? (<p className="work-order-site-history-text">{entry.siteUpdate.trim()}</p>) : null}
          {entry.materialsUsed?.trim() ? (<p className="work-order-site-history-meta">
              <span className="work-order-site-history-label">Parts / materials:</span> {entry.materialsUsed.trim()}
            </p>) : null}
          {entry.expectedReturnDate?.trim() ? (<p className="work-order-site-history-meta">
              <span className="work-order-site-history-label">Expected return:</span> {entry.expectedReturnDate.trim()}
            </p>) : null}
          {showOfficeNotes && entry.officeNotes?.trim() ? (<p className="work-order-site-history-meta work-order-site-history-office">
              <span className="work-order-site-history-label">Internal note:</span> {entry.officeNotes.trim()}
            </p>) : null}
        </li>))}
    </ul>);
}
export function WorkOrderManagementPage() {
    const { id } = useParams<{
        id: string;
    }>();
    const location = useLocation();
    const { auth } = useAuth();
    const showToast = useToast();
    const isAdmin = isAdminRole(auth?.role);
    const isTechnician = isTechnicianRole(auth?.role);
    const isResident = !isAdmin && !isTechnician;
    const [request, setRequest] = useState<MaintenanceRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [technician, setTechnician] = useState('');
    const [saving, setSaving] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [residentFeedback, setResidentFeedback] = useState('');
    const [feedbackSaving, setFeedbackSaving] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');
    const [techCompleteNotes, setTechCompleteNotes] = useState('');
    const [techSaving, setTechSaving] = useState(false);
    const [techError, setTechError] = useState('');
    const [invoiceUrl, setInvoiceUrl] = useState('');
    const [invoiceAmount, setInvoiceAmount] = useState('');
    const [invoiceNotes, setInvoiceNotes] = useState('');
    const [invoiceError, setInvoiceError] = useState('');
    const [workPhotoUrlsList, setWorkPhotoUrlsList] = useState<string[]>(['']);
    const [signatureAck, setSignatureAck] = useState('');
    const [payoutStatus, setPayoutStatus] = useState('');
    const [payoutApproved, setPayoutApproved] = useState('');
    const [payoutPaidAt, setPayoutPaidAt] = useState('');
    const [payoutNotes, setPayoutNotes] = useState('');
    const [payoutSaving, setPayoutSaving] = useState(false);
    const [payoutError, setPayoutError] = useState('');
    const [siteUpdateDraft, setSiteUpdateDraft] = useState('');
    const [materialsUsedDraft, setMaterialsUsedDraft] = useState('');
    const [expectedReturnDraft, setExpectedReturnDraft] = useState('');
    const [officeNotesDraft, setOfficeNotesDraft] = useState('');
    const [siteDetailsSaving, setSiteDetailsSaving] = useState(false);
    const [siteDetailsError, setSiteDetailsError] = useState('');
    const [techProgressSaving, setTechProgressSaving] = useState(false);
    const [chargeAmount, setChargeAmount] = useState('');
    const [chargeType, setChargeType] = useState('Maintenance / tenant damage');
    const [chargeDueDate, setChargeDueDate] = useState('');
    const [chargeSaving, setChargeSaving] = useState(false);
    const [chargeError, setChargeError] = useState('');
    const [sendBillSaving, setSendBillSaving] = useState(false);
    const [sendBillConfirmOpen, setSendBillConfirmOpen] = useState(false);
    const [approveSaving, setApproveSaving] = useState(false);
    const [approveError, setApproveError] = useState('');
    const [declineReason, setDeclineReason] = useState('');
    const [declineSaving, setDeclineSaving] = useState(false);
    const [declineError, setDeclineError] = useState('');
    const [closureSaving, setClosureSaving] = useState(false);
    const [adminReply, setAdminReply] = useState('');
    const [adminReplySaving, setAdminReplySaving] = useState(false);
    const [adminReplyError, setAdminReplyError] = useState('');
    const [reopenSaving, setReopenSaving] = useState(false);
    const [technicianNameOptions, setTechnicianNameOptions] = useState<string[]>([]);
    const [serviceCatalogItems, setServiceCatalogItems] = useState<ServiceCatalogItem[]>([]);
    const [technicianServiceFilter, setTechnicianServiceFilter] = useState<number | ''>('');
    const [assignmentContext, setAssignmentContext] = useState<TechnicianAssignmentContext | null>(null);
    const [assignmentContextLoading, setAssignmentContextLoading] = useState(false);
    const [priorityDraft, setPriorityDraft] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [prioritySaving, setPrioritySaving] = useState(false);
    const [requestDetailsOpen, setRequestDetailsOpen] = useState(true);
    useEffect(() => {
        if (!auth?.token || !id)
            return;
        setLoading(true);
        getMaintenanceRequest(auth.token, id)
            .then(setRequest)
            .catch(() => {
            setRequest(null);
            showToast('Could not load this work order.', 'error');
        })
            .finally(() => setLoading(false));
    }, [auth?.token, id, showToast]);
    useEffect(() => {
        setChargeAmount('');
        setChargeDueDate('');
        setChargeType('Maintenance / tenant damage');
        setChargeError('');
        setSendBillConfirmOpen(false);
        setRequestDetailsOpen(true);
    }, [id]);
    useEffect(() => {
        if (!request)
            return;
        const a = request.assignedTechnician;
        setTechnician(a === 'Not assigned' ? '' : a);
        setResidentFeedback(request.residentFeedback?.trim() ?? '');
        setInvoiceUrl(request.technicianInvoiceUrl?.trim() ?? '');
        setInvoiceAmount(request.technicianInvoiceAmount != null ? String(request.technicianInvoiceAmount) : '');
        setInvoiceNotes(request.technicianInvoiceNotes?.trim() ?? '');
        setTechCompleteNotes(request.technicianCompletionNotes?.trim() ?? '');
        setAdminReply(request.adminResponseToResident?.trim() ?? '');
        setPriorityDraft(normalizePriorityLabel(request.priority));
        setWorkPhotoUrlsList(request.technicianWorkPhotoUrls?.length ? [...request.technicianWorkPhotoUrls] : ['']);
        setSignatureAck(request.technicianSignatureAcknowledgment?.trim() ?? '');
        setPayoutStatus(request.technicianPayoutStatus?.trim() ?? '');
        setPayoutApproved(request.technicianPayoutApprovedAmount != null ? String(request.technicianPayoutApprovedAmount) : '');
        setPayoutPaidAt(toDatetimeLocalValue(request.technicianPayoutPaidAt ?? undefined));
        setPayoutNotes(request.technicianPayoutNotes?.trim() ?? '');
        setSiteUpdateDraft(request.technicianSiteUpdate?.trim() ?? '');
        setMaterialsUsedDraft(request.technicianMaterialsUsed?.trim() ?? '');
        setExpectedReturnDraft(request.technicianExpectedReturnDate?.trim() ?? '');
        setOfficeNotesDraft(request.technicianOfficeNotes?.trim() ?? '');
    }, [request]);
    useEffect(() => {
        if (!request)
            return;
        if (request.status !== 'Solved' || request.residentChargeBillId?.trim())
            return;
        setChargeAmount((prev) => {
            if (prev.trim() !== '')
                return prev;
            const suggested = request.technicianInvoiceAmount ?? request.technicianInvoiceSubtotal ?? null;
            if (suggested != null && suggested > 0)
                return String(suggested);
            return prev;
        });
    }, [request]);
    useEffect(() => {
        if (!request)
            return;
        if (request.status !== 'Unpaid' ||
            !request.residentChargeBillId?.trim() ||
            request.residentChargeNotificationSent === true) {
            return;
        }
        if (request.residentChargeAmount != null) {
            setChargeAmount(String(request.residentChargeAmount));
        }
        if (request.residentChargeType?.trim()) {
            setChargeType(request.residentChargeType.trim());
        }
        if (request.residentChargeDueDate?.trim()) {
            setChargeDueDate(request.residentChargeDueDate.trim().slice(0, 10));
        }
    }, [request]);
    useEffect(() => {
        if (!auth?.token || !isAdmin)
            return;
        getAdminServiceCatalog(auth.token)
            .then(setServiceCatalogItems)
            .catch(() => setServiceCatalogItems([]));
    }, [auth?.token, isAdmin]);
    useEffect(() => {
        if (!auth?.token || !isAdmin)
            return;
        const cid = technicianServiceFilter === '' ? null : Number(technicianServiceFilter);
        getAdminTechnicianNames(auth.token, cid)
            .then((list) => setTechnicianNameOptions(list.map((x) => x.name)))
            .catch(() => {
            setTechnicianNameOptions([]);
            showToast('Could not load technician directory.', 'error');
        });
    }, [auth?.token, isAdmin, technicianServiceFilter, showToast]);
    const technicianSelectOptions = (() => {
        const set = new Set(technicianNameOptions);
        const fromRequest = request?.assignedTechnician?.trim();
        if (fromRequest && fromRequest !== 'Not assigned')
            set.add(fromRequest);
        const fromState = technician.trim();
        if (fromState)
            set.add(fromState);
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    })();
    useEffect(() => {
        if (!auth?.token || !isAdmin) {
            setAssignmentContext(null);
            return;
        }
        if (request?.status === 'Requested') {
            setAssignmentContext(null);
            return;
        }
        const name = technician.trim() ||
            (request?.assignedTechnician && request.assignedTechnician !== 'Not assigned'
                ? request.assignedTechnician.trim()
                : '');
        if (!name) {
            setAssignmentContext(null);
            return;
        }
        setAssignmentContextLoading(true);
        getTechnicianAssignmentContext(auth.token, name)
            .then(setAssignmentContext)
            .catch(() => {
            setAssignmentContext(null);
            showToast('Could not load technician compliance details.', 'error');
        })
            .finally(() => setAssignmentContextLoading(false));
    }, [auth?.token, isAdmin, technician, request?.assignedTechnician, request?.status, showToast]);
    async function handleSavePriority() {
        if (!auth?.token || !request)
            return;
        if (priorityDraft === normalizePriorityLabel(request.priority))
            return;
        setPrioritySaving(true);
        try {
            const updated = await patchMaintenancePriority(auth.token, request.id, priorityDraft);
            setRequest(updated);
            showToast('Priority updated.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not update priority';
            showToast(msg, 'error');
        }
        finally {
            setPrioritySaving(false);
        }
    }
    async function handleSaveAssignment() {
        if (!auth?.token || !request)
            return;
        setSaving(true);
        setAssignError('');
        try {
            const updated = await assignMaintenanceTechnician(auth.token, request.id, technician.trim() || 'Not assigned');
            setRequest(updated);
            showToast('Technician assignment saved.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not save assignment';
            setAssignError(msg);
            showToast(msg, 'error');
        }
        finally {
            setSaving(false);
        }
    }
    async function handleResidentFeedback(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token || !request)
            return;
        setFeedbackSaving(true);
        setFeedbackError('');
        try {
            const updated = await patchResidentCompletionFeedback(auth.token, request.id, residentFeedback.trim());
            setRequest(updated);
            showToast('Your comment was saved. Property management will see it.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not save comment';
            setFeedbackError(msg);
            showToast(msg, 'error');
        }
        finally {
            setFeedbackSaving(false);
        }
    }
    async function handleTechnicianStartWork() {
        if (!auth?.token || !request)
            return;
        setTechProgressSaving(true);
        setSiteDetailsError('');
        try {
            const updated = await patchTechnicianMaintenanceStatus(auth.token, request.id, { status: 'In Progress' });
            setRequest(updated);
            showToast('Status updated to In progress.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not update status';
            setSiteDetailsError(msg);
            showToast(msg, 'error');
        }
        finally {
            setTechProgressSaving(false);
        }
    }
    async function handleSaveSiteDetails() {
        if (!auth?.token || !request)
            return;
        setSiteDetailsSaving(true);
        setSiteDetailsError('');
        try {
            const updated = await patchTechnicianSiteDetails(auth.token, request.id, {
                siteUpdate: siteUpdateDraft,
                materialsUsed: materialsUsedDraft,
                expectedReturnDate: expectedReturnDraft,
                officeNotes: officeNotesDraft,
            });
            setRequest(updated);
            showToast('Site / progress details saved.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not save details';
            setSiteDetailsError(msg);
            showToast(msg, 'error');
        }
        finally {
            setSiteDetailsSaving(false);
        }
    }
    async function handleFinishWork() {
        if (!auth?.token || !request)
            return;
        const urlRaw = invoiceUrl.trim();
        if (!urlRaw) {
            const msg = 'Add an invoice URL before finishing.';
            setTechError(msg);
            setInvoiceError('Invoice URL is required.');
            showToast(msg, 'error');
            return;
        }
        const urlNorm = normalizeHttpUrl(urlRaw);
        if (!urlNorm) {
            const msg = 'Invoice URL must be a valid http:// or https:// link.';
            setTechError(msg);
            setInvoiceError(msg);
            showToast(msg, 'error');
            return;
        }
        let amountNum: number | undefined;
        if (invoiceAmount.trim()) {
            const n = Number(invoiceAmount.replace(',', '.'));
            if (Number.isNaN(n) || n < 0) {
                const msg = 'Amount must be a valid non-negative number.';
                setInvoiceError(msg);
                showToast(msg, 'error');
                return;
            }
            amountNum = n;
        }
        const photoRaw = workPhotoUrlsList.map((u) => u.trim()).filter(Boolean);
        const photos: string[] = [];
        for (const p of photoRaw) {
            const n = normalizeHttpUrl(p);
            if (!n) {
                const msg = 'Each work photo URL must be a valid http:// or https:// link.';
                setInvoiceError(msg);
                setTechError(msg);
                showToast(msg, 'error');
                return;
            }
            photos.push(n);
        }
        setTechSaving(true);
        setTechError('');
        setInvoiceError('');
        try {
            await patchTechnicianInvoice(auth.token, request.id, {
                invoiceUrl: urlNorm,
                ...(amountNum !== undefined ? { amount: amountNum } : {}),
                ...(invoiceNotes.trim() ? { notes: invoiceNotes.trim() } : {}),
                ...(photos.length ? { workPhotoUrls: photos } : {}),
                ...(signatureAck.trim() ? { signatureAcknowledgment: signatureAck.trim() } : {}),
            });
            const updated = await patchTechnicianMaintenanceStatus(auth.token, request.id, {
                status: 'Solved',
                completionNotes: techCompleteNotes.trim() ? techCompleteNotes.trim() : undefined,
            });
            setRequest(updated);
            setTechCompleteNotes('');
            showToast('Work finished — office will finalize billing if needed.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not finish work';
            setTechError(msg);
            setInvoiceError(msg);
            showToast(msg, 'error');
        }
        finally {
            setTechSaving(false);
        }
    }
    async function handleSavePayout() {
        if (!auth?.token || !request)
            return;
        setPayoutSaving(true);
        setPayoutError('');
        try {
            let approvedAmount: number | undefined;
            if (payoutApproved.trim() !== '') {
                const n = Number(payoutApproved.replace(',', '.'));
                if (Number.isNaN(n) || n < 0) {
                    const msg = 'Approved amount must be a valid non-negative number.';
                    setPayoutError(msg);
                    showToast(msg, 'error');
                    return;
                }
                approvedAmount = n;
            }
            const paidIso = payoutPaidAt.trim()
                ? new Date(payoutPaidAt.trim()).toISOString()
                : undefined;
            if (payoutPaidAt.trim() && Number.isNaN(Date.parse(payoutPaidAt.trim()))) {
                const msg = 'Paid date/time is not valid.';
                setPayoutError(msg);
                showToast(msg, 'error');
                return;
            }
            const updated = await patchTechnicianPayout(auth.token, request.id, {
                ...(payoutStatus.trim() ? { status: payoutStatus.trim() } : {}),
                ...(approvedAmount !== undefined ? { approvedAmount } : {}),
                ...(paidIso ? { paidAt: paidIso } : {}),
                notes: payoutNotes,
            });
            setRequest(updated);
            showToast('Vendor payout record saved.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not save payout';
            setPayoutError(msg);
            showToast(msg, 'error');
        }
        finally {
            setPayoutSaving(false);
        }
    }
    async function handleApprove() {
        if (!auth?.token || !request)
            return;
        setApproveSaving(true);
        setApproveError('');
        setDeclineError('');
        try {
            const updated = await approveMaintenanceRequest(auth.token, request.id);
            setRequest(updated);
            showToast('Request approved.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not approve';
            setApproveError(msg);
            showToast(msg, 'error');
        }
        finally {
            setApproveSaving(false);
        }
    }
    async function handleDecline() {
        if (!auth?.token || !request)
            return;
        if (!confirmDelete('Decline this maintenance request? The resident will be notified and the work order will be closed.')) {
            return;
        }
        setDeclineSaving(true);
        setDeclineError('');
        setApproveError('');
        try {
            const updated = await declineMaintenanceRequest(auth.token, request.id, declineReason.trim() || null);
            setRequest(updated);
            setDeclineReason('');
            showToast('Request declined.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not decline';
            setDeclineError(msg);
            showToast(msg, 'error');
        }
        finally {
            setDeclineSaving(false);
        }
    }
    async function handleCompleteWithoutCharge() {
        if (!auth?.token || !request)
            return;
        setClosureSaving(true);
        setChargeError('');
        try {
            const updated = await completeMaintenanceWithoutCharge(auth.token, request.id);
            setRequest(updated);
            showToast('Closed with no tenant charge.', 'success');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not close request';
            setChargeError(msg);
            showToast(msg, 'error');
        }
        finally {
            setClosureSaving(false);
        }
    }
    async function handleAdminReply(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token || !request)
            return;
        setAdminReplySaving(true);
        setAdminReplyError('');
        try {
            const updated = await patchAdminResidentResponse(auth.token, request.id, adminReply.trim());
            setRequest(updated);
            showToast('Reply sent to the resident and saved on this work order.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not save reply';
            setAdminReplyError(msg);
            showToast(msg, 'error');
        }
        finally {
            setAdminReplySaving(false);
        }
    }
    async function handleReopenWorkOrder() {
        if (!auth?.token || !request)
            return;
        setReopenSaving(true);
        setAdminReplyError('');
        try {
            const updated = await updateMaintenanceRequestStatus(auth.token, request.id, 'In Progress');
            setRequest(updated);
            showToast('Work order reopened — technician can continue.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not reopen';
            setAdminReplyError(msg);
            showToast(msg, 'error');
        }
        finally {
            setReopenSaving(false);
        }
    }
    async function handleResidentCharge(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token || !request)
            return;
        const n = Number(String(chargeAmount).replace(',', '.'));
        if (Number.isNaN(n) || n <= 0) {
            const msg = 'Enter a positive amount.';
            setChargeError(msg);
            showToast(msg, 'error');
            return;
        }
        setChargeSaving(true);
        setChargeError('');
        try {
            const payload: {
                amount: number;
                type?: string;
                dueDate?: string;
            } = { amount: n };
            const t = chargeType.trim();
            if (t && t !== 'Maintenance / tenant damage')
                payload.type = t;
            if (chargeDueDate.trim())
                payload.dueDate = chargeDueDate.trim();
            const { bill, request: next } = await postResidentChargeFromMaintenance(auth.token, request.id, payload);
            setRequest({
                ...next,
                residentChargeNotificationSent: bill.residentNotificationSent ?? next.residentChargeNotificationSent ?? false,
            });
            showToast(next.residentChargeBillId != null
                ? `Bill ${next.residentChargeBillId} saved. Review it, then send it to the resident when ready.`
                : 'Bill saved.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not create bill';
            setChargeError(msg);
            showToast(msg, 'error');
        }
        finally {
            setChargeSaving(false);
        }
    }
    async function handleResidentChargeDraftSave() {
        if (!auth?.token || !request)
            return;
        const n = Number(String(chargeAmount).replace(',', '.'));
        if (Number.isNaN(n) || n <= 0) {
            const msg = 'Enter a positive amount.';
            setChargeError(msg);
            showToast(msg, 'error');
            return;
        }
        setChargeSaving(true);
        setChargeError('');
        try {
            const payload: {
                amount: number;
                type?: string;
                dueDate?: string;
            } = { amount: n };
            const t = chargeType.trim();
            if (t && t !== 'Maintenance / tenant damage')
                payload.type = t;
            if (chargeDueDate.trim())
                payload.dueDate = chargeDueDate.trim();
            const { bill, request: next } = await patchResidentChargeFromMaintenance(auth.token, request.id, payload);
            setRequest({
                ...next,
                residentChargeNotificationSent: bill.residentNotificationSent ?? next.residentChargeNotificationSent ?? false,
            });
            showToast('Draft bill updated.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not update bill';
            setChargeError(msg);
            showToast(msg, 'error');
        }
        finally {
            setChargeSaving(false);
        }
    }
    async function handleSendResidentBillConfirmed() {
        if (!auth?.token || !request)
            return;
        setSendBillSaving(true);
        try {
            const next = await postResidentChargeSendToResident(auth.token, request.id);
            setRequest(next);
            setSendBillConfirmOpen(false);
            showToast('Bill sent to the resident — they can pay it under Billing & Payments.', 'success');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not send bill';
            showToast(msg, 'error');
        }
        finally {
            setSendBillSaving(false);
        }
    }
    if (loading) {
        return (<div className="page">
        <p className="muted">Loading...</p>
      </div>);
    }
    if (!request) {
        const navState = location.state as WorkOrderLocationState | null;
        const technicianBack = typeof navState?.technicianBackPath === 'string' && navState.technicianBackPath.startsWith('/')
            ? navState.technicianBackPath
            : '/service-provider';
        const backTo = isAdmin ? '/maintenance-requests' : isTechnician ? technicianBack : '/';
        const backLabel = isAdmin
            ? 'Back to Maintenance Requests'
            : isTechnician
                ? technicianBack === '/service-provider/assigned-jobs'
                    ? 'Back to Assigned jobs'
                    : 'Back to Service Provider'
                : 'Back to Dashboard';
        return (<div className="page">
        <p>Request not found.</p>
        <p className="muted work-order-not-found-hint">
          This request may not exist, or you may not have access to it.
        </p>
        <Link to={backTo} className="btn-primary">
          {backLabel}
        </Link>
      </div>);
    }
    const navState = location.state as WorkOrderLocationState | null;
    const technicianBack = isTechnician &&
        typeof navState?.technicianBackPath === 'string' &&
        navState.technicianBackPath.startsWith('/')
        ? navState.technicianBackPath
        : '/service-provider';
    const listPath = isAdmin ? '/maintenance-requests' : isTechnician ? technicianBack : '/';
    const listLabel = isAdmin
        ? '← Back to Maintenance Requests'
        : isTechnician
            ? technicianBack === '/service-provider/assigned-jobs'
                ? '← Back to Assigned jobs'
                : '← Back to Service Provider'
            : '← Back to Dashboard';
    const roomDisplay = formatRoomUnitLabel(request.submittedFromUnit) ||
        request.submittedFromUnit?.trim() ||
        null;
    const postWorkStatuses = ['Solved', 'Unpaid', 'Completed'];
    const showResidentFeedbackForm = isResident && postWorkStatuses.includes(request.status);
    const showAdminFollowUp = isAdmin && postWorkStatuses.includes(request.status);
    const canAdminReopen = isAdmin && request.status === 'Solved' && !request.residentChargeBillId?.trim();
    const terminalTechStatuses = ['Solved', 'Unpaid', 'Completed'];
    const showVendorInvoiceInDetails = isAdmin || isTechnician;
    const showTechnicianInvoiceForm = isTechnician &&
        request.assignedTechnician.trim() !== 'Not assigned' &&
        !terminalTechStatuses.includes(request.status) &&
        request.status !== 'Requested' &&
        request.status !== 'Declined';
    const showTechnicianSiteDetailsForm = isTechnician &&
        request.assignedTechnician.trim() !== 'Not assigned' &&
        (request.status === 'Registered' || request.status === 'In Progress');
    const canAdminChargeOrClose = isAdmin && request.status === 'Solved' && !request.residentChargeBillId;
    const showAdminPendingSendBill = isAdmin &&
        request.status === 'Unpaid' &&
        Boolean(request.residentChargeBillId?.trim()) &&
        request.residentChargeNotificationSent !== true;
    const showAdminTenantChargeEditor = canAdminChargeOrClose || showAdminPendingSendBill;
    const showTriageSection = isAdmin &&
        request.status !== 'Requested' &&
        request.status !== 'Declined' &&
        request.status !== 'Completed';
    const showAssignTechnician = isAdmin &&
        request.assignedTechnician.trim() === 'Not assigned' &&
        !postWorkStatuses.includes(request.status) &&
        request.status !== 'Declined' &&
        request.status !== 'Requested';
    const showTenantChargeSection = isAdmin && !['Requested', 'Completed', 'Declined'].includes(request.status);
    const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
    const showVendorPayoutCard = isAdmin &&
        request.assignedTechnician.trim() !== 'Not assigned' &&
        ['Solved', 'Unpaid', 'Completed'].includes(request.status);
    const assignmentBlocked = Boolean(technician.trim()) && Boolean(assignmentContext?.assignmentBlockReason);
    const residentWorkOrderHint = isResident ? residentPostWorkSummaryLine(request) : null;
    const requestDetailsSummaryTop = (<div className="work-order-details-summary-top">
            <div className="work-order-details-summary-body">
              <div className="work-order-details-summary-main">
                <span className="work-order-details-title">{request.title}</span>
                <span className={statusPillClass(request.status)}>
                  {isResident ? residentFacingStatusLabel(request.status) : request.status}
                </span>
              </div>
              <p className="work-order-details-summary-meta muted small">
                {request.buildingName?.trim() || '—'}
                {roomDisplay ? ` · ${roomDisplay}` : ''} · Priority {normalizePriorityLabel(request.priority)} ·{' '}
                {request.dateCreated}
              </p>
              {residentWorkOrderHint ? (<p className="work-order-resident-summary-hint">{residentWorkOrderHint}</p>) : null}
            </div>
            {!isResident ? (<>
              <span className="details-expand-hint details-expand-hint--when-closed muted small">Show full request</span>
              <span className="details-expand-hint details-expand-hint--when-open muted small">Show less</span>
            </>) : null}
    </div>);
    const requestDetailsBody = (<div className="work-order-details-body-scroll">
          <div className="work-order-details-columns">
            <div className="work-order-details-col">
              <h4 className="work-order-details-col-title">Request</h4>
              <dl className="detail-list">
                <dt>Building</dt>
                <dd>{request.buildingName?.trim() || '—'}</dd>
                <dt>Room / unit</dt>
                <dd>{roomDisplay ?? '—'}</dd>
                <dt>Priority</dt>
                <dd>{normalizePriorityLabel(request.priority)}</dd>
                <dt>Description</dt>
                <dd className="work-order-details-description">{request.description || 'No description'}</dd>
                {request.status === 'Declined' && (<>
                    <dt>Decline reason</dt>
                    <dd>{request.adminDeclineReason?.trim() || '—'}</dd>
                  </>)}
                <dt>Resident feedback</dt>
                <dd>{request.residentFeedback?.trim() || '—'}</dd>
              </dl>
            </div>
            <div className="work-order-details-col">
              <h4 className="work-order-details-col-title">Assignment &amp; follow-up</h4>
              <dl className="detail-list">
                <dt>Assigned technician</dt>
                <dd>{request.assignedTechnician}</dd>
                <dt>Technician completion notes</dt>
                <dd>{request.technicianCompletionNotes?.trim() || '—'}</dd>
                <dt>Technician site update</dt>
                <dd>{request.technicianSiteUpdate?.trim() || '—'}</dd>
                <dt>Parts / materials</dt>
                <dd>{request.technicianMaterialsUsed?.trim() || '—'}</dd>
                <dt>Expected return / next visit</dt>
                <dd>{request.technicianExpectedReturnDate?.trim() || '—'}</dd>
                {request.technicianSiteUpdateHistory && request.technicianSiteUpdateHistory.length > 0 ? (<>
                    <dt>Progress log</dt>
                    <dd>
                      <SiteProgressHistoryList entries={request.technicianSiteUpdateHistory} showOfficeNotes={isAdmin || isTechnician}/>
                    </dd>
                  </>) : null}
                {(isAdmin || isTechnician) && (<>
                    <dt>Technician internal note (office only)</dt>
                    <dd>{request.technicianOfficeNotes?.trim() || '—'}</dd>
                  </>)}
                {showVendorInvoiceInDetails && (<>
                    <dt>Vendor invoice (technician)</dt>
                    <dd>
                      {request.technicianInvoiceUrl?.trim() ? (<a href={request.technicianInvoiceUrl.trim()} target="_blank" rel="noreferrer">
                          Open invoice link
                        </a>) : ('—')}
                    </dd>
                    <dt>Vendor invoice amount</dt>
                    <dd>
                      {request.technicianInvoiceAmount != null
                ? money.format(request.technicianInvoiceAmount)
                : '—'}
                    </dd>
                    <dt>Vendor invoice notes</dt>
                    <dd>{request.technicianInvoiceNotes?.trim() || '—'}</dd>
                    <dt>Signature acknowledgment</dt>
                    <dd>{request.technicianSignatureAcknowledgment?.trim() || '—'}</dd>
                    {isAdmin && (<>
                        <dt>Vendor payout (AP)</dt>
                        <dd>
                          {request.technicianPayoutStatus?.trim() || '—'}
                          {request.technicianPayoutApprovedAmount != null &&
                    ` · ${money.format(request.technicianPayoutApprovedAmount)}`}
                          {request.technicianPayoutPaidAt &&
                    ` · paid ${new Date(request.technicianPayoutPaidAt).toLocaleString()}`}
                          {request.technicianPayoutNotes?.trim() && (<>
                              <br />
                              <span className="muted small">{request.technicianPayoutNotes.trim()}</span>
                            </>)}
                        </dd>
                      </>)}
                    <dt>Invoice submitted</dt>
                    <dd>
                      {request.technicianInvoiceSubmittedAt
                ? new Date(request.technicianInvoiceSubmittedAt).toLocaleString()
                : '—'}
                    </dd>
                  </>)}
                <dt>Office reply</dt>
                <dd>{request.adminResponseToResident?.trim() || '—'}</dd>
              </dl>
            </div>
          </div>
          {request.photoUrls && request.photoUrls.length > 0 && (<div className="work-order-photos">
              <h4 className="work-order-photos-title">Photos (resident)</h4>
              <ul className="work-order-photo-grid">
                {request.photoUrls.map((url, i) => (<li key={i}>
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`Attachment ${i + 1}`} className="work-order-photo-thumb"/>
                    </a>
                  </li>))}
              </ul>
            </div>)}
          {showVendorInvoiceInDetails &&
            request.technicianWorkPhotoUrls &&
            request.technicianWorkPhotoUrls.length > 0 && (<div className="work-order-photos">
                <h4 className="work-order-photos-title">Photos (technician)</h4>
                <ul className="work-order-photo-grid">
                  {request.technicianWorkPhotoUrls.map((url, i) => (<li key={i}>
                      <a href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt={`Technician ${i + 1}`} className="work-order-photo-thumb"/>
                      </a>
                    </li>))}
                </ul>
              </div>)}
    </div>);
    const requestDetailsSection = (<section className="card work-order-card work-order-card--details">
      {isResident ? (<>
          <div className="work-order-details-resident-static">{requestDetailsSummaryTop}</div>
          {requestDetailsBody}
        </>) : (<details className="work-order-details-collapse details-expand-toggle" open={requestDetailsOpen} onToggle={(e) => setRequestDetailsOpen(e.currentTarget.open)}>
          <summary className="work-order-details-summary">{requestDetailsSummaryTop}</summary>
          {requestDetailsBody}
        </details>)}
    </section>);
    return (<div className={`page work-order-page${isAdmin ? ' work-order-page--admin' : ' work-order-page--single-column'}`}>
      <Link to={listPath} className="back-link">
        {listLabel}
      </Link>
      <h1>
        {isAdmin ? 'Work Order' : isTechnician ? 'Work order' : 'Maintenance request'}: {request.id}
      </h1>

      <div className={`work-order-grid${isAdmin ? ' work-order-grid--admin-split' : ''}`}>
        {isAdmin ? (<div className="work-order-admin-columns">
            <div className="work-order-admin-primary">
              {requestDetailsSection}
              {showAdminFollowUp && (<WorkOrderCollapsibleCard className="work-order-card--admin-followup" title={<h3 className="card-title">Resident follow-up</h3>} defaultOpen>
                  <form onSubmit={(e) => void handleAdminReply(e)} className="building-form">
                    <label>
                      Message to resident
                      <textarea rows={3} value={adminReply} onChange={(e) => setAdminReply(e.target.value)} disabled={adminReplySaving || reopenSaving} placeholder="Thanks for the note — we'll schedule a follow-up visit…"/>
                    </label>
                    {adminReplyError && <p className="error">{adminReplyError}</p>}
                    <div className="work-order-actions work-order-actions--inline">
                      <button type="submit" className="btn-primary" disabled={adminReplySaving || reopenSaving}>
                        {adminReplySaving ? 'Saving…' : 'Post reply to resident'}
                      </button>
                      {canAdminReopen && (<button type="button" className="btn-secondary" disabled={adminReplySaving || reopenSaving} onClick={() => void handleReopenWorkOrder()}>
                          {reopenSaving ? 'Reopening…' : 'Reopen work order'}
                        </button>)}
                    </div>
                  </form>
                </WorkOrderCollapsibleCard>)}
            </div>
            <div className="work-order-admin-rail">
              {request.status === 'Requested' && (<WorkOrderCollapsibleCard className="work-order-card--approve" title={<h3 className="card-title work-order-approve-title">Approve or decline</h3>} defaultOpen>
                  <div className="work-order-decline-note">
                    <label className="work-order-decline-note-label" htmlFor="work-order-decline-reason">
                      If declining, add a note for the resident (optional)
                    </label>
                    <textarea id="work-order-decline-reason" className="work-order-decline-reason-input" rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} disabled={declineSaving || approveSaving} placeholder="e.g. Not covered under lease, or duplicate report" maxLength={2000}/>
                  </div>
                  <div className="work-order-approve-actions">
                    <button type="button" className="btn-primary work-order-approve-btn" disabled={approveSaving || declineSaving} onClick={() => void handleApprove()}>
                      {approveSaving ? 'Approving…' : 'Approve'}
                    </button>
                    <button type="button" className="btn-danger work-order-approve-btn" disabled={declineSaving || approveSaving} onClick={() => void handleDecline()}>
                      {declineSaving ? 'Declining…' : 'Decline'}
                    </button>
                  </div>
                  {(approveError || declineError) && (<p className="error work-order-approve-error">{approveError || declineError}</p>)}
                </WorkOrderCollapsibleCard>)}

              {showTriageSection && (<WorkOrderCollapsibleCard className="work-order-card--triage" title={<h3 className="card-title">Triage</h3>} defaultOpen>
                  <div className="work-order-triage-row">
                    <label htmlFor="work-order-priority" className="work-order-triage-label">
                      Priority
                    </label>
                    <select id="work-order-priority" className="work-order-triage-select" value={priorityDraft} onChange={(e) => setPriorityDraft(e.target.value as 'Low' | 'Medium' | 'High')} disabled={prioritySaving}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                    <button type="button" className="btn-primary work-order-triage-save" disabled={prioritySaving ||
                    priorityDraft === normalizePriorityLabel(request.priority)} onClick={() => void handleSavePriority()}>
                      {prioritySaving ? 'Saving…' : 'Save priority'}
                    </button>
                  </div>
                </WorkOrderCollapsibleCard>)}

              {(showAssignTechnician || showTenantChargeSection) && (<WorkOrderCollapsibleCard className="work-order-card--admin-actions" title={<h3 className="card-title">Assignment &amp; billing</h3>} defaultOpen>
                  {showAssignTechnician && (<div className="work-order-admin-block">
                      <h4 className="work-order-subcard-title">Assign technician</h4>
                      {serviceCatalogItems.length > 0 && (<div className="work-order-service-filter">
                          <label htmlFor="work-order-service-filter" className="work-order-assignment-label">
                            Filter by service
                          </label>
                          <select id="work-order-service-filter" className="work-order-assignment-select work-order-service-filter-select" value={technicianServiceFilter === '' ? '' : String(technicianServiceFilter)} onChange={(e) => {
                            const v = e.target.value;
                            setTechnicianServiceFilter(v === '' ? '' : Number(v));
                        }} disabled={saving}>
                            <option value="">All technicians</option>
                            {serviceCatalogItems.map((c) => (<option key={c.id} value={c.id}>
                                {c.name}
                              </option>))}
                          </select>
                        </div>)}
                      <div className="work-order-assignment-row">
                        <label htmlFor="work-order-technician" className="work-order-assignment-label">
                          Technician
                        </label>
                        <select id="work-order-technician" className="work-order-assignment-select" value={technician} onChange={(e) => setTechnician(e.target.value)} disabled={saving}>
                          <option value="">Not assigned</option>
                          {technicianSelectOptions.map((name) => (<option key={name} value={name}>
                              {name}
                            </option>))}
                        </select>
                        <button type="button" className="btn-primary work-order-assignment-save" disabled={saving || assignmentBlocked} onClick={() => void handleSaveAssignment()}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                      {assignmentContext?.assignmentBlockReason && (<p className="error work-order-assign-block-reason" role="alert">
                          {assignmentContext.assignmentBlockReason}
                        </p>)}
                      {assignError && <p className="error">{assignError}</p>}
                      {assignmentContextLoading && (<p className="muted small work-order-assign-context-loading">Loading technician context…</p>)}
                      {!assignmentContextLoading && assignmentContext && (<div className="work-order-assign-context">
                          <div className="work-order-assign-context-metrics">
                            <span>
                              <strong>{assignmentContext.metrics.activeJobs}</strong>{' '}
                              <span className="muted">active jobs</span>
                            </span>
                            <span>
                              <strong>{assignmentContext.metrics.completedJobs}</strong>{' '}
                              <span className="muted">completed (all time)</span>
                            </span>
                          </div>
                        </div>)}
                    </div>)}

                  {showAssignTechnician && showTenantChargeSection && (<div className="work-order-admin-divider" aria-hidden/>)}

                  {showTenantChargeSection && (<div className="work-order-admin-block">
                      {showAdminTenantChargeEditor && (<>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            if (showAdminPendingSendBill)
                                void handleResidentChargeDraftSave();
                            else
                                void handleResidentCharge(e);
                        }} className="building-form">
                            <label>
                              Amount <span className="muted small">(required)</span>
                              <input type="text" inputMode="decimal" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} disabled={chargeSaving || closureSaving} placeholder="e.g. 150.00" required/>
                            </label>
                            <label>
                              Description
                              <input type="text" value={chargeType} onChange={(e) => setChargeType(e.target.value)} disabled={chargeSaving || closureSaving} placeholder="Maintenance / tenant damage"/>
                            </label>
                            <label>
                              Due date{' '}
                              <input type="date" value={chargeDueDate} onChange={(e) => setChargeDueDate(e.target.value)} disabled={chargeSaving || closureSaving}/>
                            </label>
                            {chargeError && <p className="error">{chargeError}</p>}
                            <div className="work-order-actions work-order-actions--inline">
                              {showAdminPendingSendBill && (<button type="submit" className="btn-secondary" disabled={chargeSaving || closureSaving}>
                                  {chargeSaving ? 'Saving…' : 'Save draft changes'}
                                </button>)}
                              {canAdminChargeOrClose && (<>
                                  <button type="submit" className="btn-primary" disabled={chargeSaving || closureSaving}>
                                    {chargeSaving ? 'Saving…' : 'Create bill'}
                                  </button>
                                  <button type="button" className="btn-secondary" disabled={chargeSaving || closureSaving} onClick={() => void handleCompleteWithoutCharge()}>
                                    {closureSaving ? 'Closing…' : 'Complete without tenant charge'}
                                  </button>
                                </>)}
                            </div>
                          </form>
                          {showAdminPendingSendBill && (<div className="work-order-bill-draft-notice" role="status">
                              <button type="button" className="btn-primary" disabled={sendBillSaving} onClick={() => setSendBillConfirmOpen(true)}>
                                Send bill to resident
                              </button>
                            </div>)}
                        </>)}
                    </div>)}
                </WorkOrderCollapsibleCard>)}

              {SHOW_VENDOR_PAYMENT_AP_FORM && showVendorPayoutCard && (<WorkOrderCollapsibleCard className="work-order-card--vendor-payout" title={<h3 className="card-title">Vendor payment (accounts payable)</h3>} defaultOpen>
                  <div className="building-form">
                    <label>
                      Payout status
                      <select value={payoutStatus} onChange={(e) => setPayoutStatus(e.target.value)} disabled={payoutSaving}>
                        <option value="">—</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </label>
                    <label>
                      Approved amount
                      <input type="text" inputMode="decimal" value={payoutApproved} onChange={(e) => setPayoutApproved(e.target.value)} disabled={payoutSaving} placeholder="e.g. 450.00"/>
                    </label>
                    <label>
                      Paid at
                      <input type="datetime-local" value={payoutPaidAt} onChange={(e) => setPayoutPaidAt(e.target.value)} disabled={payoutSaving}/>
                    </label>
                    <label>
                      AP notes
                      <textarea rows={2} value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} disabled={payoutSaving} placeholder="Check #, ACH ref, batch…"/>
                    </label>
                    {payoutError && <p className="error">{payoutError}</p>}
                    <div className="work-order-actions">
                      <button type="button" className="btn-primary" disabled={payoutSaving} onClick={() => void handleSavePayout()}>
                        {payoutSaving ? 'Saving…' : 'Save payout record'}
                      </button>
                    </div>
                  </div>
                </WorkOrderCollapsibleCard>)}
            </div>
          </div>) : (requestDetailsSection)}

        {showResidentFeedbackForm && (<WorkOrderCollapsibleCard className="work-order-card--resident-feedback" title={<>
                <p className="work-order-feedback-eyebrow">After the visit</p>
                <h3 className="work-order-feedback-title">How did the work go?</h3>
              </>} defaultOpen>
            {request.adminResponseToResident?.trim() ? (<div className="work-order-feedback-office-reply" role="region" aria-label="Message from property management">
                <span className="work-order-feedback-office-reply-label">Message from the office</span>
                <p className="work-order-feedback-office-reply-body">{request.adminResponseToResident.trim()}</p>
              </div>) : null}
            {request.residentFeedback?.trim() ? (<div className="work-order-feedback-saved" aria-live="polite">
                <span className="work-order-feedback-saved-label">Your saved comment</span>
                <p className="work-order-feedback-saved-body">{request.residentFeedback.trim()}</p>
              </div>) : null}
            <form onSubmit={(e) => void handleResidentFeedback(e)} className="work-order-feedback-form">
              <label className="work-order-feedback-label">
                {request.residentFeedback?.trim() ? 'Update your comment' : 'Your comment'}
                <textarea className="work-order-feedback-textarea" rows={5} value={residentFeedback} onChange={(e) => setResidentFeedback(e.target.value)} disabled={feedbackSaving} placeholder="e.g. Fixed to my satisfaction, or still seeing a leak…"/>
              </label>
              {feedbackError && <p className="error">{feedbackError}</p>}
              <div className="work-order-actions work-order-actions--resident-feedback">
                <button type="submit" className="btn-primary btn-primary--work-order-feedback" disabled={feedbackSaving}>
                  {feedbackSaving
                ? 'Saving…'
                : request.residentFeedback?.trim()
                    ? 'Save update'
                    : 'Save comment'}
                </button>
              </div>
            </form>
          </WorkOrderCollapsibleCard>)}

        {showTechnicianSiteDetailsForm && (<WorkOrderCollapsibleCard className="work-order-card--technician-site" title={<h3 className="card-title">Site visit &amp; progress</h3>} defaultOpen>
            <div className="building-form">
              {request.technicianSiteUpdateHistory && request.technicianSiteUpdateHistory.length > 0 ? (<>
                  <h4 className="work-order-subcard-title">Saved progress (newest first)</h4>
                  <SiteProgressHistoryList entries={request.technicianSiteUpdateHistory} showOfficeNotes/>
                </>) : null}
              <label>
                Site update <span className="muted small">(access, findings, next steps)</span>
                <textarea rows={3} value={siteUpdateDraft} onChange={(e) => setSiteUpdateDraft(e.target.value)} disabled={siteDetailsSaving || techProgressSaving} placeholder="e.g. Inspected detector — ordered replacement part; return Tuesday." maxLength={4000}/>
              </label>
              <label>
                Parts / materials used <span className="muted small">(optional)</span>
                <textarea rows={2} value={materialsUsedDraft} onChange={(e) => setMaterialsUsedDraft(e.target.value)} disabled={siteDetailsSaving || techProgressSaving} placeholder="e.g. 9V batteries (2), smoke detector model BRK-123" maxLength={4000}/>
              </label>
              <label>
                Expected return / completion date <span className="muted small">(optional)</span>
                <input type="date" value={expectedReturnDraft} onChange={(e) => setExpectedReturnDraft(e.target.value)} disabled={siteDetailsSaving || techProgressSaving}/>
              </label>
              <label>
                Internal note for office <span className="muted small">(not shown to resident)</span>
                <textarea rows={2} value={officeNotesDraft} onChange={(e) => setOfficeNotesDraft(e.target.value)} disabled={siteDetailsSaving || techProgressSaving} placeholder="e.g. Coordinate with master key — unit often empty afternoons." maxLength={4000}/>
              </label>
              {siteDetailsError ? <p className="error">{siteDetailsError}</p> : null}
              <div className="work-order-actions work-order-actions--inline">
                {request.status === 'Registered' && (<button type="button" className="btn-primary" disabled={siteDetailsSaving || techProgressSaving} onClick={() => void handleTechnicianStartWork()}>
                    {techProgressSaving ? 'Updating…' : 'Start work'}
                  </button>)}
                {request.status !== 'Registered' && (<button type="button" className="btn-secondary" disabled={siteDetailsSaving || techProgressSaving} onClick={() => void handleSaveSiteDetails()}>
                    {siteDetailsSaving ? 'Saving…' : 'Save progress'}
                  </button>)}
              </div>
            </div>
          </WorkOrderCollapsibleCard>)}

        {showTechnicianInvoiceForm && (<WorkOrderCollapsibleCard className="work-order-card--technician-work" title={<h3 className="card-title">Complete work</h3>} defaultOpen>
            <div className="building-form">
              <label>
                Invoice URL <span className="muted small">(required)</span>
                <input type="url" value={invoiceUrl} onChange={(e) => setInvoiceUrl(e.target.value)} disabled={techSaving} placeholder="https://example.com/invoice.pdf"/>
              </label>
              <label>
                Invoice amount <span className="muted small">(optional)</span>
                <input type="text" inputMode="decimal" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} disabled={techSaving} placeholder="e.g. 125.00"/>
              </label>
              <label>
                Invoice notes <span className="muted small">(optional)</span>
                <textarea rows={2} value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} disabled={techSaving} placeholder="Parts, PO number, etc."/>
              </label>
              <div className="work-order-invoice-lines-editor">
                <span className="work-order-invoice-lines-header">Work completion photos (URLs)</span>
                {workPhotoUrlsList.map((u, i) => (<div key={i} className="work-order-photo-url-row">
                    <input type="url" value={u} onChange={(e) => setWorkPhotoUrlsList((list) => {
                    const next = [...list];
                    next[i] = e.target.value;
                    return next;
                })} disabled={techSaving} placeholder="https://…"/>
                    <button type="button" className="btn-secondary btn-small" disabled={techSaving || workPhotoUrlsList.length <= 1} onClick={() => setWorkPhotoUrlsList((list) => list.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>))}
                <button type="button" className="btn-secondary btn-small" disabled={techSaving} onClick={() => setWorkPhotoUrlsList((list) => [...list, ''])}>
                  Add photo URL
                </button>
              </div>
              <label>
                Signature acknowledgment <span className="muted small">(optional — type name &amp; date)</span>
                <input type="text" value={signatureAck} onChange={(e) => setSignatureAck(e.target.value)} disabled={techSaving} placeholder="e.g. Jane Smith, 2026-03-30"/>
              </label>
              <label className="work-order-field">
                Work comments <span className="muted small">(optional)</span>
                <textarea rows={3} value={techCompleteNotes} onChange={(e) => setTechCompleteNotes(e.target.value)} disabled={techSaving} placeholder="What you did on site — parts replaced, tests, etc."/>
              </label>
              {(invoiceError || techError) && (<p className="error">{invoiceError || techError}</p>)}
              <div className="work-order-actions">
                <button type="button" className="btn-primary" disabled={techSaving || !invoiceUrl.trim()} onClick={() => void handleFinishWork()}>
                  {techSaving ? 'Saving…' : 'Finish'}
                </button>
              </div>
            </div>
          </WorkOrderCollapsibleCard>)}
      </div>

      {sendBillConfirmOpen && request?.residentChargeBillId
            ? createPortal(<div className="modal-backdrop modal-backdrop--portal" role="presentation" onClick={() => {
                    if (!sendBillSaving)
                        setSendBillConfirmOpen(false);
                }}>
              <div className="modal-panel modal-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="send-bill-confirm-title" aria-describedby="send-bill-confirm-desc" onClick={(e) => e.stopPropagation()}>
                <h3 id="send-bill-confirm-title" className="card-title">
                  Send bill to resident?
                </h3>
                <p id="send-bill-confirm-desc" className="modal-confirm-body">
                  Notify resident now.
                </p>
                <div className="building-details-actions">
                  <button type="button" className="btn-primary" disabled={sendBillSaving} onClick={() => void handleSendResidentBillConfirmed()}>
                    {sendBillSaving ? 'Sending…' : 'Send bill'}
                  </button>
                  <button type="button" className="btn-secondary" disabled={sendBillSaving} onClick={() => setSendBillConfirmOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>, document.body)
            : null}
    </div>);
}
