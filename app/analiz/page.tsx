'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'

export default function AnalizPaneli() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(true)

  // Ham Veriler
  const [tumAraclar, setTumAraclar] = useState<any[]>([])
  const [tumIslemler, setTumIslemler] = useState<any[]>([])

  // Filtre
  const [secilenYil, setSecilenYil] = useState<number>(new Date().getFullYear())
  const [secilenAy, setSecilenAy] = useState<number>(new Date().getMonth()) // 0-11

  // HEDEF SİSTEMİ (LocalStorage)
  const [aylikHedef, setAylikHedef] = useState<number>(500000)
  const [hedefDuzenleniyor, setHedefDuzenleniyor] = useState(false)
  const [yeniHedef, setYeniHedef] = useState('')

  useEffect(() => {
    // LocalStorage'dan hedefi çek
    const kayitliHedef = localStorage.getItem('carbay_profit_goal')
    if (kayitliHedef) setAylikHedef(Number(kayitliHedef))

    verileriGetir()
  }, [])

  const hedefKaydet = () => {
    const hedefSayi = Number(yeniHedef)
    if (hedefSayi && hedefSayi > 0) {
      setAylikHedef(hedefSayi)
      localStorage.setItem('carbay_profit_goal', String(hedefSayi))
      setHedefDuzenleniyor(false)
      setYeniHedef('')
    }
  }

  async function verileriGetir() {
    setYukleniyor(true)

    // 1. Arabaları Çek
    const { data: araclar } = await supabase
      .from('cars')
      .select('*, expenses(*)')

    // 2. Kasa İşlemlerini Çek
    const { data: islemler } = await supabase
      .from('transactions')
      .select('*')

    if (araclar) setTumAraclar(araclar)
    if (islemler) setTumIslemler(islemler)

    setYukleniyor(false)
  }

  // --- HESAPLAMA MOTORU ---
  const analizVerileri = useMemo(() => {
    if (yukleniyor) return null

    // AY İSİMLERİ
    const aylar = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ]

    // 1. YILLIK GENEL DATA OLUŞTUR
    const yillikOzet = aylar.map((ayAdi, index) => {
      const buAySatilanlar = tumAraclar.filter(a => {
        if (a.durum !== 'Satıldı' || !a.satis_tarihi) return false
        const d = new Date(a.satis_tarihi)
        return d.getFullYear() === secilenYil && d.getMonth() === index
      })

      const buAyIslemler = tumIslemler.filter(i => {
        const d = new Date(i.tarih)
        return d.getFullYear() === secilenYil && d.getMonth() === index
      })

      // Gelirler
      const aracCirosu = buAySatilanlar.reduce((t, a) => t + (a.satis_bedeli || 0), 0)
      const digerGelirler = buAyIslemler
        .filter(i => i.tur === 'Gelir')
        .reduce((t, i) => t + (i.tutar || 0), 0)
      const toplamGelir = aracCirosu + digerGelirler

      // Giderler
      const aracAlisMaliyeti = buAySatilanlar.reduce((t, a) => t + (a.alis_fiyati || 0), 0)
      const aracMasraflari = buAySatilanlar.reduce((t, a) => {
        const m = a.expenses ? a.expenses.reduce((et: number, e: any) => et + (e.tutar || 0), 0) : 0
        return t + m
      }, 0)
      const genelGiderler = buAyIslemler
        .filter(i => i.tur === 'Gider')
        .reduce((t, i) => t + (i.tutar || 0), 0)

      const toplamGider = aracAlisMaliyeti + aracMasraflari + genelGiderler
      const netKar = toplamGelir - toplamGider

      return {
        ay: ayAdi,
        ayIndex: index,
        aracSatisAdedi: buAySatilanlar.length,
        aracCirosu,
        aracAlisMaliyeti,
        aracMasraflari,
        genelGiderler,
        digerGelirler,
        toplamGelir,
        toplamGider,
        netKar,
        buAySatilanlar
      }
    })

    // 2. SEÇİLİ AYA AİT DETAYLAR
    const seciliAyVerisi = yillikOzet[secilenAy]
    const buAySatilanlar = seciliAyVerisi.buAySatilanlar

    // --- TEMEL METRİKLER ---
    const roiOrani = seciliAyVerisi.toplamGider > 0
      ? (seciliAyVerisi.netKar / seciliAyVerisi.toplamGider) * 100
      : 0

    let ortalamaSatisGunu = 0
    if (buAySatilanlar.length > 0) {
      const toplamGun = buAySatilanlar.reduce((t, a) => {
        const alis = new Date(a.alis_tarihi).getTime()
        const satis = new Date(a.satis_tarihi).getTime()
        const farkGun = Math.ceil((satis - alis) / (1000 * 60 * 60 * 24))
        return t + (farkGun > 0 ? farkGun : 0)
      }, 0)
      ortalamaSatisGunu = Math.round(toplamGun / buAySatilanlar.length)
    }

    // --- KAZANANLAR KULÜBÜ ---
    const markaKarliliklari: Record<string, number> = {}
    buAySatilanlar.forEach(a => {
      const masraf = a.expenses ? a.expenses.reduce((t: number, e: any) => t + (e.tutar || 0), 0) : 0
      const kar = (a.satis_bedeli || 0) - (a.alis_fiyati || 0) - masraf
      markaKarliliklari[a.marka] = (markaKarliliklari[a.marka] || 0) + kar
    })

    let enKarliMarka = { ad: '-', deger: 0 }
    Object.entries(markaKarliliklari).forEach(([marka, kar]) => {
      if (kar > enKarliMarka.deger) enKarliMarka = { ad: marka, deger: kar }
    })

    const modelHizlari: Record<string, { toplamGun: number, adet: number }> = {}
    buAySatilanlar.forEach(a => {
      const alis = new Date(a.alis_tarihi).getTime()
      const satis = new Date(a.satis_tarihi).getTime()
      const farkGun = Math.ceil((satis - alis) / (1000 * 60 * 60 * 24))
      const gun = farkGun > 0 ? farkGun : 0
      if (!modelHizlari[a.model]) modelHizlari[a.model] = { toplamGun: 0, adet: 0 }
      modelHizlari[a.model].toplamGun += gun
      modelHizlari[a.model].adet += 1
    })

    let enHizliModel = { ad: '-', gun: 9999 }
    Object.entries(modelHizlari).forEach(([model, veri]) => {
      const ort = Math.round(veri.toplamGun / veri.adet)
      if (ort < enHizliModel.gun) enHizliModel = { ad: model, gun: ort }
    })
    if (enHizliModel.gun === 9999) enHizliModel = { ad: '-', gun: 0 }

    let roiSampiyonu = { ad: '-', oran: 0 }
    buAySatilanlar.forEach(a => {
      const masraf = a.expenses ? a.expenses.reduce((t: number, e: any) => t + (e.tutar || 0), 0) : 0
      const maliyet = (a.alis_fiyati || 0) + masraf
      const kar = (a.satis_bedeli || 0) - maliyet
      if (maliyet > 0) {
        const oran = (kar / maliyet) * 100
        if (oran > roiSampiyonu.oran) roiSampiyonu = { ad: `${a.marka} ${a.model}`, oran }
      }
    })

    // --- RİSK RADARI ---
    const bugun = new Date().getTime()
    const riskliAraclar = tumAraclar.filter(a => {
      if (a.durum !== 'Stokta' || !a.alis_tarihi) return false
      const alis = new Date(a.alis_tarihi).getTime()
      const gecenGun = Math.ceil((bugun - alis) / (1000 * 60 * 60 * 24))
      return gecenGun > 45
    }).map(a => {
      const masraf = a.expenses ? a.expenses.reduce((t: number, e: any) => t + (e.tutar || 0), 0) : 0
      const toplamMaliyet = (a.alis_fiyati || 0) + masraf
      const alis = new Date(a.alis_tarihi).getTime()
      const gecenGun = Math.ceil((bugun - alis) / (1000 * 60 * 60 * 24))
      return {
        ...a,
        gecenGun,
        toplamMaliyet
      }
    }).sort((a, b) => b.gecenGun - a.gecenGun)

    // Gider Dağılımı
    const giderDagilimi = [
      { name: 'Araç Alımı', value: seciliAyVerisi.aracAlisMaliyeti, color: '#3b82f6' },
      { name: 'Araç Masrafı', value: seciliAyVerisi.aracMasraflari, color: '#f59e0b' },
      { name: 'Genel Gider', value: seciliAyVerisi.genelGiderler, color: '#ef4444' }
    ].filter(i => i.value > 0)

    return {
      yillikOzet,
      seciliAyVerisi,
      giderDagilimi,
      extraMetrikler: {
        roi: roiOrani,
        hiz: ortalamaSatisGunu,
        enKarliMarka,
        enHizliModel,
        roiSampiyonu,
        riskliAraclar
      }
    }

  }, [tumAraclar, tumIslemler, yukleniyor, secilenYil, secilenAy])

  if (yukleniyor || !analizVerileri) {
    return <div className="min-h-screen flex items-center justify-center bg-[#050509] text-slate-100">Yükleniyor...</div>
  }

  const { yillikOzet, seciliAyVerisi, giderDagilimi, extraMetrikler } = analizVerileri

  const hedefYuzdesi = Math.min((seciliAyVerisi.netKar / aylikHedef) * 100, 100)
  const hedefKalan = aylikHedef - seciliAyVerisi.netKar

  return (

    <div className="min-h-screen bg-[#050509] text-slate-100 pb-20 font-inter">
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>

            <h1 className="text-4xl font-black">
              <span className="text-[#FFB700] drop-shadow-[0_0_15px_rgba(255,183,0,0.3)]">CAR</span>
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">BAY ANALİZ</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 h-12">

            <div className="relative">
              <select
                value={secilenYil}
                onChange={(e) => setSecilenYil(Number(e.target.value))}
                className="h-12 bg-[#0A0A0D] border border-white/10 text-slate-200 text-sm rounded-xl px-4 pr-8 outline-none transition focus:border-[#FFB700] focus:ring-1 focus:ring-[#FFB700]/50 appearance-none cursor-pointer hover:bg-white/5"
              >
                {Array.from({ length: new Date().getFullYear() - 2023 + 2 }, (_, i) => 2023 + i).map(yl => (
                  <option key={yl} value={yl}>{yl}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#C9A43B]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>


            <div className="relative">
              <select
                value={secilenAy}
                onChange={(e) => setSecilenAy(Number(e.target.value))}
                className="h-12 bg-[#0A0A0D] border border-white/10 text-slate-200 text-sm rounded-xl px-4 pr-8 outline-none transition focus:border-[#FFB700] focus:ring-1 focus:ring-[#FFB700]/50 appearance-none cursor-pointer hover:bg-white/5 min-w-[140px]"
              >
                {yillikOzet.map((veri) => (
                  <option key={veri.ayIndex} value={veri.ayIndex}>{veri.ay}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#C9A43B]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <style jsx>{`
              select {
                background-color: #0A0A0D !important;
                color: #ffffff !important;
              }
              option {
                background-color: #0A0A0D !important;
                color: #ffffff !important;
              }
            `}</style>



            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block"></div>

            <button
              onClick={() => router.push('/')}
              className="h-12 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold transition flex items-center justify-center gap-2 group"
            >
              KAPAT
              <span className="group-hover:rotate-90 transition transform">✕</span>
            </button>
          </div>
        </header>

        {/* 🎯 HEDEF KARTI (NEW) */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950/50 to-slate-950 border border-indigo-500/30 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-40 h-40"><path fillRule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
          </div>

          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Aylık Hedef <span className="text-sm font-normal text-indigo-300">({seciliAyVerisi.ay})</span>
              </h3>
              <p className="text-sm text-slate-400">Bu ayki kâr hedefini yakala!</p>
            </div>
            <button
              onClick={() => setHedefDuzenleniyor(!hedefDuzenleniyor)}
              className="text-xs bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg transition"
            >
              Hedefi Düzenle
            </button>
          </div>

          {hedefDuzenleniyor && (
            <div className="mb-4 flex gap-2 relative z-10 animate-in fade-in slide-in-from-top-2">
              <input
                type="number"
                placeholder="Yeni Hedef (TL)"
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm w-40 outline-none focus:border-indigo-500"
                value={yeniHedef}
                onChange={e => setYeniHedef(e.target.value)}
              />
              <button onClick={hedefKaydet} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Kaydet</button>
            </div>
          )}

          <div className="relative z-10">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className={hedefKalan <= 0 ? 'text-emerald-400' : 'text-slate-300'}>
                {seciliAyVerisi.netKar.toLocaleString('tr-TR')} ₺
              </span>
              <span className="text-indigo-300">{aylikHedef.toLocaleString('tr-TR')} ₺</span>
            </div>

            {/* Progress Bar Container */}
            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${hedefKalan <= 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-indigo-600 to-purple-500'}`}
                style={{ width: `${hedefYuzdesi}%` }}
              >
                {hedefYuzdesi > 5 && (
                  <div className="h-full w-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InN0cmlwZXMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMNDAgMEgwTDQwIDQwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNzdHJpcGVzKSIvPjwvc3ZnPg==')] hover:animate-[spin_10s_linear_infinite]"></div>
                )}
              </div>
            </div>

            <div className="mt-2 text-right">
              {hedefKalan > 0 ? (
                <span className="text-xs text-indigo-300 font-mono">Hedefe <b>{hedefKalan.toLocaleString('tr-TR')} ₺</b> kaldı! (%{Math.round(hedefYuzdesi)})</span>
              ) : (
                <span className="text-xs text-emerald-400 font-bold flex items-center justify-end gap-1">
                  🎉 TEBRİKLER! HEDEF TAMAMLANDI!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1. SEÇİLİ AY ÖZET KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative group overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-black border border-white/10 p-6 flex flex-col justify-center">
            <div className={`absolute top-0 left-0 w-1 h-full ${seciliAyVerisi.netKar >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">{seciliAyVerisi.ay} AYI NET KÂR</div>
            <div className={`text-4xl lg:text-5xl font-black ${seciliAyVerisi.netKar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {seciliAyVerisi.netKar.toLocaleString('tr-TR')} ₺
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="text-blue-400 text-[10px] uppercase font-bold mb-1">YATIRIM GETİRİSİ</div>
            <div className="text-3xl font-black text-blue-400">%{extraMetrikler.roi.toFixed(1)}</div>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="text-purple-400 text-[10px] uppercase font-bold mb-1">ORT. SATIŞ HIZI</div>
            <div className="text-3xl font-black text-purple-400">{extraMetrikler.hiz} <span className="text-lg">Gün</span></div>
          </div>
        </div>

        {/* 🏆 AYIN YILDIZLARI */}
        {seciliAyVerisi.aracSatisAdedi > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 to-black p-5 relative group">
              <div className="text-[10px] text-yellow-500 font-bold uppercase mb-2">🏆 En Kârlı Marka</div>
              <div className="text-3xl font-black text-white">{extraMetrikler.enKarliMarka.ad}</div>
              <div className="text-yellow-400/80 font-mono text-sm mt-1">+{extraMetrikler.enKarliMarka.deger.toLocaleString('tr-TR')} ₺</div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 to-black p-5 relative group">
              <div className="text-[10px] text-cyan-500 font-bold uppercase mb-2">⚡ En Hızlı Model</div>
              <div className="text-3xl font-black text-white">{extraMetrikler.enHizliModel.ad}</div>
              <div className="text-cyan-400/80 font-mono text-sm mt-1">Ort. {extraMetrikler.enHizliModel.gun} Günde</div>
            </div>
            <div className="rounded-xl border border-lime-500/20 bg-gradient-to-br from-lime-900/10 to-black p-5 relative group">
              <div className="text-[10px] text-lime-500 font-bold uppercase mb-2"> Yatırım Kralı</div>
              <div className="text-xl font-black text-white truncate">{extraMetrikler.roiSampiyonu.ad}</div>
              <div className="text-lime-400/80 font-mono text-sm mt-1">%{extraMetrikler.roiSampiyonu.oran.toFixed(0)} Getiri</div>
            </div>
          </div>
        )}

        {/* ⚠️ RISK RADARI */}
        <div className="rounded-2xl border border-orange-500/20 bg-orange-950/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-orange-100">Stok Risk Radarı</h3>
          </div>
          {extraMetrikler.riskliAraclar.length === 0 ? (
            <div className="text-emerald-500 text-sm font-semibold"> Riskli araç bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-black/20 text-xs uppercase text-orange-400/80">
                  <tr><th className="px-4 py-2">Araç</th><th className="px-4 py-2">Süre</th><th className="px-4 py-2">Maliyet</th></tr>
                </thead>
                <tbody className="divide-y divide-orange-500/10">
                  {extraMetrikler.riskliAraclar.map((arac: any) => (
                    <tr key={arac.id} className="hover:bg-orange-500/5">
                      <td className="px-4 py-3 font-semibold text-white">{arac.marka} {arac.model}</td>
                      <td className="px-4 py-3 font-mono text-orange-300">{arac.gecenGun} Gün</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{arac.toplamMaliyet.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* GRAFİKLER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-slate-900/50 border border-white/10 p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yillikOzet}>
                  <defs>
                    <linearGradient id="colorKar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="ay" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a' }} />
                  <Area type="monotone" dataKey="netKar" name="Net Kâr" stroke="#10b981" strokeWidth={3} fill="url(#colorKar)" />
                  <Line type="monotone" dataKey="toplamGelir" name="Ciro" stroke="#475569" strokeWidth={1} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-6">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={giderDagilimi} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {giderDagilimi.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-xs text-slate-500 mt-2">Toplam Gider</div>
            <div className="text-center font-bold text-white text-lg">{seciliAyVerisi.toplamGider.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>

        {/* GEÇMİŞ TABLOSU */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="bg-slate-900/80 px-6 py-4 border-b border-white/5 font-bold text-white">🗓️ Geçmiş Dökümü</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-black/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Ay</th>
                  <th className="px-6 py-3 font-medium text-right">Satış</th>
                  <th className="px-6 py-3 font-medium text-right">Ciro</th>
                  <th className="px-6 py-3 font-medium text-right">Maliyet</th>
                  <th className="px-6 py-3 font-medium text-right">Kâr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {yillikOzet.filter(o => o.toplamGelir > 0 || o.toplamGider > 0).map((o) => (
                  <tr key={o.ay} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-bold">{o.ay}</td>
                    <td className="px-6 py-4 text-right">{o.aracSatisAdedi}</td>
                    <td className="px-6 py-4 text-right">{o.toplamGelir.toLocaleString('tr-TR')}</td>
                    <td className="px-6 py-4 text-right text-rose-300">-{o.toplamGider.toLocaleString('tr-TR')}</td>
                    <td className={`px-6 py-4 text-right font-black ${o.netKar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{o.netKar.toLocaleString('tr-TR')} ₺</td>
                  </tr>



                )
                )

                }

              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

  )

}

