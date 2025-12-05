'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AracEkle() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)

  // Form Verileri
  const [formData, setFormData] = useState({
    marka: '',
    model: '',
    paket: '',
    yil: '',
    plaka: '',
    kilometre: '',
    renk: '',
    yakit: 'Benzin',
    vites: 'Manuel',
    kasa_tipi: 'Sedan',
    alis_fiyati: '',
    alis_tarihi: '',
    tramer: '',
    notlar: ''
  })

  // Ekspertiz State
  // Default values should match the database schema
  const defaultEkspertiz = {
    kaput: 'Orijinal',
    tavan: 'Orijinal',
    bagaj: 'Orijinal',
    sol_on_camurluk: 'Orijinal',
    sol_on_kapi: 'Orijinal',
    sol_arka_kapi: 'Orijinal',
    sol_arka_camurluk: 'Orijinal',
    sag_on_camurluk: 'Orijinal',
    sag_on_kapi: 'Orijinal',
    sag_arka_kapi: 'Orijinal',
    sag_arka_camurluk: 'Orijinal',
    on_tampon: 'Orijinal',
    arka_tampon: 'Orijinal'
  }

  const [ekspertiz, setEkspertiz] = useState<Record<string, string>>(defaultEkspertiz)

  // Başlangıç Masrafları
  const [masraflar, setMasraflar] = useState({
    noter: '',
    ekspertiz: '',
    bakim: ''
  })

  // Dosya State'leri
  const [resimDosyasi, setResimDosyasi] = useState<File | null>(null)
  const [sozlesmeDosyasi, setSozlesmeDosyasi] = useState<File | null>(null)

  // Resim Yükleme Fonksiyonu
  async function dosyaYukle(dosya: File, klasor: string) {
    const temizIsim = dosya.name.replace(/[^a-zA-Z0-9.-]/g, '')
    const dosyaAdi = `${Date.now()}-${temizIsim}`

    const { data, error } = await supabase.storage
      .from('images')
      .upload(`${klasor}/${dosyaAdi}`, dosya)

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  // Ekspertiz Parça Durumu Değiştirme
  const toggleParca = (parcaKey: string) => {
    setEkspertiz(prev => {
      const current = prev[parcaKey] || 'Orijinal'
      let next = 'Orijinal'

      // Döngü: Orijinal -> Boyalı (Mavi) -> Lokal Boyalı (Sarı) -> Değişen (Kırmızı) -> Orijinal
      if (current === 'Orijinal') next = 'Boyalı'
      else if (current === 'Boyalı') next = 'Lokal Boyalı'
      else if (current === 'Lokal Boyalı') next = 'Değişen'
      else next = 'Orijinal'

      return { ...prev, [parcaKey]: next }
    })
  }

  // Hepsini Orijinal Yap
  const hepsiniOrjinalYap = () => {
    setEkspertiz(defaultEkspertiz)
  }

  // Renk Kodları (Modernize edilmiş palet)
  const getFillColor = (parcaKey: string) => {
    const status = ekspertiz[parcaKey]
    if (status === 'Boyalı') return '#3B82F6'       // Blue-500
    if (status === 'Lokal Boyalı') return '#EAB308' // Yellow-500
    if (status === 'Değişen') return '#EF4444'      // Red-500
    return '#1e293b' // Slate-800 default (for svg darker bg)
  }

  const getStrokeColor = (parcaKey: string) => {
    const status = ekspertiz[parcaKey]
    if (status !== 'Orijinal' && status) return 'white'
    return '#475569' // Slate-600 defaults
  }

  const kaydet = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setYukleniyor(true)

    try {
      let resimUrl = ''
      let sozlesmeUrl = ''

      if (resimDosyasi) {
        resimUrl = await dosyaYukle(resimDosyasi, 'araclar')
      }
      if (sozlesmeDosyasi) {
        sozlesmeUrl = await dosyaYukle(sozlesmeDosyasi, 'sozlesmeler')
      }

      // Ekspertiz Özet Metni
      const bozukParcalar = Object.entries(ekspertiz)
        .filter(([_, v]) => v !== 'Orijinal')

      let ekspertizNotu = ''
      if (bozukParcalar.length > 0) {
        ekspertizNotu = '\n\n[EKSPERTİZ ÖZETİ]:\n' + bozukParcalar
          .map(([k, v]) => `- ${k.toUpperCase().replace(/_/g, ' ')}: ${v}`)
          .join('\n')
      }

      const { data: arac, error } = await supabase.from('cars').insert([
        {
          marka: formData.marka,
          model: formData.model,
          paket: formData.paket,
          yil: Number(formData.yil),
          kilometre: Number(formData.kilometre),
          renk: formData.renk,
          vites: formData.vites,
          yakit: formData.yakit,
          plaka: formData.plaka,
          kasa_tipi: formData.kasa_tipi,
          alis_fiyati: Number(formData.alis_fiyati),
          alis_tarihi: formData.alis_tarihi,
          tramer: formData.tramer ? Number(formData.tramer) : 0,
          notlar: formData.notlar + ekspertizNotu,
          ekspertiz: ekspertiz,
          resim_url: resimUrl,
          sozlesme_url: sozlesmeUrl,
          durum: 'Stokta',
          satis_bedeli: 0
        }
      ]).select().single()

      if (error) throw error

      // Masrafları Ekleme
      if (arac && arac.id) {
        const masrafEkle = async (aciklama: string, tutar: string) => {
          if (!tutar) return
          await supabase.from('expenses').insert([{
            car_id: arac.id,
            aciklama: aciklama,
            tutar: Number(tutar),
            tarih: formData.alis_tarihi || new Date().toISOString()
          }])
        }

        await Promise.all([
          masrafEkle('Noter Masrafı', masraflar.noter),
          masrafEkle('Ekspertiz Ücreti', masraflar.ekspertiz),
          masrafEkle('Kuaför/Bakım', masraflar.bakim)
        ])
      }

      alert('✅ Araç başarıyla eklendi!')
      router.push('/')
    } catch (error: any) {
      console.error('Hata:', error)
      alert('❌ Bir hata oluştu: ' + error.message)
    } finally {
      setYukleniyor(false)
    }
  }

  const inputBase =
    'w-full rounded-xl border !border-yellow-500/40 !bg-[#0A0A0D] !text-[#F5F5F5] ' +
    'p-3 outline-none placeholder:text-slate-500 ' +
    'shadow-inner shadow-black/50 ' +
    'focus:!border-yellow-400 focus:!ring-2 focus:!ring-yellow-500/40 ' +
    'transition duration-200';

  return (
    <main className="min-h-screen bg-[#050509] text-slate-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-[0_18px_45px_rgba(0,0,0,0.9)] overflow-hidden">

          <div className="bg-black/90 px-6 md:px-8 py-5 border-b border-yellow-500/80 flex justify-between items-center gap-4">
            <div>
              <h1 className="section-title gold-text">
                Yeni Araç Girişi
              </h1>
              <p className="text-[11px] md:text-xs text-slate-400 mt-1">
                Stok listesine yeni bir araç ekleyin.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-400/80 px-4 py-2 text-xs md:text-sm font-bold text-yellow-300 bg-black/40 hover:bg-yellow-400 hover:text-black hover:border-yellow-300 transition shadow-[0_0_14px_rgba(250,204,21,0.55)]"
            >
              ← Vazgeç
            </button>
          </div>

          <form onSubmit={kaydet} className="px-6 md:px-8 py-8 space-y-8">

            {/* Bölüm 1: Araç Kimlik Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/30 border border-yellow-500/40 rounded-2xl px-4 md:px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Marka</label>
                <input type="text" required placeholder="Örn: BMW" className={inputBase} onChange={e => setFormData(prev => ({ ...prev, marka: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Model</label>
                <input type="text" required placeholder="Örn: 3.20i" className={inputBase} onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Donanım Paketi</label>
                <input type="text" placeholder="Örn: M Sport" className={inputBase} onChange={e => setFormData({ ...formData, paket: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Yıl</label>
                <input type="number" required placeholder="2023" className={inputBase} onChange={e => setFormData(prev => ({ ...prev, yil: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Plaka</label>
                <input type="text" required placeholder="34 ABC 34" className={inputBase + ' uppercase'} onChange={e => setFormData(prev => ({ ...prev, plaka: e.target.value }))} />
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />

            {/* Bölüm 2.5: GÖRSEL EKSPERTİZ SEÇİCİ */}
            <div className="bg-black/30 border border-yellow-500/40 rounded-2xl p-6 shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
              <div className="flex flex-col md:flex-row gap-8 items-center">

                {/* Sol: Modern Şema */}
                <div className="flex-1 relative w-full flex justify-center py-4">
                  <div className="relative w-[220px] h-[380px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                    {/* Araba SVG (Modernize Edilmiş) */}
                    <svg width="220" height="380" viewBox="0 0 220 380" className="w-full h-full">
                      {/* Gövde Arka Plan (Lastikler ve Gölge) */}
                      <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Lastikler */}
                      <rect x="10" y="70" width="12" height="45" rx="4" fill="#0f172a" />
                      <rect x="198" y="70" width="12" height="45" rx="4" fill="#0f172a" />
                      <rect x="10" y="270" width="12" height="45" rx="4" fill="#0f172a" />
                      <rect x="198" y="270" width="12" height="45" rx="4" fill="#0f172a" />

                      {/* Gövde Parçaları */}
                      {/* Ön Tampon */}
                      <path
                        onClick={() => toggleParca('on_tampon')}
                        d="M40 20 Q110 0 180 20 L180 40 L40 40 Z"
                        fill={getFillColor('on_tampon')}
                        stroke={getStrokeColor('on_tampon')} strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition hover:filter hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                      />

                      {/* Kaput */}
                      <path
                        onClick={() => toggleParca('kaput')}
                        d="M40 40 L180 40 L170 110 Q110 120 50 110 Z"
                        fill={getFillColor('kaput')}
                        stroke={getStrokeColor('kaput')} strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition hover:filter hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                      />

                      {/* Ön Cam (Dekoratif) */}
                      <path d="M50 110 Q110 120 170 110 L165 140 Q110 145 55 140 Z" fill="#334155" opacity="0.6" stroke="none" />

                      {/* Tavan */}
                      <path
                        onClick={() => toggleParca('tavan')}
                        d="M55 140 L165 140 L165 230 L55 230 Z"
                        fill={getFillColor('tavan')}
                        stroke={getStrokeColor('tavan')} strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition hover:filter hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                      />

                      {/* Arka Cam (Dekoratif) */}
                      <path d="M55 230 L165 230 L170 260 Q110 265 50 260 Z" fill="#334155" opacity="0.6" stroke="none" />

                      {/* Bagaj */}
                      <path
                        onClick={() => toggleParca('bagaj')}
                        d="M50 260 Q110 265 170 260 L180 320 L40 320 Z"
                        fill={getFillColor('bagaj')}
                        stroke={getStrokeColor('bagaj')} strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition hover:filter hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                      />

                      {/* Arka Tampon */}
                      <path
                        onClick={() => toggleParca('arka_tampon')}
                        d="M40 320 L180 320 L180 340 Q110 360 40 340 Z"
                        fill={getFillColor('arka_tampon')}
                        stroke={getStrokeColor('arka_tampon')} strokeWidth="1.5"
                        className="cursor-pointer hover:opacity-80 transition hover:filter hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                      />

                      {/* Yan Parçalar */}
                      <path onClick={() => toggleParca('sol_on_camurluk')} d="M20 40 L40 40 L50 110 L20 110 Z" fill={getFillColor('sol_on_camurluk')} stroke={getStrokeColor('sol_on_camurluk')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />
                      <path onClick={() => toggleParca('sag_on_camurluk')} d="M180 40 L200 40 L200 110 L170 110 Z" fill={getFillColor('sag_on_camurluk')} stroke={getStrokeColor('sag_on_camurluk')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />

                      <path onClick={() => toggleParca('sol_on_kapi')} d="M20 110 L55 140 L55 200 L20 200 Z" fill={getFillColor('sol_on_kapi')} stroke={getStrokeColor('sol_on_kapi')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />
                      <path onClick={() => toggleParca('sag_on_kapi')} d="M200 110 L165 140 L165 200 L200 200 Z" fill={getFillColor('sag_on_kapi')} stroke={getStrokeColor('sag_on_kapi')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />

                      <path onClick={() => toggleParca('sol_arka_kapi')} d="M20 200 L55 200 L55 230 L20 250 Z" fill={getFillColor('sol_arka_kapi')} stroke={getStrokeColor('sol_arka_kapi')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />
                      <path onClick={() => toggleParca('sag_arka_kapi')} d="M200 200 L165 200 L165 230 L200 250 Z" fill={getFillColor('sag_arka_kapi')} stroke={getStrokeColor('sag_arka_kapi')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />

                      <path onClick={() => toggleParca('sol_arka_camurluk')} d="M20 250 L50 260 L40 320 L20 320 Z" fill={getFillColor('sol_arka_camurluk')} stroke={getStrokeColor('sol_arka_camurluk')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />
                      <path onClick={() => toggleParca('sag_arka_camurluk')} d="M200 250 L170 260 L180 320 L200 320 Z" fill={getFillColor('sag_arka_camurluk')} stroke={getStrokeColor('sag_arka_camurluk')} strokeWidth="1.5" className="cursor-pointer hover:opacity-80 transition" />

                    </svg>
                  </div>
                </div>

                {/* Sağ: Bilgi & Lejant */}
                <div className="flex-1 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-slate-100 mb-2">Görsel Ekspertiz</h3>
                      <p className="text-sm text-slate-400">Şema üzerinden parçalara tıklayarak durumu değiştirin.</p>
                    </div>

                    <button
                      type="button"
                      onClick={hepsiniOrjinalYap}
                      className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-xs font-semibold hover:bg-slate-700 hover:text-white transition"
                    >
                      ↺ Sıfırla
                    </button>
                  </div>

                  <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-slate-800 border border-slate-600"></div>
                      <span className="text-sm text-slate-300">Orijinal (Temiz)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-blue-500 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                      <span className="text-sm text-blue-200 font-bold">Boyalı</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-yellow-500 border border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                      <span className="text-sm text-yellow-200 font-bold">Lokal Boyalı</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-red-500 border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                      <span className="text-sm text-red-200 font-bold">Değişen</span>
                    </div>
                  </div>

                  {Object.entries(ekspertiz).some(([_, v]) => v !== 'Orijinal') && (
                    <div className="p-4 bg-slate-900 border border-white/10 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Seçilen Kusurlar</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(ekspertiz).filter(([_, v]) => v !== 'Orijinal').map(([part, status]) => (
                          <span key={part} className={`px-2 py-1 rounded text-xs font-bold 
                                 ${status === 'Boyalı' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              status === 'Lokal Boyalı' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {part.replace(/_/g, ' ').toUpperCase()}: {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bölüm 3: Finansal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/30 border border-yellow-500/40 rounded-2xl px-4 md:px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-[0.12em]">Alış Fiyatı (TL)</label>
                <input type="number" required className={inputBase + ' font-bold text-lg'} onChange={e => setFormData(prev => ({ ...prev, alis_fiyati: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-[0.12em]">Alış Tarihi</label>
                <input type="date" required className={inputBase} onChange={e => setFormData(prev => ({ ...prev, alis_tarihi: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-[0.12em]">Tramer (TL)</label>
                <input type="number" placeholder="0" className={inputBase} onChange={e => setFormData(prev => ({ ...prev, tramer: e.target.value }))} />
              </div>

              <div className="md:col-span-3 mt-4 pt-4 border-t border-white/10">
                <label className="block text-xs font-bold text-yellow-500 mb-3 uppercase tracking-wide">⚡ Hızlı Masraf Girişi (Opsiyonel)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Noter Ücreti</label>
                    <input type="number" placeholder="Örn: 5000" className={inputBase + ' h-10 py-2'} value={masraflar.noter} onChange={e => setMasraflar({ ...masraflar, noter: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Ekspertiz Ücreti</label>
                    <input type="number" placeholder="Örn: 3000" className={inputBase + ' h-10 py-2'} value={masraflar.ekspertiz} onChange={e => setMasraflar({ ...masraflar, ekspertiz: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Bakım/Kuaför</label>
                    <input type="number" placeholder="Örn: 2000" className={inputBase + ' h-10 py-2'} value={masraflar.bakim} onChange={e => setMasraflar({ ...masraflar, bakim: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bölüm 4: Dosya */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/40 px-6 py-7 text-center hover:border-yellow-400 hover:bg-black/50 transition">
                <span className="text-3xl mb-2 inline-block">📸</span>
                <div className="text-sm font-semibold text-slate-100">Araç Fotoğrafı</div>
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setResimDosyasi(e.target.files ? e.target.files[0] : null)} />
                <div className="mt-2 text-[11px] text-yellow-300 font-semibold truncate">{resimDosyasi ? resimDosyasi.name : ''}</div>
              </div>
              <div className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/40 px-6 py-7 text-center hover:border-orange-400 hover:bg-black/50 transition">
                <span className="text-3xl mb-2 inline-block">📄</span>
                <div className="text-sm font-semibold text-slate-100">Alış Sözleşmesi</div>
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setSozlesmeDosyasi(e.target.files ? e.target.files[0] : null)} />
                <div className="mt-2 text-[11px] text-orange-300 font-semibold truncate">{sozlesmeDosyasi ? sozlesmeDosyasi.name : ''}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Notlar</label>
              <textarea rows={3} className={inputBase + ' resize-y min-h-[96px] bg-slate-900/80 leading-relaxed'} onChange={e => setFormData(prev => ({ ...prev, notlar: e.target.value }))} />
            </div>

            <button type="submit" disabled={yukleniyor} className={'w-full py-4 px-6 rounded-xl font-black text-lg border-b-4 transition transform active:scale-95 ' + (yukleniyor ? 'bg-slate-500/70 border-slate-700 cursor-not-allowed' : 'bg-[#FFB700] border-yellow-700 text-black shadow-lg hover:bg-yellow-400')}>
              {yukleniyor ? 'KAYDEDİLİYOR...' : 'ARACI SİSTEME KAYDET'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
