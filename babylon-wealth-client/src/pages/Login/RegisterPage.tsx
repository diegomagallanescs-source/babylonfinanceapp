import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as apiRegister } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import './AuthPages.css';

interface FieldErrors {
  firstName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak',   color: '#E05555' };
  if (score <= 3) return { score, label: 'Fair',   color: '#C9A84C' };
  return              { score, label: 'Strong', color: '#4CAF7D' };
}

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const strength = password ? passwordStrength(password) : null;

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!email) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerErrors([]);
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const authResponse = await apiRegister(email, password, firstName || undefined);
      login(authResponse);
      navigate('/');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } }).response?.data as Record<string, unknown> | undefined;
      // Identity errors: { errors: string[] }
      // Model validation errors: { errors: { FieldName: string[] } }
      const raw = data?.errors;
      if (Array.isArray(raw)) {
        setServerErrors(raw as string[]);
      } else if (raw && typeof raw === 'object') {
        setServerErrors(Object.values(raw as Record<string, string[]>).flat());
      } else {
        setServerErrors(['Something went wrong. Please try again.']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✦</div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start growing your river today.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* First name — optional */}
          <div className="auth-field">
            <input
              className="auth-input"
              type="text"
              placeholder="First name (optional)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
            <span className="auth-name-hint">Used to greet you on the home screen.</span>
          </div>

          {/* Email */}
          <div className="auth-field">
            <input
              className={`auth-input${fieldErrors.email ? ' auth-input--error' : ''}`}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </div>

          {/* Password + strength bar */}
          <div className="auth-field">
            <input
              className={`auth-input${fieldErrors.password ? ' auth-input--error' : ''}`}
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {strength && (
              <div className="auth-strength">
                <div
                  className="auth-strength__bar"
                  style={{
                    width: `${(strength.score / 5) * 100}%`,
                    background: strength.color,
                  }}
                />
              </div>
            )}
            {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
          </div>

          {/* Confirm password */}
          <div className="auth-field">
            <input
              className={`auth-input${fieldErrors.confirmPassword ? ' auth-input--error' : ''}`}
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          {/* Server-side errors (e.g. email already taken) */}
          {serverErrors.length > 0 && (
            <div className="auth-server-error">
              {serverErrors.map((msg, i) => <div key={i}>{msg}</div>)}
            </div>
          )}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
