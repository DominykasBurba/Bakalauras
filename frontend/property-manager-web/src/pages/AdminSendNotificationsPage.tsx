import { useEffect, useState, type FormEvent } from 'react'
import { postAdminBroadcastNotification } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useBuilding } from '../contexts/BuildingContext'

export function AdminSendNotificationsPage() {
  const { auth } = useAuth()
  const showToast = useToast()
  const { buildings, selectedBuildingId } = useBuilding()
  const [message, setMessage] = useState('')
  const [targetBuildingId, setTargetBuildingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedBuildingId != null) setTargetBuildingId(selectedBuildingId)
  }, [selectedBuildingId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token) return
    const text = message.trim()
    if (!text) {
      const msg = 'Enter a message.'
      setError(msg)
      showToast(msg, 'error')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await postAdminBroadcastNotification(auth.token, {
        message: text,
        buildingId: targetBuildingId,
      })
      if (result.recipientCount === 0) {
        showToast(result.warning ?? 'No residents received this message.', 'error')
      } else {
        showToast(
          `Sent to ${result.recipientCount} resident${result.recipientCount === 1 ? '' : 's'}. They will see it under Notifications.`,
          'success',
        )
        setMessage('')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page admin-send-notifications-page">
      <h1>Send notifications</h1>

      <section className="card">
        <h3 className="card-title">Broadcast message</h3>
        <form className="building-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Audience
            <select
              value={targetBuildingId === null ? 'all' : String(targetBuildingId)}
              onChange={(e) => {
                const v = e.target.value
                setTargetBuildingId(v === 'all' ? null : Number(v))
              }}
            >
              <option value="all">All residents (every building)</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Message <span className="req">*</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              maxLength={4000}
              placeholder="e.g. Water will be shut off Tuesday 9–11am for valve replacement."
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="work-order-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Sending…' : 'Send to residents'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
