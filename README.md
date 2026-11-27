# ADØP Configurator

ADØP modüler mobilya sisteminin web sitesi, 3B yapılandırıcısı ve 500 görsellik ilham galerisi.

Kaynaklar `web/` klasöründedir. Uygulama sunucu veritabanı veya özel API anahtarı gerektirmeyen HTML, CSS ve JavaScript ile çalışır. Three.js ve görseller depoda yer alır. Google Fonts erişilemediğinde tarayıcı yazı tipi yedeği kullanılır.

## Çalıştırma

Node.js 22 veya üzeri ile:

```sh
node scripts/serve.mjs --dir web --port 4173
```

Tarayıcıda `http://localhost:4173` adresini açın. Paket kurulumu gerekmez. GitHub Codespaces kullanırken 4173 portu otomatik açılır; aynı siteyi bilgisayara indirmeden çalıştırabilirsiniz.

## Kontrol ve yayın paketi

```sh
node scripts/check.mjs
node scripts/build.mjs --base /adop-configurator
node scripts/check.mjs --built
```

Hazır site `_site/` klasörüne yazılır. GitHub Pages alt adresi, sayfaların doğrudan açılması, sorgu parametreleri ve görsel yolları için yayın uyarlaması oluşturma adımında yapılır. Kök alan adında yayınlamak için temel yol atlanabilir.

`main` dalına gönderilen değişiklikler GitHub Actions üzerinde kontrol edilir; hazır site `adop-website` adıyla iş akışı çıktısı olarak saklanır.

## GitHub Pages

Pages desteklenen bir depoda, Settings → Pages → Source alanında **GitHub Actions** seçilir. Settings → Secrets and variables → Actions → Variables altında `PAGES_ENABLED=true` tanımlandığında `main` değişiklikleri otomatik yayınlanır. **GitHub Pages yayını** iş akışı elle de başlatılabilir.

GitHub Free özel depolarda Pages yayını sunmaz. Bu durumda kaynaklar özel depoda kalabilir ve Codespaces ile çalıştırılabilir; doğrudan Pages yayını için herkese açık depo veya bunu destekleyen bir GitHub planı gerekir. Depo görünürlüğü kendiliğinden değiştirilmez.

## Sayfalar

- `/` — Kendin tasarla
- `/anasayfa` — Ürün anlatımı
- `/moduller` — Modül kategorileri
- `/modul` — Modül detayı
- `/kombinasyonlar` — Kombinasyonlar ve ölçü filtreleri
- `/ilham` — 500 görselin ilham galerisi
- `/gorunum` — Mobil / masaüstü görünüm seçimi
- `/v2/` — Alternatif arayüz

## Kapsam ve korunan arşivler

Bu depo çalışan siteyi ve web görsellerini içerir. Yüksek çözünürlüklü görsel orijinalleri, tam proje ZIP'i ve Ar-Ge / masa geliştirme dosyalarının tamamı bu depoda değildir. Ayrıntılar: [Arşiv kapsamı](docs/arsiv-kapsami.md).

Başlangıç kaynağının dosya kimlikleri ve Sites sürümü: [Kaynak aktarım kaydı](migration/origin-manifest.json).

Üçüncü taraf kütüphane ve görsel kaynak bilgileri `web/assets/credits.txt` ve ilgili lisans dosyalarında korunmuştur. ADØP tasarımları ve görselleri için açık kaynak lisansı verilmemiştir.
