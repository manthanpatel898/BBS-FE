'use client';

import { useEffect, useRef, useState } from 'react';
import { DecorationImageCropModal } from '@/components/decoration/decoration-image-crop-modal';
import type { FeedbackImageDisplayMode } from '@/lib/feedback/types';
import styles from './public-feedback-form.module.css';

type Props = {
  file: File | null;
  displayMode: FeedbackImageDisplayMode;
  disabled?: boolean;
  onChange: (file: File, mode: FeedbackImageDisplayMode) => void;
};

export function FeedbackImageEditor({ file, displayMode, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [cropSource, setCropSource] = useState<File | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <section className={styles.imageEditor} aria-labelledby="feedback-photo-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Customer story photo</p>
          <h2 id="feedback-photo-title">Add a clear customer or venue photo</h2>
        </div>
        <span>Required</span>
      </div>

      <label className={styles.fileDrop}>
        <input
          ref={inputRef}
          type="file"
          aria-label="Customer photo"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) onChange(selected, 'FULL');
            event.target.value = '';
          }}
        />
        {previewUrl ? (
          // A local object URL is required here because the customer is previewing an unsaved file.
          <img
            src={previewUrl}
            alt="Selected customer feedback"
            className={displayMode === 'FULL' ? styles.containImage : styles.coverImage}
          />
        ) : (
          <span><strong>Choose a photo</strong><small>JPEG, PNG or WebP · up to 8 MB</small></span>
        )}
      </label>

      {file ? (
        <div className={styles.imageActions}>
          <button
            type="button"
            className={displayMode === 'FULL' ? styles.selectedOption : styles.option}
            disabled={disabled}
            onClick={() => onChange(file, 'FULL')}
          >
            Use full image
          </button>
          <button
            type="button"
            className={displayMode === 'CROP' ? styles.selectedOption : styles.option}
            disabled={disabled}
            onClick={() => setCropSource(file)}
          >
            Crop image
          </button>
          <button type="button" className={styles.option} disabled={disabled} onClick={() => inputRef.current?.click()}>
            Replace
          </button>
        </div>
      ) : null}

      {cropSource ? (
        <DecorationImageCropModal
          file={cropSource}
          onCancel={() => setCropSource(null)}
          onConfirm={(nextFile, mode) => {
            onChange(nextFile, mode === 'COVER' ? 'CROP' : 'FULL');
            setCropSource(null);
          }}
        />
      ) : null}
    </section>
  );
}
