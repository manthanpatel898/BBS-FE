'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listPublishedFeedback } from '@/lib/feedback/api';

export type FeedbackStory = {
  id: string;
  name: string;
  role: string;
  company: string;
  image: string;
  imageDisplayMode: 'CROP' | 'FULL';
  rating: number;
  quote: string;
};

type FeedbackState =
  | { status: 'loading' | 'empty' | 'error'; stories: FeedbackStory[] }
  | { status: 'ready'; stories: FeedbackStory[] };

function visibleCards() {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth <= 767) return 1;
  if (window.innerWidth <= 1023) return 2;
  return 3;
}

export function HomeFeedbackCarousel() {
  const [state, setState] = useState<FeedbackState>({ status: 'loading', stories: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [paused, setPaused] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const touchStart = useRef<number | null>(null);
  const stories = state.stories;
  const maxIndex = Math.max(0, stories.length - cardsPerView);

  useEffect(() => {
    let active = true;
    void listPublishedFeedback()
      .then((records) => {
        if (!active) return;
        const nextStories = records.map((record) => ({
          id: record.id,
          name: record.fullName,
          role: record.designation,
          company: record.company,
          rating: record.rating,
          quote: record.message,
          image: record.imageUrl,
          imageDisplayMode: record.imageDisplayMode,
        }));
        setState(nextStories.length ? { status: 'ready', stories: nextStories } : { status: 'empty', stories: [] });
      })
      .catch(() => active && setState({ status: 'error', stories: [] }));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const update = () => setCardsPerView(visibleCards());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => setActiveIndex((current) => Math.min(current, maxIndex)), [maxIndex]);

  const previous = useCallback(() => {
    setActiveIndex((current) => (current <= 0 ? maxIndex : current - 1));
  }, [maxIndex]);

  const next = useCallback(() => {
    setActiveIndex((current) => (current >= maxIndex ? 0 : current + 1));
  }, [maxIndex]);

  useEffect(() => {
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || maxIndex === 0 || reducedMotion) return;
    const timer = window.setInterval(next, 6000);
    return () => window.clearInterval(timer);
  }, [maxIndex, next, paused]);

  const pages = useMemo(() => Array.from({ length: maxIndex + 1 }), [maxIndex]);

  if (state.status !== 'ready') {
    const message = state.status === 'loading'
      ? 'Loading customer stories…'
      : state.status === 'empty'
        ? 'Customer stories coming soon.'
        : 'Customer stories are temporarily unavailable.';
    return <div role="region" aria-label="Customer feedback carousel" aria-live="polite" className="mt-8 rounded-[24px] border border-slate-200 bg-white px-6 py-12 text-center text-sm font-semibold text-slate-600 shadow-sm">{message}</div>;
  }

  return (
    <div
      role="region"
      aria-label="Customer feedback carousel"
      aria-roledescription="carousel"
      className="mt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        if (start != null && end != null && Math.abs(start - end) > 45) {
          if (start > end) next(); else previous();
        }
        touchStart.current = null;
        setPaused(false);
      }}
    >
      <div className="overflow-hidden py-1">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * (100 / cardsPerView)}%)` }}
        >
          {stories.map((story, index) => (
            <article
              key={story.id}
              aria-label={`${index + 1} of ${stories.length}`}
              className="group shrink-0 px-2 first:pl-0 last:pr-0"
              style={{ width: `${100 / cardsPerView}%` }}
            >
              <div className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.1)] motion-reduce:transition-none">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {brokenImages.has(story.id) ? <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-amber-50 text-4xl font-black text-amber-500" aria-label={`Photo unavailable for ${story.name}`}>{story.name.charAt(0).toUpperCase()}</div> : <img src={story.image} alt={`Feedback from ${story.name}`} onError={() => setBrokenImages((current) => new Set(current).add(story.id))} className={`h-full w-full transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none ${story.imageDisplayMode === 'FULL' ? 'object-contain' : 'object-cover'}`} />}
                </div>
                <div className="p-6">
                  <div aria-label={`${story.rating} out of 5 stars`} className="text-sm tracking-[0.16em] text-amber-500">{'★'.repeat(story.rating)}<span className="text-slate-200">{'★'.repeat(5 - story.rating)}</span></div>
                  <span className="text-4xl font-black leading-none text-amber-300">“</span>
                  <p className="mt-2 min-h-28 text-sm leading-7 text-slate-600">{story.quote}</p>
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-sm font-bold text-slate-950">{story.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{story.role}</p>
                    <p className="mt-1 text-xs text-slate-500">{story.company}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold text-slate-500" aria-live="polite">Showing feedback {activeIndex + 1}–{Math.min(activeIndex + cardsPerView, stories.length)} of {stories.length}</p>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 sm:flex" aria-label="Choose feedback position">
            {pages.map((_, index) => (
              <button key={index} type="button" onClick={() => setActiveIndex(index)} aria-label={`Show feedback position ${index + 1}`} aria-current={activeIndex === index ? 'true' : undefined} className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-7 bg-amber-500' : 'w-2 bg-slate-300 hover:bg-slate-400'}`} />
            ))}
          </div>
          <button type="button" onClick={previous} disabled={maxIndex === 0} aria-label="Previous feedback" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-bold text-slate-800 shadow-sm transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40">←</button>
          <button type="button" onClick={next} disabled={maxIndex === 0} aria-label="Next feedback" className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-xl font-bold text-white shadow-sm transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">→</button>
        </div>
      </div>
    </div>
  );
}
