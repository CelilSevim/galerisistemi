'use client'
import { useEffect, useState } from 'react'
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
  Legend
} from 'recharts'

export default function AnalizPaneli() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(true)

  // Grafik Verileri
  const [markaKarData, setMarkaKarData] = useState<any[]>([])
  const [yakitData, setYakitData] = useState<any[]>([])
  const [genelOzet, setGenelOzet] = useState({
    toplamKar: 0,
    satisOrani: 0,
    enKarliMarka: '-'
  })

  // Renk Paleti (Pasta grafik için)
  const COLORS = ['#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c', '#e5e7eb']

  useEffect(() => {
    async function verileriAnalizEt() {
      const { data: araclar } = await supabase
        .from('cars')
        .select('*, expenses(*)')

      if (!araclar) return

      // --- 1. MARKA BAZLI KÂR ANALİZİ ---
      const markaKarlilik: any = {}
      let toplamKar = 0
      let satilanAracSayisi = 0

      araclar.forEach((arac) => {
        if (arac.durum === 'Satıldı') {
          satilanAracSayisi++
          const masraf = arac.expenses
            ? arac.expenses.reduce((t: number, e: any) => t + e.tutar, 0)
            : 0
          const netKar =
            (arac.satis_bedeli || 0) - (arac.alis_fiyati || 0) - masraf

          toplamKar += netKar

          if (markaKarlilik[arac.marka]) {
            markaKarlilik[arac.marka] += netKar
          } else {
            markaKarlilik[arac.marka] = netKar
          }
        }
      })

      const markaGrafikVerisi = Object.keys(markaKarlilik)
        .map((marka) => ({
          name: marka,
          kar: markaKarlilik[marka]
        }))
        .sort((a, b) => b.kar - a.kar)

      setMarkaKarData(markaGrafikVerisi)

      // --- 2. STOK YAKIT DAĞILIMI ---
      const yakitSayilari: any = {}
      araclar
        .filter((a) => a.durum === 'Stokta')
        .forEach((arac) => {
          yakitSayilari[arac.yakit] = (yakitSayilari[arac.yakit] || 0) + 1
        })

      const yakitGrafikVerisi = Object.keys(yakitSayilari).map((yakit) => ({
        name: yakit,
        value: yakitSayilari[yakit]
      }))
      setYakitData(yakitGrafikVerisi)

      // --- 3. GENEL ÖZET ---
      setGenelOzet({
        toplamKar: toplamKar,
        satisOrani:
          Math.round((satilanAracSayisi / araclar.length) * 100) || 0,
        enKarliMarka:
          markaGrafikVerisi.length > 0 ? markaGrafikVerisi[0].name : '-'
      })

      setYukleniyor(false)
    }

    verileriAnalizEt()
  }, [])

  if (yukleniyor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050509] text-slate-100">
        <div className="px-6 py-4 rounded-xl border border-amber-400/40 bg-black/40 shadow-2xl">
          <div className="text-xs tracking-[0.25em] uppercase text-amber-300/80 text-center mb-2">
            CARBAY ANALİZ
          </div>
          <div className="text-sm text-slate-100/90 font-semibold">
            Analizler hazırlanıyor...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050509] text-slate-100 pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
        {/* ÜST BAŞLIK ALANI */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <div className="text-[11px] tracking-[0.28em] uppercase text-amber-300/80 mb-2">
              CARBAY MOTORS • ANALİZ MERKEZİ
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              Detaylı Kâr & Stok Analizi
            </h1>
            <p className="text-sm md:text-base text-slate-300/80 mt-2 max-w-xl">
              Stok yapını, satış performansını ve en çok kazandıran markaları tek
              ekranda gör.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/70 bg-black/60 px-5 py-2.5 text-sm font-semibold text-amber-100 shadow-lg shadow-black/60 hover:bg-amber-400 hover:text-black hover:border-amber-300 transition"
          >
            <span className="text-lg">↩</span>
            <span>Garaja Dön</span>
          </button>
        </header>

        {/* ÖZET KARTLAR */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Toplam Net Kâr */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/40 via-emerald-500/20 to-emerald-900/60 shadow-2xl shadow-black/50 p-5">
            <div className="text-xs font-semibold tracking-[0.18em] uppercase text-emerald-100/80 mb-2">
              Toplam Net Kâr
            </div>
            <div className="text-3xl md:text-4xl font-black text-emerald-50">
              {genelOzet.toplamKar.toLocaleString('tr-TR')} ₺
            </div>
            <div className="absolute -right-6 -bottom-10 w-28 h-28 rounded-full bg-emerald-400/20 blur-xl" />
          </div>

          {/* Satış Başarısı */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-400/40 bg-gradient-to-br from-sky-500/40 via-sky-500/20 to-slate-900/70 shadow-2xl shadow-black/50 p-5">
            <div className="text-xs font-semibold tracking-[0.18em] uppercase text-sky-100/80 mb-2">
              Satış Başarısı
            </div>
            <div className="text-3xl md:text-4xl font-black text-sky-50">
              %{genelOzet.satisOrani}
            </div>
            <p className="mt-2 text-[11px] text-sky-100/80">
              Toplam envanterin içinde satılan araç oranı
            </p>
            <div className="absolute -right-6 -bottom-10 w-28 h-28 rounded-full bg-sky-400/25 blur-xl" />
          </div>

          {/* Kâr Şampiyonu */}
          <div className="relative overflow-hidden rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-500/40 via-violet-500/20 to-slate-900/80 shadow-2xl shadow-black/50 p-5">
            <div className="text-xs font-semibold tracking-[0.18em] uppercase text-violet-100/80 mb-2">
              Kâr Şampiyonu Marka
            </div>
            <div className="text-2xl md:text-3xl font-black text-violet-50">
              {genelOzet.enKarliMarka}
            </div>
            <p className="mt-2 text-[11px] text-violet-100/80">
              Tüm satışlarda en yüksek toplam net kârı sağlayan marka
            </p>
            <div className="absolute -right-6 -bottom-10 w-28 h-28 rounded-full bg-violet-400/25 blur-xl" />
          </div>
        </section>

        {/* GRAFİKLER */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MARKA BAZLI KÂR */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black/60 p-5 h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-50">
                  🏆 Marka Bazlı Net Kâr
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Hangi marka, toplamda ne kadar kâr getirdi?
                </p>
              </div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={markaKarData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148,163,184,0.25)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    tick={{ fill: '#e5e7eb', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: '#e5e7eb', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.7)',
                      color: '#e5e7eb'
                    }}
                    labelStyle={{ color: '#facc15', fontWeight: 600 }}
                    formatter={(value: number) =>
                      `${value.toLocaleString('tr-TR')} ₺`
                    }
                  />
                  <Bar
                    dataKey="kar"
                    name="Net Kâr"
                    fill="#facc15"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* YAKIT TİPİ DAĞILIMI */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black/60 p-5 h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-slate-50">
                  ⛽ Stoktaki Yakıt Dağılımı
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Şu an stokta bulunan araçların yakıt tiplerine göre dağılımı.
                </p>
              </div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={yakitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}

                  >
                    {yakitData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.7)',
                      color: '#e5e7eb'
                    }}
                    formatter={(value: number) => `${value} adet`}
                  />
                  <Legend
                    wrapperStyle={{
                      color: '#e5e7eb',
                      fontSize: 12
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
