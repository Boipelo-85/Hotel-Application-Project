import { useEffect, useState } from 'react';
import { parseApiError } from '../services/api';

export interface EditablePhoto {
  id: string;
  image_url: string;
  alt_text?: string | null;
  display_order?: number;
}

interface PhotoEditorProps {
  label: string;
  apiPath: string;
  initialPhotos?: EditablePhoto[];
  roomDetailsUrl?: string;
  onChange?: (photos: EditablePhoto[]) => void;
}

export default function PhotoEditor({ label, apiPath, initialPhotos, roomDetailsUrl, onChange }: PhotoEditorProps) {
  const [photos, setPhotos] = useState(initialPhotos ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(Boolean(roomDetailsUrl));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!roomDetailsUrl) return;
    const controller = new AbortController();

    async function load(url: string) {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(await parseApiError(response));
        const data = await response.json() as { room: { images?: EditablePhoto[] } };
        if (!controller.signal.aborted) setPhotos(data.room.images ?? []);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load photos.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load(roomDetailsUrl);
    return () => controller.abort();
  }, [roomDetailsUrl]);

  async function updatePhoto(photo?: EditablePhoto) {
    if (busy || (!photo && !file)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      if (file && !photo) {
        body.append('image', file);
        body.append('displayOrder', String(Math.max(-1, ...photos.map(item => item.display_order ?? 0)) + 1));
      }
      const response = await fetch(photo ? `${apiPath}/images/${photo.id}` : `${apiPath}/upload-image`, {
        method: photo ? 'DELETE' : 'POST',
        body: photo ? undefined : body,
        credentials: 'include',
      });
      if (!response.ok) throw new Error(await parseApiError(response));

      let updatedPhotos: EditablePhoto[];
      if (photo) {
        updatedPhotos = photos.filter(item => item.id !== photo.id);
      } else {
        const data = await response.json() as { image: EditablePhoto };
        updatedPhotos = [...photos, data.image];
        setFile(null);
        setInputKey(key => key + 1);
      }
      setPhotos(updatedPhotos);
      onChange?.(updatedPhotos);
      setMessage(photo ? 'Photo removed.' : 'Photo added.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update photos.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset style={{ minWidth: 0, padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.25rem' }}>
      <legend>{label} photos</legend>
      <p>Photo changes save separately. To replace a photo, add the new one and then remove the old one.</p>
      {loading && <p role="status">Loading photos…</p>}
      {!loading && !error && photos.length === 0 && <p>No photos yet.</p>}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {photos.map((photo, index) => (
          <div key={photo.id}>
            <img src={photo.image_url} alt={photo.alt_text || `${label} photo ${index + 1}`} style={{ display: 'block', width: '112px', height: '80px', objectFit: 'cover' }} />
            <button type="button" disabled={busy} aria-label={`Remove photo ${index + 1}`} onClick={() => void updatePhoto(photo)}>Remove</button>
          </div>
        ))}
      </div>
      <label>
        Choose a photo
        <input key={inputKey} type="file" accept="image/jpeg,image/png,image/gif,image/webp" disabled={loading || busy} onChange={event => setFile(event.target.files?.[0] ?? null)} style={{ display: 'block', maxWidth: '100%' }} />
      </label>
      <button type="button" disabled={loading || busy || !file} onClick={() => void updatePhoto()}>Add photo</button>
      {busy && <p role="status">Saving photo change…</p>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
