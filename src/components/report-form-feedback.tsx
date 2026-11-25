"use client";

import { useEffect } from 'react';
import { showNotice } from '@/components/canonical-actions';

const MAX_UPLOAD_IMAGES = 5;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);
const ACCEPTED_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

function isAcceptedImage(file: File) {
  return ACCEPTED_MIME_TYPES.has(file.type.toLowerCase()) || (!file.type && ACCEPTED_EXTENSION.test(file.name));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadInputFor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const form = target.closest('form');
  return form?.querySelector<HTMLInputElement>('input[type="file"][data-upload-input][name="images"]') ?? null;
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  if (typeof DataTransfer === 'undefined') return false;
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
  return true;
}

function updateUploadStatus(input: HTMLInputElement) {
  const form = input.closest('form');
  const status = form?.querySelector<HTMLElement>('[data-upload-status]');
  const files = Array.from(input.files ?? []);

  status?.setAttribute('data-count', String(files.length));
  if (status) {
    status.replaceChildren();
    if (files.length === 0) {
      status.textContent = status.dataset.uploadEmpty ?? 'No images selected.';
    } else {
      const heading = document.createElement('strong');
      heading.textContent = `${files.length} image${files.length === 1 ? '' : 's'} selected`;
      const detail = document.createElement('span');
      detail.textContent = files
        .map((file) => `${file.name} (${formatSize(file.size)})`)
        .join(' · ');
      status.append(heading, document.createElement('br'), detail);
    }
  }

  const dropzone = input.closest<HTMLElement>('[data-upload-dropzone]');
  if (dropzone) {
    dropzone.dataset.selected = String(files.length > 0);
    dropzone.classList.toggle('ring-2', files.length > 0);
    dropzone.classList.toggle('ring-primary', files.length > 0);
    dropzone.classList.toggle('ring-offset-2', files.length > 0);
  }
}

function handleChange(event: Event) {
  const input = event.target;
  if (
    !(input instanceof HTMLInputElement) ||
    !input.matches('input[type="file"][data-upload-input][name="images"]')
  ) {
    return;
  }

  const selected = Array.from(input.files ?? []);
  const accepted = selected.filter((file) => isAcceptedImage(file) && file.size <= MAX_UPLOAD_BYTES);
  const withinLimit = accepted.slice(0, MAX_UPLOAD_IMAGES);
  const rejected = selected.length - withinLimit.length;

  if (rejected > 0) {
    if (!setInputFiles(input, withinLimit)) input.value = '';
    showNotice(
      `Skipped ${rejected} file${rejected === 1 ? '' : 's'}. Use JPG, PNG, WebP, GIF, HEIC, or HEIF under 10MB, up to ${MAX_UPLOAD_IMAGES} images.`,
    );
  }

  updateUploadStatus(input);
}

function handleDragOver(event: DragEvent) {
  const input = uploadInputFor(event.target);
  if (!input) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  input.closest<HTMLElement>('[data-upload-dropzone]')?.setAttribute('data-dragover', 'true');
}

function handleDragLeave(event: DragEvent) {
  const input = uploadInputFor(event.target);
  input?.closest<HTMLElement>('[data-upload-dropzone]')?.removeAttribute('data-dragover');
}

function handleDrop(event: DragEvent) {
  const input = uploadInputFor(event.target);
  if (!input) return;
  event.preventDefault();
  input.closest<HTMLElement>('[data-upload-dropzone]')?.removeAttribute('data-dragover');

  const dropped = Array.from(event.dataTransfer?.files ?? []);
  if (dropped.length === 0) return;
  if (!setInputFiles(input, dropped)) {
    showNotice('Drag and drop is not supported by this browser. Use the browse files control instead.');
    return;
  }
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function handleSubmit(event: Event) {
  const input = uploadInputFor(event.target);
  if (!input) return;
  updateUploadStatus(input);
  showNotice('Submitting your report. Keep this page open until the confirmation appears.');
}

function handleInvalid(event: Event) {
  const input = uploadInputFor(event.target);
  if (!input) return;
  showNotice('Please complete the highlighted required fields before submitting.');
}

/**
 * Canonical report screens submit through native HTML forms. This small client
 * island makes image selection and submission visible without replacing the
 * generated markup or inventing a separate client-side success state.
 */
export default function ReportFormFeedback() {
  useEffect(() => {
    document.addEventListener('change', handleChange);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('invalid', handleInvalid, true);
    return () => {
      document.removeEventListener('change', handleChange);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('submit', handleSubmit);
      document.removeEventListener('invalid', handleInvalid, true);
    };
  }, []);

  return null;
}
