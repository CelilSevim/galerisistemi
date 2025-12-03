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

      const { error } = await supabase.from('cars').insert([
        {
          marka: formData.marka,
          model: formData.model,
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
          notlar: formData.notlar,
          resim_url: resimUrl,
          sozlesme_url: sozlesmeUrl,
          durum: 'Stokta',
          satis_bedeli: 0
        }
      ])

      if (error) throw error
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
        {/* Cam panel */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-[0_18px_45px_rgba(0,0,0,0.9)] overflow-hidden">

          {/* Başlık şeridi */}
          <div className="bg-black/90 px-6 md:px-8 py-5 border-b border-yellow-500/80 flex justify-between items-center gap-4">
            <div>
              {/* küçük üst etiket */}
              

              {/* ANA BAŞLIK – CARBAY STİLİ */}
              <h1 className="section-title gold-text">
                Yeni Araç Girişi
              </h1>
              
              {/* AÇIKLAMA */}
              <p className="text-[11px] md:text-xs text-slate-400 mt-1">
                Stok listesine yeni bir araç ekleyin.
              </p>
            </div>

            {/* sağdaki buton – stilini de hafif Carbay yaptık */}
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-400/80 px-4 py-2 text-xs md:text-sm font-bold text-yellow-300 bg-black/40 hover:bg-yellow-400 hover:text-black hover:border-yellow-300 transition shadow-[0_0_14px_rgba(250,204,21,0.55)]"
            >
              ← Vazgeç
            </button>
          </div>


          {/* Form */}
          <form onSubmit={kaydet} className="px-6 md:px-8 py-8 space-y-8">

            {/* Bölüm 1: Araç Kimlik Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/30 border border-yellow-500/40 rounded-2xl px-4 md:px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.8)]grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Marka
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: BMW"
                  className={inputBase}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, marka: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Model
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 3.20i"
                  className={inputBase}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, model: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Yıl
                </label>
                <input
                  type="number"
                  required
                  placeholder="2023"
                  className={inputBase}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, yil: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Plaka
                </label>
                <input
                  type="text"
                  required
                  placeholder="34 ABC 34"
                  className={inputBase + ' uppercase'}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, plaka: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Bölüm çizgisi */}
            <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />

            {/* Bölüm 2: Teknik Detaylar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/30 border border-yellow-500/40 rounded-2xl px-4 md:px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
              <div>
              

                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Kilometre
                </label>
                <input
                  type="number"
                  required
                  className={inputBase}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      kilometre: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Renk
                </label>
                <input
                  type="text"
                  required
                  placeholder="Beyaz"
                  className={inputBase}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, renk: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Yakıt
                </label>
                <select
                  className={inputBase + ' pr-8'}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, yakit: e.target.value }))
                  }
                >
                  <option>Benzin</option>
                  <option>Dizel</option>
                  <option>Hibrit</option>
                  <option>Elektrik</option>
                  <option>LPG</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                  Vites
                </label>
                <select
                  className={inputBase + ' pr-8'}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, vites: e.target.value }))
                  }
                >
                  <option>Manuel</option>
                  <option>Otomatik</option>
                  <option>Yarı Otomatik</option>
                </select>
              </div>
            </div>

            {/* Bölüm 3: Finansal Bilgiler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/30 border border-yellow-500/40 rounded-2xl px-4 md:px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-[0.12em]">
                  Alış Fiyatı (TL)
                </label>
                <input
                  type="number"
                  required
                  className={inputBase + ' font-bold text-lg'}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      alis_fiyati: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-[0.12em]">
                  Alış Tarihi
                </label>
                <input
                  type="date"
                  required
                  className={inputBase}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      alis_tarihi: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-[0.12em]">
                  Tramer (TL)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className={inputBase}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, tramer: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Bölüm 4: Dosya Yükleme */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Araç fotoğrafı */}
              <div className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/40 px-6 py-7 text-center hover:border-yellow-400 hover:bg-black/50 transition">
                <span className="text-3xl mb-2 inline-block group-hover:scale-110 group-hover:text-yellow-300 transition">
                  📸
                </span>
                <div className="text-sm font-semibold text-slate-100">
                  Araç Fotoğrafı
                </div>
                <p className="text-xs text-slate-400">
                  Yüklemek için tıklayın
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e =>
                    setResimDosyasi(
                      e.target.files ? e.target.files[0] : null
                    )
                  }
                />
                <div className="mt-2 text-[11px] text-yellow-300 font-semibold truncate">
                  {resimDosyasi ? resimDosyasi.name : ''}
                </div>
              </div>

              {/* Alış sözleşmesi */}
              <div className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/40 px-6 py-7 text-center hover:border-orange-400 hover:bg-black/50 transition">
                <span className="text-3xl mb-2 inline-block group-hover:scale-110 group-hover:text-orange-300 transition">
                  📄
                </span>
                <div className="text-sm font-semibold text-slate-100">
                  Alış Sözleşmesi
                </div>
                <p className="text-xs text-slate-400">
                  Yüklemek için tıklayın
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e =>
                    setSozlesmeDosyasi(
                      e.target.files ? e.target.files[0] : null
                    )
                  }
                />
                <div className="mt-2 text-[11px] text-orange-300 font-semibold truncate">
                  {sozlesmeDosyasi ? sozlesmeDosyasi.name : ''}
                </div>
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wide">
                Notlar
              </label>
              <textarea
                rows={3}
                className={
                  inputBase +
                  ' resize-y min-h-[96px] bg-slate-900/80 leading-relaxed'
                }
                onChange={e =>
                  setFormData(prev => ({ ...prev, notlar: e.target.value }))
                }
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={yukleniyor}
              className={
                'w-full py-4 px-6 rounded-xl font-black text-lg ' +
                'border-b-4 transition transform active:scale-95 ' +
                (yukleniyor
                  ? 'bg-slate-500/70 border-slate-700 cursor-not-allowed text-slate-100'
                  : 'bg-[#FFB700] border-yellow-700 text-black shadow-[0_0_18px_rgba(250,204,21,0.6),0_16px_40px_rgba(0,0,0,0.9)] hover:bg-yellow-400')
              }
            >
              {yukleniyor ? 'KAYDEDİLİYOR...' : 'ARACI SİSTEME KAYDET'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
