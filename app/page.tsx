'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [araclar, setAraclar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  
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
    <div className="min-h-screen bg-black font-sans selection:bg-[#FFD60A] selection:text-black">
      
      {/* --- ÜST MENÜ (Masaüstü için Geniş, Mobil için Sade) --- */}
      <header className="bg-black/90 backdrop-blur-md sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="cursor-pointer group">
            <h1 className="text-2xl font-black tracking-tighter text-white group-hover:scale-105 transition-transform">
              CAR<span className="text-[#FFD60A]">BAY</span>
            </h1>
            <p className="text-[9px] tracking-[0.3em] text-gray-500 font-bold -mt-1 uppercase">Celil Sevim</p>
          </div>
          
          {/* MASAÜSTÜ MENÜSÜ (Mobilde Gizli: hidden md:flex) */}
          <div className="hidden md:flex items-center gap-4">
             <button onClick={() => router.push('/musteriler')} className="text-gray-400 hover:text-white transition font-medium flex items-center gap-2">📒 Müşteriler</button>
             <button onClick={() => router.push('/kasa')} className="text-gray-400 hover:text-white transition font-medium flex items-center gap-2">💰 Kasa</button>
             <button onClick={() => router.push('/analiz')} className="text-gray-400 hover:text-white transition font-medium flex items-center gap-2">📊 Analiz</button>
             <button onClick={() => router.push('/arac-ekle')} className="bg-[#FFD60A] hover:bg-yellow-400 text-black px-5 py-2 rounded-full font-bold transition shadow-lg shadow-yellow-500/20 active:scale-95">
              + Yeni Araç
            </button>
             <button onClick={cikisYap} className="w-10 h-10 rounded-full bg-[#1C1C1E] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
             </button>
          </div>
        </div>
      </header>

      {/* --- İÇERİK ALANI --- 
          max-w-7xl ve mx-auto sayesinde geniş ekranda ortalanır ve yayılır.
      */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        
        {/* FİNANS KARTLARI - Grid Yapısı (Mobilde 1, Masaüstünde 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#151515] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-[#FFD60A]/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-[#FFD60A]/10 transition-colors"></div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Stok Değeri</p>
            <h2 className="text-4xl font-black text-white tracking-tight">{toplamStokMaliyeti.toLocaleString('tr-TR')} <span className="text-[#FFD60A] text-2xl">₺</span></h2>
          </div>
          
          <div className="bg-[#151515] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors"></div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Toplam Ciro</p>
            <h2 className="text-4xl font-black text-white tracking-tight">{toplamCiro.toLocaleString('tr-TR')} <span className="text-blue-500 text-2xl">₺</span></h2>
          </div>

          <div className="bg-[#151515] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-green-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-3xl -mr-8 -mt-8 group-hover:bg-green-500/10 transition-colors"></div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Net Kâr</p>
            <h2 className={`text-4xl font-black tracking-tight ${toplamKar >= 0 ? 'text-green-500' : 'text-red-500'}`}>{toplamKar.toLocaleString('tr-TR')} <span className="text-white text-2xl">₺</span></h2>
          </div>
        </div>

        {/* ARAMA VE FİLTRE */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="relative w-full md:w-96 group">
            <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-[#FFD60A] transition-colors">🔍</span>
            <input type="text" placeholder="Araç Ara..." 
              className="w-full pl-12 pr-4 py-3 bg-[#151515] border border-white/5 rounded-2xl text-white placeholder-gray-600 focus:border-[#FFD60A] focus:ring-1 focus:ring-[#FFD60A] outline-none transition-all shadow-lg"
              value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
          </div>
          
          <div className="flex bg-[#151515] p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto">
            {['Hepsi', 'Stokta', 'Satıldı'].map((durum) => (
              <button key={durum} onClick={() => setFiltreDurumu(durum)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${filtreDurumu === durum ? 'bg-[#FFD60A] text-black shadow-lg shadow-yellow-500/20' : 'text-gray-500 hover:text-white'}`}>
                {durum}
              </button>
            ))}
          </div>
        </div>

        {/* ARAÇ LİSTESİ - Grid Yapısı */}
        <div className="space-y-6">
            {yukleniyor && <div className="text-center text-gray-600 text-sm py-10 animate-pulse">Garaj yükleniyor...</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtrelenenAraclar.map((arac) => {
                const masrafTutari = masrafHesapla(arac)
                const netKar = (arac.satis_bedeli || 0) - ((arac.alis_fiyati || 0) + masrafTutari)
                const satisGunu = arac.durum === 'Satıldı' && arac.satis_tarihi ? gunFarkiHesapla(arac.alis_tarihi, arac.satis_tarihi) : null

                return (
                    <div key={arac.id} className="bg-[#151515] rounded-[2rem] overflow-hidden border border-white/5 relative group hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                    
                    <div className="h-56 relative overflow-hidden">
                        {arac.resim_url ? <img src={arac.resim_url} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${arac.durum === 'Satıldı' ? 'grayscale opacity-40' : ''}`} /> : <div className="w-full h-full bg-[#222] flex items-center justify-center text-gray-600 text-xs">Resim Yok</div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent opacity-90"></div>
                        
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                            {arac.durum === 'Satıldı' && <span className="bg-black/60 backdrop-blur-md border border-[#FFD60A] text-[#FFD60A] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl">SATILDI</span>}
                            {satisGunu !== null && <span className="bg-green-500/20 backdrop-blur-md text-green-400 px-3 py-1 rounded-lg text-[10px] font-bold w-fit">⏱ {satisGunu} Gün</span>}
                        </div>
                        <span className="absolute top-4 right-4 bg-white/10 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg border border-white/10">{arac.yil}</span>
                        
                        {arac.durum !== 'Satıldı' && (
                            <div className="absolute bottom-4 left-4">
                                <p className="text-gray-400 text-[9px] font-bold uppercase mb-0.5 tracking-wider">Satış Fiyatı</p>
                                <p className="text-3xl font-black text-white tracking-tight leading-none">{arac.satis_fiyati ? arac.satis_fiyati.toLocaleString('tr-TR') : '---'} <span className="text-[#FFD60A] text-sm">₺</span></p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 pt-2">
                        <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-white leading-tight">{arac.marka} {arac.model}</h3>
                            <p className="text-xs text-gray-500 mt-1 font-mono tracking-wide">{arac.plaka}</p>
                        </div>
                        </div>

                        {masrafTutari > 0 && <div className="mb-5 text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg w-fit flex items-center gap-1">🛠️ {masrafTutari.toLocaleString('tr-TR')} TL Masraf</div>}
                        
                        <div className="flex gap-2 mb-6 text-xs font-medium text-gray-400 overflow-x-auto hide-scrollbar pb-1">
                            <span className="bg-[#222] border border-white/5 px-3 py-1.5 rounded-lg whitespace-nowrap">{arac.yakit}</span>
                            <span className="bg-[#222] border border-white/5 px-3 py-1.5 rounded-lg whitespace-nowrap">{arac.vites}</span>
                            <span className="bg-[#222] border border-white/5 px-3 py-1.5 rounded-lg whitespace-nowrap">{arac.kilometre.toLocaleString('tr-TR')} KM</span>
                        </div>

                        <div className="flex gap-3 border-t border-white/5 pt-5">
                            {arac.durum !== 'Satıldı' ? (
                                <button onClick={() => { setSatilacakArac(arac); setSatisTarihi(new Date().toISOString().split('T')[0]) }} className="flex-1 bg-[#FFD60A] text-black hover:bg-yellow-400 py-3 rounded-xl transition font-bold flex justify-center items-center gap-2 text-xs shadow-lg shadow-yellow-500/20">
                                    <span>💰</span> Satış Yap
                                </button>
                            ) : (
                                <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col justify-center items-center py-1">
                                    <span className="text-[9px] text-green-500 font-bold uppercase">Net Kâr</span>
                                    <span className="text-sm font-black text-white">{netKar.toLocaleString('tr-TR')} ₺</span>
                                </div>
                            )}
                            
                            <div className="flex gap-2">
                                <button onClick={() => whatsappPaylas(arac)} className="bg-[#222] hover:bg-[#25D366] hover:text-white text-gray-400 w-10 h-10 rounded-xl flex items-center justify-center transition text-lg" title="WhatsApp">📲</button>
                                <button onClick={() => { setSozlesmeArac(arac); setAktifSekme('alis') }} className="bg-[#222] hover:bg-white/20 text-gray-400 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition text-lg" title="Dosyalar">📂</button>
                                <button onClick={() => window.open(`/arac-vitrin/${arac.id}`, '_blank')} className="bg-[#222] hover:bg-white/20 text-gray-400 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition text-lg" title="Yazdır">🖨️</button>
                                <button onClick={() => router.push(`/arac-duzenle/${arac.id}`)} className="bg-[#222] hover:bg-blue-500 hover:text-white text-gray-400 w-10 h-10 rounded-xl flex items-center justify-center transition text-lg" title="Düzenle">✏️</button>
                            </div>
                        </div>
                    </div>
                    </div>
                )
                })}
            </div>
        </div>

      </main>

      {/* --- ALT DOCK MENÜ (Sadece Mobilde Görünür: md:hidden) --- */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-16 bg-[#151515]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] flex justify-between items-center px-6 shadow-2xl z-50">
            
            <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center justify-center gap-1 text-white transition hover:scale-110">
                <span className="text-xl">🏠</span>
            </button>

            <button onClick={() => router.push('/musteriler')} className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-white transition hover:scale-110">
                <span className="text-xl">📒</span>
            </button>

            {/* ORTA BUTON (Taşan) */}
            <div className="relative -top-8">
                <button onClick={() => router.push('/arac-ekle')} className="w-16 h-16 bg-[#FFD60A] rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(255,214,10,0.5)] text-black border-[5px] border-[#000000] active:scale-95 transition hover:scale-105">
                    <span className="text-3xl font-light mb-1">+</span>
                </button>
            </div>

            <button onClick={() => router.push('/kasa')} className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-white transition hover:scale-110">
                <span className="text-xl">💰</span>
            </button>

            <button onClick={() => router.push('/analiz')} className="flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-white transition hover:scale-110">
                <span className="text-xl">📊</span>
            </button>
        </div>

      {/* MODALLAR */}
      {sozlesmeArac && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] rounded-[2rem] shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-white/10">
            <div className="p-5 bg-black/50 text-white flex justify-between items-center border-b border-white/10">
              <div><h3 className="font-bold text-[#FFD60A] text-lg">Dosyalar</h3><p className="text-xs text-gray-400">{sozlesmeArac.marka}</p></div>
              <button onClick={() => setSozlesmeArac(null)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
            </div>
            <div className="flex border-b border-white/10 bg-black/20">
              <button onClick={() => setAktifSekme('alis')} className={`flex-1 py-4 font-bold text-sm transition ${aktifSekme === 'alis' ? 'border-b-2 border-[#FFD60A] text-[#FFD60A]' : 'text-gray-500'}`}>📥 Alış</button>
              <button onClick={() => setAktifSekme('satis')} className={`flex-1 py-4 font-bold text-sm transition ${aktifSekme === 'satis' ? 'border-b-2 border-[#FFD60A] text-[#FFD60A]' : 'text-gray-500'}`}>📤 Satış</button>
            </div>
            <div className="flex-1 p-6 bg-[#121212] overflow-auto flex items-center justify-center relative">
              {aktifSekme === 'alis' && (sozlesmeArac.sozlesme_url ? <img src={sozlesmeArac.sozlesme_url} className="max-w-full max-h-full shadow-lg rounded-xl" /> : <div className="text-gray-600 text-center"><span className="text-5xl block mb-4 opacity-30">📂</span>Dosya Yok</div>)}
              {aktifSekme === 'satis' && (sozlesmeArac.satis_sozlesmesi_url ? <img src={sozlesmeArac.satis_sozlesmesi_url} className="max-w-full max-h-full shadow-lg rounded-xl" /> : <div className="text-gray-600 text-center"><span className="text-5xl block mb-4 opacity-30">📂</span>Dosya Yok</div>)}
            </div>
          </div>
        </div>
      )}

      {satilacakArac && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-white/10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Satış Onayı</h3>
              <div className="w-16 h-1 bg-[#FFD60A] mx-auto mt-3 rounded-full"></div>
            </div>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-[#FFD60A] uppercase mb-2">Satış Fiyatı (TL)</label>
                    <input type="number" autoFocus value={satisFiyati} onChange={(e) => setSatisFiyati(e.target.value)} className="w-full text-4xl font-black bg-transparent border-b-2 border-white/20 focus:border-[#FFD60A] outline-none text-white p-2" placeholder="0" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tarih</label>
                    <input type="date" value={satisTarihi} onChange={(e) => setSatisTarihi(e.target.value)} className="w-full p-4 bg-[#2C2C2E] border border-white/10 rounded-xl text-white outline-none focus:border-[#FFD60A]" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sözleşme</label>
                    <input type="file" accept="image/*" onChange={(e) => setSatisSozlesmesi(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FFD60A] file:text-black hover:file:bg-yellow-400" />
                </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setSatilacakArac(null)} className="flex-1 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition">İptal</button>
              <button onClick={satisiTamamla} disabled={satisYukleniyor} className="flex-1 py-4 bg-[#FFD60A] text-black font-bold rounded-xl hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition active:scale-95">{satisYukleniyor ? '...' : 'Tamamla'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}