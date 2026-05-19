import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createMaintenanceRequest, getAuthSession } from '../services/api';
import type { SessionResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './ReportIssuePage.css';
const MAX_PHOTOS = 6;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const DEFAULT_SUBMIT_PRIORITY = 'Medium';
function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
}
type PhotoItem = {
    id: string;
    name: string;
    dataUrl: string;
};
function formatBytes(n: number) {
    if (n < 1024)
        return `${n} B`;
    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
export function ReportIssuePage() {
    const { auth } = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();
    const fileInputId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [photoError, setPhotoError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [session, setSession] = useState<SessionResponse | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [sessionError, setSessionError] = useState('');
    useEffect(() => {
        if (!auth?.token) {
            setSessionLoading(false);
            return;
        }
        let cancelled = false;
        setSessionLoading(true);
        setSessionError('');
        void getAuthSession(auth.token)
            .then((s) => {
            if (!cancelled)
                setSession(s);
        })
            .catch(() => {
            if (!cancelled)
                setSessionError('Could not refresh your building and unit from the server.');
        })
            .finally(() => {
            if (!cancelled)
                setSessionLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [auth?.token]);
    const buildingDisplay = session?.buildingName?.trim() || '—';
    const unitDisplay = session?.unit?.trim() || auth?.unit?.trim() || '—';
    const addFiles = useCallback(async (fileList: FileList | File[] | null) => {
        if (!fileList?.length)
            return;
        const incoming = [...fileList].filter((f) => f.type.startsWith('image/'));
        if (!incoming.length) {
            setPhotoError('Please choose image files (PNG, JPEG, WebP, etc.).');
            return;
        }
        setPhotoError('');
        const next: PhotoItem[] = [];
        for (const file of incoming) {
            if (photos.length + next.length >= MAX_PHOTOS) {
                setPhotoError(`You can attach up to ${MAX_PHOTOS} photos.`);
                break;
            }
            if (file.size > MAX_FILE_BYTES) {
                setPhotoError(`Each file must be at most ${formatBytes(MAX_FILE_BYTES)} (${file.name}).`);
                break;
            }
            try {
                const dataUrl = await readFileAsDataUrl(file);
                next.push({ id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`, name: file.name, dataUrl });
            }
            catch {
                setPhotoError(`Could not read ${file.name}.`);
                break;
            }
        }
        if (next.length)
            setPhotos((prev) => [...prev, ...next]);
    }, [photos.length]);
    function removePhoto(id: string) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        setPhotoError('');
    }
    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!auth?.token)
            return;
        setSubmitting(true);
        try {
            const photoUrls = photos.length ? photos.map((p) => p.dataUrl) : undefined;
            await createMaintenanceRequest(auth.token, title.trim(), description.trim(), DEFAULT_SUBMIT_PRIORITY, photoUrls);
            showToast('Maintenance request submitted.', 'success');
            navigate('/my-maintenance-requests');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not submit request';
            showToast(msg, 'error');
        }
        finally {
            setSubmitting(false);
        }
    }
    return (<div className="page report-issue-page">
      <h1>Report an issue</h1>
      <p className="page-subtitle">Maintenance request</p>
      {sessionError ? (<p className="report-issue-session-warn muted" role="status">
          {sessionError} You can still submit; your profile on file will be used.
        </p>) : null}

      <form className="report-form card" onSubmit={(e) => void handleSubmit(e)}>
        <div className="report-form-location">
          <label>
            Building
            <input type="text" className="readonly" readOnly value={sessionLoading ? 'Loading…' : buildingDisplay} aria-busy={sessionLoading}/>
          </label>
          <label>
            Your unit
            <input type="text" className="readonly" readOnly value={sessionLoading ? 'Loading…' : unitDisplay}/>
          </label>
        </div>

        <label>
          <span className="report-form-label-row">
            Title <span className="req">*</span>
          </span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={submitting} autoComplete="off"/>
        </label>

        <label>
          <span className="report-form-label-row">
            Description <span className="req">*</span>
          </span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required disabled={submitting}/>
        </label>

        <div className="report-form-upload-field">
          <label htmlFor={fileInputId}>Photos (optional)</label>
          <div className={`upload-zone upload-zone--compact${dragActive ? ' upload-zone--drag' : ''}`} role="presentation" onDragEnter={(ev) => {
            ev.preventDefault();
            setDragActive(true);
        }} onDragOver={(ev) => {
            ev.preventDefault();
            setDragActive(true);
        }} onDragLeave={(ev) => {
            ev.preventDefault();
            if (!ev.currentTarget.contains(ev.relatedTarget as Node))
                setDragActive(false);
        }} onDrop={(ev) => {
            ev.preventDefault();
            setDragActive(false);
            void addFiles(ev.dataTransfer.files);
        }} onClick={() => fileInputRef.current?.click()} onKeyDown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                fileInputRef.current?.click();
            }
        }}>
            <p className="upload-zone-prompt">Drop photos here or choose files.</p>
            <button type="button" className="btn-secondary upload-zone-btn" disabled={submitting || photos.length >= MAX_PHOTOS} onClick={(ev) => {
            ev.stopPropagation();
            fileInputRef.current?.click();
        }}>
              Choose files
            </button>
            <input ref={fileInputRef} id={fileInputId} type="file" className="upload-input-hidden" accept="image/*" multiple disabled={submitting || photos.length >= MAX_PHOTOS} onChange={(ev) => {
            void addFiles(ev.target.files);
            ev.target.value = '';
        }}/>
          </div>
          {photoError ? (<p className="upload-photo-error error-text" role="alert">
              {photoError}
            </p>) : null}
          {photos.length > 0 ? (<ul className="upload-photo-list">
              {photos.map((p) => (<li key={p.id} className="upload-photo-item">
                  <img src={p.dataUrl} alt="" className="upload-photo-thumb"/>
                  <span className="upload-photo-name">{p.name}</span>
                  <button type="button" className="btn-secondary upload-photo-remove" disabled={submitting} onClick={() => removePhoto(p.id)}>
                    Remove
                  </button>
                </li>))}
            </ul>) : null}
        </div>

        <div className="form-actions">
          <Link to="/" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>);
}
