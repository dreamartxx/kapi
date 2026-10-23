# KAPI — Minecraft temalı uygulama portalları

Yedi uygulama için hareketli, mobil uyumlu portal merkezi ve şifreli yönetim paneli. PHP 8.2+ kullanır; Composer, Node.js, derleme veya MySQL kurulumu gerektirmez. Güncel PHP 8.3+ önerilir.

## Hostinger kurulumu

Hedef: `https://whitesmoke-curlew-715276.hostingersite.com`

1. hPanel'de bu alan adına ait **özel PHP/HTML web sitesi** açın. PHP Yapılandırması'ndan güncel PHP 8.3 veya üzerini ve SSL/HTTPS'i etkinleştirin.
2. Git dağıtımı için `https://github.com/dreamartxx/kapi` reposunun `main` dalını bağlayın. Dosyalar web köküne (`public_html`) gelmeli. Node.js veya build komutu kullanılmaz. Alternatif: teslim edilen ZIP'i `public_html` içine çıkarın; `index.html`, `admin.html`, `api.php`, `assets/` ve `data/.htaccess` burada olmalı.
3. `/admin.html` adresini açın. İlk istekte `data/state.php` otomatik oluşturulur. PHP kullanıcısının `data/` dizinine yazabilmesi gerekir; 777 izni vermeyin.
4. hPanel Dosya Yöneticisi'nde **public_html/data/state.php** dosyasını açın. JSON içindeki `setup_key` değerini kopyalayın. Bu dosya web üzerinden okunamaz; dosya yöneticisinden açın.
5. Yönetim ekranına kurulum anahtarını ve **en az 6 karakterli kendi şifrenizi** yazın. Kurulum anahtarı başarılı kurulumdan sonra silinir. Hazır/varsayılan bir şifre yoktur.
6. Portal adını, kategori, renk, açıklama ve URL alanlarını düzenleyip **Değişiklikleri kaydet** seçin. Boş URL, “Yakında” durumu oluşturur.

Hostinger rehberleri: [Git dağıtımı](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/), [Dosya Yöneticisi](https://www.hostinger.com/support/4548688-basic-actions-in-the-file-manager-in-hostinger/), [PHP sürümü](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/).

## Başlangıç bağlantıları

1. Morpa Kampüs — https://www.morpakampus.com/giris
2. Okumanya — https://oku.okumanya.com.tr/auth/login
3. Kültür Okulları — https://ogrenci.ozelbursakulturokullari.com/Kullanici/Giris
4–7. Admin panelinden eklenmek üzere boş.

Bu merkez bağlantıları yeni sekmede açar. Diğer platformların kullanıcı adı/şifrelerini toplamaz, ortak giriş (SSO) sağlamaz. Her platformun kendi giriş ekranı kullanılır.

## Veri ve güvenlik

- Portal ayarları ve parola hash'i sunucudaki `data/state.php` dosyasında tutulur. Yalnızca yedi portal için ayrı veritabanı gerekmez.
- `data/` ve `tests/` dizinleri Apache/LiteSpeed `.htaccess` ile erişime kapalıdır. `state.php`, ek olarak PHP çalıştırıldığında 404 döndüren bir korumayla başlar. PHP'yi kapatarak statik sunucu üzerinden yayınlamayın.
- İsterseniz `KAPI_DATA_DIR` ortam değişkeniyle veriyi web kökünün dışına taşıyabilirsiniz. Geçerli veri dosyasını yeni dizine kopyalayın ve dizine PHP yazma erişimi sağlayın.
- Şifre `password_hash` ile saklanır; minimum 6 Unicode karakter, maksimum 72 bayttır. Oturum çerezleri HttpOnly, SameSite=Strict ve HTTPS'te Secure'dür. Yönetim API'si, localhost haricinde HTTPS gerektirir.
- CSRF doğrulama, 30 dakika hareketsizlikte oturum kapatma, IP başına 15 dakikada 5 hatalı giriş sınırı ve eşzamanlı düzenleme çakışması kontrolü bulunur.
- Şifre değişince diğer oturumlar geçersiz olur. Kaydetme dosya kilidi ve atomik yeniden adlandırma kullanır.
- **data/state.php dosyasını yedekleyin.** Git'e veya genel ZIP'e dahil etmeyin. Dağıtımlarda mevcut `data/` içeriğini silmeyin; tüm klasörü temizleyen dağıtım seçeneklerini kullanmayın.
- Şifre unutulursa, dosya yöneticisinden `state.php` yedeğini alın. PHP CLI üzerinden `password_hash` ile ürettiğiniz yeni hash'i `password_hash` alanına yazıp `auth_version` değerini 1 artırın. JSON yapısını ve baştaki PHP korumasını koruyun; dosyayı silmek portal ayarlarını sıfırlar.
- Google Fonts yalnızca yazı tipi için kullanılır; yüklenmezse sistem fontuna geçilir. Resimler ve portal çizimleri repoda yereldir.

## Yerel çalıştırma ve test

```sh
php -S 127.0.0.1:8097 -t .
python3 tests/integration.py
```

Test ayrı geçici depolama ve ayrı PHP sunucusu kullanır; site verisine dokunmaz. Şifre kurulumu, giriş, CSRF, URL doğrulama, kaydetme, çakışma, oturum iptali ve hız sınırını doğrular.

Minecraft tarzı çizimler ve fan temalı arayüzdür. Mojang veya Microsoft ile resmi bağlantısı yoktur.
