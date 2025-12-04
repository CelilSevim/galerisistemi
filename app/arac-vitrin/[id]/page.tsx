'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function VitrinKagidi() {
  const params = useParams()
  const id = params.id
  const [arac, setArac] = useState<any>(null)
  const [fiyat, setFiyat] = useState('')

  useEffect(() => {
    async function veriGetir() {
      const { data } = await supabase.from('cars').select('*').eq('id', id).single()
      if (data) setArac(data)
    }
    if (id) veriGetir()
  }, [id])

  // Ekspertiz Parça İsimlerini Türkçeleştirme Sözlüğü
  const parcaIsimleri: any = {
    kaput: 'Kaput',
    tavan: 'Tavan',
    bagaj: 'Bagaj',
    sol_on_camurluk: 'Sol Ön Çamurluk',
    sol_on_kapi: 'Sol Ön Kapı',
    sol_arka_kapi: 'Sol Arka Kapı',
    sol_arka_camurluk: 'Sol Arka Çamurluk',
    sag_on_camurluk: 'Sağ Ön Çamurluk',
    sag_on_kapi: 'Sağ Ön Kapı',
    sag_arka_kapi: 'Sağ Arka Kapı',
    sag_arka_camurluk: 'Sağ Arka Çamurluk',
  }

  // Duruma Göre Renk Ayarı (yalnızca stil)
  const getDurumRenk = (durum: string) => {
    if (durum === 'Orijinal') return 'text-emerald-700 font-bold'
    if (durum === 'Boyalı') return 'text-amber-700 font-bold'
    if (durum === 'Lokal Boyalı') return 'text-orange-600 font-bold'
    if (durum === 'Değişen') return 'text-red-600 font-black'
    return 'text-gray-400'
  }

  if (!arac) return <div className="text-center p-10">Kağıt hazırlanıyor...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-8 flex flex-col items-center">
      {/* EKRAN BUTONLARI (yazdırma dışında görünür) */}
      <div className="print:hidden mb-8 flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-lg border border-gray-200">
        <input
          type="text"
          placeholder="Fiyat Girin (Örn: 1.250.000 TL)"
          className="border border-gray-300 focus:border-black/70 focus:ring-0 p-2 rounded-lg w-64 font-bold text-gray-800 text-sm"
          value={fiyat}
          onChange={(e) => setFiyat(e.target.value)}
        />
        <button
          onClick={() => window.print()}
          className="bg-black text-carbay-gold px-6 py-2 rounded-lg font-bold hover:bg-gray-900 transition flex items-center gap-2 text-sm"
        >
          🖨️ Yazdır
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 text-sm"
        >
          Kapat
        </button>
      </div>

      {/* A4 KÂĞIT ALANI */}
      <div className="bg-white w-[210mm] h-[297mm] shadow-2xl print:shadow-none print:w-full print:h-screen p-10 md:p-12 flex flex-col box-border relative">
        {/* LOGO / ÜST BAR */}
        <header className="pb-6 mb-6 border-b-4 border-black flex flex-col items-center gap-2">
          <div className="text-6xl font-black tracking-tight leading-none">
            <span className="text-carbay-gold">CAR</span>
            <span className="text-black">BAY</span>
          </div>
          <div className="text-[11px] tracking-[0.45em] uppercase text-gray-500">
            Celil Sevim
          </div>
        </header>

        {/* MODERN PREMIUM BAŞLIK */}
<div className="text-center mb-10">

  {/* MARKA + MODEL */}
  <div className="flex justify-center items-end gap-4">

      {/* MARKA */}
      <span className="text-7xl font-black tracking-tight text-black uppercase">
        {arac.marka}
      </span>

      

      {/* MODEL */}
      <span className="text-7xl font-black tracking-tight text-black uppercase">
        {arac.model}
      </span>

  </div>

  {/* PAKET / DONANIM BİLGİSİ */}
  {arac.paket && (
    <div className="mt-4 text-2xl font-semibold text-gray-500 tracking-[0.3em] uppercase">
      {arac.paket}
    </div>
  )}

</div>


        {/* ÖZET TEKNİK BİLGİLER */}
        <section className="grid grid-cols-4 gap-4 mb-8 border-y border-gray-200 py-5 text-center text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-semibold tracking-[0.2em] uppercase">
              Yıl
            </span>
            <span className="text-2xl font-black text-gray-900">{arac.yil}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-semibold tracking-[0.2em] uppercase">
              Km
            </span>
            <span className="text-2xl font-black text-gray-900">
              {arac.kilometre.toLocaleString('tr-TR')}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-semibold tracking-[0.2em] uppercase">
              Yakıt
            </span>
            <span className="text-2xl font-black text-gray-900">{arac.yakit}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-semibold tracking-[0.2em] uppercase">
              Vites
            </span>
            <span className="text-2xl font-black text-gray-900">{arac.vites}</span>
          </div>
        </section>

        {/* TRAMER / HASAR */}
        <section className="mb-8 text-center">
          <span className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-gray-100 text-[10px] font-semibold tracking-[0.18em] uppercase text-gray-500">
            Tramer / Hasar Kaydı
          </span>
          <div
            className={`mt-3 text-4xl font-black tracking-tight ${
              arac.tramer > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {arac.tramer ? `${arac.tramer.toLocaleString('tr-TR')} TL` : 'HASAR KAYDI YOK'}
          </div>
        </section>

        {/* EKSPERTİZ RAPORU LİSTESİ */}
        <section className="flex-1 mb-6">
          <div className="flex flex-col items-center mb-5">
            <h4 className="text-sm font-black tracking-[0.25em] uppercase text-gray-700">
              Ekspertiz Raporu
            </h4>
            <div className="mt-2 h-[2px] w-32 bg-gray-900" />
          </div>

          {arac.ekspertiz ? (
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {Object.keys(parcaIsimleri).map((key) => {
                const durum = arac.ekspertiz[key] || '-'
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between border-b border-dashed border-gray-200 pb-1"
                  >
                    <span className="text-gray-600 font-medium uppercase text-[11px]">
                      {parcaIsimleri[key]}
                    </span>
                    <span
                      className={`text-sm uppercase ${getDurumRenk(
                        durum
                      )} tracking-wide`}
                    >
                      {durum}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 italic py-10">
              Ekspertiz bilgisi girilmemiş.
            </div>
          )}
        </section>

        {/* FİYAT ALANI */}
        <section className="mt-auto pt-4 text-center">
  {fiyat ? (
    <div className="inline-flex flex-col items-center gap-2">
      {/* BAŞLIK – kutunun DIŞINDA */}
      <div className="text-xs md:text-sm font-black tracking-[0.35em] uppercase text-gray-800">
        Satış Fiyatı
      </div>

      {/* ÇERÇEVELİ KUTU */}
      <div className="px-10 py-5 border border-black rounded-xl inline-flex items-baseline gap-2">
        <span className="text-5xl md:text-6xl font-black tracking-tight leading-none text-gray-900">
          {fiyat}
        </span>
        <span className="text-3xl md:text-4xl font-black text-gray-900">
          ₺
        </span>
      </div>
    </div>
  ) : (
    <div className="border-2 border-dashed border-gray-300 px-8 py-5 text-gray-300 font-bold text-xl uppercase tracking-wide">
      Fiyat Bilgisi Alınız
    </div>
  )}
</section>


        {/* ALT BİLGİ SATIRI */}
        <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-500 tracking-[0.3em] uppercase font-semibold">
          Carbay Motors • Güvenilir İkinci Elin Adresi • İstanbul
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0mm;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }

        .text-carbay-gold {
          color: #ffb700 !important;
          text-shadow: 0 0 6px rgba(255, 183, 0, 0.45);
        }
      `}</style>
    </div>
  )
}
