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
  const [musteriAdi, setMusteriAdi] = useState('')
  const [musteriTel, setMusteriTel] = useState('')
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
    // Validasyon: Müşteri adı da zorunlu oldu
    if (!satisFiyati || !satilacakArac || !satisTarihi || !musteriAdi) {
      return alert('Lütfen Fiyat, Tarih ve Müşteri Adını girin!')
    }
    
    setSatisYukleniyor(true)

    try {
      // 1. ADIM: Müşteriyi Kaydet
      const { data: musteriData, error: musteriError } = await supabase
        .from('customers')
        .insert([{ ad_soyad: musteriAdi, telefon: musteriTel }])
        .select()
        .single() // Eklenen müşterinin ID'sini almak için

      if (musteriError) throw musteriError
      
      // 2. ADIM: Sözleşme Varsa Yükle
      let sozlesmeUrl = ''
      if (satisSozlesmesi) {
        sozlesmeUrl = await dosyaYukle(satisSozlesmesi)
      }

      // 3. ADIM: Arabayı Güncelle (Satıldı yap + Müşteriye Bağla)
      const { error } = await supabase.from('cars').update({ 
        durum: 'Satıldı', 
        satis_bedeli: Number(satisFiyati),
        satis_tarihi: satisTarihi,
        satis_sozlesmesi_url: sozlesmeUrl,
        customer_id: musteriData.id // Müşteri bağlantısı burada
      }).eq('id', satilacakArac.id)

      if (error) throw error

      alert('🎉 Satış ve Müşteri Kaydı Başarılı!')
      
      // Temizlik
      setSatilacakArac(null)
      setSatisFiyati('')
      setSatisTarihi('')
      setSatisSozlesmesi(null)
      setMusteriAdi('') // Yeni eklenen temizlik
      setMusteriTel('') // Yeni eklenen temizlik
      
      verileriGetir()

    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSatisYukleniyor(false)
    }
  }

  // --- WHATSAPP PAYLAŞIM FONKSİYONU ---
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

  const toplamStokMaliyeti = araclar.filter(a => a.durum === 'Stokta').reduce((toplam, arac) => toplam + (arac.alis_fiyati || 0) + masrafHesapla(arac), 0)
  const toplamCiro = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => toplam + (arac.satis_bedeli || 0), 0)
  const toplamKar = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => {
    const maliyet = (arac.alis_fiyati || 0) + masrafHesapla(arac)
    return toplam + ((arac.satis_bedeli || 0) - maliyet)
  }, 0)

  if (!oturumVarMi && yukleniyor) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Yükleniyor...</div>

  return (
    <>
      <main className="min-h-screen pb-32">
        {/* ÜST MENÜ: SİYAH VE GOLD TEMA */}
        <header className="app-header sticky top-0 z-20">
          <div className="app-header-inner">

            <div className="app-logo flex flex-col cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>

              <div className="flex items-center text-3xl font-black tracking-tighter">
                <span className="text-[#FFB700]">CAR</span>
                <span className="text-white">BAY</span>
              </div>
              <div className="text-[10px] tracking-[0.4em] text-white/70 font-light -mt-1 ml-1 uppercase">Celil Sevim</div>
            </div>

            <div className="app-nav hidden md:flex items-center gap-2">
              <button onClick={() => router.push('/musteriler')} className="app-nav-tab">📒 Müşteriler</button>
              <button onClick={() => router.push('/kasa')} className="app-nav-tab">💰 Kasa</button>
              <button onClick={() => router.push('/analiz')} className="app-nav-tab">📊 Analiz</button>

              <button onClick={() => router.push('/arac-ekle')} className="app-nav-cta"><span className="icon">+</span><span>Yeni Araç</span></button>

              <button onClick={cikisYap} className="app-nav-link app-nav-link--ghost">Çıkış</button>

            </div>
          </div>
        </header>

        {/* İÇERİK */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="glass-panel">
            {/* Başlık alanı */}
            <div className="mb-8">
              <h1 className="section-title gold-text">Carbay Motors</h1>
              <p className="section-subtitle">
                Stoktaki ve satılan araçlarını, maliyet ve kâr durumlarını tek panelden yönet.
              </p>
            </div>

            {/* FİNANSAL TABLO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="finance-card border-l-4 border-black/80">
                <div className="text-gray-300 text-xs font-bold uppercase tracking-wider">Stok Maliyeti</div>
                <div className="value text-3xl font-extrabold mt-1">
                  {toplamStokMaliyeti.toLocaleString('tr-TR')} ₺
                </div>
              </div>
              <div className="finance-card border-l-4 border-[#FFB700]/80">
                <div className="text-gray-300 text-xs font-bold uppercase tracking-wider">Toplam Ciro</div>
                <div className="value text-3xl font-extrabold mt-1">
                  {toplamCiro.toLocaleString('tr-TR')} ₺
                </div>
              </div>
              <div className="finance-card border-l-4 border-green-500/80">
                <div className="text-gray-300 text-xs font-bold uppercase tracking-wider">Net Kâr</div>
                <div
                  className={`value text-3xl font-extrabold mt-1 ${toplamKar >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                >
                  {toplamKar.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>

            {/* ARAMA ALANI */}
            <div className="search-wrapper flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
              <div className="relative w-full md:w-96 form-field">
                <span className="absolute left-3 top-3 text-gray-400"></span>
                <input
                  type="text"
                  placeholder="Marka, Model veya Plaka..."
                  className="search-input-dark w-full pl-10 pr-4 py-2.5 outline-none transition"
                  value={aramaMetni}
                  onChange={(e) => setAramaMetni(e.target.value)}
                />

              </div>
              <div className="flex bg-black/30 p-1 rounded-lg w-full md:w-auto overflow-x-auto border border-white/10">
                {['Hepsi', 'Stokta', 'Satıldı'].map((durum) => (
                  <button
                    key={durum}
                    onClick={() => setFiltreDurumu(durum)}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition ${filtreDurumu === durum
                        ? 'filter-btn-active'
                        : 'text-gray-300 hover:text-white'
                      }`}
                  >
                    {durum}
                  </button>
                ))}
              </div>
            </div>

            {/* ARAÇ LİSTESİ */}
            {yukleniyor && !araclar.length ? (
              <div className="text-center py-20 text-gray-300">Yükleniyor...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtrelenenAraclar.length === 0 ? (
                  <div className="col-span-3 text-center text-gray-400 py-10">
                    Kayıt bulunamadı.
                  </div>
                ) : null}

                {filtrelenenAraclar.map((arac) => {
                  const masrafTutari = masrafHesapla(arac)
                  const toplamMaliyet = (arac.alis_fiyati || 0) + masrafTutari
                  const netKar = (arac.satis_bedeli || 0) - toplamMaliyet
                  const satisGunu =
                    arac.durum === 'Satıldı' && arac.satis_tarihi
                      ? gunFarkiHesapla(arac.alis_tarihi, arac.satis_tarihi)
                      : null

                  return (
                    <div
                      key={arac.id}
                      className={`car-card rounded-xl transition duration-300 overflow-hidden group relative ${arac.durum === 'Satıldı' ? 'ring-1 ring-green-500' : ''
                        }`}
                    >
                      <div className="relative h-56 bg-gray-900">
                        {arac.resim_url ? (
                          <img
                            src={arac.resim_url}
                            className={`w-full h-full object-cover ${arac.durum === 'Satıldı' ? 'grayscale opacity-70' : ''
                              }`}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                            Resim Yok
                          </div>
                        )}

                        {arac.durum === 'Satıldı' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <span className="border-4 border-[#FFB700] text-[#FFB700] font-black text-4xl -rotate-12 px-6 py-2 rounded-lg tracking-widest shadow-2xl bg-black">
                              SATILDI
                            </span>
                          </div>
                        )}

                        {satisGunu !== null && (
                          <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-md z-10">
                            ⏱️ {satisGunu} Günde
                          </div>
                        )}
                        <div className="absolute top-3 right-3 car-year-tag text-xs">
                          {arac.yil}
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                         {/* YENİ HALİ (Bunu yapıştır) */}
<div>
  {/* 1. Marka ve Model (Büyük ve Kalın) */}
  <h3 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">
    {arac.marka} {arac.model}
  </h3>

  {/* 2. Donanım Paketi (Altında, Küçük ve Gri) */}
  {arac.paket && (
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">
      {arac.paket}
    </p>
  )}

  {/* 3. Plaka (En altta kutucuk içinde) */}
  <p className="text-xs text-gray-500 font-mono bg-gray-100 border border-gray-200 px-2 py-0.5 rounded inline-block mt-2">
    {arac.plaka}
  </p>
</div>

                          {/* === TEK KART AKSİYON ÇERÇEVESİ (3x2 grid) === */}
                          <div className="card-actions">
                            {arac.durum !== 'Satıldı' && (
                              <button
                                onClick={() => {
                                  setSatilacakArac(arac)
                                  setSatisTarihi(new Date().toISOString().split('T')[0])
                                }}
                                className="card-action card-action-sale"
                                title="Sat"
                              >
                                {/* Satış – para ikonu */}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="3" y="5" width="18" height="14" rx="2" />
                                  <path d="M7 12h4" />
                                  <path d="M7 9h10" />
                                  <path d="M7 15h6" />
                                </svg>
                              </button>
                            )}

                            {/* Sözleşme */}
                            <button
                              onClick={() => {
                                setSozlesmeArac(arac)
                                setAktifSekme('alis')
                              }}
                              className="card-action card-action-contract"
                              title="Sözleşmeler"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M7 3h8l4 4v14H7z" />
                                <path d="M15 3v4h4" />
                                <path d="M10 11h6" />
                                <path d="M10 15h4" />
                              </svg>
                            </button>

                            {/* WhatsApp / Paylaş */}
                            <button
                              onClick={() => whatsappPaylas(arac)}
                              className="card-action card-action-whatsapp"
                              title="WhatsApp ile Paylaş"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M15 8h4v4" />
                                <path d="M10 14 19 5" />
                                <path d="M12 20a8 8 0 1 1 4.9-14.3" />
                              </svg>
                            </button>

                            {/* Yazdır */}
                            <button
                              onClick={() => window.open(`/arac-vitrin/${arac.id}`, '_blank')}
                              className="card-action card-action-print"
                              title="Yazdır"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 9V4h12v5" />
                                <rect x="6" y="13" width="12" height="7" rx="1" />
                                <path d="M8 17h8" />
                              </svg>
                            </button>

                            {/* Düzenle */}
                            <button
                              onClick={() => router.push(`/arac-duzenle/${arac.id}`)}
                              className="card-action card-action-edit"
                              title="Düzenle"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M15 5 19 9 10 18H6v-4z" />
                                <path d="M13 7 17 11" />
                              </svg>
                            </button>

                            {/* Sil */}
                            <button
                              onClick={() => aracSil(arac.id)}
                              className="card-action card-action-delete"
                              title="Sil"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4 7h16" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                                <path d="M9 7V4h6v3" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {masrafTutari > 0 && (
                          <div className="car-expense mb-3 text-xs flex items-center gap-1 w-fit">
                            🛠️ {masrafTutari.toLocaleString('tr-TR')} TL Masraf
                          </div>
                        )}

                        <div className="flex gap-2 mb-4 mt-2 text-xs font-medium text-gray-200">
                          <span className="car-badge">{arac.yakit}</span>
                          <span className="car-badge">{arac.vites}</span>
                          <span className="car-badge">
                            {arac.kilometre.toLocaleString('tr-TR')} KM
                          </span>
                        </div>

                        <div className="border-t border-white/10 pt-4">
                          {arac.durum === 'Satıldı' ? (
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">
                                  Net Kâr
                                </div>
                                <div
                                  className={`text-xl font-black ${netKar >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}
                                >
                                  {netKar.toLocaleString('tr-TR')} ₺
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-gray-400 uppercase">
                                  Satış Rakamı
                                </div>
                                <div className="font-bold text-gray-100">
                                  {arac.satis_bedeli?.toLocaleString('tr-TR')} ₺
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">
                                  Toplam Maliyet
                                </div>
                                <div className="car-cost">
                                  {toplamMaliyet.toLocaleString('tr-TR')} ₺
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* MOBİL ALT MENÜ (MODERN) */}
        <nav className="mobile-nav md:hidden pb-safe-area-inset-bottom">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mobile-nav-item mobile-nav-item--active"
          >
            <span className="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5 10.5V20h14v-9.5" />
                <path d="M10 20v-4h4v4" />
              </svg>
            </span>
            <span className="label">Garaj</span>
          </button>

          <button
            onClick={() => router.push('/musteriler')}
            className="mobile-nav-item"
          >
            <span className="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z" />
                <path d="M5 20.5a7 7 0 0 1 14 0" />
              </svg>
            </span>
            <span className="label">Müşteri</span>
          </button>

          <button
            onClick={() => router.push('/kasa')}
            className="mobile-nav-item"
          >
            <span className="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M9 10h6" />
                <path d="M9 14h3" />
                <path d="M17 10v6" />
              </svg>
            </span>
            <span className="label">Kasa</span>
          </button>

          {/* + BUTONU SAĞDA */}
          <button
            onClick={() => router.push('/arac-ekle')}
            className="mobile-nav-cta"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
              className="w-7 h-7"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </nav>

        {/* SÖZLEŞMELER PENCERESİ */}
        {sozlesmeArac && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
              <div className="p-4 bg-black text-white flex justify-between items-center border-b border-[#FFB700]">
                <div>
                  <h3 className="font-bold text-[#FFB700]">Sözleşme Dosyaları</h3>
                  <p className="text-xs text-gray-400">
                    {sozlesmeArac.marka} {sozlesmeArac.model}
                  </p>
                </div>
                <button
                  onClick={() => setSozlesmeArac(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setAktifSekme('alis')}
                  className={`flex-1 py-3 font-bold text-sm transition ${aktifSekme === 'alis'
                      ? 'border-b-4 border-[#FFB700] text-black bg-yellow-50'
                      : 'text-gray-400'
                    }`}
                >
                  📥 Alış Sözleşmesi
                </button>
                <button
                  onClick={() => setAktifSekme('satis')}
                  className={`flex-1 py-3 font-bold text-sm transition ${aktifSekme === 'satis'
                      ? 'border-b-4 border-[#FFB700] text-black bg-yellow-50'
                      : 'text-gray-400'
                    }`}
                >
                  📤 Satış Sözleşmesi
                </button>
              </div>
              <div className="flex-1 p-6 bg-gray-50 overflow-auto flex items-center justify-center">
                {aktifSekme === 'alis' &&
                  (sozlesmeArac.sozlesme_url ? (
                    <img
                      src={sozlesmeArac.sozlesme_url}
                      className="max-w-full max-h-full shadow-lg border"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <span className="text-4xl block mb-2">📂</span>Dosya Yok
                    </div>
                  ))}
                {aktifSekme === 'satis' &&
                  (sozlesmeArac.satis_sozlesmesi_url ? (
                    <img
                      src={sozlesmeArac.satis_sozlesmesi_url}
                      className="max-w-full max-h-full shadow-lg border"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <span className="text-4xl block mb-2">📂</span>Dosya Yok
                    </div>
                  ))}
              </div>
              <div className="p-4 bg-white border-t text-center">
                {(aktifSekme === 'alis' && sozlesmeArac.sozlesme_url) ||
                  (aktifSekme === 'satis' && sozlesmeArac.satis_sozlesmesi_url) ? (
                  <button
                    onClick={() =>
                      window.open(
                        aktifSekme === 'alis'
                          ? sozlesmeArac.sozlesme_url
                          : sozlesmeArac.satis_sozlesmesi_url,
                        '_blank'
                      )
                    }
                    className="text-black underline text-sm font-bold hover:text-[#FFB700]"
                  >
                    Tam Ekran Aç ↗
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* SATIŞ MODALI */}
        {satilacakArac && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  Satış Onayı
                </h3>
                <div className="w-16 h-1 bg-[#FFB700] mx-auto mt-2"></div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Satış Fiyatı (TL)
                </label>
                {/* --- YENİ MÜŞTERİ ALANI BAŞLANGIÇ --- */}
           
            {/* --- YENİ MÜŞTERİ ALANI BİTİŞ --- */}
                <input
                  type="number"
                  autoFocus
                  value={satisFiyati}
                  onChange={(e) => setSatisFiyati(e.target.value)}
                  className="w-full text-3xl font-black text-gray-900 border-b-2 border-gray-200 focus:border-[#FFB700] outline-none py-2 bg-transparent"
                  placeholder="0"
                />
              </div>
               <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="block text-xs font-bold text-[#FFD60A] uppercase mb-3 tracking-wider">
                  Müşteri Bilgileri
                </label>
                <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Adı Soyadı" 
                      value={musteriAdi} 
                      onChange={(e) => setMusteriAdi(e.target.value)} 
                      className="w-full p-3 bg-[#2C2C2E] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#FFD60A]" 
                    />
                    <input 
                      type="tel" 
                      placeholder="Telefon (05XX...)" 
                      value={musteriTel} 
                      onChange={(e) => setMusteriTel(e.target.value)} 
                      className="w-full p-3 bg-[#2C2C2E] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#FFD60A]" 
                    />
                </div>
            </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Satış Tarihi
                </label>
                <input
                  type="date"
                  value={satisTarihi}
                  onChange={(e) => setSatisTarihi(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-gray-50"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Satış Sözleşmesi
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setSatisSozlesmesi(e.target.files ? e.target.files[0] : null)
                  }
                  className="w-full text-sm text-gray-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSatilacakArac(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={satisiTamamla}
                  disabled={satisYukleniyor}
                  className="flex-1 py-3 bg-[#FFB700] text-black font-bold rounded-lg hover:bg-yellow-400 shadow-lg"
                >
                  {satisYukleniyor ? '...' : 'Satışı Tamamla'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* GLOBAL CSS (styled-jsx) */}
      <style jsx global>{`
        /* === NAV TABS (Müşteriler / Kasa / Analiz) === */
        .app-nav-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.5rem 1.1rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: radial-gradient(
            circle at top,
            rgba(15, 23, 42, 0.95),
            rgba(15, 15, 20, 0.98)
          );
          color: #e5e7eb;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7);
          transition:
            background 0.16s ease-out,
            color 0.16s ease-out,
            box-shadow 0.16s ease-out,
            transform 0.12s ease-out,
            border-color 0.16s ease-out;
        }
      
        /* === MOBİL ALT NAV SADECE MOBİLDE === */
        @media (max-width: 767px) {
          .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 4.4rem;
            padding: 0.45rem 1.3rem 0.9rem;
            display: flex;
            align-items: center;
            justify-content: space-evenly;
            background: rgba(4, 7, 14, 0.75);
            backdrop-filter: blur(22px) saturate(180%);
            -webkit-backdrop-filter: blur(22px) saturate(180%);
            border-top: 1px solid rgba(255, 199, 0, 0.15);
            box-shadow:
              0 -4px 20px rgba(0, 0, 0, 0.6),
              inset 0 1px 4px rgba(255, 255, 255, 0.03);
            z-index: 50;
            border-radius: 1.3rem 1.3rem 0 0;
          }

          .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.12rem;
            padding: 0.25rem 0.45rem;
            color: #9ca3af;
            transition: all 0.18s ease;
          }

          .mobile-nav-item:hover {
            color: #facc15;
            transform: translateY(-2px);
          }

          .mobile-nav-item .icon {
            font-size: 1.28rem;
          }

          .mobile-nav-item .label {
            font-size: 0.58rem;
            font-weight: 600;
            letter-spacing: 0.09em;
          }

          .mobile-nav-item--active {
            color: #facc15;
            transform: translateY(-2px);
            text-shadow: 0 0 8px rgba(250, 204, 21, 0.6);
          }

          /* + BUTONU SAĞDA */
          .mobile-nav-cta {
            width: 2.9rem;
            height: 2.9rem;
            border-radius: 50%;
            background: linear-gradient(145deg, #fbcf28, #eab308);
            border: 3px solid rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow:
              0 10px 22px rgba(0, 0, 0, 0.75),
              0 0 18px rgba(250, 204, 21, 0.6);
            transition: all 0.18s ease;
          }

          .mobile-nav-cta:hover {
            transform: translateY(-2px) scale(1.04);
            box-shadow:
              0 12px 28px rgba(0, 0, 0, 0.9),
              0 0 24px rgba(250, 204, 21, 0.9);
          }

          .mobile-nav-cta:active {
            transform: translateY(1px) scale(0.95);
          }
        }

        .app-nav-tab:hover {
          border-color: rgba(250, 204, 21, 0.95);
          background: radial-gradient(circle at top, #facc15, #eab308);
          color: #111827;
          box-shadow:
            0 0 18px rgba(250, 204, 21, 0.75),
            0 10px 24px rgba(0, 0, 0, 1);
          transform: translateY(-1px);
        }

        /* Aktif tab (Analiz) */
        .app-nav-tab--active {
          background: radial-gradient(circle at top, #facc15, #eab308);
          border-color: rgba(250, 204, 21, 0.96);
          color: #111827;
          box-shadow:
            0 0 18px rgba(250, 204, 21, 0.85),
            0 10px 26px rgba(0, 0, 0, 1);
        }

        :root {
          --background: #050509;
          --foreground: #f9fafb;
          --accent-gold: #ffb700;
          --accent-gold-soft: #ffe082;
          --accent-gold-dark: #b57700;
          --border-subtle: rgba(255, 255, 255, 0.06);
          --panel-bg-dark: rgba(15, 15, 20, 0.9);
          --panel-bg-light: rgba(255, 255, 255, 0.9);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --background: #040409;
            --foreground: #e5e7eb;
          }
        }

        /* === ÜST NAVBAR (CARBAY) === */
        .app-header {
          background: linear-gradient(to bottom, #020617, #020617);
          border-bottom: 2px solid #facc15;
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.9),
            0 0 0 1px rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .app-header-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0.6rem 1.6rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
        }

        /* Logo tarafı ufak ayar */
        .app-logo {
          transform: translateY(1px);
        }

        .app-logo:hover {
          filter: brightness(1.08);
        }

        /* Sağ taraftaki menü alanı */
        .app-nav {
          background: radial-gradient(
            circle at top,
            rgba(15, 23, 42, 0.9),
            rgba(15, 15, 20, 0.98)
          );
          padding: 0.4rem 0.55rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.9),
            0 0 0 1px rgba(0, 0, 0, 0.9);
        }

        /* Genel nav butonu */
        .app-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          border: 1px solid transparent;
          background: transparent;
          color: #e5e7eb;
          cursor: pointer;
          transition:
            background 0.16s ease-out,
            color 0.16s ease-out,
            box-shadow 0.16s ease-out,
            transform 0.12s ease-out,
            border-color 0.16s ease-out;
        }

        .app-nav-link:hover {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(148, 163, 184, 0.8);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.7);
          transform: translateY(-1px);
        }

        /* Aktif sayfa (Analiz) */
        .app-nav-link--active {
          background: radial-gradient(circle at top, #facc15, #eab308);
          color: #111827;
          border-color: rgba(250, 204, 21, 0.96);
          box-shadow:
            0 0 16px rgba(250, 204, 21, 0.7),
            0 8px 22px rgba(0, 0, 0, 0.9);
        }

        /* Çıkış için daha hafif buton */
        .app-nav-link--ghost {
          background: transparent;
          color: #9ca3af;
        }

        .app-nav-link--ghost:hover {
          background: rgba(15, 23, 42, 0.85);
          color: #f9fafb;
          border-color: rgba(148, 163, 184, 0.6);
        }

        /* Büyük CTA: Yeni Araç */
        .app-nav-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.55rem 1.4rem;
          border-radius: 999px;
          border: 1px solid #111827;
          background-image: linear-gradient(135deg, #facc15, #fbbf24, #f59e0b);
          color: #111827;
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          cursor: pointer;
          box-shadow:
            0 0 18px rgba(250, 204, 21, 0.6),
            0 12px 32px rgba(0, 0, 0, 0.95);
          transition:
            transform 0.14s ease-out,
            box-shadow 0.14s ease-out,
            filter 0.14s ease-out;
        }

        .app-nav-cta .icon {
          font-size: 1rem;
        }

        .app-nav-cta:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow:
            0 0 24px rgba(250, 204, 21, 0.85),
            0 16px 40px rgba(0, 0, 0, 1);
          filter: brightness(1.03);
        }

        .app-nav-cta:active {
          transform: translateY(1px) scale(0.97);
          box-shadow:
            0 0 14px rgba(250, 204, 21, 0.6),
            0 10px 24px rgba(0, 0, 0, 0.95);
        }

        /* Mobilde header padding biraz küçülsün */
        @media (max-width: 768px) {
          .app-header-inner {
            padding: 0.5rem 1rem;
          }
        }
  
        /* === ARKA PLAN & GENEL FONT === */
        body {
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background:
            radial-gradient(circle at top left, rgba(255, 183, 0, 0.08), transparent 55%),
            radial-gradient(circle at bottom right, rgba(148, 163, 184, 0.16), transparent 60%),
            #050509;
          color: var(--foreground);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "Segoe UI", sans-serif;
        }

        /* TÜM GİRİŞ KUTULARI İÇİN YAZI RENGİNİ SİYAH YAP */
        input,
        textarea,
        select {
          color: #000000 !important;
          background-color: #ffffff;
          font: inherit;
        }

        /* Placeholder (İpucu yazısı) */
        input::placeholder,
        textarea::placeholder {
          color: #9ca3af !important;
        }

        /* === GLASS PANEL === */
        .glass-panel {
          background: var(--panel-bg-dark);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 1.25rem;
          border: 1px solid var(--border-subtle);
          box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(255, 255, 255, 0.03);
          padding: 2.25rem 2rem;
          max-width: 1120px;
          width: 100%;
          position: relative;
          overflow: hidden;
          margin: 0 auto 2.5rem auto;
        }

        .glass-panel::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(
            circle at top,
            rgba(255, 183, 0, 0.18),
            transparent 65%
          );
          opacity: 0.55;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .glass-panel > * {
          position: relative;
          z-index: 1;
        }

        /* === BAŞLIKLAR === */
        .section-title {
          font-size: clamp(1.7rem, 2vw, 2.15rem);
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.5rem;
        }

        .section-title::after {
          content: "";
          height: 2px;
          width: 72px;
          border-radius: 999px;
          background: linear-gradient(to right, var(--accent-gold), transparent);
        }

        .gold-text {
          background: linear-gradient(to right, #ffb700, #ffe082, #ffb700);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          background-size: 220% auto;
          animation: shine 6s linear infinite;
        }

        @keyframes shine {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .section-subtitle {
          color: rgba(229, 231, 235, 0.78);
          font-size: 0.92rem;
          max-width: 36rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        /* === FORM ALANLARI / SEARCH === */
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          margin-bottom: 0;
        }

        .form-field label {
          font-size: 0.84rem;
          font-weight: 500;
          color: rgba(229, 231, 235, 0.85);
        }

        .form-field input,
        .form-field textarea,
        .form-field select {
          border-radius: 0.9rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          padding: 0.65rem 0.9rem;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.18s ease-out;
          box-shadow: 0 0 0 0 rgba(255, 183, 0, 0);
        }

        .form-field textarea {
          min-height: 110px;
          resize: vertical;
        }

        .form-field input:focus,
        .form-field textarea:focus,
        .form-field select:focus {
          border-color: var(--accent-gold);
          box-shadow:
            0 0 0 1px rgba(255, 183, 0, 0.7),
            0 10px 24px rgba(15, 23, 42, 0.45);
          transform: translateY(-1px);
          background-color: #f9fafb;
        }

        .form-field.has-error input,
        .form-field.has-error textarea,
        .form-field.has-error select {
          border-color: #f97373;
          box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.75);
        }

        .field-hint {
          font-size: 0.78rem;
          color: rgba(148, 163, 184, 0.9);
        }

        .field-error {
          font-size: 0.78rem;
          color: #fecaca;
        }

        /* === FINANCE CARDS === */
        .finance-card {
          background: rgba(18, 18, 24, 0.85);
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.4rem 1.6rem;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
          color: #fff;
        }

        .finance-card .value {
          color: #ffb700;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        /* === SEARCH WRAPPER === */
        .search-wrapper {
          background: rgba(18, 18, 24, 0.85);
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        /* DARK SEARCH INPUT (üstteki beyaz alan) */
        .search-input-dark {
          background: rgba(8, 8, 12, 0.98) !important;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          color: #f9fafb !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.65);
        }

        /* Placeholder rengi */
        .search-input-dark::placeholder {
          color: #9ca3af !important;
        }

        /* Focus efekti */
        .search-input-dark:focus {
          border-color: var(--accent-gold);
          box-shadow:
            0 0 0 1px rgba(255, 183, 0, 0.7),
            0 12px 28px rgba(15, 23, 42, 0.7);
          background: #050509 !important;
        }

        .filter-btn-active {
          background: #ffb700 !important;
          color: #000 !important;
          border-radius: 0.6rem !important;
          box-shadow: 0 0 12px rgba(255, 183, 0, 0.45);
        }

        /* === BUTONLAR - PRIMARY (genel kullanıma hazır) === */
        .button-primary {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.7rem 1.4rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background-image: linear-gradient(
            135deg,
            var(--accent-gold),
            var(--accent-gold-soft),
            var(--accent-gold-dark)
          );
          color: #1f2933;
          box-shadow:
            0 0 14px rgba(255, 183, 0, 0.5),
            0 10px 32px rgba(0, 0, 0, 0.8);
          transition:
            transform 0.16s ease-out,
            box-shadow 0.16s ease-out,
            filter 0.16s ease-out;
        }

        .button-primary span.icon {
          font-size: 1.05rem;
        }

        .button-primary:hover {
          transform: translateY(-1px) scale(1.01);
          box-shadow:
            0 0 20px rgba(255, 183, 0, 0.7),
            0 16px 40px rgba(0, 0, 0, 0.9);
          filter: brightness(1.04);
        }

        .button-primary:active {
          transform: translateY(1px) scale(0.985);
          box-shadow:
            0 0 10px rgba(255, 183, 0, 0.45),
            0 8px 24px rgba(0, 0, 0, 0.85);
        }

        .button-primary:focus-visible {
          outline: 2px solid #fef3c7;
          outline-offset: 3px;
        }

        /* === İKİNCİL BUTON === */
        .button-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.65rem 1.2rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: radial-gradient(
            circle at top,
            rgba(148, 163, 184, 0.18),
            transparent
          );
          color: rgba(229, 231, 235, 0.9);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.16s ease-out;
        }

        .button-ghost:hover {
          border-color: rgba(249, 250, 251, 0.9);
          background: radial-gradient(
            circle at top,
            rgba(148, 163, 184, 0.26),
            transparent
          );
        }

        /* === NEON GLOW (soft) === */
        .neon-glow {
          box-shadow:
            0 0 10px rgba(255, 183, 0, 0.32),
            0 0 24px rgba(255, 183, 0, 0.18);
          transition: all 0.22s ease-out;
        }

        .neon-glow:hover {
          box-shadow:
            0 0 18px rgba(255, 183, 0, 0.72),
            0 0 40px rgba(255, 183, 0, 0.4);
        }

        /* === ARAÇ KARTI (Dark Modern) === */
        .car-card {
          background: rgba(15, 15, 20, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.1rem;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.25s ease;
          box-shadow:
            0 8px 18px rgba(0, 0, 0, 0.45),
            inset 0 0 0 0 rgba(255, 183, 0, 0.1);
        }

        /* === KART AKSİYON ALANI (ikon bar) === */
        .card-actions {
          display: grid;
          grid-template-columns: repeat(3, auto); /* 3'er 3'er diz */
          gap: 0.55rem;
          justify-content: center;
          align-content: center;
          background: radial-gradient(
            circle at top,
            rgba(15, 23, 42, 0.92),
            rgba(15, 15, 20, 0.96)
          );
          padding: 0.7rem 0.8rem;
          border-radius: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.5);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.8),
            inset 0 0 0 1px rgba(0, 0, 0, 0.7);
          flex-shrink: 0; /* Başlığa göre daralmasın */
        }

        /* Genel ikon buton stili */
        .card-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.85rem;
          border: 1px solid rgba(148, 163, 184, 0.45);
          background: #f9fafb;
          font-size: 0; /* sadece SVG, text yok */
          cursor: pointer;
          transition:
            transform 0.16s ease-out,
            box-shadow 0.16s ease-out,
            border-color 0.16s ease-out,
            background 0.16s ease-out;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.55);
        }

        /* SVG boyutu ve rengi – hepsi siyah */
        .card-action svg {
          width: 18px;
          height: 18px;
          color: #000 !important;
          stroke: #000 !important;
        }

        .card-action:hover {
          transform: translateY(-1px) scale(1.04);
          border-color: var(--accent-gold);
          box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.85),
            0 0 14px rgba(255, 183, 0, 0.4);
          background: #fefce8;
        }

        .card-action:active {
          transform: translateY(1px) scale(0.97);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.7);
        }

        /* Tip bazlı renk varyasyonları (sadece hafif ton farkı) */
        .card-action-sale {
          background: #ecfdf5;
          border-color: rgba(34, 197, 94, 0.4);
        }

        .card-action-contract {
          background: #fffbeb;
          border-color: rgba(245, 158, 11, 0.4);
        }

        .card-action-whatsapp {
          background: #ecfdf5;
          border-color: rgba(22, 163, 74, 0.5);
        }

        .card-action-print {
          background: #eef2ff;
          border-color: rgba(79, 70, 229, 0.4);
        }

        .card-action-edit {
          background: #eff6ff;
          border-color: rgba(59, 130, 246, 0.5);
        }

        .card-action-delete {
          background: #fef2f2;
          border-color: rgba(239, 68, 68, 0.6);
        }

        .car-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 16px 40px rgba(0, 0, 0, 0.55),
            0 0 18px rgba(255, 183, 0, 0.35);
          border-color: rgba(255, 183, 0, 0.25);
        }

        .car-title {
          color: #ffffff;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .car-badge {
          background: rgba(255, 255, 255, 0.06);
          color: #d1d5db;
          padding: 4px 8px;
          border-radius: 0.5rem;
          font-size: 11px;
          font-weight: 500;
        }

        .car-year-tag {
          background: #ffb700;
          color: #000;
          padding: 4px 10px;
          border-radius: 0.4rem;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(255, 183, 0, 0.4);
        }

        .car-expense {
          background: rgba(255, 0, 0, 0.18);
          color: #ef4444;
          padding: 4px 10px;
          border: 1px solid rgba(255, 0, 0, 0.4);
          border-radius: 0.4rem;
          font-size: 11px;
          font-weight: 700;
        }

        .car-cost {
          color: #ffffff;
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
          
        /* === RESPONSIVE === */
        @media (max-width: 768px) {
          .glass-panel {
            padding: 1.4rem 1.1rem;
            border-radius: 1rem;
            margin-bottom: 1.8rem;
          }

          .section-title {
            font-size: 1.4rem;
            letter-spacing: 0.14em;
          }

          .section-subtitle {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  )
}
