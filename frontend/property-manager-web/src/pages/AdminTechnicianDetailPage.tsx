import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminOfferedServiceReviewPanel } from '../components/AdminOfferedServiceReviewPanel';
import { getAdminServiceCatalog, getAdminTechnician, putAdminTechnicianCatalogServices, putAdminTechnicianOfferedServiceReview, putAdminTechnicianProfile, } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { ServiceCatalogItem, TechnicianDetail, TechnicianOfferedService, TechnicianProfileWritePayload, } from '../types';
const CONTRACTOR_TYPES = [
    { value: '', label: '— Select —' },
    { value: 'w2', label: 'W-2 employee' },
    { value: 'independent_contractor', label: 'Independent contractor' },
    { value: 'vendor_company', label: 'Vendor / company' },
];
export function AdminTechnicianDetailPage() {
    const { userId: userIdParam } = useParams<{
        userId: string;
    }>();
    const userId = Number(userIdParam);
    const { auth } = useAuth();
    const showToast = useToast();
    const [detail, setDetail] = useState<TechnicianDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [contractorType, setContractorType] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [licenseExpiry, setLicenseExpiry] = useState('');
    const [coiExpiry, setCoiExpiry] = useState('');
    const [workersCompExpiry, setWorkersCompExpiry] = useState('');
    const [w9OnFile, setW9OnFile] = useState(false);
    const [backgroundCheckOnFile, setBackgroundCheckOnFile] = useState(false);
    const [afterHoursOnCall, setAfterHoursOnCall] = useState(false);
    const [poRequired, setPoRequired] = useState(false);
    const [billingEmail, setBillingEmail] = useState('');
    const [billingPhone, setBillingPhone] = useState('');
    const [rateNotes, setRateNotes] = useState('');
    const [serviceAreaNotes, setServiceAreaNotes] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [additionalInsuredEntity, setAdditionalInsuredEntity] = useState('');
    const [catalogItems, setCatalogItems] = useState<ServiceCatalogItem[]>([]);
    const [catalogSelected, setCatalogSelected] = useState<Set<number>>(() => new Set());
    const [catalogSaving, setCatalogSaving] = useState(false);
    const [catalogError, setCatalogError] = useState('');
    const [offeredReviewSavingId, setOfferedReviewSavingId] = useState<number | null>(null);
    const load = useCallback(async () => {
        if (!auth?.token || !Number.isFinite(userId) || userId <= 0)
            return;
        setLoading(true);
        setLoadError('');
        try {
            const d = await getAdminTechnician(auth.token, userId);
            setDetail(d);
            const p = d.profile;
            setCompanyName(p?.companyName?.trim() ?? '');
            setContractorType(p?.contractorType?.trim() ?? '');
            setLicenseNumber(p?.licenseNumber?.trim() ?? '');
            setLicenseExpiry(p?.licenseExpiry?.slice(0, 10) ?? '');
            setCoiExpiry(p?.coiExpiry?.slice(0, 10) ?? '');
            setWorkersCompExpiry(p?.workersCompExpiry?.slice(0, 10) ?? '');
            setW9OnFile(p?.w9OnFile ?? false);
            setBackgroundCheckOnFile(p?.backgroundCheckOnFile ?? false);
            setAfterHoursOnCall(p?.afterHoursOnCall ?? false);
            setPoRequired(p?.poRequired ?? false);
            setBillingEmail(p?.billingEmail?.trim() ?? '');
            setBillingPhone(p?.billingPhone?.trim() ?? '');
            setRateNotes(p?.rateNotes?.trim() ?? '');
            setServiceAreaNotes(p?.serviceAreaNotes?.trim() ?? '');
            setInternalNotes(p?.internalNotes?.trim() ?? '');
            setAdditionalInsuredEntity(p?.additionalInsuredEntity?.trim() ?? '');
            setCatalogSelected(new Set((d.catalogServices ?? []).map((c) => c.id)));
        }
        catch {
            const msg = 'Could not load technician.';
            setLoadError(msg);
            showToast(msg, 'error');
            setDetail(null);
        }
        finally {
            setLoading(false);
        }
    }, [auth?.token, userId, showToast]);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        if (!auth?.token)
            return;
        getAdminServiceCatalog(auth.token)
            .then(setCatalogItems)
            .catch(() => setCatalogItems([]));
    }, [auth?.token]);
    async function handleOfferedReview(s: TechnicianOfferedService, decision: 'approve' | 'reject', catalogItemId?: number, note?: string | null) {
        if (!auth?.token || !detail)
            return;
        setOfferedReviewSavingId(s.id);
        try {
            await putAdminTechnicianOfferedServiceReview(auth.token, userId, s.id, {
                decision,
                catalogItemId: decision === 'approve' ? catalogItemId : undefined,
                note: decision === 'reject' ? note : undefined,
            });
            showToast(decision === 'approve' ? 'Suggestion approved.' : 'Suggestion rejected.', 'success');
            await load();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not update.';
            showToast(msg, 'error');
        }
        finally {
            setOfferedReviewSavingId(null);
        }
    }
    async function handleSaveCatalog() {
        if (!auth?.token || !detail)
            return;
        setCatalogSaving(true);
        setCatalogError('');
        try {
            const ids = Array.from(catalogSelected).sort((a, b) => a - b);
            await putAdminTechnicianCatalogServices(auth.token, userId, ids);
            showToast('Service catalog assignments saved.', 'success');
            await load();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not save.';
            setCatalogError(msg);
            showToast(msg, 'error');
        }
        finally {
            setCatalogSaving(false);
        }
    }
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token || !detail)
            return;
        setSaving(true);
        setSaveError('');
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
        };
        try {
            await putAdminTechnicianProfile(auth.token, userId, payload);
            showToast('Profile saved.', 'success');
            await load();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not save.';
            setSaveError(msg);
            showToast(msg, 'error');
        }
        finally {
            setSaving(false);
        }
    }
    if (!Number.isFinite(userId) || userId <= 0) {
        return (<div className="page">
        <p>Invalid technician.</p>
        <Link to="/admin/technicians">Back to directory</Link>
      </div>);
    }
    if (loading && !detail) {
        return (<div className="page">
        <p className="muted">Loading…</p>
      </div>);
    }
    if (loadError || !detail) {
        return (<div className="page">
        <p className="error">{loadError || 'Not found.'}</p>
        <Link to="/admin/technicians">Back to directory</Link>
      </div>);
    }
    return (<div className="page admin-technician-detail-page">
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
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={200}/>
            </label>
            <label>
              Relationship
              <select value={contractorType} onChange={(e) => setContractorType(e.target.value)}>
                {CONTRACTOR_TYPES.map((o) => (<option key={o.value || 'empty'} value={o.value}>
                    {o.label}
                  </option>))}
              </select>
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Licenses &amp; insurance</legend>
            <label>
              License / certification # <span className="muted small">(optional)</span>
              <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} maxLength={120}/>
            </label>
            <label>
              License expiry
              <input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)}/>
            </label>
            <label>
              COI (general liability) expiry
              <input type="date" value={coiExpiry} onChange={(e) => setCoiExpiry(e.target.value)}/>
            </label>
            <label>
              Workers&apos; compensation expiry
              <input type="date" value={workersCompExpiry} onChange={(e) => setWorkersCompExpiry(e.target.value)}/>
            </label>
            <label>
              Additional insured (named on COI)
              <input value={additionalInsuredEntity} onChange={(e) => setAdditionalInsuredEntity(e.target.value)} maxLength={300} placeholder="e.g. Property owner LLC"/>
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Documentation on file</legend>
            <label className="admin-technician-check">
              <input type="checkbox" checked={w9OnFile} onChange={(e) => setW9OnFile(e.target.checked)}/>
              W-9 on file
            </label>
            <label className="admin-technician-check">
              <input type="checkbox" checked={backgroundCheckOnFile} onChange={(e) => setBackgroundCheckOnFile(e.target.checked)}/>
              Background check on file
            </label>
            <label className="admin-technician-check">
              <input type="checkbox" checked={afterHoursOnCall} onChange={(e) => setAfterHoursOnCall(e.target.checked)}/>
              After-hours / on-call
            </label>
            <label className="admin-technician-check">
              <input type="checkbox" checked={poRequired} onChange={(e) => setPoRequired(e.target.checked)}/>
              PO required before billing
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Billing &amp; coverage</legend>
            <label>
              Billing email
              <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)}/>
            </label>
            <label>
              Billing phone
              <input type="tel" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)}/>
            </label>
            <label>
              Rate / PO notes <span className="muted small">(internal)</span>
              <textarea value={rateNotes} onChange={(e) => setRateNotes(e.target.value)} rows={2}/>
            </label>
            <label>
              Service area / buildings
              <textarea value={serviceAreaNotes} onChange={(e) => setServiceAreaNotes(e.target.value)} rows={2} placeholder="Regions, property types, or building IDs they cover"/>
            </label>
          </fieldset>

          <fieldset className="admin-technician-fieldset">
            <legend>Internal notes</legend>
            <label>
              <span className="muted small">Admin-only — not visible to the technician.</span>
              <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={4} placeholder="e.g. Compliance exceptions, assignment restrictions, billing preferences…"/>
            </label>
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
        {catalogItems.length === 0 ? (<p className="muted">No catalog entries yet. Add services under Service catalog first.</p>) : (<>
            <ul className="admin-technician-catalog-checklist">
              {catalogItems.map((c) => (<li key={c.id}>
                  <label className="admin-technician-check">
                    <input type="checkbox" checked={catalogSelected.has(c.id)} onChange={() => {
                    setCatalogSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.id))
                            next.delete(c.id);
                        else
                            next.add(c.id);
                        return next;
                    });
                }}/>
                    <span>
                      <strong>{c.name}</strong>
                      {c.description?.trim() ? (<span className="muted small"> — {c.description.trim()}</span>) : null}
                    </span>
                  </label>
                </li>))}
            </ul>
            {catalogError && <p className="error">{catalogError}</p>}
            <div className="work-order-actions">
              <button type="button" className="btn-primary" disabled={catalogSaving} onClick={() => void handleSaveCatalog()}>
                {catalogSaving ? 'Saving…' : 'Save service assignments'}
              </button>
            </div>
          </>)}
      </section>

      <section className="card">
        <h3 className="card-title">Offered services (from technician)</h3>
        {detail.offeredServices.length === 0 ? (<p className="muted">None listed yet.</p>) : (<ul className="admin-technician-offered-review-list">
            {detail.offeredServices.map((s) => (<li key={s.id} className="admin-technician-offered-review-item">
                <AdminOfferedServiceReviewPanel service={s} catalogItems={catalogItems} busy={offeredReviewSavingId === s.id} onApprove={(catalogItemId) => void handleOfferedReview(s, 'approve', catalogItemId)} onReject={(n) => void handleOfferedReview(s, 'reject', undefined, n)}/>
              </li>))}
          </ul>)}
      </section>
    </div>);
}
