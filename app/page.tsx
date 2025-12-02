'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [araclar, setAraclar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  
  // State'ler
  const [aramaMetni, setAramaMetni] = useState('')
  const [filtreDurumu, setFiltreDurumu] = useState('Hepsi') 
  const [oturumVarMi, setOturumVarMi] = useState(false)
  const [satilacakArac, setSatilacakArac] = useState<any>(null)
  const [satisFiyati, setSatisFiyati] = useState('')
  const [satisTarihi, setSatisTarihi] = useState('') 
  const [satisSozlesmesi, setSatisSozlesmesi] = useState<File | null>(null)
  const [satisYukleniyor, setSatisYukleniyor] = useState(false)
  const [sozlesmeArac, setSozlesmeArac] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState<'alis' | 'satis'>('alis')

  useEffect(() => {
    async function oturumKontrol() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
      else { setOturumVarMi(true); verileriGetir(); }
    }
    oturumKontrol()
  }, [router])

  async function verileriGetir() {
    const { data, error } = await supabase.from('cars').select('*, expenses(*)').order('created_at', { ascending: false })
    if (error) console.error(error)
    else setAraclar(data || [])
    setYukleniyor(false)
  }

  const cikisYap = async () => { await supabase.auth.signOut(); router.push('/login') }

  const gunFarkiHesapla = (alisTarihi: string, satisTarihi: string) => {
    if (!alisTarihi || !satisTarihi) return 0
    const d1 = new Date(alisTarihi); const d2 = new Date(satisTarihi)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
  }

  async function dosyaYukle(dosya: File) {
    const dosyaAdi = `sozlesme-${Date.now()}-${dosya.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const { data, error } = await supabase.storage.from('images').upload(`sozlesmeler/${dosyaAdi}`, dosya)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  const masrafHesapla = (arac: any) => {
    if (!arac.expenses) return 0
    return arac.expenses.reduce((toplam: number, item: any) => toplam + (item.tutar || 0), 0)
  }

  const aracSil = async (id: number) => {
    if (!confirm('Bu aracı silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('cars').delete().eq('id', id)
    if (error) alert('Hata: ' + error.message)
    else setAraclar(araclar.filter(arac => arac.id !== id))
  }

  const satisiTamamla = async () => {
    if (!satisFiyati || !satilacakArac || !satisTarihi) return alert('Lütfen bilgileri doldurun!')
    setSatisYukleniyor(true)
    try {
      let sozlesmeUrl = ''
      if (satisSozlesmesi) sozlesmeUrl = await dosyaYukle(satisSozlesmesi)
      const { error } = await supabase.from('cars').update({ durum: 'Satıldı', satis_bedeli: Number(satisFiyati), satis_tarihi: satisTarihi, satis_sozlesmesi_url: sozlesmeUrl }).eq('id', satilacakArac.id)
      if (error) throw error
      alert('🎉 Satış kaydedildi.'); setSatilacakArac(null); setSatisFiyati(''); setSatisTarihi(''); setSatisSozlesmesi(null); verileriGetir()
    } catch (error: any) { alert('Hata: ' + error.message) } 
    finally { setSatisYukleniyor(false) }
  }

  const whatsappPaylas = (arac: any) => {
    const bosluk = '%0A'
    let ekspertizMetni = ""
    if (arac.ekspertiz) {
        const parcaIsimleri: any = { kaput: 'Kaput', tavan: 'Tavan', bagaj: 'Bagaj', sol_on_camurluk: 'Sol Ön Çamurluk', sol_on_kapi: 'Sol Ön Kapı', sol_arka_kapi: 'Sol Arka Kapı', sol_arka_camurluk: 'Sol Arka Çamurluk', sag_on_camurluk: 'Sağ Ön Çamurluk', sag_on_kapi: 'Sağ Ön Kapı', sag_arka_kapi: 'Sağ Arka Kapı', sag_arka_camurluk: 'Sağ Arka Çamurluk' }
        let kusurlar = []
        for (const key in arac.ekspertiz) {
            const durum = arac.ekspertiz[key]
            if (durum && durum !== 'Orijinal' && parcaIsimleri[key]) kusurlar.push(`- ${parcaIsimleri[key]}: *${durum}*`)
        }
        if (kusurlar.length === 0) ekspertizMetni = `✅ *EKSPERTİZ: HATASIZ*`
        else ekspertizMetni = `⚠️ *EKSPERTİZ DURUMU:*${bosluk}${kusurlar.join(bosluk)}`
    } else ekspertizMetni = "ℹ️ Ekspertiz girilmemiş."
    const mesaj = `Merhaba, Carbay Motors güvencesiyle:${bosluk}${bosluk}🚗 *${arac.marka} ${arac.model}*${bosluk}📅 ${arac.yil} | 🛣 ${arac.kilometre} KM${bosluk}${ekspertizMetni}${bosluk}${bosluk}📸 Fotoğraf: ${arac.resim_url || 'Yok'}`
    window.open(`https://wa.me/?text=${mesaj}`, '_blank')
  }

  const filtrelenenAraclar = araclar.filter(arac => {
    const metinUyumu = arac.marka.toLowerCase().includes(aramaMetni.toLowerCase()) || arac.model.toLowerCase().includes(aramaMetni.toLowerCase()) || arac.plaka.toLowerCase().includes(aramaMetni.toLowerCase())
    let durumUyumu = true
    if (filtreDurumu === 'Stokta') durumUyumu = arac.durum !== 'Satıldı'
    else if (filtreDurumu === 'Satıldı') durumUyumu = arac.durum === 'Satıldı'
    return metinUyumu && durumUyumu
  })

  const toplamStokMaliyeti = araclar.filter(a => a.durum === 'Stokta').reduce((toplam, arac) => toplam + (arac.alis_fiyati || 0) + masrafHesapla(arac), 0)
  const toplamCiro = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => toplam + (arac.satis_bedeli || 0), 0)
  const toplamKar = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => {
      const maliyet = (arac.alis_fiyati || 0) + masrafHesapla(arac)
      return toplam + ((arac.satis_bedeli || 0) - maliyet)
    }, 0)

  if (!oturumVarMi && yukleniyor) return <div className="min-h-screen flex items-center justify-center bg-black text-[#FFD60A]">Yükleniyor...</div>

  return (
    // BU KISIM ÇOK ÖNEMLİ: Masaüstünde de mobil gibi görünmesini sağlayan yapı
    <div className="min-h-screen bg-black flex justify-center font-sans selection:bg-[#FFD60A] selection:text-black">
      <main className="w-full max-w-md bg-black min-h-screen relative shadow-2xl overflow-hidden pb-32 border-x border-gray-800/30">
        
        {/* ÜST BAŞLIK (Header) */}
        <header className="bg-black/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex justify-between items-center">
          <div onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="cursor-pointer">
            <h1 className="text-2xl font-black tracking-tighter text-white">
              CAR<span className="text-[#FFD60A]">BAY</span>
            </h1>
            <p className="text-[9px] tracking-[0.3em] text-gray-500 font-bold -mt-1">CELİL SEVİM</p>
          </div>
          <button onClick={cikisYap} className="w-8 h-8 rounded-full bg-[#1C1C1E] flex items-center justify-center text-gray-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
          </button>
        </header>

        {/* İÇERİK ALANI */}
        <div className="px-5 space-y-6 mt-2">
          
          {/* FİNANS KARTLARI (KAYDIRMALI) */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {/* Kart 1: Stok */}
            <div className="snap-center shrink-0 w-72 bg-[#1C1C1E] p-5 rounded-[24px] relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#FFD60A]/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Stok Değeri</p>
              <h2 className="text-3xl font-black text-white">{toplamStokMaliyeti.toLocaleString('tr-TR')} <span className="text-[#FFD60A] text-lg">₺</span></h2>
            </div>
            
            {/* Kart 2: Ciro */}
            <div className="snap-center shrink-0 w-72 bg-[#1C1C1E] p-5 rounded-[24px] relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Toplam Ciro</p>
              <h2 className="text-3xl font-black text-white">{toplamCiro.toLocaleString('tr-TR')} <span className="text-blue-500 text-lg">₺</span></h2>
            </div>

            {/* Kart 3: Kâr */}
            <div className="snap-center shrink-0 w-72 bg-[#1C1C1E] p-5 rounded-[24px] relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Net Kâr</p>
              <h2 className={`text-3xl font-black ${toplamKar >= 0 ? 'text-green-500' : 'text-red-500'}`}>{toplamKar.toLocaleString('tr-TR')} <span className="text-white text-lg">₺</span></h2>
            </div>
          </div>

          {/* ARAMA VE FİLTRE */}
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-500">🔍</span>
              <input type="text" placeholder="Araç Ara..." 
                className="w-full pl-11 pr-4 py-3 bg-[#1C1C1E] rounded-2xl text-sm font-medium outline-none focus:ring-1 focus:ring-[#FFD60A] transition-all"
                value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
            </div>
            <div className="flex bg-[#1C1C1E] p-1 rounded-xl">
              {['Hepsi', 'Stokta', 'Satıldı'].map((durum) => (
                <button key={durum} onClick={() => setFiltreDurumu(durum)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filtreDurumu === durum ? 'bg-[#FFD60A] text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500'}`}>
                  {durum}
                </button>
              ))}
            </div>
          </div>

          {/* ARAÇ LİSTESİ */}
          <div className="space-y-4">
            {yukleniyor && <div className="text-center text-gray-600 text-sm py-10 animate-pulse">Garaj yükleniyor...</div>}
            
            {filtrelenenAraclar.map((arac) => {
               const masrafTutari = masrafHesapla(arac)
               const netKar = (arac.satis_bedeli || 0) - ((arac.alis_fiyati || 0) + masrafTutari)
               const satisGunu = arac.durum === 'Satıldı' && arac.satis_tarihi ? gunFarkiHesapla(arac.alis_tarihi, arac.satis_tarihi) : null

               return (
                 <div key={arac.id} className="bg-[#1C1C1E] rounded-[24px] overflow-hidden border border-white/5 relative group">
                   
                   {/* Resim */}
                   <div className="h-48 relative">
                     {arac.resim_url ? <img src={arac.resim_url} className={`w-full h-full object-cover ${arac.durum === 'Satıldı' ? 'grayscale opacity-40' : ''}`} /> : <div className="w-full h-full bg-[#2C2C2E] flex items-center justify-center text-gray-600 text-xs">Resim Yok</div>}
                     <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] to-transparent opacity-90"></div>
                     
                     {/* Etiketler */}
                     <div className="absolute top-3 left-3 flex gap-2">
                        {arac.durum === 'Satıldı' && <span className="bg-black/50 backdrop-blur-md border border-[#FFD60A] text-[#FFD60A] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">SATILDI</span>}
                        {satisGunu !== null && <span className="bg-green-500/20 backdrop-blur-md text-green-400 px-3 py-1 rounded-full text-[10px] font-bold">⏱ {satisGunu} Gün</span>}
                     </div>
                     <span className="absolute top-3 right-3 bg-white/10 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold">{arac.yil}</span>
                     
                     {/* Fiyat (Resim Üzerinde) */}
                     {arac.durum !== 'Satıldı' && (
                        <div className="absolute bottom-3 left-4">
                            <p className="text-gray-400 text-[9px] font-bold uppercase mb-0.5">Satış Fiyatı</p>
                            <p className="text-2xl font-black text-white tracking-tight">{arac.satis_fiyati ? arac.satis_fiyati.toLocaleString('tr-TR') : '---'} <span className="text-[#FFD60A] text-sm">₺</span></p>
                        </div>
                     )}
                   </div>

                   {/* Detaylar */}
                   <div className="p-5 pt-2">
                     <div className="flex justify-between items-start mb-4">
                       <div>
                         <h3 className="text-lg font-bold text-white leading-tight">{arac.marka} {arac.model}</h3>
                         <p className="text-xs text-gray-500 mt-1 font-mono">{arac.plaka}</p>
                       </div>
                     </div>

                     {/* Özellik Hapları */}
                     <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar">
                        <span className="bg-[#2C2C2E] px-3 py-1.5 rounded-lg text-[10px] text-gray-300 whitespace-nowrap">{arac.yakit}</span>
                        <span className="bg-[#2C2C2E] px-3 py-1.5 rounded-lg text-[10px] text-gray-300 whitespace-nowrap">{arac.vites}</span>
                        <span className="bg-[#2C2C2E] px-3 py-1.5 rounded-lg text-[10px] text-gray-300 whitespace-nowrap">{arac.kilometre.toLocaleString('tr-TR')} KM</span>
                     </div>

                     {/* İşlem Butonları */}
                     <div className="grid grid-cols-4 gap-2">
                        {arac.durum !== 'Satıldı' ? (
                            <button onClick={() => { setSatilacakArac(arac); setSatisTarihi(new Date().toISOString().split('T')[0]) }} className="col-span-2 bg-[#FFD60A] text-black rounded-xl py-3 font-bold text-xs hover:bg-yellow-400 active:scale-95 transition">💰 Satış Yap</button>
                        ) : (
                            <div className="col-span-2 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col justify-center items-center py-1">
                                <span className="text-[9px] text-green-500 font-bold uppercase">Net Kâr</span>
                                <span className="text-sm font-black text-white">{netKar.toLocaleString('tr-TR')} ₺</span>
                            </div>
                        )}
                        <button onClick={() => whatsappPaylas(arac)} className="bg-[#2C2C2E] text-white rounded-xl flex items-center justify-center text-lg active:scale-95 transition">📲</button>
                        <button onClick={() => router.push(`/arac-duzenle/${arac.id}`)} className="bg-[#2C2C2E] text-white rounded-xl flex items-center justify-center text-lg active:scale-95 transition">✏️</button>
                     </div>
                   </div>
                 </div>
               )
            })}
          </div>
        </div>

        {/* --- ALT DOCK MENÜ (Yüzen Tasarım) --- */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-2 flex justify-between items-center shadow-2xl z-50">
            
            <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-500 hover:text-[#FFD60A] transition">
                <span className="text-xl">🏠</span>
            </button>

            <button onClick={() => router.push('/musteriler')} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-500 hover:text-[#FFD60A] transition">
                <span className="text-xl">📒</span>
            </button>

            {/* ORTA BUTON (Taşan) */}
            <div className="relative -top-8">
                <button onClick={() => router.push('/arac-ekle')} className="w-14 h-14 bg-[#FFD60A] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,214,10,0.4)] text-black border-[4px] border-black active:scale-95 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </button>
            </div>

            <button onClick={() => router.push('/kasa')} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-500 hover:text-[#FFD60A] transition">
                <span className="text-xl">💰</span>
            </button>

            <button onClick={() => router.push('/analiz')} className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-500 hover:text-[#FFD60A] transition">
                <span className="text-xl">📊</span>
            </button>
        </div>

      </main>

      {/* --- MODALLAR (Aynı Kalan Kısımlar) --- */}
      {/* (Sözleşme ve Satış Modalları buraya gelecek - kodun devamı aynı) */}
      {satilacakArac && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1C1E] rounded-[2rem] shadow-2xl w-full max-w-sm p-6 border border-white/10">
            <div className="text-center mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Satış Onayı</h3>
              <p className="text-xs text-gray-500 mt-1">{satilacakArac.marka} {satilacakArac.model}</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-[#FFD60A] uppercase block mb-1">Satış Fiyatı</label>
                    <input type="number" autoFocus value={satisFiyati} onChange={(e) => setSatisFiyati(e.target.value)} className="w-full text-3xl font-black bg-transparent border-b border-white/20 text-white focus:border-[#FFD60A] outline-none py-1" placeholder="0" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tarih</label>
                    <input type="date" value={satisTarihi} onChange={(e) => setSatisTarihi(e.target.value)} className="w-full p-3 bg-[#2C2C2E] rounded-xl text-white outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Sözleşme</label>
                    <input type="file" onChange={(e) => setSatisSozlesmesi(e.target.files ? e.target.files[0] : null)} className="w-full text-xs text-gray-400" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setSatilacakArac(null)} className="py-3 bg-[#2C2C2E] text-white rounded-xl font-bold text-sm">İptal</button>
              <button onClick={satisiTamamla} disabled={satisYukleniyor} className="py-3 bg-[#FFD60A] text-black rounded-xl font-bold text-sm shadow-lg">{satisYukleniyor ? '...' : 'Onayla'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}