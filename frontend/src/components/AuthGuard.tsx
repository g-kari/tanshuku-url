import { useAuth } from '../contexts/AuthContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm tracking-wide text-warm-black-50">
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6">
        <p className="text-sm tracking-wide text-warm-black-50">
          ログインが必要です
        </p>
        <button
          onClick={() => login()}
          className="interactive-scale rounded-xl border border-warm-black bg-warm-black px-8 py-3 text-sm font-bold tracking-widest text-warm-white shadow-sm hover:shadow-lg transition-all duration-400"
          style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
        >
          ログイン
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
