import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthGuard from './components/AuthGuard';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Preview from './pages/Preview';
import Dashboard from './pages/Dashboard';

function Nav() {
  const location = useLocation();
  const { user, isLoading, login, logout } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path
      ? 'bg-warm-black text-warm-white'
      : 'hover:bg-warm-black hover:text-warm-white';

  const btnClass =
    'rounded-xl px-4 py-1.5 text-sm tracking-wide border border-warm-black transition-all duration-400';

  return (
    <nav className="sticky top-0 z-50 border-b border-warm-black-25 bg-warm-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link
          to="/"
          className="text-lg font-bold tracking-widest text-warm-black"
        >
          tanshuku
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className={`${btnClass} ${isActive('/')}`}
            style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
          >
            Shorten
          </Link>
          <Link
            to="/dashboard"
            className={`${btnClass} ${isActive('/dashboard')}`}
            style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
          >
            Dashboard
          </Link>

          {!isLoading && (
            <>
              {user ? (
                <button
                  onClick={() => logout()}
                  className={`${btnClass} text-warm-black-50 hover:bg-warm-black hover:text-warm-white`}
                  style={{
                    transitionTimingFunction: 'var(--ease-magnetic)',
                  }}
                >
                  {user.name ?? 'User'}
                </button>
              ) : (
                <button
                  onClick={() => login()}
                  className={`${btnClass} bg-warm-black text-warm-white`}
                  style={{
                    transitionTimingFunction: 'var(--ease-magnetic)',
                  }}
                >
                  ログイン
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Home /> : <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <Routes>
          <Route
            path="/"
            element={<RootRoute />}
          />
          <Route path="/preview/:code" element={<Preview />} />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
