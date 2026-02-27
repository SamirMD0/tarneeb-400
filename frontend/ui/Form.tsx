'use client';

// frontend/ui/Form.tsx
// Login / Sign-up flip-card form, wired to the backend auth API.
// On success: redirects to /lobby.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import '@/styles/form.css';

// ─── Validation helpers ────────────────────────────────────────────────────────

function validateEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'Enter a valid email address.';
}
function validatePassword(v: string) {
  return v.length >= 6 ? null : 'Password must be at least 6 characters.';
}
function validateName(v: string) {
  return v.trim().length >= 2 ? null : 'Name must be at least 2 characters.';
}

// ─── Shared field error display ───────────────────────────────────────────────

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="text-xs text-red-400 mt-1 ml-0.5">{message}</p>;
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({
  onSuccess,
  serverError,
  isLoading,
  onSubmit,
}: {
  onSuccess: () => void;
  serverError: string | null;
  isLoading: boolean;
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched]   = useState({ email: false, password: false });

  const emailErr    = touched.email    ? validateEmail(email)       : null;
  const passwordErr = touched.password ? validatePassword(password) : null;
  const isValid     = !validateEmail(email) && !validatePassword(password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    onSubmit(email, password);
  }

  return (
    <form className="flex w-full flex-col items-center gap-4" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div
          role="alert"
          className="w-full rounded-lg px-3 py-2 text-xs text-red-400"
          style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)' }}
        >
          {serverError}
        </div>
      )}

      <div className="w-full">
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          className="form-input"
          aria-label="Email"
          aria-invalid={!!emailErr}
          onChange={(e) => { setEmail(e.target.value); if (touched.email) setTouched(t => ({ ...t })); }}
          onBlur={() => setTouched(t => ({ ...t, email: true }))}
        />
        <FieldError message={emailErr} />
      </div>

      <div className="w-full">
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          className="form-input"
          aria-label="Password"
          aria-invalid={!!passwordErr}
          onChange={(e) => { setPassword(e.target.value); if (touched.password) setTouched(t => ({ ...t })); }}
          onBlur={() => setTouched(t => ({ ...t, password: true }))}
        />
        <FieldError message={passwordErr} />
      </div>

      <button type="submit" className="form-btn mt-1" disabled={isLoading}>
        {isLoading ? '…' : "Let's go!"}
      </button>
    </form>
  );
}

// ─── Sign-up form ─────────────────────────────────────────────────────────────

function SignUpForm({
  serverError,
  isLoading,
  onSubmit,
}: {
  serverError: string | null;
  isLoading: boolean;
  onSubmit: (name: string, email: string, password: string) => void;
}) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched]   = useState({ name: false, email: false, password: false });

  const nameErr     = touched.name     ? validateName(name)         : null;
  const emailErr    = touched.email    ? validateEmail(email)       : null;
  const passwordErr = touched.password ? validatePassword(password) : null;
  const isValid     = !validateName(name) && !validateEmail(email) && !validatePassword(password);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!isValid) return;
    onSubmit(name, email, password);
  }

  return (
    <form className="flex w-full flex-col items-center gap-3" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div
          role="alert"
          className="w-full rounded-lg px-3 py-2 text-xs text-red-400"
          style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)' }}
        >
          {serverError}
        </div>
      )}

      <div className="w-full">
        <input
          type="text"
          placeholder="Name"
          autoComplete="name"
          value={name}
          className="form-input"
          aria-label="Name"
          aria-invalid={!!nameErr}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, name: true }))}
        />
        <FieldError message={nameErr} />
      </div>

      <div className="w-full">
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          className="form-input"
          aria-label="Email"
          aria-invalid={!!emailErr}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, email: true }))}
        />
        <FieldError message={emailErr} />
      </div>

      <div className="w-full">
        <input
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          className="form-input"
          aria-label="Password"
          aria-invalid={!!passwordErr}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, password: true }))}
        />
        <FieldError message={passwordErr} />
      </div>

      <button type="submit" className="form-btn mt-1" disabled={isLoading}>
        {isLoading ? '…' : 'Confirm!'}
      </button>
    </form>
  );
}

// ─── Main Form component ──────────────────────────────────────────────────────

export default function Form() {
  const router = useRouter();
  const { login, register, isLoading, error } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleLogin(email: string, password: string) {
    const ok = await login(email, password);
    if (ok) router.push('/lobby');
  }

  async function handleRegister(name: string, email: string, password: string) {
    const ok = await register(name, email, password);
    if (ok) router.push('/lobby');
  }

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
              !isSignUp ? 'underline underline-offset-4' : 'text-slate-500 hover:text-slate-300',
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
              isSignUp ? 'underline underline-offset-4' : 'text-slate-500 hover:text-slate-300',
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
            <LoginForm
              onSuccess={() => router.push('/lobby')}
              serverError={!isSignUp ? error : null}
              isLoading={isLoading && !isSignUp}
              onSubmit={handleLogin}
            />
          </div>

          {/* Back — Sign up */}
          <div className="form-face flip-card-face flip-card-face--back absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg p-6">
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
            <SignUpForm
              serverError={isSignUp ? error : null}
              isLoading={isLoading && isSignUp}
              onSubmit={handleRegister}
            />
          </div>

        </div>
      </div>
    </div>
  );
}