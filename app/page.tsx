'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [araclar, setAraclar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  
  // Arama ve Filtre
  const [aramaMetni, setAramaMetni] = useState('')
  const [filtreDurumu, setFiltreDurumu] = useState('Hepsi') 
  const [oturumVarMi, setOturumVarMi] = useState(false)

  // Modallar
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
      else {
        setOturumVarMi(true)
        verileriGetir()
      }
    }
    oturumKontrol()
  }, [router])

  async function verileriGetir() {
    const { data, error } = await supabase
      .from('cars')
      .select('*, expenses(*)') 
      .order('created_at', { ascending: false })
    
    if (error) console.error(error)
    else setAraclar(data || [])
    setYukleniyor(false)
  }

  const cikisYap = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const gunFarkiHesapla = (alisTarihi: string, satisTarihi: string) => {
    if (!alisTarihi || !satisTarihi) return 0
    const d1 = new Date(alisTarihi)
    const d2 = new Date(satisTarihi)
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
    if (!confirm('Bu aracı kalıcı olarak silmek istediğinize emin misiniz?')) return;
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

      const { error } = await supabase.from('cars').update({ 
        durum: 'Satıldı', 
        satis_bedeli: Number(satisFiyati),
        satis_tarihi: satisTarihi,
        satis_sozlesmesi_url: sozlesmeUrl 
      }).eq('id', satilacakArac.id)

      if (error) throw error
      alert('🎉 Satış kaydedildi.')
      setSatilacakArac(null); setSatisFiyati(''); setSatisTarihi(''); setSatisSozlesmesi(null); verileriGetir()
    } catch (error: any) { alert('Hata: ' + error.message) } 
    finally { setSatisYukleniyor(false) }
  }

  const whatsappPaylas = (arac: any) => {
    const bosluk = '%0A'
    let ekspertizMetni = ""
    if (arac.ekspertiz) {
        const parcaIsimleri: any = {
            kaput: 'Kaput', tavan: 'Tavan', bagaj: 'Bagaj',
            sol_on_camurluk: 'Sol Ön Çamurluk', sol_on_kapi: 'Sol Ön Kapı',
            sol_arka_kapi: 'Sol Arka Kapı', sol_arka_camurluk: 'Sol Arka Çamurluk',
            sag_on_camurluk: 'Sağ Ön Çamurluk', sag_on_kapi: 'Sağ Ön Kapı',
            sag_arka_kapi: 'Sağ Arka Kapı', sag_arka_camurluk: 'Sağ Arka Çamurluk'
        }
        let kusurlar = []
        for (const key in arac.ekspertiz) {
            const durum = arac.ekspertiz[key]
            if (durum && durum !== 'Orijinal' && parcaIsimleri[key]) {
                kusurlar.push(`- ${parcaIsimleri[key]}: *${durum}*`)
            }
        }
        if (kusurlar.length === 0) ekspertizMetni = `✅ *EKSPERTİZ: HATASIZ - BOYASIZ*`
        else ekspertizMetni = `⚠️ *EKSPERTİZ DURUMU:*${bosluk}${kusurlar.join(bosluk)}`
    } else ekspertizMetni = "ℹ️ Ekspertiz girilmemiş."

    const mesaj = `Merhaba, Carbay Motors güvencesiyle:${bosluk}${bosluk}🚗 *${arac.marka} ${arac.model}*${bosluk}📅 ${arac.yil} | 🛣 ${arac.kilometre} KM${bosluk}${ekspertizMetni}${bosluk}${bosluk}📸 Fotoğraf: ${arac.resim_url || 'Yok'}`
    window.open(`https://wa.me/?text=${mesaj}`, '_blank')
  }

  const filtrelenenAraclar = araclar.filter(arac => {
    const metinUyumu = 
      arac.marka.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      arac.model.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      arac.plaka.toLowerCase().includes(aramaMetni.toLowerCase())
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

  if (!oturumVarMi && yukleniyor) return <div className="min-h-screen flex items-center justify-center bg-[#121212] text-[#FFB700]">Yükleniyor...</div>

  return (
    // Zemin rengi globals.css'ten geliyor ama garanti olsun diye buraya da ekledik
    <main className="min-h-screen bg-[#121212] pb-36 font-sans"> 
      
      {/* ÜST MENÜ: Görseldeki gibi koyu ve şık */}
      <header className="bg-[#121212] sticky top-0 z-20 pt-4 pb-2 px-4 border-b border-white/5 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex flex-col cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="flex items-center text-3xl font-black tracking-tighter">
              <span className="text-[#FFB700]">CAR</span><span className="text-white">BAY</span>
            </div>
            <div className="text-[10px] tracking-[0.4em] text-white/50 font-medium -mt-1 ml-1 uppercase">Celil Sevim</div>
          </div>
          
          {/* MASAÜSTÜ BUTONLAR */}
          <div className="hidden md:flex items-center gap-3">
             <button onClick={() => router.push('/musteriler')} className="text-gray-400 hover:text-[#FFB700] px-4 py-2 font-bold flex items-center gap-2 transition-colors">
                <span className="text-xl">📒</span> Müşteriler
             </button>
             <button onClick={() => router.push('/kasa')} className="text-gray-400 hover:text-[#FFB700] px-4 py-2 font-bold flex items-center gap-2 transition-colors">
                <span className="text-xl">💰</span> Kasa
             </button>
             <button onClick={() => router.push('/arac-ekle')} className="bg-[#FFB700] hover:bg-yellow-400 text-black px-6 py-2.5 rounded-full font-bold shadow-[0_0_20px_rgba(255,183,0,0.3)] active:scale-95 transition-all">
              + Yeni Araç
            </button>
             <button onClick={cikisYap} className="text-gray-500 hover:text-white px-3 py-2.5 font-medium text-sm ml-2">Çıkış</button>
          </div>
        </div>
      </header>

      {/* İÇERİK */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* FİNANSAL KARTLAR - Görseldeki gibi koyu gri, çok yuvarlak köşeli */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Kart 1 */}
          <div className="bg-[#1E1E1E] p-6 rounded-[2rem] shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-5 opacity-5 text-6xl text-white">📦</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Stok Maliyeti</div>
            <div className="text-3xl font-black text-white tracking-tight">{toplamStokMaliyeti.toLocaleString('tr-TR')} <span className="text-lg text-[#FFB700]">₺</span></div>
          </div>
          {/* Kart 2 */}
          <div className="bg-[#1E1E1E] p-6 rounded-[2rem] shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-5 opacity-5 text-6xl text-[#FFB700]">📈</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Toplam Ciro</div>
            <div className="text-3xl font-black text-[#FFB700] tracking-tight">{toplamCiro.toLocaleString('tr-TR')} <span className="text-lg text-white">₺</span></div>
          </div>
          {/* Kart 3 */}
          <div className="bg-[#1E1E1E] p-6 rounded-[2rem] shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-5 opacity-5 text-6xl text-green-500">💵</div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Net Kâr</div>
            <div className={`text-3xl font-black tracking-tight ${toplamKar >= 0 ? 'text-green-500' : 'text-red-500'}`}>{toplamKar.toLocaleString('tr-TR')} <span className="text-lg text-white">₺</span></div>
          </div>
        </div>

        {/* ARAMA VE FİLTRE - Koyu tema */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="relative w-full md:w-96">
            <span className="absolute left-4 top-3.5 text-gray-500 text-lg">🔍</span>
            <input type="text" placeholder="Marka, Model veya Plaka..." 
              className="w-full pl-12 pr-4 py-3 bg-[#1E1E1E] border border-white/5 rounded-full text-white placeholder-gray-500 focus:border-[#FFB700] focus:ring-1 focus:ring-[#FFB700] outline-none transition-all shadow-sm"
              value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
          </div>
          
          <div className="flex bg-[#1E1E1E] p-1.5 rounded-full w-full md:w-auto border border-white/5">
            {['Hepsi', 'Stokta', 'Satıldı'].map((durum) => (
              <button key={durum} onClick={() => setFiltreDurumu(durum)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${filtreDurumu === durum ? 'bg-[#FFB700] text-black shadow-lg shadow-yellow-500/20' : 'text-gray-400 hover:text-white'}`}>
                {durum}
              </button>
            ))}
          </div>
        </div>

        {/* ARAÇ LİSTESİ */}
        {yukleniyor && !araclar.length ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">Veriler Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filtrelenenAraclar.length === 0 ? <div className="col-span-3 text-center text-gray-500 py-20 bg-[#1E1E1E] rounded-[2rem] border border-white/5">Araç bulunamadı.</div> : null}
             
             {filtrelenenAraclar.map((arac) => {
                const masrafTutari = masrafHesapla(arac)
                const toplamMaliyet = (arac.alis_fiyati || 0) + masrafTutari
                const netKar = (arac.satis_bedeli || 0) - toplamMaliyet
                const satisGunu = arac.durum === 'Satıldı' && arac.satis_tarihi ? gunFarkiHesapla(arac.alis_tarihi, arac.satis_tarihi) : null

                return (
                  // KART TASARIMI: Koyu Gri, Yumuşak Köşeler
                  <div key={arac.id} className={`bg-[#1E1E1E] rounded-[2rem] shadow-lg overflow-hidden group relative border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1`}>
                    
                    <div className="relative h-56 bg-[#2C2C2E]">
                      {arac.resim_url ? <img src={arac.resim_url} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${arac.durum === 'Satıldı' ? 'grayscale opacity-50' : ''}`} /> : <div className="flex items-center justify-center h-full text-gray-600 text-sm">Resim Yok</div>}
                      
                      {/* Üstteki Gradient Gölge (Yazılar Okunsun Diye) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] via-transparent to-transparent opacity-90"></div>

                      {arac.durum === 'Satıldı' && <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"><span className="border-4 border-[#FFB700] text-[#FFB700] font-black text-3xl -rotate-12 px-6 py-2 rounded-xl bg-black tracking-widest shadow-2xl">SATILDI</span></div>}
                      
                      {satisGunu !== null && <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">⏱️ {satisGunu} Günde</div>}
                      
                      {/* Yıl Rozeti */}
                      <div className="absolute top-4 right-4 bg-[#FFB700] text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">{arac.yil}</div>

                      {/* Fiyat (Resmin Üzerinde) */}
                      {arac.durum !== 'Satıldı' && (
                          <div className="absolute bottom-4 left-4">
                              <p className="text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">Satış Fiyatı</p>
                              <div className="text-2xl font-black text-white tracking-tight">{arac.satis_fiyati ? arac.satis_fiyati.toLocaleString('tr-TR') : '---'} <span className="text-sm text-[#FFB700]">₺</span></div>
                          </div>
                      )}
                    </div>

                    <div className="p-6 pt-2 relative">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white leading-tight">{arac.marka} {arac.model}</h3>
                          <p className="text-xs text-gray-400 mt-1 font-mono bg-white/5 px-2 py-1 rounded-lg inline-block border border-white/5">{arac.plaka}</p>
                        </div>
                      </div>

                      {masrafTutari > 0 && <div className="mb-4 text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full w-fit flex items-center gap-1">🛠️ {masrafTutari.toLocaleString('tr-TR')} TL Masraf</div>}
                      
                      <div className="flex gap-2 mb-6 text-xs font-medium text-gray-400">
                        <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{arac.yakit}</span>
                        <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{arac.vites}</span>
                        <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{arac.kilometre.toLocaleString('tr-TR')} KM</span>
                      </div>

                      {/* BUTONLAR - Koyu temaya uygun */}
                      <div className="flex gap-2 border-t border-white/10 pt-4">
                         {arac.durum !== 'Satıldı' && <button onClick={() => { setSatilacakArac(arac); setSatisTarihi(new Date().toISOString().split('T')[0]) }} className="flex-1 bg-green-500/10 hover:bg-green-500 hover:text-black text-green-500 p-3 rounded-2xl transition font-bold flex justify-center items-center gap-1">💰 Sat</button>}
                         
                         <button onClick={() => whatsappPaylas(arac)} className="bg-[#25D366]/10 hover:bg-[#25D366] hover:text-white text-[#25D366] p-3 rounded-2xl transition flex-1 flex justify-center" title="WhatsApp">📲</button>
                         
                         <div className="flex gap-2">
                            <button onClick={() => { setSozlesmeArac(arac); setAktifSekme('alis') }} className="bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white p-3 rounded-2xl transition" title="Dosyalar">📂</button>
                            <button onClick={() => window.open(`/arac-vitrin/${arac.id}`, '_blank')} className="bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white p-3 rounded-2xl transition" title="Yazdır">🖨️</button>
                            <button onClick={() => router.push(`/arac-duzenle/${arac.id}`)} className="bg-white/5 hover:bg-blue-500 hover:text-white text-gray-400 p-3 rounded-2xl transition" title="Düzenle">✏️</button>
                            <button onClick={() => aracSil(arac.id)} className="bg-white/5 hover:bg-red-500 hover:text-white text-gray-400 p-3 rounded-2xl transition" title="Sil">🗑️</button>
                         </div>
                      </div>

                      {arac.durum === 'Satıldı' && (
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                             <div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Net Kâr</div><div className={`text-2xl font-black ${netKar >= 0 ? 'text-green-500' : 'text-red-500'}`}>{netKar.toLocaleString('tr-TR')} ₺</div></div>
                             <div className="text-right"><div className="text-[10px] text-gray-500 uppercase tracking-wider">Satış Rakamı</div><div className="font-bold text-white text-lg">{arac.satis_bedeli?.toLocaleString('tr-TR')} ₺</div></div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* --- MOBİL ALT MENÜ (DOCK STİLİ) --- */}
      {/* Görseldeki gibi: Alt taraf siyah, üst çizgi yok veya çok ince, butonlar hizalı */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#121212]/90 backdrop-blur-xl border-t border-white/5 flex justify-around items-end px-4 py-2 z-50 pb-safe-area-inset-bottom">
        
        <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center justify-center w-16 text-gray-500 hover:text-[#FFB700] active:text-[#FFB700] transition-colors pb-2">
          <span className="text-2xl mb-1">🏠</span>
          <span className="text-[10px] font-bold tracking-wide">Garaj</span>
        </button>

        <button onClick={() => router.push('/musteriler')} className="flex flex-col items-center justify-center w-16 text-gray-500 hover:text-[#FFB700] active:text-[#FFB700] transition-colors pb-2">
          <span className="text-2xl mb-1">📒</span>
          <span className="text-[10px] font-bold tracking-wide">Müşteri</span>
        </button>
        
        {/* ORTA EKLE BUTONU - Düzgün Hizalanmış */}
        <div className="relative -top-5">
           <button onClick={() => router.push('/arac-ekle')} 
             className="w-16 h-16 bg-[#FFB700] rounded-2xl shadow-[0_0_20px_rgba(255,183,0,0.4)] flex items-center justify-center transform active:scale-95 transition-all text-black hover:bg-yellow-400">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </button>
        </div>

        <button onClick={() => router.push('/kasa')} className="flex flex-col items-center justify-center w-16 text-gray-500 hover:text-[#FFB700] active:text-[#FFB700] transition-colors pb-2">
          <span className="text-2xl mb-1">💰</span>
          <span className="text-[10px] font-bold tracking-wide">Kasa</span>
        </button>

        <button onClick={() => router.push('/analiz')} className="flex flex-col items-center justify-center w-16 text-gray-500 hover:text-[#FFB700] active:text-[#FFB700] transition-colors pb-2">
          <span className="text-2xl mb-1">📊</span>
          <span className="text-[10px] font-bold tracking-wide">Analiz</span>
        </button>

      </nav>

      {/* MODALLAR (Koyu Tema) */}
      {/* Sözleşmeler */}
      {sozlesmeArac && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-[2rem] shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-white/10">
            <div className="p-5 bg-black/50 text-white flex justify-between items-center border-b border-white/10">
              <div><h3 className="font-bold text-[#FFB700] text-lg">Dosyalar</h3><p className="text-xs text-gray-400">{sozlesmeArac.marka}</p></div>
              <button onClick={() => setSozlesmeArac(null)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
            </div>
            <div className="flex border-b border-white/10 bg-black/20">
              <button onClick={() => setAktifSekme('alis')} className={`flex-1 py-4 font-bold text-sm transition ${aktifSekme === 'alis' ? 'border-b-2 border-[#FFB700] text-[#FFB700]' : 'text-gray-500'}`}>📥 Alış</button>
              <button onClick={() => setAktifSekme('satis')} className={`flex-1 py-4 font-bold text-sm transition ${aktifSekme === 'satis' ? 'border-b-2 border-[#FFB700] text-[#FFB700]' : 'text-gray-500'}`}>📤 Satış</button>
            </div>
            <div className="flex-1 p-6 bg-[#121212] overflow-auto flex items-center justify-center relative">
              {aktifSekme === 'alis' && (sozlesmeArac.sozlesme_url ? <img src={sozlesmeArac.sozlesme_url} className="max-w-full max-h-full shadow-lg rounded-xl" /> : <div className="text-gray-600 text-center"><span className="text-5xl block mb-4 opacity-30">📂</span>Dosya Yok</div>)}
              {aktifSekme === 'satis' && (sozlesmeArac.satis_sozlesmesi_url ? <img src={sozlesmeArac.satis_sozlesmesi_url} className="max-w-full max-h-full shadow-lg rounded-xl" /> : <div className="text-gray-600 text-center"><span className="text-5xl block mb-4 opacity-30">📂</span>Dosya Yok</div>)}
            </div>
          </div>
        </div>
      )}

      {/* Satış Modalı */}
      {satilacakArac && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-white/10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Satış Onayı</h3>
              <div className="w-16 h-1 bg-[#FFB700] mx-auto mt-3 rounded-full"></div>
            </div>
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-[#FFB700] uppercase mb-2">Satış Fiyatı (TL)</label>
                    <input type="number" autoFocus value={satisFiyati} onChange={(e) => setSatisFiyati(e.target.value)} className="w-full text-4xl font-black bg-transparent border-b-2 border-white/20 focus:border-[#FFB700] outline-none text-white p-2" placeholder="0" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tarih</label>
                    <input type="date" value={satisTarihi} onChange={(e) => setSatisTarihi(e.target.value)} className="w-full p-4 bg-[#2C2C2E] border border-white/10 rounded-xl text-white outline-none focus:border-[#FFB700]" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sözleşme</label>
                    <input type="file" accept="image/*" onChange={(e) => setSatisSozlesmesi(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FFB700] file:text-black hover:file:bg-yellow-400" />
                </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setSatilacakArac(null)} className="flex-1 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition">İptal</button>
              <button onClick={satisiTamamla} disabled={satisYukleniyor} className="flex-1 py-4 bg-[#FFB700] text-black font-bold rounded-xl hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition active:scale-95">{satisYukleniyor ? '...' : 'Tamamla'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}