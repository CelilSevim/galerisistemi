'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function AracDuzenle() {
  const router = useRouter()
  const params = useParams()
  const id = params.id

  const [yukleniyor, setYukleniyor] = useState(false)
  const [masraflar, setMasraflar] = useState<any[]>([])
  const [yeniMasraf, setYeniMasraf] = useState({ aciklama: '', tutar: '', tarih: '' })

  const [formData, setFormData] = useState<any>({
    marka: '', model: '', yil: '', plaka: '', kilometre: '',
    renk: '', yakit: 'Benzin', vites: 'Manuel', kasa_tipi: 'Sedan',
    alis_fiyati: '', alis_tarihi: '', tramer: '', notlar: '',
    resim_url: '', sozlesme_url: ''
  })

  // --- EKSPERTİZ STATE ---
  const [ekspertiz, setEkspertiz] = useState<any>({
    kaput: 'Orijinal', tavan: 'Orijinal', bagaj: 'Orijinal',
    sol_on_camurluk: 'Orijinal', sol_on_kapi: 'Orijinal', sol_arka_kapi: 'Orijinal', sol_arka_camurluk: 'Orijinal',
    sag_on_camurluk: 'Orijinal', sag_on_kapi: 'Orijinal', sag_arka_kapi: 'Orijinal', sag_arka_camurluk: 'Orijinal',
    on_tampon: 'Orijinal', arka_tampon: 'Orijinal'
  })

  const [yeniResim, setYeniResim] = useState<File | null>(null)

  const parcalar = [
    { key: 'kaput', label: 'Kaput' },
    { key: 'tavan', label: 'Tavan' },
    { key: 'bagaj', label: 'Bagaj' },
    { key: 'sol_on_camurluk', label: 'Sol Ön Çamurluk' },
    { key: 'sol_on_kapi', label: 'Sol Ön Kapı' },
    { key: 'sol_arka_kapi', label: 'Sol Arka Kapı' },
    { key: 'sol_arka_camurluk', label: 'Sol Arka Çamurluk' },
    { key: 'sag_on_camurluk', label: 'Sağ Ön Çamurluk' },
    { key: 'sag_on_kapi', label: 'Sağ Ön Kapı' },
    { key: 'sag_arka_kapi', label: 'Sağ Arka Kapı' },
    { key: 'sag_arka_camurluk', label: 'Sağ Arka Çamurluk' },
  ]

  const durumlar = ['Orijinal', 'Boyalı', 'Lokal Boyalı', 'Değişen', 'Plastik']

  useEffect(() => {
    async function verileriGetir() {
      const { data: aracData, error: aracError } = await supabase
        .from('cars').select('*').eq('id', id).single()

      if (aracError) {
        alert('Araç bulunamadı!')
        router.push('/')
      } else {
        setFormData(aracData)
        if (aracData.ekspertiz) setEkspertiz(aracData.ekspertiz)
      }
      masraflariYenile()
    }
    if (id) verileriGetir()
  }, [id, router])

  async function masraflariYenile() {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('car_id', id)
      .order('tarih', { ascending: false })

    setMasraflar(data || [])
  }

  async function dosyaYukle(dosya: File) {
    const dosyaAdi = `${Date.now()}-${dosya.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const { data, error } = await supabase.storage.from('images').upload(`araclar/${dosyaAdi}`, dosya)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  const guncelle = async (e: React.FormEvent) => {
    e.preventDefault()
    setYukleniyor(true)
    try {
      let guncelResimUrl = formData.resim_url
      if (yeniResim) guncelResimUrl = await dosyaYukle(yeniResim)

      const { error } = await supabase
        .from('cars')
        .update({
          ...formData,
          yil: Number(formData.yil),
          kilometre: Number(formData.kilometre),
          alis_fiyati: Number(formData.alis_fiyati),
          tramer: Number(formData.tramer || 0),
          resim_url: guncelResimUrl,
          ekspertiz: ekspertiz
        })
        .eq('id', id)

      if (error) throw error
      alert('✅ Güncelleme Başarılı!')
      router.push('/')

    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setYukleniyor(false)
    }
  }

  const masrafEkle = async () => {
    if (!yeniMasraf.aciklama || !yeniMasraf.tutar) return alert('Alanları doldurun!')
    const { error } = await supabase.from('expenses').insert([{
      car_id: id,
      aciklama: yeniMasraf.aciklama,
      tutar: Number(yeniMasraf.tutar),
      tarih: yeniMasraf.tarih || new Date().toISOString()
    }])
    if (error) alert('Hata: ' + error.message)
    else {
      setYeniMasraf({ aciklama: '', tutar: '', tarih: '' })
      masraflariYenile()
    }
  }

  const masrafSil = async (masrafId: number) => {
    if (!confirm('Silmek istiyor musunuz?')) return
    await supabase.from('expenses').delete().eq('id', masrafId)
    masraflariYenile()
  }

  const hepsiniOrjinalYap = () => {
    const yeniEkspertiz: any = {}
    parcalar.forEach(p => yeniEkspertiz[p.key] = 'Orijinal')
    setEkspertiz(yeniEkspertiz)
  }

  const renkKoduAl = (durum: string) => {
    if (durum === 'Boyalı') return '#3B82F6'
    if (durum === 'Lokal Boyalı') return '#FACC15'
    if (durum === 'Değişen') return '#EF4444'
    if (durum === 'Orijinal') return '#22C55E'
    return '#E5E7EB'
  }

  const renkClassAl = (durum: string) => {
    if (durum === 'Boyalı') return 'bg-blue-900/40 text-blue-100 border-blue-400/60'
    if (durum === 'Lokal Boyalı') return 'bg-yellow-900/30 text-yellow-100 border-yellow-400/70'
    if (durum === 'Değişen') return 'bg-red-900/40 text-red-100 border-red-400/70'
    if (durum === 'Orijinal') return 'bg-emerald-900/30 text-emerald-100 border-emerald-400/60'
    return 'bg-slate-900/40 text-slate-100 border-slate-600/60'
  }

  const toplamMasraf = masraflar.reduce((acc, item) => acc + (item.tutar || 0), 0)

  if (!formData.marka) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050509] text-gray-100">
        Yükleniyor...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#050509] px-4 md:px-8 py-8 pb-32 flex justify-center">
      <div className="max-w-6xl w-full rounded-2xl border border-white/10 bg-[rgba(15,15,20,0.96)] shadow-[0_18px_45px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden">
        {/* HEADER */}
        <div className="px-6 md:px-8 py-5 bg-gradient-to-r from-black via-slate-950 to-black border-b border-yellow-500/80 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] tracking-[0.3em] uppercase text-slate-400 font-semibold">
              Araç Yönetimi
            </div>
            <h1 className="section-title gold-text">
              <span>Düzenle &amp; Ekspertiz</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              {formData.marka} {formData.model} • {formData.plaka}
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-400/90 bg-black/70 px-4 py-2 text-xs md:text-sm font-semibold text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.3)] hover:bg-yellow-400 hover:text-black hover:border-yellow-300 transition"
          >
            <span className="text-base">←</span>
            Garaja Dön
          </button>
        </div>

        <div className="px-6 md:px-8 py-6 md:py-8 text-gray-100">
          {/* ÜST: ARAÇ BİLGİLERİ + MASRAFLAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Araç Bilgileri */}
            <div className="lg:col-span-2 bg-slate-950/60 rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.7)] p-5 md:p-6">
              <h1 className="text-3xl font-extrabold text-[#FFB700] mb-4">
                ARAÇ BİLGİLERİ
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Marka</label>
                  <input
                    type="text"
                    value={formData.marka}
                    onChange={e => setFormData({ ...formData, marka: e.target.value })}
                    className="carbay-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="carbay-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Yıl</label>
                  <input
                    type="number"
                    value={formData.yil}
                    onChange={e => setFormData({ ...formData, yil: e.target.value })}
                    className="carbay-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Plaka</label>
                  <input
                    type="text"
                    value={formData.plaka}
                    onChange={e => setFormData({ ...formData, plaka: e.target.value })}
                    className="carbay-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Kilometre</label>
                  <input
                    type="number"
                    value={formData.kilometre}
                    onChange={e => setFormData({ ...formData, kilometre: e.target.value })}
                    className="carbay-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">Alış Fiyatı (TL)</label>
                  <input
                    type="number"
                    value={formData.alis_fiyati}
                    onChange={e => setFormData({ ...formData, alis_fiyati: e.target.value })}
                    className="carbay-input"
                  />
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-700/80 rounded-xl bg-slate-900/60 px-4 py-3 text-center hover:border-[#FFB700] hover:bg-slate-900 transition cursor-pointer relative">
                <p className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-center gap-1">
                  <span>📸</span> Fotoğrafı Değiştir
                </p>
                <p className="text-[11px] text-slate-500">
                  Yeni bir fotoğraf seçerek mevcut görüntüyü güncelleyebilirsiniz.
                </p>
                <input
                  type="file"
                  onChange={e => setYeniResim(e.target.files ? e.target.files[0] : null)}
                  className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Masraflar */}
            <div className="bg-slate-950/70 rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-5 flex flex-col">
              <h3 className="text-3xl font-extrabold text-[#FFB700] mb-4 flex flex-col items-start gap-1">
                <span>MASRAFLAR</span>
                <span className="text-[12px] text-slate-300 font-semibold tracking-wide">
                  Aracın Toplam Masrafı
                </span>
                <span className="inline-flex items-center rounded-full bg-red-900/50 px-3 py-1 text-[16px] font-bold text-red-200 border border-red-500/60">
                  {toplamMasraf.toLocaleString('tr-TR')} ₺
                </span>
              </h3>


              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                    Açıklama
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Lastik, bakım..."
                    value={yeniMasraf.aciklama}
                    onChange={e => setYeniMasraf({ ...yeniMasraf, aciklama: e.target.value })}
                    className="carbay-input"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                      Tutar
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={yeniMasraf.tutar}
                      onChange={e => setYeniMasraf({ ...yeniMasraf, tutar: e.target.value })}
                      className="carbay-input"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={masrafEkle}
                      className="h-[38px] rounded-lg bg-[#FFB700] px-4 text-lg font-black text-black shadow-[0_0_18px_rgba(250,204,21,0.7)] hover:bg-yellow-400 active:translate-y-[1px] transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-40 pr-1">
                {masraflar.map((masraf) => (
                  <div
                    key={masraf.id}
                    className="bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-[11px] flex justify-between items-center group"
                  >
                    <span className="font-medium text-slate-100 truncate">{masraf.aciklama}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-300 whitespace-nowrap">
                        -{masraf.tutar}₺
                      </span>
                      <button
                        onClick={() => masrafSil(masraf.id)}
                        className="rounded-full px-1 text-slate-500 hover:text-red-400 hover:bg-red-900/40 transition"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {masraflar.length === 0 && (
                  <div className="text-[11px] text-slate-500 text-center py-4 border border-dashed border-slate-700/70 rounded-lg">
                    Bu araca kayıtlı masraf bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ALT: EKSPERTİZ + GÖRSEL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ekspertiz listesi */}
            <div className="bg-slate-950/70 rounded-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.85)] p-5 md:p-6">
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
                <h3 className="text-xl font-extrabold text-[#FFB700]">
                  EKSPERTİZ RAPORU
                </h3>
                <button
                  type="button"
                  onClick={hepsiniOrjinalYap}
                  className="rounded-full bg-emerald-900/40 px-3 py-1 text-[11px] font-semibold text-emerald-200 border border-emerald-500/70 hover:bg-emerald-700/60 transition"
                >
                  Hepsini Orijinal Yap
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {parcalar.map((parca) => (
                  <div
                    key={parca.key}
                    className={`flex justify-between items-center px-3 py-2 rounded-lg border text-xs md:text-[13px] ${renkClassAl(
                      ekspertiz[parca.key]
                    )} transition-colors`}
                  >
                    <span className="font-medium">{parca.label}</span>
                    <select
                      value={ekspertiz[parca.key] || ''}
                      onChange={(e) => setEkspertiz({ ...ekspertiz, [parca.key]: e.target.value })}
                      className="eks-select"
                    >

                      <option value="">Seçiniz...</option>
                      {durumlar.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Görsel araç */}
            <div className="bg-slate-950/70 rounded-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.85)] p-5 md:p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <h3 className="absolute top-4 left-5 text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
                Görsel Durum
              </h3>

              <div className="mt-4">
                <svg
                  width="220"
                  height="380"
                  viewBox="0 0 220 380"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]"
                >
                  {/* Tekerlekler */}
                  <rect x="10" y="70" width="10" height="40" rx="2" fill="#020617" />
                  <rect x="200" y="70" width="10" height="40" rx="2" fill="#020617" />
                  <rect x="10" y="270" width="10" height="40" rx="2" fill="#020617" />
                  <rect x="200" y="270" width="10" height="40" rx="2" fill="#020617" />

                  {/* Ön Tampon */}
                  <path
                    d="M40 20 Q110 0 180 20 L180 40 L40 40 Z"
                    fill={renkKoduAl(ekspertiz.on_tampon)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Kaput */}
                  <path
                    d="M40 40 L180 40 L170 110 Q110 120 50 110 Z"
                    fill={renkKoduAl(ekspertiz.kaput)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Ön Cam */}
                  <path
                    d="M50 110 Q110 120 170 110 L165 140 Q110 145 55 140 Z"
                    fill="#9CA3AF"
                    opacity="0.55"
                    stroke="#f9fafb"
                    strokeWidth="1"
                  />

                  {/* Tavan */}
                  <path
                    d="M55 140 L165 140 L165 230 L55 230 Z"
                    fill={renkKoduAl(ekspertiz.tavan)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Arka Cam */}
                  <path
                    d="M55 230 L165 230 L170 260 Q110 265 50 260 Z"
                    fill="#9CA3AF"
                    opacity="0.55"
                    stroke="#f9fafb"
                    strokeWidth="1"
                  />

                  {/* Bagaj */}
                  <path
                    d="M50 260 Q110 265 170 260 L180 320 L40 320 Z"
                    fill={renkKoduAl(ekspertiz.bagaj)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Arka Tampon */}
                  <path
                    d="M40 320 L180 320 L180 340 Q110 360 40 340 Z"
                    fill={renkKoduAl(ekspertiz.arka_tampon)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Sol Ön Çamurluk */}
                  <path
                    d="M20 40 L40 40 L50 110 L20 110 Z"
                    fill={renkKoduAl(ekspertiz.sol_on_camurluk)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />
                  {/* Sağ Ön Çamurluk */}
                  <path
                    d="M180 40 L200 40 L200 110 L170 110 Z"
                    fill={renkKoduAl(ekspertiz.sag_on_camurluk)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Sol Ön Kapı */}
                  <path
                    d="M20 110 L55 140 L55 200 L20 200 Z"
                    fill={renkKoduAl(ekspertiz.sol_on_kapi)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />
                  {/* Sağ Ön Kapı */}
                  <path
                    d="M200 110 L165 140 L165 200 L200 200 Z"
                    fill={renkKoduAl(ekspertiz.sag_on_kapi)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Sol Arka Kapı */}
                  <path
                    d="M20 200 L55 200 L55 230 L20 250 Z"
                    fill={renkKoduAl(ekspertiz.sol_arka_kapi)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />
                  {/* Sağ Arka Kapı */}
                  <path
                    d="M200 200 L165 200 L165 230 L200 250 Z"
                    fill={renkKoduAl(ekspertiz.sag_arka_kapi)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />

                  {/* Sol Arka Çamurluk */}
                  <path
                    d="M20 250 L50 260 L40 320 L20 320 Z"
                    fill={renkKoduAl(ekspertiz.sol_arka_camurluk)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />
                  {/* Sağ Arka Çamurluk */}
                  <path
                    d="M200 250 L170 260 L180 320 L200 320 Z"
                    fill={renkKoduAl(ekspertiz.sag_arka_camurluk)}
                    stroke="#f9fafb"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4 text-[11px] font-semibold text-slate-200 bg-slate-900/80 px-4 py-3 rounded-lg border border-white/10">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" /> Orijinal
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-blue-500" /> Boyalı
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-yellow-400" /> Lokal
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-red-500" /> Değişen
                </span>
              </div>
            </div>
          </div>

          {/* KAYDET BUTONU */}
          <div className="mt-10 text-center">
            <button
              onClick={guncelle}
              disabled={yukleniyor}
              className="inline-flex w-full md:w-1/2 items-center justify-center rounded-2xl border border-yellow-600 bg-gradient-to-r from-[#FFB700] via-amber-400 to-yellow-500 px-6 py-4 text-lg font-black tracking-wide text-black shadow-[0_0_24px_rgba(250,204,21,0.9)] hover:brightness-105 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {yukleniyor ? 'KAYDEDİLİYOR...' : 'KAYDET VE ÇIK'}
            </button>
          </div>
        </div>
      </div>

      {/* GLOBAL STYLES: INPUT + EKS SELECT */}
     <style jsx global>{`
  /* CARBAY INPUTLAR */
  .carbay-input {
    width: 100%;
    border-radius: 0.9rem;
    border: 1px solid rgba(148, 163, 184, 0.45);
    padding: 0.7rem 0.9rem;
    font-size: 0.9rem;
    outline: none;
    background: rgba(8, 8, 12, 0.98);
    color: #ffffff !important;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55);
    transition:
      border-color 0.16s ease-out,
      box-shadow 0.16s ease-out,
      background 0.16s ease-out,
      transform 0.12s ease-out;
  }

  .carbay-input::placeholder {
    color: #6b7280;
  }

  .carbay-input:focus {
    border-color: #facc15;
    box-shadow:
      0 0 0 1px rgba(250, 204, 21, 0.7),
      0 12px 28px rgba(15, 23, 42, 0.9);
    background: #020617;
    transform: translateY(-1px);
  }

  /* EKSPERTİZ SELECT (KAPALI HAL) */
  .eks-select {
    min-width: 8.5rem;
  height: 38px;
  padding: 0 1.8rem 0 0.9rem;
  border-radius: 9999px;

  /* SABİT KALIN SARI ÇERÇEVEYİ KALDIRDIK  */
  border: 1px solid rgba(148, 163, 184, 0.45);

  background: radial-gradient(circle at 20% 0%, #020617 0%, #020617 70%);
  color: #f9fafb !important;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  line-height: 38px;
  cursor: pointer;

  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55);
  transition:
    border-color 0.16s ease-out,
    box-shadow 0.16s ease-out,
    background 0.16s ease-out,
    transform 0.12s ease-out;

  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  }

  /* Eski IE okunu gizle (tamamlayıcı) */
  .eks-select::-ms-expand {
    display: none;
  }

  .eks-select:hover {
    border-color: #ffb700;
  background: radial-gradient(circle at top, #020617, #000) !important;
  transform: translateY(-1px);
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.95),
    0 0 12px rgba(255, 183, 0, 0.35);
  }

  .eks-select:focus {
    border-color: #ffb700;
  box-shadow:
    0 0 0 1px rgba(255, 183, 0, 0.8),
    0 12px 28px rgba(0, 0, 0, 0.95);
  }

  /* DROPDOWN İÇİ (AÇILMIŞ MENÜ) */
  .eks-select option {
    background-color: #050509 !important;
  color: #f9fafb !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  padding: 10px !important;
  text-align: center !important;
  }

  /* Seçili satırın görünümü (açık menüde) */
  .eks-select option:checked {
    background-color: #ffb700 !important;
  color: #000 !important;
  }

  /* Bazı tarayıcılarda hover desteği sınırlı ama zarar vermez */
  .eks-select:hover option:hover {
    background-color: #ffb700 !important;
    color: #000 !important;
  }
`}</style>

    </main>
  )
}
