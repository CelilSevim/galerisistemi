'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [araclar, setAraclar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  
  // Arama, Filtre ve Auth
  const [aramaMetni, setAramaMetni] = useState('')
  const [filtreDurumu, setFiltreDurumu] = useState('Hepsi') 
  const [oturumVarMi, setOturumVarMi] = useState(false)

  // --- MODAL STATE'LERİ ---
  const [satilacakArac, setSatilacakArac] = useState<any>(null)
  const [satisFiyati, setSatisFiyati] = useState('')
  const [satisTarihi, setSatisTarihi] = useState('') 
  const [satisSozlesmesi, setSatisSozlesmesi] = useState<File | null>(null)
  const [satisYukleniyor, setSatisYukleniyor] = useState(false)

  // Sözleşme Görüntüleme Penceresi
  const [sozlesmeArac, setSozlesmeArac] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState<'alis' | 'satis'>('alis')

  useEffect(() => {
    async function oturumKontrol() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
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
    
    if (error) {
      console.error('Veri çekme hatası:', error)
    } else {
      setAraclar(data || [])
    }
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
    if (!satisFiyati || !satilacakArac || !satisTarihi) return alert('Lütfen fiyat ve tarih girin!')
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
      alert('🎉 Satış başarıyla kaydedildi!')
      setSatilacakArac(null); setSatisFiyati(''); setSatisTarihi(''); setSatisSozlesmesi(null); verileriGetir()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSatisYukleniyor(false)
    }
  }

  // --- WHATSAPP PAYLAŞIM FONKSİYONU ---
  const whatsappPaylas = (arac: any) => {
    const bosluk = '%0A' // Satır atlama kodu
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
        if (kusurlar.length === 0) {
            ekspertizMetni = `✅ *EKSPERTİZ: HATASIZ - BOYASIZ - DEĞİŞENSİZ*`
        } else {
            ekspertizMetni = `⚠️ *EKSPERTİZ DURUMU:*${bosluk}${kusurlar.join(bosluk)}`
        }
    } else {
        ekspertizMetni = "ℹ️ Ekspertiz bilgisi girilmemiştir."
    }

    const mesaj = `Merhaba, Carbay Motors güvencesiyle incelediğiniz araç:${bosluk}${bosluk}` +
                  `🚗 *${arac.marka} ${arac.model}*${bosluk}` +
                  `📅 Yıl: ${arac.yil}${bosluk}` +
                  `⛽ Yakıt: ${arac.yakit}${bosluk}` +
                  `🕹 Vites: ${arac.vites}${bosluk}` +
                  `🛣 KM: ${arac.kilometre.toLocaleString('tr-TR')}${bosluk}` +
                  `🎨 Renk: ${arac.renk || '-'}${bosluk}${bosluk}` +
                  `${ekspertizMetni}${bosluk}${bosluk}` +
                  `💰 *Fiyat: [FİYAT BİLGİSİ GİRİNİZ] TL*${bosluk}${bosluk}` +
                  `📸 Fotoğraf: ${arac.resim_url || 'Mevcut değil'}`

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

  // Hesaplamalar
  const toplamStokMaliyeti = araclar.filter(a => a.durum === 'Stokta').reduce((toplam, arac) => toplam + (arac.alis_fiyati || 0) + masrafHesapla(arac), 0)
  const toplamCiro = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => toplam + (arac.satis_bedeli || 0), 0)
  const toplamKar = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => {
      const maliyet = (arac.alis_fiyati || 0) + masrafHesapla(arac)
      return toplam + ((arac.satis_bedeli || 0) - maliyet)
    }, 0)

  if (!oturumVarMi && yukleniyor) return <div className="min-h-screen flex items-center justify-center bg-[#121212] text-[#FFB700]">Yükleniyor...</div>

  return (
    // Arka plan rengi globals.css'den geliyor ama burada da garanti olsun diye ekledik
    <main className="min-h-screen bg-[#121212] pb-32"> 
      
      {/* ÜST MENÜ */}
      <header className="bg-black/80 backdrop-blur-md shadow-xl sticky top-0 z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex flex-col cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="flex items-center text-3xl font-black tracking-tighter">
              <span className="text-[#FFB700]">CAR</span>
              <span className="text-white">BAY</span>
            </div>
            <div className="text-[10px] tracking-[0.4em] text-white/60 font-light -mt-1 ml-1 uppercase">Celil Sevim</div>
          </div>
          <div className="hidden md:flex items-center gap-3">
             <button onClick={() => router.push('/musteriler')} className="text-gray-300 hover:text-[#FFB700] px-3 py-2 transition text-sm font-bold flex items-center gap-1">📒 Müşteriler</button>
             <button onClick={() => router.push('/kasa')} className="text-gray-300 hover:text-[#FFB700] px-3 py-2 transition text-sm font-bold flex items-center gap-1">💰 Kasa</button>
             <button onClick={() => router.push('/analiz')} className="text-[#FFB700] border border-[#FFB700] hover:bg-[#FFB700] hover:text-black px-4 py-2.5 rounded-full font-bold transition text-sm flex items-center gap-2">📊 Analiz</button>
             <button onClick={() => router.push('/arac-ekle')} className="bg-[#FFB700] hover:bg-yellow-400 text-black px-6 py-2.5 rounded-full font-bold transition shadow-lg flex items-center gap-2 active:scale-95 hover:shadow-yellow-500/20">
              <span>+</span> Yeni Araç
            </button>
            <button onClick={cikisYap} className="text-gray-400 hover:text-white px-3 py-2.5 rounded-lg font-medium transition text-sm">Çıkış</button>
          </div>
        </div>
      </header>

      {/* İÇERİK */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* FİNANSAL TABLO - YENİ TASARIM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Kart 1 */}
          <div className="bg-[#1E1E1E] p-6 rounded-[2rem] premium-shadow premium-card relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/5 w-24 h-24 rounded-full blur-xl"></div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Stok Maliyeti</div>
            <div className="text-4xl font-black text-white tracking-tight">{toplamStokMaliyeti.toLocaleString('tr-TR')} <span className="text-[#FFB700] text-2xl">₺</span></div>
          </div>
          {/* Kart 2 */}
          <div className="bg-[#1E1E1E] p-6 rounded-[2rem] premium-shadow premium-card relative overflow-hidden">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-[#FFB700]/10 w-24 h-24 rounded-full blur-xl"></div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Toplam Ciro</div>
            <div className="text-4xl font-black text-[#FFB700] tracking-tight">{toplamCiro.toLocaleString('tr-TR')} <span className="text-2xl">₺</span></div>
          </div>
          {/* Kart 3 */}
          <div className="bg-[#1E1E1E] p-6 rounded-[2rem] premium-shadow premium-card relative overflow-hidden">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-green-500/10 w-24 h-24 rounded-full blur-xl"></div>
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Net Kâr</div>
            <div className={`text-4xl font-black tracking-tight ${toplamKar >= 0 ? 'text-green-500' : 'text-red-500'}`}>{toplamKar.toLocaleString('tr-TR')} <span className="text-2xl">₺</span></div>
          </div>
        </div>

        {/* ARAMA ALANI - YENİ TASARIM */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
          <div className="relative w-full md:w-96">
            <span className="absolute left-4 top-3.5 text-gray-500">🔍</span>
            <input type="text" placeholder="Marka, Model veya Plaka ara..." 
              // Input stili globals.css'den geliyor ama burada override ediyoruz
              className="w-full pl-12 pr-4 py-3 !bg-[#1E1E1E] !border-none rounded-full shadow-inner focus:ring-2 focus:ring-[#FFB700] transition text-white placeholder-gray-500 outline-none"
              value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
          </div>
          <div className="flex bg-[#1E1E1E] p-1.5 rounded-full w-full md:w-auto overflow-x-auto shadow-sm">
            {['Hepsi', 'Stokta', 'Satıldı'].map((durum) => (
              <button key={durum} onClick={() => setFiltreDurumu(durum)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${filtreDurumu === durum ? 'bg-[#FFB700] text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
                {durum}
              </button>
            ))}
          </div>
        </div>

        {/* ARAÇ LİSTESİ - YENİ TASARIM */}
        {yukleniyor && !araclar.length ? (
          <div className="text-center py-20 text-gray-500">Araçlar yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filtrelenenAraclar.length === 0 ? <div className="col-span-3 text-center text-gray-400 py-10">Kayıt bulunamadı.</div> : null}
             
             {filtrelenenAraclar.map((arac) => {
                const masrafTutari = masrafHesapla(arac)
                const toplamMaliyet = (arac.alis_fiyati || 0) + masrafTutari
                const netKar = (arac.satis_bedeli || 0) - toplamMaliyet
                const satisGunu = arac.durum === 'Satıldı' && arac.satis_tarihi ? gunFarkiHesapla(arac.alis_tarihi, arac.satis_tarihi) : null

                return (
                  // YENİ KART TASARIMI
                  <div key={arac.id} className="bg-[#1E1E1E] rounded-3xl premium-shadow premium-card overflow-hidden group relative border border-white/5">
                    
                    <div className="relative h-64">
                      {arac.resim_url ? (
                        <img src={arac.resim_url} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${arac.durum === 'Satıldı' ? 'grayscale opacity-40' : ''}`} />
                      ) : (<div className="flex items-center justify-center h-full text-gray-600 text-sm bg-gray-800">Resim Yok</div>)}
                      
                      {/* Resim Üzeri Gölgelendirme (Gradient) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] via-transparent to-transparent opacity-80"></div>

                      {arac.durum === 'Satıldı' && <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"><span className="border-4 border-[#FFB700] text-[#FFB700] font-black text-4xl -rotate-12 px-6 py-2 rounded-xl tracking-widest shadow-2xl bg-black/80">SATILDI</span></div>}
                      
                      {satisGunu !== null && (
                        <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10">
                          ⏱️ {satisGunu} Günde Satıldı
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-[#FFB700] text-black px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">{arac.yil}</div>

                      {/* Fiyat Etiketi (Resmin üzerinde) */}
                      {arac.durum !== 'Satıldı' && arac.satis_fiyati && (
                          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-[#FFB700] px-4 py-2 rounded-2xl text-lg font-black shadow-xl border border-[#FFB700]/20">
                              {arac.satis_fiyati.toLocaleString('tr-TR')} ₺
                          </div>
                      )}
                    </div>

                    <div className="p-6 relative">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white leading-tight">{arac.marka} {arac.model}</h3>
                          <p className="text-xs text-gray-400 mt-1 font-mono bg-white/5 px-2 py-0.5 rounded inline-block border border-white/10">{arac.plaka}</p>
                        </div>
                      </div>

                      {masrafTutari > 0 && <div className="mb-4 text-xs flex items-center gap-1 text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full w-fit">🛠️ {masrafTutari.toLocaleString('tr-TR')} TL Masraf</div>}
                      
                      <div className="flex gap-2 mb-6 text-xs font-medium text-gray-300">
                        <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{arac.yakit}</span>
                        <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{arac.vites}</span>
                        <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{arac.kilometre.toLocaleString('tr-TR')} KM</span>
                      </div>

                      {/* Butonlar */}
                      <div className="flex gap-2 border-t border-white/5 pt-4">
                        {arac.durum !== 'Satıldı' && (
                          <button onClick={() => { setSatilacakArac(arac); setSatisTarihi(new Date().toISOString().split('T')[0]) }} className="flex-1 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-black py-2.5 rounded-xl transition font-bold flex justify-center items-center gap-1">💰 Sat</button>
                        )}
                         <button onClick={() => whatsappPaylas(arac)} className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white py-2.5 rounded-xl transition font-bold flex justify-center items-center gap-1">📲 WhatsApp</button>
                        
                        {/* Diğer İşlemler Menüsü (Daha temiz görünüm için) */}
                        <div className="flex gap-2">
                            <button onClick={() => { setSozlesmeArac(arac); setAktifSekme('alis') }} className="bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white p-2.5 rounded-xl transition" title="Sözleşmeler">📂</button>
                            <button onClick={() => window.open(`/arac-vitrin/${arac.id}`, '_blank')} className="bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white p-2.5 rounded-xl transition" title="Yazdır">🖨️</button>
                            <button onClick={() => router.push(`/arac-duzenle/${arac.id}`)} className="bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 p-2.5 rounded-xl transition" title="Düzenle">✏️</button>
                        </div>
                      </div>
                      
                       {arac.durum === 'Satıldı' && (
                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl">
                             <div><div className="text-[10px] text-gray-500 font-bold uppercase">Net Kâr</div><div className={`text-2xl font-black ${netKar >= 0 ? 'text-green-500' : 'text-red-500'}`}>{netKar.toLocaleString('tr-TR')} ₺</div></div>
                             <div className="text-right"><div className="text-[10px] text-gray-500 font-bold uppercase">Satış Rakamı</div><div className="text-xl font-bold text-white">{arac.satis_bedeli?.toLocaleString('tr-TR')} ₺</div></div>
                        </div>
                       )}

                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* MOBİL ALT MENÜ - KORUNDU */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-black/80 backdrop-blur-lg border-t border-white/10 flex justify-around items-center z-50 shadow-2xl pb-safe-area-inset-bottom transition-all">
        <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center justify-center gap-1 text-[#FFB700] p-2">
          <span className="text-2xl">🏠</span><span className="text-[10px] font-bold">Garaj</span>
        </button>
        <button onClick={() => router.push('/musteriler')} className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700] active:scale-110 transition-all p-2">
          <span className="text-2xl">📒</span><span className="text-[10px] font-bold">Müşteri</span>
        </button>
        
        {/* ORTA EKLE BUTONU (VURGULU) */}
        <div className="relative">
           <button onClick={() => router.push('/arac-ekle')} className="absolute left-1/2 -translate-x-1/2 -top-10 bg-[#FFB700] text-black p-4 rounded-full shadow-[0_0_25px_rgba(255,183,0,0.6)] border-[3px] border-black active:scale-95 active:shadow-[0_0_10px_rgba(255,183,0,0.4)] transition-all transform hover:bg-yellow-400 flex items-center justify-center z-50">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </button>
        </div>

        <button onClick={() => router.push('/kasa')} className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700] active:scale-110 transition-all p-2">
          <span className="text-2xl">💰</span><span className="text-[10px] font-bold">Kasa</span>
        </button>
      </nav>

      {/* MODALLAR (Sözleşme ve Satış) - Renkleri güncellendi */}
      {sozlesmeArac && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-3xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-white/10">
            <div className="p-5 bg-black/50 text-white flex justify-between items-center border-b border-white/10">
              <div><h3 className="font-bold text-[#FFB700] text-xl">Sözleşme Dosyaları</h3><p className="text-sm text-gray-400">{sozlesmeArac.marka} {sozlesmeArac.model}</p></div>
              <button onClick={() => setSozlesmeArac(null)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
            </div>
            <div className="flex border-b border-white/10 bg-black/20">
              <button onClick={() => setAktifSekme('alis')} className={`flex-1 py-4 font-bold text-sm transition ${aktifSekme === 'alis' ? 'border-b-4 border-[#FFB700] text-[#FFB700]' : 'text-gray-400 hover:text-white'}`}>📥 Alış Sözleşmesi</button>
              <button onClick={() => setAktifSekme('satis')} className={`flex-1 py-4 font-bold text-sm transition ${aktifSekme === 'satis' ? 'border-b-4 border-[#FFB700] text-[#FFB700]' : 'text-gray-400 hover:text-white'}`}>📤 Satış Sözleşmesi</button>
            </div>
            <div className="flex-1 p-6 bg-[#121212] overflow-auto flex items-center justify-center relative">
              {aktifSekme === 'alis' && (sozlesmeArac.sozlesme_url ? <img src={sozlesmeArac.sozlesme_url} className="max-w-full max-h-full shadow-lg rounded-xl" /> : <div className="text-gray-600 text-center"><span className="text-5xl block mb-4 opacity-50">📂</span>Dosya Yok</div>)}
              {aktifSekme === 'satis' && (sozlesmeArac.satis_sozlesmesi_url ? <img src={sozlesmeArac.satis_sozlesmesi_url} className="max-w-full max-h-full shadow-lg rounded-xl" /> : <div className="text-gray-600 text-center"><span className="text-5xl block mb-4 opacity-50">📂</span>Dosya Yok</div>)}
            </div>
          </div>
        </div>
      )}

      {satilacakArac && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-white/10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Satış Onayı</h3>
              <div className="w-20 h-1.5 bg-[#FFB700] mx-auto mt-3 rounded-full"></div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#FFB700] uppercase mb-2">Satış Fiyatı (TL)</label>
              {/* Input stili globals.css'den */}
              <input type="number" autoFocus value={satisFiyati} onChange={(e) => setSatisFiyati(e.target.value)} className="w-full text-4xl font-black p-4" placeholder="0" />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Satış Tarihi</label>
              <input type="date" value={satisTarihi} onChange={(e) => setSatisTarihi(e.target.value)} className="w-full p-3" />
            </div>
            <div className="mb-8">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Satış Sözleşmesi (Fotoğraf)</label>
              <input type="file" accept="image/*" onChange={(e) => setSatisSozlesmesi(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FFB700] file:text-black hover:file:bg-yellow-400" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setSatilacakArac(null)} className="flex-1 py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition">İptal</button>
              <button onClick={satisiTamamla} disabled={satisYukleniyor} className="flex-1 py-4 bg-[#FFB700] text-black font-bold rounded-xl hover:bg-yellow-400 shadow-lg shadow-yellow-500/30 transition active:scale-95">{satisYukleniyor ? 'İşleniyor...' : 'Satışı Tamamla'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}