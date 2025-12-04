'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const girisYap = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Giriş başarısız: ' + error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-[#050509] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Arka plan glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-72 w-72 rounded-full bg-[#FFB700]/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-[rgba(10,10,18,0.98)] shadow-[0_22px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl px-7 py-8 md:px-9 md:py-10">
          {/* Logo + başlık */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-2xl border border-[#FFB700]/70 bg-black/90 px-5 py-3 shadow-[0_0_22px_rgba(255,183,0,0.55)] mb-3">
              <span className="text-2xl font-black tracking-tight text-white">
                <span className="text-[#FFB700]">CAR</span>BAY
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-wide">
              Yönetim Paneli Girişi
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Yalnızca yetkili <span className="font-semibold text-[#FFB700]">CARBAY</span> personeli.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={girisYap} className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-[0.16em]">
                E-posta
              </label>
              <input
                type="email"
                required
                className="carbay-input"
                placeholder="patron@carbay.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-[0.16em]">
                Şifre
              </label>
              <input
                type="password"
                required
                className="carbay-input"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="carbay-primary-btn mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Giriş kontrol ediliyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-500">
            Bu alan sadece <span className="font-semibold text-slate-300">yetkili personel</span> içindir.
            <br />
            Tüm giriş denemeleri güvenlik amaçlı kaydedilir.
          </div>
        </div>
      </div>

      {/* Global CARBAY input & buton stilleri */}
      <style jsx global>{`
        .carbay-input {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid rgba(148, 163, 184, 0.55);
          padding: 0.75rem 0.9rem;
          font-size: 0.9rem;
          outline: none;
          background: radial-gradient(circle at 0% 0%, #020617 0%, #020617 60%, #020817 100%);
          color: #ffffff !important;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.8);
          transition:
            border-color 0.16s ease-out,
            box-shadow 0.16s ease-out,
            background 0.16s ease-out,
            transform 0.1s ease-out;
        }

        .carbay-input::placeholder {
          color: #6b7280;
        }

        .carbay-input:focus {
          border-color: #ffb700;
          box-shadow:
            0 0 0 1px rgba(255, 183, 0, 0.85),
            0 14px 32px rgba(0, 0, 0, 0.95);
          background: #020617;
          transform: translateY(-1px);
        }

        .carbay-primary-btn {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid #f59e0b;
          padding: 0.85rem 1rem;
          font-size: 0.95rem;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #ffb700, #facc15, #ffb700);
          color: #000000;
          box-shadow:
            0 0 22px rgba(255, 183, 0, 0.7),
            0 18px 40px rgba(0, 0, 0, 0.95);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition:
            filter 0.12s ease-out,
            transform 0.08s ease-out,
            box-shadow 0.15s ease-out;
        }

        .carbay-primary-btn:hover:not(:disabled) {
          filter: brightness(1.05);
          box-shadow:
            0 0 26px rgba(255, 200, 60, 0.9),
            0 20px 46px rgba(0, 0, 0, 0.98);
        }

        .carbay-primary-btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow:
            0 0 18px rgba(255, 183, 0, 0.7),
            0 12px 30px rgba(0, 0, 0, 0.95);
        }
      `}</style>
    </main>
  )
}
