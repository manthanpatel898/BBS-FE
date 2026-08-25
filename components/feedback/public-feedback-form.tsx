'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  submitCustomerFeedback,
  validateFeedbackInvitation,
} from '@/lib/feedback/api';
import {
  captureFeedbackToken,
  clearFeedbackToken,
} from '@/lib/feedback/token-session';
import type {
  FeedbackImageDisplayMode,
  PublicInvitation,
  SubmitFeedbackInput,
} from '@/lib/feedback/types';
import { FeedbackImageEditor } from './feedback-image-editor';
import styles from './public-feedback-form.module.css';

type FormState =
  | 'VALIDATING'
  | 'READY'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'INVALID'
  | 'EXPIRED'
  | 'USED'
  | 'ERROR';

type Props = {
  initialToken?: string;
  validateInvitation?: (token: string) => Promise<PublicInvitation>;
  submitFeedback?: (token: string, input: SubmitFeedbackInput) => Promise<unknown>;
};

const emptyForm = {
  fullName: '',
  designation: '',
  company: '',
  rating: 0,
  message: '',
  consentAccepted: false,
};

export function PublicFeedbackForm({
  initialToken,
  validateInvitation: validate = validateFeedbackInvitation,
  submitFeedback: submit = submitCustomerFeedback,
}: Props) {
  const [state, setState] = useState<FormState>('VALIDATING');
  const [token, setToken] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [displayMode, setDisplayMode] = useState<FeedbackImageDisplayMode>('FULL');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const nextToken =
      initialToken ?? captureFeedbackToken(new URLSearchParams(window.location.search));
    if (!nextToken) {
      setState('INVALID');
      return;
    }
    setToken(nextToken);
    void validate(nextToken)
      .then((result) => {
        if (!active) return;
        if (result.status !== 'READY') {
          setState(result.status);
          if (result.status === 'INVALID' || result.status === 'EXPIRED' || result.status === 'USED') {
            clearFeedbackToken();
          }
          return;
        }
        setForm((current) => ({ ...current, ...result.prefill }));
        setState('READY');
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Unable to validate this feedback link.');
        setState('ERROR');
      });
    return () => {
      active = false;
    };
  }, [initialToken, validate]);

  const valid = useMemo(
    () =>
      Boolean(
        form.fullName.trim() &&
          form.designation.trim() &&
          form.company.trim() &&
          form.rating >= 1 &&
          form.message.trim() &&
          form.consentAccepted &&
          image,
      ),
    [form, image],
  );

  const update = (field: keyof typeof emptyForm, value: string | number | boolean) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || !image || state === 'SUBMITTING') return;
    setState('SUBMITTING');
    setError('');
    try {
      await submit(token, {
        fullName: form.fullName.trim(),
        designation: form.designation.trim(),
        company: form.company.trim(),
        rating: form.rating,
        message: form.message.trim(),
        consentAccepted: true,
        displayMode,
        image,
      });
      clearFeedbackToken();
      setState('SUCCESS');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit feedback. Please try again.');
      setState('READY');
    }
  };

  if (state === 'VALIDATING') return <StatePanel title="Checking your feedback link…" body="Please wait a moment." busy />;
  if (state === 'INVALID') return <StatePanel title="Invalid feedback link" body="Please use the exact feedback link shared with you." />;
  if (state === 'EXPIRED') return <StatePanel title="This feedback link has expired" body="Please ask the Zenovel team for a new link." />;
  if (state === 'USED') return <StatePanel title="Feedback already received" body="Thank you. This single-use link has already been submitted." />;
  if (state === 'ERROR') return <StatePanel title="We could not open this form" body={error} />;
  if (state === 'SUCCESS') return <StatePanel title="Thank you for sharing your story" body="Your feedback has been submitted securely and is awaiting review." success />;

  const busy = state === 'SUBMITTING';
  return (
    <form className={styles.form} onSubmit={submitForm} noValidate>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Customer feedback</p>
        <h1>Tell us how ZenBooking supports your business</h1>
        <p>Your experience helps other banquet and event teams understand what the platform can do.</p>
      </header>

      <div className={styles.formGrid}>
        <section className={styles.fields} aria-labelledby="customer-story-details">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Your details</p>
              <h2 id="customer-story-details">Customer story</h2>
            </div>
            <span>All fields required</span>
          </div>
          <label>Customer name<input value={form.fullName} disabled={busy} maxLength={80} onChange={(e) => update('fullName', e.target.value)} /></label>
          <div className={styles.twoColumns}>
            <label>Designation<input value={form.designation} disabled={busy} maxLength={80} onChange={(e) => update('designation', e.target.value)} /></label>
            <label>Company<input value={form.company} disabled={busy} maxLength={120} onChange={(e) => update('company', e.target.value)} /></label>
          </div>
          <fieldset className={styles.rating}>
            <legend>Rating</legend>
            <div role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating} className={form.rating >= rating ? styles.activeStar : ''}>
                  <input type="radio" name="rating" aria-label={`${rating} stars`} value={rating} checked={form.rating === rating} disabled={busy} onChange={() => update('rating', rating)} />★
                </label>
              ))}
            </div>
          </fieldset>
          <label>Feedback message<textarea aria-label="Feedback message" value={form.message} disabled={busy} maxLength={1200} rows={7} onChange={(e) => update('message', e.target.value)} /><small>{form.message.length}/1200</small></label>
        </section>

        <FeedbackImageEditor
          file={image}
          displayMode={displayMode}
          disabled={busy}
          onChange={(nextImage, mode) => {
            setImage(nextImage);
            setDisplayMode(mode);
          }}
        />
      </div>

      <label className={styles.consent}>
        <input type="checkbox" checked={form.consentAccepted} disabled={busy} onChange={(e) => update('consentAccepted', e.target.checked)} />
        <span><strong>I allow Zenovel Technolab to publish this feedback and photo.</strong><small>The team may edit presentation copy while preserving my original submission for audit purposes.</small></span>
      </label>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      <div aria-live="polite" className={styles.srOnly}>{busy ? 'Submitting feedback' : error}</div>
      <button className={styles.submit} type="submit" disabled={!valid || busy}>
        {busy ? 'Submitting securely…' : 'Submit feedback'}
      </button>
    </form>
  );
}

function StatePanel({ title, body, busy, success }: { title: string; body: string; busy?: boolean; success?: boolean }) {
  return (
    <section className={styles.statePanel} aria-live="polite">
      <span className={success ? styles.successIcon : styles.stateIcon}>{busy ? '…' : success ? '✓' : '!'}</span>
      <p className={styles.eyebrow}>ZenBooking feedback</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </section>
  );
}

