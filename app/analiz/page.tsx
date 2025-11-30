'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function AnalizPaneli() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(true)
  
  // Grafik Verileri
  const [markaKarData, setMarkaKarData] = useState<any[]>([])
  const [yakitData, setYakitData] = useState<any[]>([])
  const [genelOzet, setGenelOzet] = useState({ toplamKar: 0, satisOrani: 0, enKarliMarka: '-' })

  // Renk Paleti (Pasta grafik için)
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

  useEffect(() => {
    async function verileriAnalizEt() {
      // Tüm araçları ve masrafları çek
      const { data: araclar } = await supabase
        .from('cars')
        .select('*, expenses(*)')

      if (!araclar) return

      // --- 1. MARKA BAZLI KÂR ANALİZİ ---
      const markaKarlilik: any = {}
      let toplamKar = 0
      let satilanAracSayisi = 0

      araclar.forEach(arac => {
        if (arac.durum === 'Satıldı') {
          satilanAracSayisi++
          // Masraf hesapla
          const masraf = arac.expenses ? arac.expenses.reduce((t:number, e:any) => t + e.tutar, 0) : 0
          const netKar = (arac.satis_bedeli || 0) - (arac.alis_fiyati || 0) - masraf
          
          toplamKar += netKar

          // Markaya göre topla
          if (markaKarlilik[arac.marka]) {
            markaKarlilik[arac.marka] += netKar
          } else {
            markaKarlilik[arac.marka] = netKar
          }
        }
      })

      // Grafik formatına çevir
      const markaGrafikVerisi = Object.keys(markaKarlilik).map(marka => ({
        name: marka,
        kar: markaKarlilik[marka]
      })).sort((a, b) => b.kar - a.kar) // En çok kâr getiren en başa

      setMarkaKarData(markaGrafikVerisi)


      // --- 2. STOK YAKIT DAĞILIMI ---
      const yakitSayilari: any = {}
      araclar.filter(a => a.durum === 'Stokta').forEach(arac => {
        yakitSayilari[arac.yakit] = (yakitSayilari[arac.yakit] || 0) + 1
      })

      const yakitGrafikVerisi = Object.keys(yakitSayilari).map(yakit => ({
        name: yakit,
        value: yakitSayilari[yakit]
      }))
      setYakitData(yakitGrafikVerisi)


      // --- 3. GENEL ÖZET ---
      setGenelOzet({
        toplamKar: toplamKar,
        satisOrani: Math.round((satilanAracSayisi / araclar.length) * 100) || 0,
        enKarliMarka: markaGrafikVerisi.length > 0 ? markaGrafikVerisi[0].name : '-'
      })

      setYukleniyor(false)
    }

    verileriAnalizEt()
  }, [])

  if (yukleniyor) return <div className="p-10 text-center">Analizler hazırlanıyor...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
      
      {/* BAŞLIK */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">📊 Detaylı Analiz Paneli</h1>
           <p className="text-gray-500">İşletmenizin finansal röntgeni</p>
        </div>
        <button onClick={() => router.push('/')} className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition">
          ← Garaja Dön
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* ÖZET KARTLAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="text-green-100 font-medium mb-1">Toplam Net Kâr</div>
            <div className="text-4xl font-bold">{genelOzet.toplamKar.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="text-blue-100 font-medium mb-1">Satış Başarısı</div>
            <div className="text-4xl font-bold">%{genelOzet.satisOrani}</div>
            <div className="text-sm opacity-80 mt-2">Toplam araçların satılma oranı</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
            <div className="text-purple-100 font-medium mb-1">Kâr Şampiyonu</div>
            <div className="text-4xl font-bold">{genelOzet.enKarliMarka}</div>
            <div className="text-sm opacity-80 mt-2">En çok kazandıran marka</div>
          </div>
        </div>

        {/* GRAFİKLER ALANI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* GRAFİK 1: MARKA BAZLI KÂR */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
            <h3 className="text-lg font-bold text-gray-800 mb-6">🏆 Hangi Markadan Ne Kadar Kazandın?</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={markaKarData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString('tr-TR')} ₺`} />
                <Bar dataKey="kar" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Net Kâr" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* GRAFİK 2: YAKIT TİPİ DAĞILIMI (PASTA) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
            <h3 className="text-lg font-bold text-gray-800 mb-6">⛽ Stoktaki Yakıt Dağılımı</h3>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={yakitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {yakitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  )
}