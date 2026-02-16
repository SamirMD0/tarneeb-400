'use client';

import { useState } from 'react';
import '@/styles/form.css';

export default function Form() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="flex items-center justify-center">
      <div className="flip-card-scene">

        {/* ── Toggle ───────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={[
              'text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded',
              !isSignUp
                ? 'underline underline-offset-4'
                : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
            style={!isSignUp ? { color: '#e555c7', textShadow: '0 0 10px rgba(229,85,199,0.6)' } : {}}
          >
            Log in
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={isSignUp}
            aria-label="Toggle between Log in and Sign up"
            onClick={() => setIsSignUp((v) => !v)}
            className={['form-switch', isSignUp ? 'form-switch--on' : ''].join(' ')}
          >
            <span className={['form-switch__thumb', isSignUp ? 'form-switch__thumb--on' : ''].join(' ')} />
          </button>

          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={[
              'text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded',
              isSignUp
                ? 'underline underline-offset-4'
                : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
            style={isSignUp ? { color: '#e555c7', textShadow: '0 0 10px rgba(229,85,199,0.6)' } : {}}
          >
            Sign up
          </button>
        </div>

        {/* ── Flip card ─────────────────────────────────────── */}
        <div className={['flip-card-inner', isSignUp ? 'flip-card-inner--flipped' : ''].join(' ')}>

          {/* Front — Log in */}
          <div className="form-face flip-card-face absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-lg p-6">
            <p
              className="text-xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #e555c7 0%, #55aaff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Log in
            </p>
            <form
              className="flex w-full flex-col items-center gap-5"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="form-input"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className="form-input"
              />
              <button type="submit" className="form-btn mt-2">
                Let's go!
              </button>
            </form>
          </div>

          {/* Back — Sign up */}
          <div className="form-face flip-card-face flip-card-face--back absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-lg p-6">
            <p
              className="text-xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #55aaff 0%, #e555c7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Sign up
            </p>
            <form
              className="flex w-full flex-col items-center gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                name="name"
                type="text"
                placeholder="Name"
                autoComplete="name"
                className="form-input"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="form-input"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                className="form-input"
              />
              <button type="submit" className="form-btn mt-1">
                Confirm!
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}