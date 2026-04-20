import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getAdminServiceCatalog,
  getAdminTechnician,
  putAdminTechnicianCatalogServices,
  putAdminTechnicianOfferedServiceReview,
  putAdminTechnicianProfile,
} from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type {
  OfferedServiceReviewStatus,
  ServiceCatalogItem,
  TechnicianDetail,
  TechnicianOfferedService,
  TechnicianProfileWritePayload,
} from '../types'

const CONTRACTOR_TYPES = [
  { value: '', label: '— Select —' },
  { value: 'w2', label: 'W-2 employee' },
  { value: 'independent_contractor', label: 'Independent contractor' },
  { value: 'vendor_company', label: 'Vendor / company' },
]

function offeredReviewStatusLabel(status: OfferedServiceReviewStatus | undefined): string {
  const s = status ?? 'approved'
  switch (s) {
    case 'pending_review':
      return 'Pending review'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return s
  }
}

export function AdminTechnicianDetailPage() {
  const { userId: userIdParam } = useParams<{ userId: string }>()
  const userId = Number(userIdParam)
  const { auth } = useAuth()
  const showToast = useToast()

  const [detail, setDetail] = useState<TechnicianDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [contractorType, setContractorType] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseExpiry, setLicenseExpiry] = useState('')
  const [coiExpiry, setCoiExpiry] = useState('')
  const [workersCompExpiry, setWorkersCompExpiry] = useState('')
  const [w9OnFile, setW9OnFile] = useState(false)
  const [backgroundCheckOnFile, setBackgroundCheckOnFile] = useState(false)
  const [afterHoursOnCall, setAfterHoursOnCall] = useState(false)
  const [poRequired, setPoRequired] = useState(false)
  const [billingEmail, setBillingEmail] = useState('')
  const [billingPhone, setBillingPhone] = useState('')
  const [rateNotes, setRateNotes] = useState('')
  const [serviceAreaNotes, setServiceAreaNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [additionalInsuredEntity, setAdditionalInsuredEntity] = useState('')

  const [catalogItems, setCatalogItems] = useState<ServiceCatalogItem[]>([])
  const [catalogSelected, setCatalogSelected] = useState<Set<number>>(() => new Set())
  const [catalogSaving, setCatalogSaving] = useState(false)
  const [catalogError, setCatalogError] = useState('')

  const [offeredLinkPick, setOfferedLinkPick] = useState<Record<number, string>>({})
  const [offeredRejectNote, setOfferedRejectNote] = useState<Record<number, string>>({})
  const [offeredReviewSavingId, setOfferedReviewSavingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!auth?.token || !Number.isFinite(userId) || userId <= 0) return
    setLoading(true)
    setLoadError('')
    try {
      const d = await getAdminTechnician(auth.token, userId)
      setDetail(d)
      const p = d.profile
      setCompanyName(p?.companyName?.trim() ?? '')
      setContractorType(p?.contractorType?.trim() ?? '')
      setLicenseNumber(p?.licenseNumber?.trim() ?? '')
      setLicenseExpiry(p?.licenseExpiry?.slice(0, 10) ?? '')
      setCoiExpiry(p?.coiExpiry?.slice(0, 10) ?? '')
      setWorkersCompExpiry(p?.workersCompExpiry?.slice(0, 10) ?? '')
      setW9OnFile(p?.w9OnFile ?? false)
      setBackgroundCheckOnFile(p?.backgroundCheckOnFile ?? false)
      setAfterHoursOnCall(p?.afterHoursOnCall ?? false)
      setPoRequired(p?.poRequired ?? false)
      setBillingEmail(p?.billingEmail?.trim() ?? '')
      setBillingPhone(p?.billingPhone?.trim() ?? '')
      setRateNotes(p?.rateNotes?.trim() ?? '')
      setServiceAreaNotes(p?.serviceAreaNotes?.trim() ?? '')
      setInternalNotes(p?.internalNotes?.trim() ?? '')
      setAdditionalInsuredEntity(p?.additionalInsuredEntity?.trim() ?? '')
      setCatalogSelected(new Set((d.catalogServices ?? []).map((c) => c.id)))
    } catch {
      const msg = 'Could not load technician.'
      setLoadError(msg)
      showToast(msg, 'error')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [auth?.token, userId, showToast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!auth?.token) return
    getAdminServiceCatalog(auth.token)
      .then(setCatalogItems)
      .catch(() => setCatalogItems([]))
  }, [auth?.token])

  async function handleOfferedReview(
    s: TechnicianOfferedService,
    decision: 'approve' | 'reject',
  ) {
    if (!auth?.token || !detail) return
    setOfferedReviewSavingId(s.id)
    try {
      const catalogRaw = offeredLinkPick[s.id]?.trim()
      const catalogItemId =
        catalogRaw && catalogRaw !== '' ? Number(catalogRaw) : undefined
      await putAdminTechnicianOfferedServiceReview(auth.token, userId, s.id, {
        decision,
        catalogItemId: decision === 'approve' ? catalogItemId : undefined,
        note: decision === 'reject' ? offeredRejectNote[s.id]?.trim() || null : undefined,
      })
      showToast(decision === 'approve' ? 'Suggestion approved.' : 'Suggestion rejected.', 'success')
      setOfferedRejectNote((prev) => {
        const next = { ...prev }
        delete next[s.id]
        return next
      })
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update.'
      showToast(msg, 'error')
    } finally {
      setOfferedReviewSavingId(null)
    }
  }

  async function handleSaveCatalog() {
    if (!auth?.token || !detail) return
    setCatalogSaving(true)
    setCatalogError('')
    try {
      const ids = Array.from(catalogSelected).sort((a, b) => a - b)
      await putAdminTechnicianCatalogServices(auth.token, userId, ids)
      showToast('Service catalog assignments saved.', 'success')
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save.'
      setCatalogError(msg)
      showToast(msg, 'error')
    } finally {
      setCatalogSaving(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token || !detail) return
    setSaving(true)
    setSaveError('')
    const payload: TechnicianProfileWritePayload = {
      companyName: companyName.trim() || null,
      contractorType: contractorType.trim() || null,
      licenseNumber: licenseNumber.trim() || null,
      licenseExpiry: licenseExpiry.trim() || null,
      coiExpiry: coiExpiry.trim() || null,
      workersCompExpiry: workersCompExpiry.trim() || null,
      w9OnFile,
      backgroundCheckOnFile,
      afterHoursOnCall,
      poRequired,
      billingEmail: billingEmail.trim() || null,
      billingPhone: billingPhone.trim() || null,
      rateNotes: rateNotes.trim() || null,
      serviceAreaNotes: serviceAreaNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
      additionalInsuredEntity: additionalInsuredEntity.trim() || null,
    }
    try {
      await putAdminTechnicianProfile(auth.token, userId, payload)
      showToast('Profile saved.', 'success')
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save.'
      setSaveError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <div className="page">
        <p>Invalid technician.</p>
        <Link to="/admin/technicians">Back to directory</Link>
      </div>
    )
  }

  if (loading && !detail) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (loadError || !detail) {
    return (
      <div className="page">
        <p className="error">{loadError || 'Not found.'}</p>
        <Link to="/admin/technicians">Back to directory</Link>
      </div>
    )
  }

  return (
    <div className="page admin-technician-detail-page">
      <Link to="/admin/technicians" className="back-link">
        ← Technicians directory
      </Link>
      <h1>{detail.name}</h1>
      <p className="muted small">
        {detail.email}
        {detail.unitLabel?.trim() ? ` · ${detail.unitLabel.trim()}` : ''} · Active jobs:{' '}
        <strong>{detail.metrics.activeJobs}</strong> · Completed: <strong>{detail.metrics.completedJobs}</strong>
      </p>

      <section className="card admin-technician-compliance-card">
        <details className="admin-technician-compliance-details" open>
          <summary className="admin-technician-compliance-summary">
            Compliance &amp; business
          </summary>
          <form className="building-form admin-technician-form" onSubmit={(e) => void handleSubmit(e)}>
          <fieldset className="admin-technician-fieldset">
            <legend>Identity</legend>
            <label>
              Company / DBA
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={200} />
            </label>
            <label>
              Relationship
              <select value={contractorType} onChange={(e) => setContractorType(e.target.value)}>
                {CONTRACTOR_TYPES.map((o) => (
                  <option key={o.value || 'empty'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Licenses &amp; insurance</legend>
            <label>
              License / certification # <span className="muted small">(optional)</span>
              <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} maxLength={120} />
            </label>
            <label>
              License expiry
              <input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
            </label>
            <label>
              COI (general liability) expiry
              <input type="date" value={coiExpiry} onChange={(e) => setCoiExpiry(e.target.value)} />
            </label>
            <label>
              Workers&apos; compensation expiry
              <input
                type="date"
                value={workersCompExpiry}
                onChange={(e) => setWorkersCompExpiry(e.target.value)}
              />
            </label>
            <label>
              Additional insured (named on COI)
              <input
                value={additionalInsuredEntity}
                onChange={(e) => setAdditionalInsuredEntity(e.target.value)}
                maxLength={300}
                placeholder="e.g. Property owner LLC"
              />
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Documentation on file</legend>
            <label className="admin-technician-check">
              <input type="checkbox" checked={w9OnFile} onChange={(e) => setW9OnFile(e.target.checked)} />
              W-9 on file
            </label>
            <label className="admin-technician-check">
              <input
                type="checkbox"
                checked={backgroundCheckOnFile}
                onChange={(e) => setBackgroundCheckOnFile(e.target.checked)}
              />
              Background check on file
            </label>
            <label className="admin-technician-check">
              <input
                type="checkbox"
                checked={afterHoursOnCall}
                onChange={(e) => setAfterHoursOnCall(e.target.checked)}
              />
              After-hours / on-call
            </label>
            <label className="admin-technician-check">
              <input type="checkbox" checked={poRequired} onChange={(e) => setPoRequired(e.target.checked)} />
              PO required before billing
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Billing &amp; coverage</legend>
            <label>
              Billing email
              <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
            </label>
            <label>
              Billing phone
              <input type="tel" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} />
            </label>
            <label>
              Rate / PO notes <span className="muted small">(internal)</span>
              <textarea value={rateNotes} onChange={(e) => setRateNotes(e.target.value)} rows={2} />
            </label>
            <label>
              Service area / buildings
              <textarea
                value={serviceAreaNotes}
                onChange={(e) => setServiceAreaNotes(e.target.value)}
                rows={2}
                placeholder="Regions, property types, or building IDs they cover"
              />
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Internal notes</legend>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              placeholder="Admin-only — not visible to the technician."
            />
          </fieldset>

          {saveError && <p className="error">{saveError}</p>}
          <div className="work-order-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save compliance profile'}
            </button>
          </div>
        </form>
        </details>
      </section>

      <section className="card">
        <h3 className="card-title">Service catalog</h3>
        <p className="muted small">
          Pick which general services this technician is approved for (for example Plumbing, HVAC). These are
          managed in{' '}
          <Link to="/admin/service-catalog">Service catalog</Link> and used to filter technicians when assigning
          work orders.
        </p>
        {catalogItems.length === 0 ? (
          <p className="muted">No catalog entries yet. Add services under Service catalog first.</p>
        ) : (
          <>
            <ul className="admin-technician-catalog-checklist">
              {catalogItems.map((c) => (
                <li key={c.id}>
                  <label className="admin-technician-check">
                    <input
                      type="checkbox"
                      checked={catalogSelected.has(c.id)}
                      onChange={() => {
                        setCatalogSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(c.id)) next.delete(c.id)
                          else next.add(c.id)
                          return next
                        })
                      }}
                    />
                    <span>
                      <strong>{c.name}</strong>
                      {c.description?.trim() ? (
                        <span className="muted small"> — {c.description.trim()}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {catalogError && <p className="error">{catalogError}</p>}
            <div className="work-order-actions">
              <button type="button" className="btn-primary" disabled={catalogSaving} onClick={() => void handleSaveCatalog()}>
                {catalogSaving ? 'Saving…' : 'Save service assignments'}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Offered services (from technician)</h3>
        <p className="muted small admin-technician-offered-lead">
          Technicians add their own lines under Service Provider → Offered services. Approve what the office is
          comfortable advertising; optionally align a line with your <Link to="/admin/service-catalog">office catalog</Link>{' '}
          so they are also tagged for work-order filters and catalog assignments.
        </p>
        {detail.offeredServices.length === 0 ? (
          <p className="muted">None listed yet.</p>
        ) : (
          <ul className="admin-technician-offered-review-list">
            {detail.offeredServices.map((s) => {
              const st = s.reviewStatus ?? 'approved'
              return (
              <li key={s.id} className="admin-technician-offered-review-item">
                <div className="admin-technician-offered-review-head">
                  <span className={`offered-review-pill offered-review-pill--${st}`}>
                    {offeredReviewStatusLabel(st)}
                  </span>
                  <strong>{s.title}</strong>
                </div>
                {s.description?.trim() ? (
                  <p className="muted small">{s.description.trim()}</p>
                ) : null}
                {st === 'rejected' && s.adminReviewNote?.trim() ? (
                  <p className="admin-technician-offered-reject-note">
                    <span className="muted small">Office note: </span>
                    {s.adminReviewNote.trim()}
                  </p>
                ) : null}
                {s.mappedCatalogName?.trim() ? (
                  <p className="muted small admin-technician-offered-mapped">
                    Aligned with office catalog: <strong>{s.mappedCatalogName.trim()}</strong>
                  </p>
                ) : null}
                {(st === 'pending_review' ||
                  st === 'rejected' ||
                  (st === 'approved' && !s.mappedCatalogItemId)) && (
                  <div className="admin-technician-offered-review-actions">
                    <label className="admin-technician-offered-link-select">
                      <span className="muted small">Map to office catalog</span>
                      <select
                        value={offeredLinkPick[s.id] ?? ''}
                        onChange={(e) =>
                          setOfferedLinkPick((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        disabled={offeredReviewSavingId === s.id}
                      >
                        <option value="">— Optional —</option>
                        {catalogItems.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(st === 'pending_review' || st === 'rejected') && (
                      <>
                        <button
                          type="button"
                          className="btn-primary btn-small"
                          disabled={offeredReviewSavingId === s.id}
                          onClick={() => void handleOfferedReview(s, 'approve')}
                        >
                          {offeredReviewSavingId === s.id ? 'Saving…' : 'Approve'}
                        </button>
                        <label className="admin-technician-offered-reject-wrap">
                          <span className="muted small">Reject note</span>
                          <input
                            type="text"
                            value={offeredRejectNote[s.id] ?? ''}
                            onChange={(e) =>
                              setOfferedRejectNote((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                            placeholder="Optional — shown to technician"
                            disabled={offeredReviewSavingId === s.id}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn-danger btn-small"
                          disabled={offeredReviewSavingId === s.id}
                          onClick={() => void handleOfferedReview(s, 'reject')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {st === 'approved' && !s.mappedCatalogItemId && (
                      <button
                        type="button"
                        className="btn-secondary btn-small"
                        disabled={
                          offeredReviewSavingId === s.id ||
                          !(offeredLinkPick[s.id] && offeredLinkPick[s.id] !== '')
                        }
                        onClick={() => void handleOfferedReview(s, 'approve')}
                      >
                        {offeredReviewSavingId === s.id ? 'Saving…' : 'Link to catalog'}
                      </button>
                    )}
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
