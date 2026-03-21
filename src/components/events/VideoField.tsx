import { useState, useRef } from "react";
import { getVideoDisplayInfo } from "../../utils/videoUtils";
import { UPLOAD_WORKER_URL, UPLOAD_SECRET, MAX_VIDEO_BYTES, MAX_VIDEO_LABEL } from "../../utils/uploadConfig";
import "./VideoField.css";

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

type Props = {
  videoUrl: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
};

export default function VideoField({ videoUrl, onChange, onUploadingChange }: Props) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = videoUrl ? getVideoDisplayInfo(videoUrl) : null;

  const switchMode = (newMode: 'url' | 'file') => {
    setMode(newMode);
    // Clear video URL and upload state when switching modes
    onChange("");
    setUploadState('idle');
    setUploadError(null);
    setUploadedFilename(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (!file.type.startsWith("video/")) {
      setUploadError("Please select a video file.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUploadError(`File must be under ${MAX_VIDEO_LABEL}.`);
      return;
    }

    setUploadError(null);
    setUploadState('uploading');
    setUploadProgress(0);
    onUploadingChange(true);
    setUploadedFilename(file.name);

    try {
      // Step 1: Get presigned URL from Worker
      const presignRes = await fetch(`${UPLOAD_WORKER_URL}/presign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${UPLOAD_SECRET}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }

      const { uploadUrl, publicUrl } = await presignRes.json() as { uploadUrl: string; publicUrl: string };

      // Step 2: PUT file directly to R2 via presigned URL (XHR for progress tracking)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      setUploadProgress(100);
      setUploadState('done');
      onChange(publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadState('error');
      setUploadedFilename(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      onUploadingChange(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    setUploadState('idle');
    setUploadError(null);
    setUploadedFilename(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="form-field">
      <label className="form-label">BSL Video <span className="form-label-muted">· optional</span></label>

      <div className="videofield-mode-toggle">
        <button
          type="button"
          className={`event-type-btn${mode === 'url' ? ' event-type-btn--active' : ''}`}
          onClick={() => switchMode('url')}
        >
          Paste Link
        </button>
        <button
          type="button"
          className={`event-type-btn${mode === 'file' ? ' event-type-btn--active' : ''}`}
          onClick={() => switchMode('file')}
        >
          Upload File
        </button>
      </div>

      {mode === 'url' && (
        <>
          <input
            className="form-input"
            type="url"
            placeholder="e.g. https://youtube.com/watch?v=..."
            value={videoUrl}
            onChange={e => onChange(e.target.value)}
          />
          {preview && (
            <div className="videofield-preview">
              {preview.type === 'youtube' || preview.type === 'vimeo' ? (
                <iframe
                  src={preview.embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video preview"
                />
              ) : (
                <video src={preview.src} controls preload="metadata" />
              )}
            </div>
          )}
        </>
      )}

      {mode === 'file' && (
        <>
          {uploadState !== 'done' && (
            <input
              ref={fileInputRef}
              className="form-input videofield-file-input"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={uploadState === 'uploading'}
            />
          )}

          {uploadState === 'uploading' && (
            <div className="videofield-progress">
              <div
                className="videofield-progress-bar"
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
              <span className="videofield-progress-label">{uploadProgress}%</span>
            </div>
          )}

          {uploadState === 'done' && uploadedFilename && (
            <div className="videofield-success">
              <span className="videofield-success-name">✓ {uploadedFilename}</span>
              <button type="button" className="videofield-remove-btn" onClick={handleRemove}>
                Remove
              </button>
            </div>
          )}

          {uploadError && (
            <span className="form-field-error videofield-error">{uploadError}</span>
          )}
        </>
      )}
    </div>
  );
}
