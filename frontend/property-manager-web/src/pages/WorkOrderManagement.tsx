import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  approveMaintenanceRequest,
  declineMaintenanceRequest,
  assignMaintenanceTechnician,
  completeMaintenanceWithoutCharge,
  getAdminServiceCatalog,
  getAdminTechnicianNames,
  getMaintenanceRequest,
  getTechnicianAssignmentContext,
  patchAdminResidentResponse,
  patchMaintenancePriority,
  patchResidentCompletionFeedback,
  patchTechnicianInvoice,
  patchTechnicianPayout,
  patchTechnicianMaintenanceStatus,
  postResidentChargeFromMaintenance,
  updateMaintenanceRequestStatus,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { isAdminRole, isTechnicianRole } from '../utils/auth'
import { formatRoomUnitLabel } from '../utils/unitLabel'
import { confirmDelete } from '../utils/confirmDelete'
import type { MaintenanceRequest, ServiceCatalogItem, TechnicianAssignmentContext } from '../types'

function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusPillClass(status: string): string {
  return `status-pill ${status.toLowerCase().replace(/\s+/g, '-')}`
}

function normalizePriorityLabel(p: string | undefined): 'Low' | 'Medium' | 'High' {
  const x = (p ?? '').trim().toLowerCase()
  if (x === 'low') return 'Low'
  if (x === 'high') return 'High'
  return 'Medium'
}

export function WorkOrderManagementPage() {
  const { id } = useParams<{ id: string }>()
  const { auth } = useAuth()
  const showToast = useToast()
  const isAdmin = isAdminRole(auth?.role)
  const isTechnician = isTechnicianRole(auth?.role)
  const isResident = !isAdmin && !isTechnician

  const [request, setRequest] = useState<MaintenanceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [technician, setTechnician] = useState('')
  const [saving, setSaving] = useState(false)
  const [assignError, setAssignError] = useState('')

  const [residentFeedback, setResidentFeedback] = useState('')
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')

  const [techCompleteNotes, setTechCompleteNotes] = useState('')
  const [techSaving, setTechSaving] = useState(false)
  const [techError, setTechError] = useState('')

  const [invoiceUrl, setInvoiceUrl] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoiceError, setInvoiceError] = useState('')
  const [workPhotoUrlsList, setWorkPhotoUrlsList] = useState<string[]>([''])
  const [signatureAck, setSignatureAck] = useState('')
  const [payoutStatus, setPayoutStatus] = useState('')
  const [payoutApproved, setPayoutApproved] = useState('')
  const [payoutPaidAt, setPayoutPaidAt] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [payoutError, setPayoutError] = useState('')

  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeType, setChargeType] = useState('Maintenance / tenant damage')
  const [chargeDueDate, setChargeDueDate] = useState('')
  const [chargeSaving, setChargeSaving] = useState(false)
  const [chargeError, setChargeError] = useState('')

  const [approveSaving, setApproveSaving] = useState(false)
  const [approveError, setApproveError] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [declineSaving, setDeclineSaving] = useState(false)
  const [declineError, setDeclineError] = useState('')
  const [closureSaving, setClosureSaving] = useState(false)

  const [adminReply, setAdminReply] = useState('')
  const [adminReplySaving, setAdminReplySaving] = useState(false)
  const [adminReplyError, setAdminReplyError] = useState('')
  const [reopenSaving, setReopenSaving] = useState(false)

  const [technicianNameOptions, setTechnicianNameOptions] = useState<string[]>([])
  const [serviceCatalogItems, setServiceCatalogItems] = useState<ServiceCatalogItem[]>([])
  const [technicianServiceFilter, setTechnicianServiceFilter] = useState<number | ''>('')
  const [assignmentContext, setAssignmentContext] = useState<TechnicianAssignmentContext | null>(null)
  const [assignmentContextLoading, setAssignmentContextLoading] = useState(false)

  const [priorityDraft, setPriorityDraft] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [prioritySaving, setPrioritySaving] = useState(false)

  useEffect(() => {
    if (!auth?.token || !id) return
    setLoading(true)
    getMaintenanceRequest(auth.token, id)
      .then(setRequest)
      .catch(() => {
        setRequest(null)
        showToast('Could not load this work order.', 'error')
      })
      .finally(() => setLoading(false))
  }, [auth?.token, id, showToast])

  useEffect(() => {
    setChargeAmount('')
    setChargeDueDate('')
    setChargeType('Maintenance / tenant damage')
    setChargeError('')
  }, [id])

  useEffect(() => {
    if (!request) return
    const a = request.assignedTechnician
    setTechnician(a === 'Not assigned' ? '' : a)
    setResidentFeedback(request.residentFeedback?.trim() ?? '')
    setInvoiceUrl(request.technicianInvoiceUrl?.trim() ?? '')
    setInvoiceAmount(
      request.technicianInvoiceAmount != null ? String(request.technicianInvoiceAmount) : '',
    )
    setInvoiceNotes(request.technicianInvoiceNotes?.trim() ?? '')
    setTechCompleteNotes(request.technicianCompletionNotes?.trim() ?? '')
    setAdminReply(request.adminResponseToResident?.trim() ?? '')
    setPriorityDraft(normalizePriorityLabel(request.priority))
    setWorkPhotoUrlsList(request.technicianWorkPhotoUrls?.length ? [...request.technicianWorkPhotoUrls] : [''])
    setSignatureAck(request.technicianSignatureAcknowledgment?.trim() ?? '')
    setPayoutStatus(request.technicianPayoutStatus?.trim() ?? '')
    setPayoutApproved(
      request.technicianPayoutApprovedAmount != null ? String(request.technicianPayoutApprovedAmount) : '',
    )
    setPayoutPaidAt(toDatetimeLocalValue(request.technicianPayoutPaidAt ?? undefined))
    setPayoutNotes(request.technicianPayoutNotes?.trim() ?? '')
  }, [request])

  /** Suggest tenant charge from vendor invoice total when bill not yet created (admin can edit). */
  useEffect(() => {
    if (!request) return
    if (request.status !== 'Solved' || request.residentChargeBillId?.trim()) return
    setChargeAmount((prev) => {
      if (prev.trim() !== '') return prev
      const suggested =
        request.technicianInvoiceAmount ?? request.technicianInvoiceSubtotal ?? null
      if (suggested != null && suggested > 0) return String(suggested)
      return prev
    })
  }, [
    request?.id,
    request?.status,
    request?.residentChargeBillId,
    request?.technicianInvoiceAmount,
    request?.technicianInvoiceSubtotal,
  ])

  useEffect(() => {
    if (!auth?.token || !isAdmin) return
    getAdminServiceCatalog(auth.token)
      .then(setServiceCatalogItems)
      .catch(() => setServiceCatalogItems([]))
  }, [auth?.token, isAdmin])

  useEffect(() => {
    if (!auth?.token || !isAdmin) return
    const cid = technicianServiceFilter === '' ? null : Number(technicianServiceFilter)
    getAdminTechnicianNames(auth.token, cid)
      .then((list) => setTechnicianNameOptions(list.map((x) => x.name)))
      .catch(() => {
        setTechnicianNameOptions([])
        showToast('Could not load technician directory.', 'error')
      })
  }, [auth?.token, isAdmin, technicianServiceFilter, showToast])

  const technicianSelectOptions = (() => {
    const set = new Set(technicianNameOptions)
    const fromRequest = request?.assignedTechnician?.trim()
    if (fromRequest && fromRequest !== 'Not assigned') set.add(fromRequest)
    const fromState = technician.trim()
    if (fromState) set.add(fromState)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  })()

  useEffect(() => {
    if (!auth?.token || !isAdmin) {
      setAssignmentContext(null)
      return
    }
    if (request?.status === 'Requested') {
      setAssignmentContext(null)
      return
    }
    const name =
      technician.trim() ||
      (request?.assignedTechnician && request.assignedTechnician !== 'Not assigned'
        ? request.assignedTechnician.trim()
        : '')
    if (!name) {
      setAssignmentContext(null)
      return
    }
    setAssignmentContextLoading(true)
    getTechnicianAssignmentContext(auth.token, name)
      .then(setAssignmentContext)
      .catch(() => {
        setAssignmentContext(null)
        showToast('Could not load technician compliance details.', 'error')
      })
      .finally(() => setAssignmentContextLoading(false))
  }, [auth?.token, isAdmin, technician, request?.assignedTechnician, request?.status, showToast])

  async function handleSavePriority() {
    if (!auth?.token || !request) return
    if (priorityDraft === normalizePriorityLabel(request.priority)) return
    setPrioritySaving(true)
    try {
      const updated = await patchMaintenancePriority(auth.token, request.id, priorityDraft)
      setRequest(updated)
      showToast('Priority updated.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not update priority'
      showToast(msg, 'error')
    } finally {
      setPrioritySaving(false)
    }
  }

  async function handleSaveAssignment() {
    if (!auth?.token || !request) return
    setSaving(true)
    setAssignError('')
    try {
      const updated = await assignMaintenanceTechnician(
        auth.token,
        request.id,
        technician.trim() || 'Not assigned',
      )
      setRequest(updated)
      showToast('Technician assignment saved.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save assignment'
      setAssignError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleResidentFeedback(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token || !request) return
    setFeedbackSaving(true)
    setFeedbackError('')
    try {
      const updated = await patchResidentCompletionFeedback(
        auth.token,
        request.id,
        residentFeedback.trim(),
      )
      setRequest(updated)
      showToast('Your comment was saved. Property management will see it.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save comment'
      setFeedbackError(msg)
      showToast(msg, 'error')
    } finally {
      setFeedbackSaving(false)
    }
  }

  /** Saves vendor invoice (required URL) then marks work Solved with optional notes. */
  async function handleFinishWork() {
    if (!auth?.token || !request) return
    const url = invoiceUrl.trim()
    if (!url) {
      const msg = 'Add an invoice URL before finishing.'
      setTechError(msg)
      setInvoiceError('Invoice URL is required.')
      showToast(msg, 'error')
      return
    }

    let amountNum: number | undefined
    if (invoiceAmount.trim()) {
      const n = Number(invoiceAmount.replace(',', '.'))
      if (Number.isNaN(n) || n < 0) {
        const msg = 'Amount must be a valid non-negative number.'
        setInvoiceError(msg)
        showToast(msg, 'error')
        return
      }
      amountNum = n
    }

    const photos = workPhotoUrlsList.map((u) => u.trim()).filter(Boolean)

    setTechSaving(true)
    setTechError('')
    setInvoiceError('')
    try {
      await patchTechnicianInvoice(auth.token, request.id, {
        invoiceUrl: url,
        ...(amountNum !== undefined ? { amount: amountNum } : {}),
        ...(invoiceNotes.trim() ? { notes: invoiceNotes.trim() } : {}),
        ...(photos.length ? { workPhotoUrls: photos } : {}),
        ...(signatureAck.trim() ? { signatureAcknowledgment: signatureAck.trim() } : {}),
      })
      const updated = await patchTechnicianMaintenanceStatus(auth.token, request.id, {
        status: 'Solved',
        completionNotes: techCompleteNotes.trim() ? techCompleteNotes.trim() : undefined,
      })
      setRequest(updated)
      setTechCompleteNotes('')
      showToast('Work finished — office will finalize billing if needed.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not finish work'
      setTechError(msg)
      setInvoiceError(msg)
      showToast(msg, 'error')
    } finally {
      setTechSaving(false)
    }
  }

  async function handleSavePayout() {
    if (!auth?.token || !request) return
    setPayoutSaving(true)
    setPayoutError('')
    try {
      let approvedAmount: number | undefined
      if (payoutApproved.trim() !== '') {
        const n = Number(payoutApproved.replace(',', '.'))
        if (Number.isNaN(n) || n < 0) {
          const msg = 'Approved amount must be a valid non-negative number.'
          setPayoutError(msg)
          showToast(msg, 'error')
          return
        }
        approvedAmount = n
      }
      const paidIso = payoutPaidAt.trim()
        ? new Date(payoutPaidAt.trim()).toISOString()
        : undefined
      if (payoutPaidAt.trim() && Number.isNaN(Date.parse(payoutPaidAt.trim()))) {
        const msg = 'Paid date/time is not valid.'
        setPayoutError(msg)
        showToast(msg, 'error')
        return
      }
      const updated = await patchTechnicianPayout(auth.token, request.id, {
        ...(payoutStatus.trim() ? { status: payoutStatus.trim() } : {}),
        ...(approvedAmount !== undefined ? { approvedAmount } : {}),
        ...(paidIso ? { paidAt: paidIso } : {}),
        notes: payoutNotes,
      })
      setRequest(updated)
      showToast('Vendor payout record saved.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save payout'
      setPayoutError(msg)
      showToast(msg, 'error')
    } finally {
      setPayoutSaving(false)
    }
  }

  async function handleApprove() {
    if (!auth?.token || !request) return
    setApproveSaving(true)
    setApproveError('')
    setDeclineError('')
    try {
      const updated = await approveMaintenanceRequest(auth.token, request.id)
      setRequest(updated)
      showToast('Request approved.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not approve'
      setApproveError(msg)
      showToast(msg, 'error')
    } finally {
      setApproveSaving(false)
    }
  }

  async function handleDecline() {
    if (!auth?.token || !request) return
    if (
      !confirmDelete(
        'Decline this maintenance request? The resident will be notified and the work order will be closed.',
      )
    ) {
      return
    }
    setDeclineSaving(true)
    setDeclineError('')
    setApproveError('')
    try {
      const updated = await declineMaintenanceRequest(
        auth.token,
        request.id,
        declineReason.trim() || null,
      )
      setRequest(updated)
      setDeclineReason('')
      showToast('Request declined.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not decline'
      setDeclineError(msg)
      showToast(msg, 'error')
    } finally {
      setDeclineSaving(false)
    }
  }

  async function handleCompleteWithoutCharge() {
    if (!auth?.token || !request) return
    setClosureSaving(true)
    setChargeError('')
    try {
      const updated = await completeMaintenanceWithoutCharge(auth.token, request.id)
      setRequest(updated)
      showToast('Closed with no tenant charge.', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not close request'
      setChargeError(msg)
      showToast(msg, 'error')
    } finally {
      setClosureSaving(false)
    }
  }

  async function handleAdminReply(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token || !request) return
    setAdminReplySaving(true)
    setAdminReplyError('')
    try {
      const updated = await patchAdminResidentResponse(auth.token, request.id, adminReply.trim())
      setRequest(updated)
      showToast('Reply sent to the resident and saved on this work order.', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save reply'
      setAdminReplyError(msg)
      showToast(msg, 'error')
    } finally {
      setAdminReplySaving(false)
    }
  }

  async function handleReopenWorkOrder() {
    if (!auth?.token || !request) return
    setReopenSaving(true)
    setAdminReplyError('')
    try {
      const updated = await updateMaintenanceRequestStatus(auth.token, request.id, 'In Progress')
      setRequest(updated)
      showToast('Work order reopened — technician can continue.', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reopen'
      setAdminReplyError(msg)
      showToast(msg, 'error')
    } finally {
      setReopenSaving(false)
    }
  }

  async function handleResidentCharge(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token || !request) return
    const n = Number(String(chargeAmount).replace(',', '.'))
    if (Number.isNaN(n) || n <= 0) {
      const msg = 'Enter a positive amount.'
      setChargeError(msg)
      showToast(msg, 'error')
      return
    }
    setChargeSaving(true)
    setChargeError('')
    try {
      const payload: { amount: number; type?: string; dueDate?: string } = { amount: n }
      const t = chargeType.trim()
      if (t && t !== 'Maintenance / tenant damage') payload.type = t
      if (chargeDueDate.trim()) payload.dueDate = chargeDueDate.trim()
      const { request: next } = await postResidentChargeFromMaintenance(
        auth.token,
        request.id,
        payload,
      )
      setRequest(next)
      const successMsg =
        next.residentChargeBillId != null
          ? `Bill ${next.residentChargeBillId} created for the resident.`
          : 'Bill created.'
      showToast(successMsg, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create bill'
      setChargeError(msg)
      showToast(msg, 'error')
    } finally {
      setChargeSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading...</p>
      </div>
    )
  }

  if (!request) {
    const backTo = isAdmin ? '/maintenance-requests' : isTechnician ? '/service-provider' : '/'
    const backLabel = isAdmin
      ? 'Back to Maintenance Requests'
      : isTechnician
        ? 'Back to Service Provider'
        : 'Back to Dashboard'
    return (
      <div className="page">
        <p>Request not found.</p>
        <p className="muted work-order-not-found-hint">
          This request may not exist, or you may not have access to it.
        </p>
        <Link to={backTo} className="btn-primary">
          {backLabel}
        </Link>
      </div>
    )
  }

  const listPath = isAdmin ? '/maintenance-requests' : isTechnician ? '/service-provider' : '/'
  const listLabel = isAdmin
    ? '← Back to Maintenance Requests'
    : isTechnician
      ? '← Back to Service Provider'
      : '← Back to Dashboard'

  const roomDisplay =
    formatRoomUnitLabel(request.submittedFromUnit) ||
    request.submittedFromUnit?.trim() ||
    null

  const postWorkStatuses = ['Solved', 'Unpaid', 'Completed']
  const showResidentFeedbackForm = isResident && postWorkStatuses.includes(request.status)

  const showAdminFollowUp = isAdmin && postWorkStatuses.includes(request.status)
  const canAdminReopen =
    isAdmin && request.status === 'Solved' && !request.residentChargeBillId?.trim()

  const terminalTechStatuses = ['Solved', 'Unpaid', 'Completed']

  const showVendorInvoiceInDetails = isAdmin || isTechnician
  const showTechnicianInvoiceForm =
    isTechnician &&
    request.assignedTechnician.trim() !== 'Not assigned' &&
    !terminalTechStatuses.includes(request.status) &&
    request.status !== 'Requested' &&
    request.status !== 'Declined'

  const canAdminChargeOrClose =
    isAdmin && request.status === 'Solved' && !request.residentChargeBillId

  const showTriageSection =
    isAdmin &&
    request.status !== 'Requested' &&
    request.status !== 'Declined' &&
    request.status !== 'Completed'

  const showAssignTechnician =
    isAdmin &&
    request.assignedTechnician.trim() === 'Not assigned' &&
    !postWorkStatuses.includes(request.status) &&
    request.status !== 'Declined' &&
    request.status !== 'Requested'

  const showTenantChargeSection =
    isAdmin && !['Requested', 'Completed', 'Declined'].includes(request.status)

  const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

  const showVendorPayoutCard =
    isAdmin &&
    request.assignedTechnician.trim() !== 'Not assigned' &&
    ['Solved', 'Unpaid', 'Completed'].includes(request.status)

  const assignmentBlocked =
    Boolean(technician.trim()) && Boolean(assignmentContext?.assignmentBlockReason)

  const residentSplitLayout = isResident && showResidentFeedbackForm

  const requestDetailsSection = (
    <section className="card work-order-card work-order-card--details">
      <details className="work-order-details-collapse details-expand-toggle">
        <summary className="work-order-details-summary">
          <div className="work-order-details-summary-top">
            <div className="work-order-details-summary-body">
              <div className="work-order-details-summary-main">
                <span className="work-order-details-title">{request.title}</span>
                <span className={statusPillClass(request.status)}>{request.status}</span>
              </div>
              <p className="work-order-details-summary-meta muted small">
                {request.buildingName?.trim() || '—'}
                {roomDisplay ? ` · ${roomDisplay}` : ''} · Priority {normalizePriorityLabel(request.priority)} ·{' '}
                {request.dateCreated}
              </p>
            </div>
            <span className="details-expand-hint details-expand-hint--when-closed muted small">Show full request</span>
            <span className="details-expand-hint details-expand-hint--when-open muted small">Show less</span>
          </div>
        </summary>
        <div className="work-order-details-body-scroll">
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
                {request.status === 'Declined' && (
                  <>
                    <dt>Decline reason</dt>
                    <dd>{request.adminDeclineReason?.trim() || '—'}</dd>
                  </>
                )}
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
                {showVendorInvoiceInDetails && (
                  <>
                    <dt>Vendor invoice (technician)</dt>
                    <dd>
                      {request.technicianInvoiceUrl?.trim() ? (
                        <a href={request.technicianInvoiceUrl.trim()} target="_blank" rel="noreferrer">
                          Open invoice link
                        </a>
                      ) : (
                        '—'
                      )}
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
                    {isAdmin && (
                      <>
                        <dt>Vendor payout (AP)</dt>
                        <dd>
                          {request.technicianPayoutStatus?.trim() || '—'}
                          {request.technicianPayoutApprovedAmount != null &&
                            ` · approved ${money.format(request.technicianPayoutApprovedAmount)}`}
                          {request.technicianPayoutPaidAt &&
                            ` · paid ${new Date(request.technicianPayoutPaidAt).toLocaleString()}`}
                          {request.technicianPayoutNotes?.trim() && (
                            <>
                              <br />
                              <span className="muted small">{request.technicianPayoutNotes.trim()}</span>
                            </>
                          )}
                        </dd>
                      </>
                    )}
                    <dt>Invoice submitted</dt>
                    <dd>
                      {request.technicianInvoiceSubmittedAt
                        ? new Date(request.technicianInvoiceSubmittedAt).toLocaleString()
                        : '—'}
                    </dd>
                  </>
                )}
                <dt>Office reply</dt>
                <dd>{request.adminResponseToResident?.trim() || '—'}</dd>
              </dl>
            </div>
          </div>
          {request.photoUrls && request.photoUrls.length > 0 && (
            <div className="work-order-photos">
              <h4 className="work-order-photos-title">Photos (resident)</h4>
              <ul className="work-order-photo-grid">
                {request.photoUrls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`Attachment ${i + 1}`} className="work-order-photo-thumb" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {showVendorInvoiceInDetails &&
            request.technicianWorkPhotoUrls &&
            request.technicianWorkPhotoUrls.length > 0 && (
              <div className="work-order-photos">
                <h4 className="work-order-photos-title">Photos (technician)</h4>
                <ul className="work-order-photo-grid">
                  {request.technicianWorkPhotoUrls.map((url, i) => (
                    <li key={i}>
                      <a href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt={`Technician ${i + 1}`} className="work-order-photo-thumb" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </details>
    </section>
  )

  return (
    <div
      className={`page work-order-page${residentSplitLayout ? ' work-order-page--resident-split' : ''}${isAdmin ? ' work-order-page--admin' : ''}`}
    >
      <Link to={listPath} className="back-link">
        {listLabel}
      </Link>
      <h1>
        {isAdmin ? 'Work Order' : isTechnician ? 'Work order' : 'Maintenance request'}: {request.id}
      </h1>

      <div
        className={`work-order-grid${residentSplitLayout ? ' work-order-grid--resident-split' : ''}${isAdmin ? ' work-order-grid--admin-split' : ''}`}
      >
        {isAdmin ? (
          <div className="work-order-admin-columns">
            <div className="work-order-admin-primary">{requestDetailsSection}</div>
            <div className="work-order-admin-rail">
              {request.status === 'Requested' && (
                <section className="card work-order-card work-order-card--approve">
                  <h3 className="card-title work-order-approve-title">Approve or decline</h3>
                  <div className="work-order-decline-note">
                    <label className="work-order-decline-note-label" htmlFor="work-order-decline-reason">
                      If declining, add a note for the resident (optional)
                    </label>
                    <textarea
                      id="work-order-decline-reason"
                      className="work-order-decline-reason-input"
                      rows={3}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      disabled={declineSaving || approveSaving}
                      placeholder="e.g. Not covered under lease, or duplicate report"
                      maxLength={2000}
                    />
                  </div>
                  <div className="work-order-approve-actions">
                    <button
                      type="button"
                      className="btn-primary work-order-approve-btn"
                      disabled={approveSaving || declineSaving}
                      onClick={() => void handleApprove()}
                    >
                      {approveSaving ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="btn-danger work-order-approve-btn"
                      disabled={declineSaving || approveSaving}
                      onClick={() => void handleDecline()}
                    >
                      {declineSaving ? 'Declining…' : 'Decline'}
                    </button>
                  </div>
                  {(approveError || declineError) && (
                    <p className="error work-order-approve-error">{approveError || declineError}</p>
                  )}
                </section>
              )}

              {showTriageSection && (
                <section className="card work-order-card work-order-card--triage">
                  <h3 className="card-title">Triage</h3>
                  <div className="work-order-triage-row">
                    <label htmlFor="work-order-priority" className="work-order-triage-label">
                      Priority
                    </label>
                    <select
                      id="work-order-priority"
                      className="work-order-triage-select"
                      value={priorityDraft}
                      onChange={(e) =>
                        setPriorityDraft(e.target.value as 'Low' | 'Medium' | 'High')
                      }
                      disabled={prioritySaving}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                    <button
                      type="button"
                      className="btn-primary work-order-triage-save"
                      disabled={
                        prioritySaving ||
                        priorityDraft === normalizePriorityLabel(request.priority)
                      }
                      onClick={() => void handleSavePriority()}
                    >
                      {prioritySaving ? 'Saving…' : 'Save priority'}
                    </button>
                  </div>
                </section>
              )}

              {(showAssignTechnician || showTenantChargeSection) && (
                <section className="card work-order-card work-order-card--admin-actions">
                  {showAssignTechnician && (
                    <div className="work-order-admin-block">
                      <h3 className="card-title">Assign technician</h3>
                      {serviceCatalogItems.length > 0 && (
                        <div className="work-order-service-filter">
                          <label htmlFor="work-order-service-filter" className="work-order-assignment-label">
                            Filter by service
                          </label>
                          <select
                            id="work-order-service-filter"
                            className="work-order-assignment-select work-order-service-filter-select"
                            value={technicianServiceFilter === '' ? '' : String(technicianServiceFilter)}
                            onChange={(e) => {
                              const v = e.target.value
                              setTechnicianServiceFilter(v === '' ? '' : Number(v))
                            }}
                            disabled={saving}
                          >
                            <option value="">All technicians</option>
                            {serviceCatalogItems.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="work-order-assignment-row">
                        <label htmlFor="work-order-technician" className="work-order-assignment-label">
                          Technician
                        </label>
                        <select
                          id="work-order-technician"
                          className="work-order-assignment-select"
                          value={technician}
                          onChange={(e) => setTechnician(e.target.value)}
                          disabled={saving}
                        >
                          <option value="">Not assigned</option>
                          {technicianSelectOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-primary work-order-assignment-save"
                          disabled={saving || assignmentBlocked}
                          onClick={() => void handleSaveAssignment()}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                      {assignmentContext?.assignmentBlockReason && (
                        <p className="error work-order-assign-block-reason" role="alert">
                          {assignmentContext.assignmentBlockReason}
                        </p>
                      )}
                      {assignError && <p className="error">{assignError}</p>}
                      {assignmentContextLoading && (
                        <p className="muted small work-order-assign-context-loading">Loading technician context…</p>
                      )}
                      {!assignmentContextLoading && assignmentContext && (
                        <div className="work-order-assign-context">
                          <div className="work-order-assign-context-metrics">
                            <span>
                              <strong>{assignmentContext.metrics.activeJobs}</strong>{' '}
                              <span className="muted">active jobs</span>
                            </span>
                            <span>
                              <strong>{assignmentContext.metrics.completedJobs}</strong>{' '}
                              <span className="muted">completed (all time)</span>
                            </span>
                            {assignmentContext.userId != null && (
                              <Link
                                to={`/admin/technicians/${assignmentContext.userId}`}
                                className="btn-link btn-link--inline"
                              >
                                Edit compliance profile
                              </Link>
                            )}
                          </div>
                          {(assignmentContext.catalogServices?.length ?? 0) > 0 && (
                            <div className="work-order-assign-offered">
                              <span className="muted small work-order-assign-offered-label">Catalog:</span>
                              <ul className="work-order-assign-offered-list">
                                {(assignmentContext.catalogServices ?? []).map((s) => (
                                  <li key={s.id}>{s.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {assignmentContext.offeredServices.length > 0 && (
                            <div className="work-order-assign-offered">
                              <span className="muted small work-order-assign-offered-label">Also lists:</span>
                              <ul className="work-order-assign-offered-list">
                                {assignmentContext.offeredServices.map((s) => (
                                  <li key={s.id}>{s.title}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {assignmentContext.warnings.length > 0 && (
                            <ul className="work-order-assign-warnings">
                              {assignmentContext.warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {showAssignTechnician && showTenantChargeSection && (
                    <div className="work-order-admin-divider" aria-hidden />
                  )}

                  {showTenantChargeSection && (
                    <div className="work-order-admin-block">
                      <h3 className="card-title">Tenant charge &amp; closure</h3>
                      <p className="muted small work-order-bill-intro">
                        When work is solved, the office can <strong>create a bill</strong> for the resident who
                        submitted this request. The bill is tied to this work order (not a blank invoice). The
                        resident sees it under <strong>Billing &amp; Payments</strong> and can pay there.
                      </p>
                      {request.status === 'Unpaid' && request.residentChargeBillId && (
                        <p className="muted small work-order-tenant-unpaid-note">
                          Status <strong>Unpaid</strong> — bill <strong>{request.residentChargeBillId}</strong> is
                          waiting for payment. The request will move to <strong>Completed</strong> when paid.
                        </p>
                      )}
                      {canAdminChargeOrClose && (
                        <>
                          <div className="work-order-bill-context-card" role="region" aria-label="Bill context">
                            <h4 className="work-order-bill-context-title">Bill is based on this work order</h4>
                            <dl className="work-order-bill-context-dl">
                              <div>
                                <dt>Work order</dt>
                                <dd>
                                  <strong>{request.title}</strong>
                                  <span className="muted small"> ({request.id})</span>
                                </dd>
                              </div>
                              {(request.buildingName?.trim() || roomDisplay) && (
                                <div>
                                  <dt>Location</dt>
                                  <dd>
                                    {[request.buildingName?.trim(), roomDisplay].filter(Boolean).join(' · ') ||
                                      '—'}
                                  </dd>
                                </div>
                              )}
                              <div>
                                <dt>Billed to</dt>
                                <dd>Resident who submitted this request</dd>
                              </div>
                              {((request.technicianInvoiceAmount != null && request.technicianInvoiceAmount > 0) ||
                                (request.technicianInvoiceSubtotal != null && request.technicianInvoiceSubtotal > 0)) ? (
                                <div>
                                  <dt>Vendor invoice reference</dt>
                                  <dd>
                                    {request.technicianInvoiceAmount != null && request.technicianInvoiceAmount > 0
                                      ? `$${request.technicianInvoiceAmount.toFixed(2)}`
                                      : request.technicianInvoiceSubtotal != null
                                        ? `$${request.technicianInvoiceSubtotal.toFixed(2)} (subtotal)`
                                        : '—'}
                                    <span className="muted small">
                                      {' '}
                                      — amount below is prefilled when empty; adjust if the tenant charge differs.
                                    </span>
                                  </dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>
                          <form onSubmit={(e) => void handleResidentCharge(e)} className="building-form">
                            <label>
                              Amount <span className="muted small">(required)</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={chargeAmount}
                                onChange={(e) => setChargeAmount(e.target.value)}
                                disabled={chargeSaving || closureSaving}
                                placeholder="e.g. 150.00"
                                required
                              />
                            </label>
                            <label>
                              Description
                              <input
                                type="text"
                                value={chargeType}
                                onChange={(e) => setChargeType(e.target.value)}
                                disabled={chargeSaving || closureSaving}
                                placeholder="Maintenance / tenant damage"
                              />
                            </label>
                            <label>
                              Due date <span className="muted small">(optional — default 30 days)</span>
                              <input
                                type="date"
                                value={chargeDueDate}
                                onChange={(e) => setChargeDueDate(e.target.value)}
                                disabled={chargeSaving || closureSaving}
                              />
                            </label>
                            {chargeError && <p className="error">{chargeError}</p>}
                            <div className="work-order-actions work-order-actions--inline">
                              <button type="submit" className="btn-primary" disabled={chargeSaving || closureSaving}>
                                {chargeSaving ? 'Creating…' : 'Create bill for resident'}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={chargeSaving || closureSaving}
                                onClick={() => void handleCompleteWithoutCharge()}
                              >
                                {closureSaving ? 'Closing…' : 'Complete without tenant charge'}
                              </button>
                            </div>
                          </form>
                        </>
                      )}
                      {request.status === 'Solved' && request.residentChargeBillId && (
                        <p className="muted small">A bill is already linked to this work order.</p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {showVendorPayoutCard && (
                <section className="card work-order-card work-order-card--vendor-payout">
                  <h3 className="card-title">Vendor payment (accounts payable)</h3>
                  <div className="building-form">
                    <label>
                      Payout status
                      <select
                        value={payoutStatus}
                        onChange={(e) => setPayoutStatus(e.target.value)}
                        disabled={payoutSaving}
                      >
                        <option value="">—</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </label>
                    <label>
                      Approved amount
                      <input
                        type="text"
                        inputMode="decimal"
                        value={payoutApproved}
                        onChange={(e) => setPayoutApproved(e.target.value)}
                        disabled={payoutSaving}
                        placeholder="e.g. 450.00"
                      />
                    </label>
                    <label>
                      Paid at
                      <input
                        type="datetime-local"
                        value={payoutPaidAt}
                        onChange={(e) => setPayoutPaidAt(e.target.value)}
                        disabled={payoutSaving}
                      />
                    </label>
                    <label>
                      AP notes
                      <textarea
                        rows={2}
                        value={payoutNotes}
                        onChange={(e) => setPayoutNotes(e.target.value)}
                        disabled={payoutSaving}
                        placeholder="Check #, ACH ref, batch…"
                      />
                    </label>
                    {payoutError && <p className="error">{payoutError}</p>}
                    <div className="work-order-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={payoutSaving}
                        onClick={() => void handleSavePayout()}
                      >
                        {payoutSaving ? 'Saving…' : 'Save payout record'}
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        ) : (
          requestDetailsSection
        )}

        {showResidentFeedbackForm && (
          <section className="card work-order-card work-order-card--resident-feedback">
            <p className="work-order-feedback-eyebrow">After the visit</p>
            <h3 className="work-order-feedback-title">Comment on the work</h3>
            <form onSubmit={(e) => void handleResidentFeedback(e)} className="work-order-feedback-form">
              <label className="work-order-feedback-label">
                Your comment
                <textarea
                  className="work-order-feedback-textarea"
                  rows={5}
                  value={residentFeedback}
                  onChange={(e) => setResidentFeedback(e.target.value)}
                  disabled={feedbackSaving}
                  placeholder="e.g. Fixed to my satisfaction, or still seeing a leak…"
                />
              </label>
              {feedbackError && <p className="error">{feedbackError}</p>}
              <div className="work-order-actions work-order-actions--resident-feedback">
                <button type="submit" className="btn-primary btn-primary--work-order-feedback" disabled={feedbackSaving}>
                  {feedbackSaving ? 'Saving…' : 'Save comment'}
                </button>
              </div>
            </form>
          </section>
        )}

        {showAdminFollowUp && (
          <section className="card work-order-card work-order-card--admin-followup">
            <h3 className="card-title">Resident follow-up</h3>
            <form onSubmit={(e) => void handleAdminReply(e)} className="building-form">
              <label>
                Message to resident
                <textarea
                  rows={3}
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  disabled={adminReplySaving || reopenSaving}
                  placeholder="Thanks for the note — we'll schedule a follow-up visit…"
                />
              </label>
              {adminReplyError && <p className="error">{adminReplyError}</p>}
              <div className="work-order-actions work-order-actions--inline">
                <button type="submit" className="btn-primary" disabled={adminReplySaving || reopenSaving}>
                  {adminReplySaving ? 'Saving…' : 'Post reply to resident'}
                </button>
                {canAdminReopen && (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={adminReplySaving || reopenSaving}
                    onClick={() => void handleReopenWorkOrder()}
                  >
                    {reopenSaving ? 'Reopening…' : 'Reopen work order'}
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        {showTechnicianInvoiceForm && (
          <section className="card work-order-card work-order-card--technician-work">
            <h3 className="card-title">Complete work</h3>
            <div className="building-form">
              <label>
                Invoice URL <span className="muted small">(required)</span>
                <input
                  type="url"
                  value={invoiceUrl}
                  onChange={(e) => setInvoiceUrl(e.target.value)}
                  disabled={techSaving}
                  placeholder="https://…"
                />
              </label>
              <label>
                Invoice amount <span className="muted small">(optional)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  disabled={techSaving}
                  placeholder="e.g. 125.00"
                />
              </label>
              <label>
                Invoice notes <span className="muted small">(optional)</span>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  disabled={techSaving}
                  placeholder="Parts, PO number, etc."
                />
              </label>
              <div className="work-order-invoice-lines-editor">
                <span className="work-order-invoice-lines-header">Work completion photos (URLs)</span>
                {workPhotoUrlsList.map((u, i) => (
                  <div key={i} className="work-order-photo-url-row">
                    <input
                      type="url"
                      value={u}
                      onChange={(e) =>
                        setWorkPhotoUrlsList((list) => {
                          const next = [...list]
                          next[i] = e.target.value
                          return next
                        })
                      }
                      disabled={techSaving}
                      placeholder="https://…"
                    />
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      disabled={techSaving || workPhotoUrlsList.length <= 1}
                      onClick={() => setWorkPhotoUrlsList((list) => list.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  disabled={techSaving}
                  onClick={() => setWorkPhotoUrlsList((list) => [...list, ''])}
                >
                  Add photo URL
                </button>
              </div>
              <label>
                Signature acknowledgment <span className="muted small">(optional — type name &amp; date)</span>
                <input
                  type="text"
                  value={signatureAck}
                  onChange={(e) => setSignatureAck(e.target.value)}
                  disabled={techSaving}
                  placeholder="e.g. Jane Smith, 2026-03-30"
                />
              </label>
              <label className="work-order-field">
                Work comments <span className="muted small">(optional)</span>
                <textarea
                  rows={3}
                  value={techCompleteNotes}
                  onChange={(e) => setTechCompleteNotes(e.target.value)}
                  disabled={techSaving}
                  placeholder="What you did on site — parts replaced, tests, etc."
                />
              </label>
              {(invoiceError || techError) && (
                <p className="error">{invoiceError || techError}</p>
              )}
              <div className="work-order-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={techSaving || !invoiceUrl.trim()}
                  onClick={() => void handleFinishWork()}
                >
                  {techSaving ? 'Saving…' : 'Finish'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
