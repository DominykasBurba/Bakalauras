import { useRef, useState, type FormEvent, type DragEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createMaintenanceRequest } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const MAX_PHOTOS = 5
const MAX_BYTES = 10 * 1024 * 1024
/** Residents do not set priority; office triages. API still expects a value. */
const DEFAULT_PRIORITY = 'Medium' as const

type PhotoItem = { id: string; name: string; dataUrl: string }

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ReportIssue() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const showToast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
  })
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [photoError, setPhotoError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const dragDepthRef = useRef(0)
  const [loading, setLoading] = useState(false)

  async function addFiles(fileList: FileList | File[] | null) {
    if (!fileList?.length) return
    const files = Array.from(fileList)
    const messages: string[] = []
    const newItems: PhotoItem[] = []
    let count = photos.length

    for (const file of files) {
      if (count >= MAX_PHOTOS) {
        messages.push(`Maximum ${MAX_PHOTOS} photos.`)
        break
      }
      if (!/^image\/(jpeg|png)$/i.test(file.type)) {
        messages.push(`${file.name}: use PNG or JPG only.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        messages.push(`${file.name}: max 10MB.`)
        continue
      }
      try {
        const dataUrl = await readFileAsDataUrl(file)
        newItems.push({ id: crypto.randomUUID(), name: file.name, dataUrl })
        count += 1
      } catch {
        messages.push(`${file.name}: could not read file.`)
      }
    }

    if (newItems.length) {
      setPhotos((p) => [...p, ...newItems])
    }
    setPhotoError(messages.length ? messages.join(' ') : '')
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    void addFiles(e.target.files)
    e.target.value = ''
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current += 1
    setDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setDragOver(false)
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setDragOver(false)
    void addFiles(e.dataTransfer.files)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!auth?.token) return
    setLoading(true)
    try {
      const photoUrls = photos.map((p) => p.dataUrl)
      const created = await createMaintenanceRequest(
        auth.token,
        form.title,
        form.description,
        DEFAULT_PRIORITY,
        photoUrls.length ? photoUrls : undefined,
      )
      showToast(`Request ${created.id} submitted.`, 'success')
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit request'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page report-issue-page">
      <h1>Report Issue</h1>
      <form onSubmit={handleSubmit} className="report-form card">
        <label>
          Problem Title *
          <input
            type="text"
            placeholder="Brief description of the issue"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
        </label>
        <label>
          Detailed Description *
          <textarea
            placeholder="Describe the problem in detail..."
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={6}
            required
          />
        </label>
        <div className="report-form-upload-field">
          <label htmlFor="issue-photos">Upload Photos (Optional)</label>
          <input
            id="issue-photos"
            ref={fileInputRef}
            type="file"
            className="upload-input-hidden"
            accept="image/png,image/jpeg"
            multiple
            aria-label="Choose photos"
            onChange={handleFileInputChange}
          />
          <div
            className={`upload-zone ${dragOver ? 'upload-zone--drag' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            role="button"
            tabIndex={0}
          >
            <p>Click to upload or drag and drop</p>
            <p className="muted">PNG, JPG up to 10MB each (max {MAX_PHOTOS} photos)</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
            >
              Select Files
            </button>
          </div>
          {photoError && <p className="error upload-photo-error">{photoError}</p>}
          {photos.length > 0 && (
            <ul className="upload-photo-list">
              {photos.map((p) => (
                <li key={p.id} className="upload-photo-item">
                  <img src={p.dataUrl} alt="" className="upload-photo-thumb" />
                  <span className="upload-photo-name">{p.name}</span>
                  <button
                    type="button"
                    className="btn-secondary upload-photo-remove"
                    onClick={() => {
                      setPhotos((prev) => prev.filter((x) => x.id !== p.id))
                      setPhotoError('')
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label>
          Your unit / location
          <input
            type="text"
            value={auth?.unit?.trim() || '—'}
            readOnly
            className="readonly"
            aria-readonly="true"
          />
        </label>
        <div className="form-actions">
          <Link to="/" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  )
}
