import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResidentProfile, putResidentProfile } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function CompleteProfilePage() {
  const { auth, refreshAuth } = useAuth()
  const showToast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [adminComment, setAdminComment] = useState<string | null>(null)
  const [form, setForm] = useState({
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    aboutMe: '',
  })

  useEffect(() => {
    if (!auth?.token) return
    setLoading(true)
    getResidentProfile(auth.token)
      .then((p) => {
        setAdminComment(p.adminComment ?? null)
        setForm({
          phone: p.phone ?? '',
          emergencyContactName: p.emergencyContactName ?? '',
          emergencyContactPhone: p.emergencyContactPhone ?? '',
          aboutMe: p.aboutMe ?? '',
        })
      })
      .catch(() => {
        setError('Could not load profile')
        showToast('Could not load profile.', 'error')
      })
      .finally(() => setLoading(false))
  }, [auth?.token, showToast])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token) return
    setSaving(true)
    setError('')
    try {
      await putResidentProfile(auth.token, {
        phone: form.phone.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        aboutMe: form.aboutMe.trim() || null,
      })
      await refreshAuth()
      showToast('Profile submitted for review.', 'success')
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const declinedNote =
    auth?.profileStatus === 'declined' ? (
      <div className="card profile-review-banner profile-review-declined">
        <p>
          <strong>Your previous submission was not approved.</strong> Update your details below and submit again.
        </p>
        {adminComment ? (
          <p className="profile-admin-comment">
            <strong>Comment from management:</strong> {adminComment}
          </p>
        ) : null}
      </div>
    ) : null

  return (
    <div className="page complete-profile-page">
      <h1>Complete your profile</h1>

      {declinedNote}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <form className="card building-form complete-profile-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Phone <span className="req">*</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
              disabled={saving}
            />
          </label>
          <label>
            Emergency contact name <span className="req">*</span>
            <input
              value={form.emergencyContactName}
              onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
              required
              disabled={saving}
            />
          </label>
          <label>
            Emergency contact phone <span className="req">*</span>
            <input
              type="tel"
              value={form.emergencyContactPhone}
              onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
              required
              disabled={saving}
            />
          </label>
          <label>
            About you <span className="muted small">(optional)</span>
            <textarea
              rows={4}
              value={form.aboutMe}
              onChange={(e) => setForm((f) => ({ ...f, aboutMe: e.target.value }))}
              disabled={saving}
              placeholder="Anything you’d like property management to know"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="building-details-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
