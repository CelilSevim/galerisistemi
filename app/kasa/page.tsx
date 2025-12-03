'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function KasaSayfasi() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hareketler, setHareketler] = useState<any[]>([])
  const [secilenAy, setSecilenAy] = useState<string>('Hepsi')

  const [yeniIslem, setYeniIslem] = useState({
    aciklama: '',
    tutar: '',
    tur: 'Gider',
    tarih: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    verileriGetir()
  }, [])

  async function verileriGetir() {
    setYukleniyor(true)

    const { data: islemler } = await supabase.from('transactions').select('*')
    const { data: araclar } = await supabase.from('cars').select('*, expenses(*)')

    let tumHareketler: any[] = []

    if (islemler) {
      islemler.forEach(islem => {
        tumHareketler.push({
          id: `tr-${islem.id}`,
          tarih: islem.tarih,
          aciklama: islem.aciklama,
          kategori: islem.kategori || 'Genel',
          tutar: islem.tutar,
          tur: islem.tur,
          kaynak: 'Dükkan'
        })
      })
    }

    if (araclar) {
      araclar.forEach(arac => {
        tumHareketler.push({
          id: `alis-${arac.id}`,
          tarih: arac.alis_tarihi,
          aciklama: `${arac.marka} ${arac.model} Alımı`,
          kategori: 'Araç Alım',
          tutar: arac.alis_fiyati,
          tur: 'Gider',
          kaynak: 'Oto'
        })

        if (arac.durum === 'Satıldı' && arac.satis_bedeli > 0) {
          tumHareketler.push({
            id: `satis-${arac.id}`,
            tarih: arac.satis_tarihi || arac.created_at,
            aciklama: `${arac.marka} ${arac.model} Satışı`,
            kategori: 'Araç Satış',
            tutar: arac.satis_bedeli,
            tur: 'Gelir',
            kaynak: 'Oto'
          })
        }

        if (arac.expenses) {
          arac.expenses.forEach((masraf: any) => {
            tumHareketler.push({
              id: `masraf-${masraf.id}`,
              tarih: masraf.tarih || masraf.created_at,
              aciklama: `${arac.marka} ${arac.model} - ${masraf.aciklama}`,
              kategori: 'Araç Masraf',
              tutar: masraf.tutar,
              tur: 'Gider',
              kaynak: 'Oto'
            })
          })
        }
      })
    }

    tumHareketler.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())

    setHareketler(tumHareketler)
    setYukleniyor(false)
  }

  const islemKaydet = async () => {
    if (!yeniIslem.aciklama || !yeniIslem.tutar) return alert('Lütfen alanları doldurun')

    const { error } = await supabase.from('transactions').insert([{
      aciklama: yeniIslem.aciklama,
      tutar: Number(yeniIslem.tutar),
      tur: yeniIslem.tur,
      tarih: yeniIslem.tarih,
      kategori: 'Genel'
    }])

    if (error) alert('Hata: ' + error.message)
    else {
      alert('✅ İşlem eklendi!')
      setYeniIslem({ ...yeniIslem, aciklama: '', tutar: '' })
      verileriGetir()
    }
  }

  const aylar = Array.from(new Set(hareketler.map(h => h.tarih.slice(0, 7)))).sort().reverse()

  const filtrelenenHareketler = secilenAy === 'Hepsi'
    ? hareketler
    : hareketler.filter(h => h.tarih.startsWith(secilenAy))

  const toplamGelir = filtrelenenHareketler
    .filter(h => h.tur === 'Gelir')
    .reduce((acc, curr) => acc + curr.tutar, 0)

  const toplamGider = filtrelenenHareketler
    .filter(h => h.tur === 'Gider')
    .reduce((acc, curr) => acc + curr.tutar, 0)

  const kasaDurumu = toplamGelir - toplamGider

  return (
    <main className="min-h-screen bg-[#050509] px-4 md:px-8 py-8 pb-24 flex justify-center">
      <div className="max-w-6xl w-full rounded-2xl border border-white/10 bg-[rgba(15,15,20,0.96)] shadow-[0_18px_45px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 md:px-8 py-5 bg-gradient-to-r from-black via-slate-950 to-black border-b border-yellow-500/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] tracking-[0.3em] uppercase text-slate-400 font-semibold">
              Finans Modülü
            </div>
            <h1 className="section-title gold-text">
              KASA &amp; FİNANS
            </h1>
            
          </div>

          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-400/90 bg-black/70 px-4 py-2 text-xs md:text-sm font-semibold text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.3)] hover:bg-yellow-400 hover:text-black hover:border-yellow-300 transition"
          >
            <span className="text-base">←</span>
            Garaja Dön
          </button>
        </div>

        {/* CONTENT */}
        <div className="px-6 md:px-8 py-6 md:py-8 text-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* SOL: ÖZET + FORM */}
            <div className="space-y-6">
              
              {/* ÖZET KARTI */}
              <div className="relative overflow-hidden rounded-2xl bg-slate-950/80 border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.95)] p-5 md:p-6">
                {/* Glow para işareti */}
                <div className="pointer-events-none absolute -top-10 right-0 text-[140px] font-black text-yellow-500/10 select-none">
                  ₺
                </div>

                {/* Ay seçici */}
                <div className="mb-5 relative z-10">
  <label className="text-[11px] text-slate-400 uppercase font-semibold mb-1 block tracking-[0.14em]">
    DÖNEM SEÇ
  </label>

  <div className="relative">
    <select
      value={secilenAy}
      onChange={(e) => setSecilenAy(e.target.value)}
      className="carbay-select"
    >
      <option value="Hepsi">TÜM ZAMANLAR</option>
      {aylar.map((ay) => (
        <option key={ay} value={ay}>
          {new Date(ay + '-01')
            .toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
            .toUpperCase()}
        </option>
      ))}
    </select>

    {/* Sağdaki ok ikonu */}
    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-yellow-300">
      ▾
    </span>
  </div>
</div>


                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1 relative z-10">
                  {secilenAy === 'Hepsi' ? 'GENEL KÂR / ZARAR' : 'AYLIK KÂR / ZARAR'}
                </p>
                <h2
                  className={`relative z-10 text-4xl md:text-5xl font-black tracking-tight ${
                    kasaDurumu >= 0 ? 'text-emerald-300' : 'text-red-400'
                  }`}
                >
                  {kasaDurumu.toLocaleString('tr-TR')} ₺
                </h2>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 relative z-10">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em]">
                      TOPLAM GİRİŞ
                    </p>
                    <p className="mt-1 text-lg md:text-xl font-extrabold text-emerald-300">
                      +{toplamGelir.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em]">
                      TOPLAM ÇIKIŞ
                    </p>
                    <p className="mt-1 text-lg md:text-xl font-extrabold text-rose-300">
                      -{toplamGider.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                </div>
              </div>

              {/* HIZLI İŞLEM FORMU */}
              <div className="rounded-2xl bg-slate-950/70 border border-white/10 shadow-[0_14px_34px_rgba(0,0,0,0.9)] p-5 md:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-100">
                  <span className="inline-block h-6 w-1 rounded-full bg-[#FFB700]" />
                  Hızlı İşlem Ekle
                </h3>

                <div className="space-y-4">
                  {/* Gelir / Gider toggle */}
                  <div className="flex rounded-full bg-slate-900/80 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setYeniIslem({ ...yeniIslem, tur: 'Gelir' })}
                      className={`flex-1 rounded-full py-2 text-xs font-bold transition ${
                        yeniIslem.tur === 'Gelir'
                          ? 'bg-emerald-500 text-black shadow-[0_0_16px_rgba(16,185,129,0.8)]'
                          : 'text-slate-400'
                      }`}
                    >
                      Gelir (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setYeniIslem({ ...yeniIslem, tur: 'Gider' })}
                      className={`flex-1 rounded-full py-2 text-xs font-bold transition ${
                        yeniIslem.tur === 'Gider'
                          ? 'bg-rose-500 text-black shadow-[0_0_16px_rgba(244,63,94,0.8)]'
                          : 'text-slate-400'
                      }`}
                    >
                      Gider (-)
                    </button>
                  </div>

                  <input
                    type="date"
                    value={yeniIslem.tarih}
                    onChange={e => setYeniIslem({ ...yeniIslem, tarih: e.target.value })}
                    className="carbay-input"
                  />

                  <input
                    type="text"
                    placeholder="Açıklama (Örn: Kira, Çay, Elektrik...)"
                    value={yeniIslem.aciklama}
                    onChange={e => setYeniIslem({ ...yeniIslem, aciklama: e.target.value })}
                    className="carbay-input"
                  />

                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Tutar"
                      value={yeniIslem.tutar}
                      onChange={e => setYeniIslem({ ...yeniIslem, tutar: e.target.value })}
                      className="carbay-input pr-10 font-semibold"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₺
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={islemKaydet}
                    className="mt-1 inline-flex w-full items-center justify-center rounded-2xl border border-yellow-600 bg-gradient-to-r from-[#FFB700] via-amber-400 to-yellow-500 px-6 py-3 text-sm font-black tracking-wide text-black shadow-[0_0_22px_rgba(250,204,21,0.9)] hover:brightness-105 active:translate-y-[1px]"
                  >
                    KAYDET
                  </button>
                </div>
              </div>
            </div>

            {/* SAĞ: HAREKET LİSTESİ */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-slate-950/80 border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-5 py-3">
                  <h3 className="text-sm font-semibold text-slate-100">
                    {secilenAy === 'Hepsi'
                      ? 'Tüm Hareketler'
                      : `${new Date(secilenAy + '-01')
                          .toLocaleDateString('tr-TR', { month: 'long' })
                          .toUpperCase()} Hareketleri`}
                  </h3>
                  <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-slate-300 border border-white/10">
                    {filtrelenenHareketler.length} işlem
                  </span>
                </div>

                <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                  {yukleniyor ? (
                    <div className="p-10 text-center text-slate-500">Hesaplanıyor...</div>
                  ) : filtrelenenHareketler.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">Bu dönemde işlem yok.</div>
                  ) : (
                    <table className="w-full text-xs md:text-sm text-left">
                      <thead className="sticky top-0 bg-slate-900/95 text-slate-300 text-[11px] uppercase tracking-[0.14em]">
                        <tr>
                          <th className="px-5 py-3">Tarih</th>
                          <th className="px-5 py-3">Açıklama</th>
                          <th className="px-5 py-3">Kategori</th>
                          <th className="px-5 py-3 text-right">Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filtrelenenHareketler.map((islem) => (
                          <tr
                            key={islem.id}
                            className="hover:bg-slate-900/70 transition-colors"
                          >
                            <td className="px-5 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {new Date(islem.tarih).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-5 py-3 font-semibold text-slate-100">
                              {islem.kaynak === 'Oto' ? '🚗 ' : '🏢 '}
                              {islem.aciklama}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold
                                  ${
                                    islem.kategori === 'Araç Satış'
                                      ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-500/60'
                                      : islem.kategori === 'Araç Alım'
                                      ? 'bg-sky-900/40 text-sky-200 border border-sky-500/60'
                                      : 'bg-slate-900/60 text-slate-200 border border-slate-600/60'
                                  }`}
                              >
                                {islem.kategori}
                              </span>
                            </td>
                           <td className={`p-4 text-right font-black text-base
        ${islem.tur === 'Gelir' ? 'text-green-600' : 'text-red-600'}`}>
        {islem.tur === 'Gelir' ? '+' : '-'}{islem.tutar.toLocaleString('tr-TR')} ₺
      </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GLOBAL STYLES (CARBAY INPUT) */}
        <style jsx global>{`
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

  /* DÖNEM SEÇ select'i – Araç ekleme sayfasındaki koyu input stili */
  .carbay-select {
    width: 100%;
    border-radius: 0.9rem;
    border: 1px solid rgba(148, 163, 184, 0.6);
    padding: 0.6rem 2.3rem 0.6rem 0.9rem;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    outline: none;
    background: radial-gradient(circle at 0 0, #020617 0%, #020617 60%, #000 100%);
    color: #e5e7eb !important;
    cursor: pointer;

    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;

    transition:
      border-color 0.16s ease-out,
      box-shadow 0.16s ease-out,
      background 0.16s ease-out,
      transform 0.12s ease-out;
  }

  .carbay-select:focus {
    border-color: #facc15;
    box-shadow:
      0 0 0 1px rgba(250, 204, 21, 0.8),
      0 12px 28px rgba(15, 23, 42, 0.9);
    background: #020617;
    transform: translateY(-1px);
  }

  .carbay-select option {
    background-color: #020617;
    color: #f9fafb;
    font-size: 0.8rem;
    font-weight: 600;
  }
    .neon-green {
  color: #00ff9d !important;
  text-shadow: 0 0 6px #00ff9d, 0 0 12px #00ff9d;
}

.neon-red {
  color: #ff4d6d !important;
  text-shadow: 0 0 6px #ff4d6d, 0 0 12px #ff4d6d;
}

        `}</style>
      </div>
    </main>
  )
}
