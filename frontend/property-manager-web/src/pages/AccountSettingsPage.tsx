import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { changePassword, getAuthSession } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { isResidentRole } from '../utils/auth'
import { formatRoomUnitLabel } from '../utils/unitLabel'
import type { SessionResponse } from '../types'

function dash(s: string | null | undefined): string {
  const t = s?.trim()
  return t ? t : '—'
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function profileStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const m: Record<string, string> = {
    pending_profile: 'Pending profile',
    pending_review: 'Pending review',
    approved: 'Approved',
    declined: 'Declined',
  }
  return m[status] ?? status
}

export function AccountSettingsPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth?.token) return
    setSessionLoading(true)
    setSessionError('')
    getAuthSession(auth.token)
      .then(setSession)
      .catch(() => setSessionError('Could not load your profile. Try refreshing the page.'))
      .finally(() => setSessionLoading(false))
  }, [auth?.token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token) return
    setError('')
    if (newPassword.length < 8) {
      const msg = 'New password must be at least 8 characters.'
      setError(msg)
      showToast(msg, 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation do not match.'
      setError(msg)
      showToast(msg, 'error')
      return
    }
    if (newPassword === currentPassword) {
      const msg = 'New password must be different from your current password.'
      setError(msg)
      showToast(msg, 'error')
      return
    }
    setSaving(true)
    try {
      await changePassword(auth.token, { currentPassword, newPassword })
      showToast('Password updated.', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update password'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const resident = isResidentRole(session?.role ?? auth?.role)
  const roomDisplay =
    formatRoomUnitLabel(session?.unit) || session?.unit?.trim() || null

  return (
    <div className="page account-settings-page">
      <header className="account-settings-header">
        <Link to="/" className="back-link">
          ← Back to dashboard
        </Link>
        <h1>Account</h1>
      </header>

      <div className="account-settings-layout">
        <section className="card work-order-card account-profile-card">
          <h3 className="card-title account-profile-card-title">Profile</h3>
          {sessionLoading && <p className="muted account-profile-loading">Loading profile…</p>}
          {sessionError && <p className="error">{sessionError}</p>}
          {!sessionLoading && session && (
            <>
              <div className="profile-section">
                <h4 className="profile-section-title">Account</h4>
                <dl className="detail-list profile-detail-grid">
                  <dt>User ID</dt>
                  <dd>{session.userId}</dd>
                  <dt>Email</dt>
                  <dd>{dash(session.email)}</dd>
                  <dt>Name</dt>
                  <dd>{dash(session.name)}</dd>
                  <dt>Role</dt>
                  <dd>{dash(session.role)}</dd>
                </dl>
              </div>
              <div className="profile-section">
                <h4 className="profile-section-title">Building &amp; unit</h4>
                <dl className="detail-list profile-detail-grid">
                  <dt>Building</dt>
                  <dd>{dash(session.buildingName)}</dd>
                  <dt>Room / unit</dt>
                  <dd>{roomDisplay || dash(session.unit)}</dd>
                  {session.buildingId != null && (
                    <>
                      <dt>Building ID</dt>
                      <dd className="profile-value-mono">{session.buildingId}</dd>
                    </>
                  )}
                  {session.unitId != null && (
                    <>
                      <dt>Unit record ID</dt>
                      <dd className="profile-value-mono">{session.unitId}</dd>
                    </>
                  )}
                </dl>
              </div>
              {resident && (
                <div className="profile-section">
                  <h4 className="profile-section-title">Resident details</h4>
                  <dl className="detail-list profile-detail-grid">
                    <dt>Profile status</dt>
                    <dd>{profileStatusLabel(session.profileStatus)}</dd>
                    <dt>Phone</dt>
                    <dd>{dash(session.phone)}</dd>
                    <dt>Emergency contact</dt>
                    <dd>{dash(session.emergencyContactName)}</dd>
                    <dt>Emergency contact phone</dt>
                    <dd>{dash(session.emergencyContactPhone)}</dd>
                    <dt>About me</dt>
                    <dd className="profile-value-multiline">{dash(session.aboutMe)}</dd>
                    <dt>Management comment</dt>
                    <dd className="profile-value-multiline">{dash(session.adminComment)}</dd>
                    <dt>Profile submitted</dt>
                    <dd>{formatDateTime(session.profileSubmittedAt)}</dd>
                    <dt>Profile reviewed</dt>
                    <dd>{formatDateTime(session.profileReviewedAt)}</dd>
                  </dl>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card work-order-card account-password-card">
          <h3 className="card-title account-password-card-title">Change password</h3>
          <p className="muted small account-password-hint">
            Use a strong password you do not reuse elsewhere. You will stay signed in after changing it.
          </p>
          <form onSubmit={(e) => void handleSubmit(e)} className="building-form account-password-form">
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
              required
            />
          </label>
          <label>
            New password <span className="muted small">(min. 8 characters)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
              required
              minLength={8}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="work-order-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
        </section>
      </div>
    </div>
  )
}
