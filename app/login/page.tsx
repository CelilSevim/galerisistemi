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
      // Başarılıysa ana sayfaya yolla
      router.push('/')
      router.refresh() // Sayfayı yenile ki giriş yaptığını anlasın
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 text-white p-3 rounded-xl font-bold text-2xl mb-2">CM</div>
          <h1 className="text-2xl font-bold text-gray-800">Carbay Motors</h1>
          <p className="text-gray-500 text-sm">Yönetim Paneli Girişi</p>
        </div>

        <form onSubmit={girisYap} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input 
              type="email" 
              required
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="patron@carbay.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input 
              type="password" 
              required
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition active:scale-95 disabled:opacity-50">
            {loading ? 'Kontrol Ediliyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          Bu alan sadece yetkili personel içindir.
        </div>
      </div>
    </div>
  )
}