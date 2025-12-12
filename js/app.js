const BAKIM_MODU = false;
// Apps Script URL'si
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby3kd04k2u9XdVDD1-vdbQQAsHNW6WLIn8bNYxTlVCL3U1a0WqZo6oPp9zfBWIpwJEinQ/exec";
let jokers = { call: 1, half: 1, double: 1 };
let doubleChanceUsed = false;
let firstAnswerIndex = -1;
const VALID_CATEGORIES = ['Teknik', 'İkna', 'Kampanya', 'Bilgi'];
// --- GLOBAL DEĞİŞKENLER ---
let database = [], newsData = [], sportsData = [], salesScripts = [], quizQuestions = [];
let techWizardData = {}; // Teknik Sihirbaz Verisi
let currentUser = "";
let isAdminMode = false;    
let isEditingActive = false;
let sessionTimeout;
let activeCards = [];
let currentCategory = 'all';
let adminUserList = [];
let allEvaluationsData = [];
let wizardStepsData = {};
const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
// ==========================================================
// --- KALİTE PUANLAMA LOGİĞİ: CHAT (BUTON TABANLI) ---
// ==========================================================
/**
 * Puanlama butonuna basıldığında ilgili satırın skorunu ve görünümünü günceller.
 * @param {number} index - Kriterin dizin numarası.
 * @param {number} score - Atanan puan (İyi/Orta/Kötü'den gelen).
 * @param {number} max - Kriterin maksimum puanı.
 */
window.setButtonScore = function(index, score, max) {
    const row = document.getElementById(`row-${index}`);
    const badge = document.getElementById(`badge-${index}`);
    const noteInput = document.getElementById(`note-${index}`);
    const buttons = row.querySelectorAll('.eval-button');
    // Butonları resetle
    buttons.forEach(b => b.classList.remove('active'));
    // Aktif butonu ayarla
    const activeBtn = row.querySelector(`.eval-button[data-score="${score}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    // Puanı göster
    badge.innerText = score;
    // Not Alanını Güncelle (Max puandan düşükse göster)
    if (score < max) {
        noteInput.style.display = 'block';
        badge.style.background = '#d32f2f'; // Kırmızıya çek
        row.style.borderColor = '#ffcdd2';
        row.style.background = '#fff5f5';
    } else {
        noteInput.style.display = 'none';
        noteInput.value = ''; // Notu temizle
        badge.style.background = '#2e7d32'; // Yeşile çek
        row.style.borderColor = '#eee';
        row.style.background = '#fff';
    }
    window.recalcTotalScore();
};
/**
 * Toplam skoru hesaplar ve göstergeyi günceller (Buton Versiyonu).
 */
window.recalcTotalScore = function() {
    let currentTotal = 0;
    let maxTotal = 0;
    
    // Puanları badge'lerden topla
    const scoreBadges = document.querySelectorAll('.score-badge');
    scoreBadges.forEach(b => {
        currentTotal += parseInt(b.innerText) || 0;
    });
    
    // Max puanları row attribute'ünden topla
    const maxScores = document.querySelectorAll('.criteria-row');
    maxScores.forEach(row => {
        const max = parseInt(row.getAttribute('data-max-score')) || 0;
        maxTotal += max;
    });
    
    const liveScoreEl = document.getElementById('live-score');
    const ringEl = document.getElementById('score-ring');
    if(liveScoreEl) liveScoreEl.innerText = currentTotal;
    if(ringEl) {
        let color = '#2e7d32';
        let ratio = maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;
        if(ratio < 50) color = '#d32f2f';
        else if(ratio < 85) color = '#ed6c02';
        else if(ratio < 95) color = '#fabb00';
        ringEl.style.background = `conic-gradient(${color} ${ratio}%, #444 ${ratio}%)`;
    }
};
// ==========================================================
// --- KALİTE PUANLAMA LOGİĞİ: TELE SATIŞ (SLIDER TABANLI) ---
// ==========================================================
/**
 * Puanlama slider'ı hareket ettiğinde ilgili satırın skorunu ve görünümünü günceller.
 * Bu fonksiyon Telesatış için eski slider mantığını geri getirir.
 * @param {number} index - Kriterin dizin numarası.
 * @param {number} max - Kriterin maksimum puanı.
 */
window.updateRowSliderScore = function(index, max) {
    const slider = document.getElementById(`slider-${index}`);
    const badge = document.getElementById(`badge-${index}`);
    const noteInput = document.getElementById(`note-${index}`);
    const row = document.getElementById(`row-${index}`);
    if(!slider) return;
    const val = parseInt(slider.value);
    badge.innerText = val;
    
    // Stil Güncelleme (Max puandan düşükse kırmızı, değilse yeşil/normal)
    if (val < max) {
        noteInput.style.display = 'block';
        badge.style.background = '#d32f2f';
        row.style.borderColor = '#ffcdd2';
        row.style.background = '#fff5f5';
    } else {
        noteInput.style.display = 'none';
        noteInput.value = '';
        badge.style.background = '#2e7d32';
        row.style.borderColor = '#eee';
        row.style.background = '#fff';
    }
    window.recalcTotalSliderScore();
};
/**
 * Toplam skoru hesaplar ve göstergeyi günceller (Slider Versiyonu).
 */
window.recalcTotalSliderScore = function() {
    let currentTotal = 0;
    let maxTotal = 0;
    const sliders = document.querySelectorAll('.slider-input');
    
    sliders.forEach(s => {
        // Slider input'larının hepsi toplanır
        currentTotal += parseInt(s.value) || 0;
        maxTotal += parseInt(s.getAttribute('max')) || 0;
    });
    const liveScoreEl = document.getElementById('live-score');
    const ringEl = document.getElementById('score-ring');
    
    if(liveScoreEl) liveScoreEl.innerText = currentTotal;
    if(ringEl) {
        let color = '#2e7d32';
        let ratio = maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;
        if(ratio < 50) color = '#d32f2f';
        else if(ratio < 85) color = '#ed6c02';
        else if(ratio < 95) color = '#fabb00';
        ringEl.style.background = `conic-gradient(${color} ${ratio}%, #444 ${ratio}%)`;
    }
};
// --- YARDIMCI FONKSİYONLAR ---
function getToken() { return localStorage.getItem("sSportToken"); }
function getFavs() { return JSON.parse(localStorage.getItem('sSportFavs') || '[]'); }
function toggleFavorite(title) {
    event.stopPropagation();
    let favs = getFavs();
    if (favs.includes(title)) {
        favs = favs.filter(t => t !== title);
    } else {
        favs.push(title);
    }
    localStorage.setItem('sSportFavs', JSON.stringify(favs));
    if (currentCategory === 'fav') {
        filterCategory(document.querySelector('.btn-fav'), 'fav');
    } else {
        renderCards(activeCards);
    }
}
function isFav(title) { return getFavs().includes(title); }
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return 'N/A';
    if (dateString.match(/^\d{2}\.\d{2}\.\d{4}/)) { return dateString; }
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { return dateString; }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    } catch (e) { return dateString; }
}
function isNew(dateStr) {
    if (!dateStr) return false;
    let date;
    if (dateStr.indexOf('.') > -1) {
        const cleanDate = dateStr.split(' ')[0];
        const parts = cleanDate.split('.');
        date = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
        date = new Date(dateStr);
    }
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
}
function getCategorySelectHtml(currentCategory, id) {
    let options = VALID_CATEGORIES.map(cat => `<option value="${cat}" ${cat === currentCategory ? 'selected' : ''}>${cat}</option>`).join('');
    if (currentCategory && !VALID_CATEGORIES.includes(currentCategory)) {
        options = `<option value="${currentCategory}" selected>${currentCategory} (Hata)</option>` + options;
    }
    // Düzenleme pencerelerindeki stil sorununu çözmek için `swal2-input` sınıfını ekledik.
    return `<select id="${id}" class="swal2-input" style="width:100%; margin-top:5px; height:35px; font-size:0.9rem;">${options}</select>`;
}
function escapeForJsString(text) {
    if (!text) return "";
    return text.toString().replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '');
}
// YENİ GÜVENLİ KOPYALAMA FONKSİYONU (Sihirbaz İçin)
function copyScriptContent(encodedText) {
    const text = decodeURIComponent(encodedText);
    copyText(text);
}
function copyText(t) {
    navigator.clipboard.writeText(t.replace(/\\n/g, '\n')).then(() => 
        Swal.fire({icon:'success', title:'Kopyalandı', toast:true, position:'top-end', showConfirmButton:false, timer:1500}) );
}
function highlightText(htmlContent) {
    if (!htmlContent) return "";
    const searchTerm = document.getElementById('searchInput').value.toLocaleLowerCase('tr-TR').trim();
    if (!searchTerm) return htmlContent;
    try {
        const regex = new RegExp(`(${searchTerm})`, "gi");
        // Highlight sınıfı CSS'te tanımlı olmalıdır.
        return htmlContent.toString().replace(regex, '<span class="highlight">$1</span>');
    } catch(e) {
        return htmlContent;
    }
}
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) { if(e.keyCode == 123) return false; }
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});
// --- SESSION & LOGIN ---
/**
 * qusers rolü için sadece kalite modalını açar ve diğer içerikleri gizler.
 */
function checkSession() {
    const savedUser = localStorage.getItem("sSportUser");
    const savedToken = localStorage.getItem("sSportToken");
    const savedRole = localStorage.getItem("sSportRole");
    if (savedUser && savedToken) {
        currentUser = savedUser;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("user-display").innerText = currentUser;
        checkAdmin(savedRole);
        startSessionTimer();
        
        if (BAKIM_MODU) {
            document.getElementById("maintenance-screen").style.display = "flex";
        } else {
            document.getElementById("main-app").style.display = "block";
            loadContentData();
            loadWizardData();
            loadTechWizardData();
            
            // Eğer qusers rolündeyse, ana içeriği gizle ve kalite modalını aç
            if (savedRole === 'qusers') {
                 // Ana içeriği (kartlar) gizle
                const grid = document.getElementById('cardGrid');
                if (grid) grid.style.display = 'none';
                // Filtre ve arama alanını gizle
                const controls = document.querySelector('.control-wrapper');
                if (controls) controls.style.display = 'none';
                // Ticker'ı gizle
                const ticker = document.querySelector('.news-ticker-box');
                if (ticker) ticker.style.display = 'none';
                
                // Kalite Modalını aç
                openQualityArea();
            }
        }
    }
}
function enterBas(e) { if (e.key === "Enter") girisYap(); }
function girisYap() {
    const uName = document.getElementById("usernameInput").value.trim();
    const uPass = document.getElementById("passInput").value.trim();
    const loadingMsg = document.getElementById("loading-msg");
    const errorMsg = document.getElementById("error-msg");
    if(!uName || !uPass) {
        errorMsg.innerText = "Lütfen bilgileri giriniz.";
        errorMsg.style.display = "block";
        return;
    }
    loadingMsg.style.display = "block";
    loadingMsg.innerText = "Doğrulanıyor...";
    errorMsg.style.display = "none";
    document.querySelector('.login-btn').disabled = true;
    const hashedPass = CryptoJS.SHA256(uPass).toString();
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "login", username: uName, password: hashedPass })
    }).then(response => response.json())
    .then(data => {
        loadingMsg.style.display = "none";
        document.querySelector('.login-btn').disabled = false;
        
        if (data.result === "success") {
            currentUser = data.username;
            localStorage.setItem("sSportUser", currentUser);
            localStorage.setItem("sSportToken", data.token);
            localStorage.setItem("sSportRole", data.role);
            
            const savedRole = data.role; // Yeni eklenen
            
            if (data.forceChange === true) {
                Swal.fire({
                    icon: 'warning',
                    title: '    ⚠️     Güvenlik Uyarısı',
                    text: 'İlk girişiniz. Lütfen şifrenizi değiştirin.',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    confirmButtonText: 'Şifremi Değiştir'
                }).then(() => { changePasswordPopup(true); });
            } else {
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("user-display").innerText = currentUser;
                checkAdmin(savedRole);
                startSessionTimer();
                
                if (BAKIM_MODU) {
                    document.getElementById("maintenance-screen").style.display = "flex";
                } else {
                    document.getElementById("main-app").style.display = "block";
                    loadContentData();
                    loadWizardData();
                    loadTechWizardData();
                    
                    if (savedRole === 'qusers') { 
                        // Ana içeriği (kartlar) gizle
                        const grid = document.getElementById('cardGrid');
                        if (grid) grid.style.display = 'none';
                        // Filtre ve arama alanını gizle
                        const controls = document.querySelector('.control-wrapper');
                        if (controls) controls.style.display = 'none';
                        // Ticker'ı gizle
                        const ticker = document.querySelector('.news-ticker-box');
                        if (ticker) ticker.style.display = 'none';
                        openQualityArea();
                    }
                }
            }
        } else {
            errorMsg.innerText = data.message || "Hatalı giriş!";
            errorMsg.style.display = "block";
        }
    }).catch(error => {
        console.error("Login Error:", error);
        loadingMsg.style.display = "none";
        document.querySelector('.login-btn').disabled = false;
        errorMsg.innerText = "Sunucu hatası! Lütfen sayfayı yenileyin.";
        errorMsg.style.display = "block";
    });
}
function checkAdmin(role) {
    const addCardDropdown = document.getElementById('dropdownAddCard');
    const quickEditDropdown = document.getElementById('dropdownQuickEdit');
    
    isAdminMode = (role === "admin");
    isEditingActive = false;
    document.body.classList.remove('editing');
    
    // qusers rolü için menü butonlarını devre dışı bırak
    const isQualityUser = (role === 'qusers');
    const filterButtons = document.querySelectorAll('.filter-btn:not(.btn-fav)'); 
    
    if (isQualityUser) {
        // Tüm menü butonlarını devre dışı bırak
        filterButtons.forEach(btn => {
            // Kalite butonu hariç diğer tüm menü butonlarını gizle/devre dışı bırak
            if (btn.innerText.indexOf('Kalite') === -1) {
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
                btn.style.filter = 'grayscale(100%)';
            } else {
                btn.style.filter = 'none';
            }
        });
        
        // Ana navigasyon filtresini de devre dışı bırakalım
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.disabled = true;
            searchInput.placeholder = "Arama devre dışı (Kalite Modu)";
            searchInput.style.opacity = '0.6';
        }
    } else {
        // Tüm menü butonlarını aktif et
        filterButtons.forEach(btn => {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.style.filter = 'none';
        });
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.disabled = false;
            searchInput.placeholder = "İçeriklerde hızlı ara...";
            searchInput.style.opacity = '1';
        }
    }
    
    if(isAdminMode) {
        if(addCardDropdown) addCardDropdown.style.display = 'flex';
        if(quickEditDropdown) {
            quickEditDropdown.style.display = 'flex';
            quickEditDropdown.innerHTML = '<i class="fas fa-pen" style="color:var(--secondary);"></i> Düzenlemeyi Aç';
            quickEditDropdown.classList.remove('active');
        }
    } else {
        if(addCardDropdown) addCardDropdown.style.display = 'none';
        if(quickEditDropdown) quickEditDropdown.style.display = 'none';
    }
}
function logout() {
    currentUser = "";
    isAdminMode = false;
    isEditingActive = false;
    document.body.classList.remove('editing');
    
    localStorage.removeItem("sSportUser");
    localStorage.removeItem("sSportToken");
    localStorage.removeItem("sSportRole");
    
    if (sessionTimeout) clearTimeout(sessionTimeout);
    
    document.getElementById("main-app").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("passInput").value = "";
    document.getElementById("usernameInput").value = "";
    document.getElementById("error-msg").style.display = "none";
}
function startSessionTimer() {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        Swal.fire({ icon: 'warning', title: 'Oturum Süresi Doldu', text: 'Güvenlik nedeniyle otomatik çıkış yapıldı.', confirmButtonText: 'Tamam' }).then(() => { logout(); });
    },  28800000);
}
function openUserMenu() {
    let options = {
        title: `Merhaba, ${currentUser}`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '    🔑     Şifre Değiştir',
        denyButtonText: '    🚪     Çıkış Yap',
        cancelButtonText: 'İptal'
    };
    Swal.fire(options).then((result) => {
        if (result.isConfirmed) changePasswordPopup();
        else if (result.isDenied) logout();
    });
}
async function changePasswordPopup(isMandatory = false) {
    const { value: formValues } = await Swal.fire({
        title: isMandatory ? 'Yeni Şifre Belirleyin' : 'Şifre Değiştir',
        html: `${isMandatory ? '<p style="font-size:0.9rem; color:#d32f2f;">İlk giriş şifrenizi değiştirmeden devam edemezsiniz.</p>' : ''}<input id="swal-old-pass" type="password" class="swal2-input" placeholder="Eski Şifre (Mevcut)"><input id="swal-new-pass" type="password" class="swal2-input" placeholder="Yeni Şifre">`,
        focusConfirm: false,
        showCancelButton: !isMandatory,
        allowOutsideClick: !isMandatory,
        allowEscapeKey: !isMandatory,
        confirmButtonText: 'Değiştir',
        cancelButtonText: 'İptal',
        preConfirm: () => {
            const o = document.getElementById('swal-old-pass').value;
            const n = document.getElementById('swal-new-pass').value;
            if(!o || !n) { Swal.showValidationMessage('Alanlar boş bırakılamaz'); }
            return [ o, n ]
        }
    });
    if (formValues) {
        Swal.fire({ title: 'İşleniyor...', didOpen: () => { Swal.showLoading() } });
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "changePassword",
                username: currentUser,
                oldPass: CryptoJS.SHA256(formValues[0]).toString(),
                newPass: CryptoJS.SHA256(formValues[1]).toString(),
                token: getToken()
            })
        })
        .then(response => response.json())
        .then(data => {
            if(data.result === "success") {
                Swal.fire('Başarılı!', 'Şifreniz güncellendi. Güvenlik gereği yeniden giriş yapınız.', 'success').then(() => { logout(); });
            } else {
                Swal.fire('Hata', data.message || 'İşlem başarısız.', 'error').then(() => { if(isMandatory) changePasswordPopup(true); });
            }
        }).catch(err => {
            Swal.fire('Hata', 'Sunucu hatası.', 'error');
            if(isMandatory) changePasswordPopup(true);
        });
    } else if (isMandatory) {
        changePasswordPopup(true);
    }
}
// --- DATA FETCHING ---
function loadContentData() {
    document.getElementById('loading').style.display = 'block';
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "fetchData" })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loading').style.display = 'none';
        if (data.result === "success") {
            const rawData = data.data;
            const fetchedCards = rawData.filter(i => ['card','bilgi','teknik','kampanya','ikna'].includes(i.Type.toLowerCase())).map(i => ({
                title: i.Title,
                category: i.Category,
                text: i.Text,
                script: i.Script,
                code: i.Code,
                link: i.Link,
                date: formatDateToDDMMYYYY(i.Date)
            }));
            const fetchedNews = rawData.filter(i => i.Type.toLowerCase() === 'news').map(i => ({
                date: formatDateToDDMMYYYY(i.Date),
                title: i.Title,
                desc: i.Text,
                type: i.Category,
                status: i.Status
            }));
            const fetchedSports = rawData.filter(i => i.Type.toLowerCase() === 'sport').map(i => ({
                title: i.Title,
                icon: i.Icon,
                desc: i.Text,
                tip: i.Tip,
                detail: i.Detail,
                pronunciation: i.Pronunciation
            }));
            const fetchedSales = rawData.filter(i => i.Type.toLowerCase() === 'sales').map(i => ({
                title: i.Title,
                text: i.Text
            }));
            const fetchedQuiz = rawData.filter(i => i.Type.toLowerCase() === 'quiz').map(i => ({
                q: i.Text,
                opts: i.QuizOptions ? i.QuizOptions.split(',').map(o => o.trim()) : [],
                a: parseInt(i.QuizAnswer)
            }));
            database = fetchedCards;
            newsData = fetchedNews;
            sportsData = fetchedSports;
            salesScripts = fetchedSales;
            quizQuestions = fetchedQuiz;
            if(currentCategory === 'fav') {
                filterCategory(document.querySelector('.btn-fav'), 'fav');
            } else {
                activeCards = database;
                renderCards(database);
            }
            startTicker();
        } else {
            document.getElementById('loading').innerHTML = `Veriler alınamadı: ${data.message || 'Bilinmeyen Hata'}`;
        }
    })
    .catch(error => {
        console.error("Fetch Hatası:", error);
        document.getElementById('loading').innerHTML = 'Bağlantı Hatası! Sunucuya ulaşılamıyor.';
    });
}
function loadWizardData() {
    return new Promise((resolve, reject) => {
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "getWizardData" })
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === "success" && data.steps) {
                wizardStepsData = data.steps;
                resolve();
            } else {
                wizardStepsData = {};
                reject(new Error("Wizard verisi yüklenemedi."));
            }
        })
        .catch(error => {
            wizardStepsData = {};
            reject(error);
        });
    });
}
function loadTechWizardData() {
    return new Promise((resolve, reject) => {
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "getTechWizardData" })
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === "success" && data.steps) {
                techWizardData = data.steps;
                resolve();
            } else {
                techWizardData = {};
            }
        })
        .catch(error => {
            techWizardData = {};
        });
    });
}
// --- RENDER & FILTERING ---
function renderCards(data) {
    activeCards = data;
    const container = document.getElementById('cardGrid');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#777;">Kayıt bulunamadı.</div>';
        return;
    }
    data.forEach((item, index) => {
        const safeTitle = escapeForJsString(item.title);
        const isFavorite = isFav(item.title);
        const favClass = isFavorite ? 'fas fa-star active' : 'far fa-star';
        const newBadge = isNew(item.date) ? '<span class="new-badge">YENİ</span>' : '';
        const editIconHtml = (isAdminMode && isEditingActive) 
            ? `<i class="fas fa-pencil-alt edit-icon" onclick="editContent(${index})" style="display:block;"></i>` 
            : '';
        
        let rawText = item.text || "";
        let formattedText = rawText.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<b>$1</b>');
        
        let html = `<div class="card ${item.category}">${newBadge}
            <div class="icon-wrapper">
                ${editIconHtml}
                <i class="${favClass} fav-icon" onclick="toggleFavorite('${safeTitle}')"></i>
            </div>
            <div class="card-header"><h3 class="card-title">${highlightText(item.title)}</h3><span class="badge">${item.category}</span></div>
            <div class="card-content" onclick="showCardDetail('${safeTitle}', '${escapeForJsString(item.text)}')">
                <div class="card-text-truncate">${highlightText(formattedText)}</div>
                <div style="font-size:0.8rem; color:#999; margin-top:5px; text-align:right;">(Tamamını oku)</div>
            </div>
            <div class="script-box">${highlightText(item.script)}</div>
            <div class="card-actions">
                <button class="btn btn-copy" onclick="copyText('${escapeForJsString(item.script)}')"><i class="fas fa-copy"></i> Kopyala</button>
                ${item.code ? `<button class="btn btn-copy" style="background:var(--secondary); color:#0e1b42; font-weight:700;" onclick="copyText('${escapeForJsString(item.code)}')">Kod</button>` : ''}
                ${item.link ? `<a href="${item.link}" target="_blank" class="btn btn-link"><i class="fas fa-external-link-alt"></i> Link</a>` : ''}
            </div>
        </div>`;
        container.innerHTML += html;
    });
}
function filterCategory(btn, cat) {
    currentCategory = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterContent();
}
function filterContent() {
    const search = document.getElementById('searchInput').value.toLocaleLowerCase('tr-TR').trim();
    let filtered = database;
    if (currentCategory === 'fav') {
        filtered = filtered.filter(i => isFav(i.title));
    } else if (currentCategory !== 'all') {
        filtered = filtered.filter(i => i.category === currentCategory);
    }
    if (search) {
        filtered = filtered.filter(item => {
            const title = (item.title || "").toString().toLocaleLowerCase('tr-TR');
            const text = (item.text || "").toString().toLocaleLowerCase('tr-TR');
            const script = (item.script || "").toString().toLocaleLowerCase('tr-TR');
            const code = (item.code || "").toString().toLocaleLowerCase('tr-TR');
            return title.includes(search) || text.includes(search) || script.includes(search) || code.includes(search);
        });
    }
    activeCards = filtered;
    renderCards(filtered);
}
function showCardDetail(title, text) {
    Swal.fire({
        title: title,
        html: `<div style="text-align:left; font-size:1rem; line-height:1.6;">${text.replace(/\\n/g,'<br>')}</div>`,
        showCloseButton: true,
        showConfirmButton: false,
        width: '600px',
        background: '#f8f9fa'
    });
}
function toggleEditMode() {
    if (!isAdminMode) return;
    isEditingActive = !isEditingActive;
    document.body.classList.toggle('editing', isEditingActive);
    
    const btn = document.getElementById('dropdownQuickEdit');
    if(isEditingActive) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-times" style="color:var(--accent);"></i> Düzenlemeyi Kapat';
        Swal.fire({ icon: 'success', title: 'Düzenleme Modu AÇIK', text: 'Kalem ikonlarına tıklayarak içerikleri düzenleyebilirsiniz.', timer: 1500, showConfirmButton: false });
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-pen" style="color:var(--secondary);"></i> Düzenlemeyi Aç';
    }
    filterContent();
    // Diğer modüllerdeki ikonları da güncellemek için
    if(document.getElementById('guide-modal').style.display === 'flex') openGuide();
    if(document.getElementById('sales-modal').style.display === 'flex') openSales();
    if(document.getElementById('news-modal').style.display === 'flex') openNews();
}
function sendUpdate(o, c, v, t='card') {
    if (!Swal.isVisible()) Swal.fire({ title: 'Kaydediliyor...', didOpen: () => { Swal.showLoading() } });
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "updateContent", title: o, column: c, value: v, type: t, originalText: o, username: currentUser, token: getToken() })
    }).then(r => r.json())
    .then(data => {
        if (data.result === "success") {
            Swal.fire({icon: 'success', title: 'Başarılı', timer: 1500, showConfirmButton: false});
            setTimeout(loadContentData, 1600);
        } else {
            Swal.fire('Hata', 'Kaydedilemedi: ' + (data.message || 'Bilinmeyen Hata'), 'error');
        }
    }).catch(err => Swal.fire('Hata', 'Sunucu hatası.', 'error'));
}
// --- CRUD OPERASYONLARI ---
async function addNewCardPopup() {
    const catSelectHTML = getCategorySelectHtml('Bilgi', 'swal-new-cat');
    const { value: formValues } = await Swal.fire({
        title: 'Yeni İçerik Ekle',
        html: `
        <div style="margin-bottom:15px; text-align:left;">
            <label style="font-weight:bold; font-size:0.9rem;">Ne Ekleyeceksin?</label>
            <select id="swal-type-select" class="swal2-input" style="width:100%; margin-top:5px; height:35px; font-size:0.9rem;" onchange="toggleAddFields()">
                <option value="card">    📌     Bilgi Kartı</option>
                <option value="news">    📢     Duyuru</option>
                <option value="sales">    📞     Telesatış Scripti</option>
                <option value="sport">    🏆     Spor İçeriği</option>
                <option value="quiz">    ❓     Quiz Sorusu</option>
            </select>
        </div>
        <div id="preview-card" class="card Bilgi" style="text-align:left; box-shadow:none; border:1px solid #e0e0e0; margin-top:10px;">
            <div class="card-header" style="align-items: center; gap: 10px;">
                <input id="swal-new-title" class="swal2-input" style="margin:0; height:40px; flex-grow:1; border:none; border-bottom:2px solid #eee; padding:0 5px; font-weight:bold; color:#0e1b42;" placeholder="Başlık Giriniz...">
                <div id="cat-container" style="width: 110px;">${catSelectHTML}</div>
            </div>
            <div class="card-content" style="margin-bottom:10px;">
                <textarea id="swal-new-text" class="swal2-textarea" style="margin:0; width:100%; box-sizing:border-box; border:none; resize:none; font-family:inherit; min-height:100px; padding:10px; background:#f9f9f9;" placeholder="İçerik metni..."></textarea>
            </div>
            <div id="script-container" class="script-box" style="padding:0; border:1px solid #f0e68c;">
                <textarea id="swal-new-script" class="swal2-textarea" style="margin:0; width:100%; box-sizing:border-box; border:none; background:transparent; font-style:italic; min-height:80px; font-size:0.9rem;" placeholder="Script metni (İsteğe bağlı)..."></textarea>
            </div>
            <div id="extra-container" class="card-actions" style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div style="position:relative;"><i class="fas fa-code" style="position:absolute; left:10px; top:10px; color:#aaa;"></i><input id="swal-new-code" class="swal2-input" style="margin:0; height:35px; font-size:0.85rem; padding-left:30px;" placeholder="Kod"></div>
                <div style="position:relative;"><i class="fas fa-link" style="position:absolute; left:10px; top:10px; color:#aaa;"></i><input id="swal-new-link" class="swal2-input" style="margin:0; height:35px; font-size:0.85rem; padding-left:30px;" placeholder="Link"></div>
            </div>
            <div id="sport-extra" style="display:none; padding:10px;">
                <label style="font-weight:bold;">Kısa Açıklama (Desc)</label><input id="swal-sport-tip" class="swal2-input" placeholder="Kısa İpucu/Tip">
                <label style="font-weight:bold;">Detaylı Metin (Detail)</label><input id="swal-sport-detail" class="swal2-input" placeholder="Detaylı Açıklama (Alt Metin)">
                <label style="font-weight:bold;">Okunuşu (Pronunciation)</label><input id="swal-sport-pron" class="swal2-input" placeholder="Okunuşu">
                <label style="font-weight:bold;">İkon Sınıfı (Icon)</label><input id="swal-sport-icon" class="swal2-input" placeholder="FontAwesome İkon Sınıfı (e.g., fa-futbol)">
            </div>
            <div id="news-extra" style="display:none; padding:10px;">
                <label style="font-weight:bold;">Duyuru Tipi</label><select id="swal-news-type" class="swal2-input"><option value="info">Bilgi</option><option value="update">Değişiklik</option><option value="fix">Çözüldü</option></select>
                <label style="font-weight:bold;">Durum</label><select id="swal-news-status" class="swal2-input"><option value="Aktif">Aktif</option><option value="Pasif">Pasif (Gizle)</option></select>
            </div>
            <div id="quiz-extra" style="display:none; padding:10px;">
                <label style="font-weight:bold;">Soru Metni (Text)</label><textarea id="swal-quiz-q" class="swal2-textarea" placeholder="Quiz sorusu..."></textarea>
                <label style="font-weight:bold;">Seçenekler (Virgülle Ayırın)</label><input id="swal-quiz-opts" class="swal2-input" placeholder="Örn: şık A,şık B,şık C,şık D">
                <label style="font-weight:bold;">Doğru Cevap İndeksi</label><input id="swal-quiz-ans" type="number" class="swal2-input" placeholder="0 (A), 1 (B), 2 (C) veya 3 (D)" min="0" max="3">
            </div>
        </div>`,
        width: '700px',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-plus"></i> Ekle',
        cancelButtonText: 'İptal',
        focusConfirm: false,
        didOpen: () => {
            const selectEl = document.getElementById('swal-new-cat');
            const cardEl = document.getElementById('preview-card');
            selectEl.style.margin = "0"; selectEl.style.height = "30px"; selectEl.style.fontSize = "0.8rem"; selectEl.style.padding = "0 5px";
            
            selectEl.addEventListener('change', function() { cardEl.className = 'card ' + this.value; });
            
            window.toggleAddFields = function() {
                const type = document.getElementById('swal-type-select').value;
                const catCont = document.getElementById('cat-container');
                const scriptCont = document.getElementById('script-container');
                const extraCont = document.getElementById('extra-container');
                const sportExtra = document.getElementById('sport-extra');
                const newsExtra = document.getElementById('news-extra');
                const quizExtra = document.getElementById('quiz-extra');
                const cardPreview = document.getElementById('preview-card');
                
                catCont.style.display = 'none'; scriptCont.style.display = 'none'; extraCont.style.display = 'none';
                sportExtra.style.display = 'none'; newsExtra.style.display = 'none'; quizExtra.style.display = 'none';
                
                document.getElementById('swal-new-title').value = '';
                document.getElementById('swal-new-text').value = '';
                cardPreview.style.borderLeft = "5px solid var(--info)";
                cardPreview.className = 'card Bilgi';
                if (type === 'card') {
                    catCont.style.display = 'block'; scriptCont.style.display = 'block'; extraCont.style.display = 'grid';
                    cardPreview.className = 'card ' + document.getElementById('swal-new-cat').value;
                    document.getElementById('swal-new-title').placeholder = "Başlık Giriniz...";
                    document.getElementById('swal-new-text').placeholder = "İçerik metni...";
                } else if (type === 'sales') {
                    scriptCont.style.display = 'block';
                    document.getElementById('swal-new-script').placeholder = "Satış Metni...";
                    cardPreview.style.borderLeft = "5px solid var(--sales)";
                    document.getElementById('swal-new-title').placeholder = "Script Başlığı...";
                    document.getElementById('swal-new-text').placeholder = "Sadece buraya metin girilecek.";
                } else if (type === 'sport') {
                    sportExtra.style.display = 'block';
                    cardPreview.style.borderLeft = "5px solid var(--primary)";
                    document.getElementById('swal-new-title').placeholder = "Spor Terimi Başlığı...";
                    document.getElementById('swal-new-text').placeholder = "Kısa Açıklama (Desc)...";
                } else if (type === 'news') {
                    newsExtra.style.display = 'block';
                    cardPreview.style.borderLeft = "5px solid var(--secondary)";
                    document.getElementById('swal-new-title').placeholder = "Duyuru Başlığı...";
                    document.getElementById('swal-new-text').placeholder = "Duyuru Metni (Desc)...";
                } else if (type === 'quiz') {
                    quizExtra.style.display = 'block';
                    document.getElementById('swal-new-title').placeholder = "Quiz Başlığı (Örn: Soru 1)";
                    document.getElementById('swal-new-text').placeholder = "Bu alan boş bırakılacak.";
                    cardPreview.style.borderLeft = "5px solid var(--quiz)";
                }
            };
            // Default olarak card alanlarını göster
            window.toggleAddFields();
        },
        preConfirm: () => {
            const type = document.getElementById('swal-type-select').value;
            const today = new Date();
            const dateStr = today.getDate() + "." + (today.getMonth()+1) + "." + today.getFullYear();
            
            const quizOpts = type === 'quiz' ? document.getElementById('swal-quiz-opts').value : '';
            const quizAns = type === 'quiz' ? document.getElementById('swal-quiz-ans').value : '';
            const quizQ = type === 'quiz' ? document.getElementById('swal-quiz-q').value : '';
            
            if (type === 'quiz' && (!quizQ || !quizOpts || quizAns === '')) {
                Swal.showValidationMessage('Quiz sorusu için tüm alanlar (Soru, Seçenekler, Cevap İndeksi) zorunludur.');
                return false;
            }
            // Başlık kontrolü
            if (!document.getElementById('swal-new-title').value.trim()) {
                Swal.showValidationMessage('Başlık alanı boş bırakılamaz.');
                return false;
            }
            return {
                cardType: type,
                category: type === 'card' ? document.getElementById('swal-new-cat').value : (type === 'news' ? document.getElementById('swal-news-type').value : ''),
                title: document.getElementById('swal-new-title').value,
                text: type === 'quiz' ? quizQ : document.getElementById('swal-new-text').value,
                script: (type === 'card' || type === 'sales') ? document.getElementById('swal-new-script').value : '',
                code: type === 'card' ? document.getElementById('swal-new-code').value : '',
                status: type === 'news' ? document.getElementById('swal-news-status').value : '',
                link: type === 'card' ? document.getElementById('swal-new-link').value : '',
                tip: type === 'sport' ? document.getElementById('swal-sport-tip').value : '',
                detail: type === 'sport' ? document.getElementById('swal-sport-detail').value : '',
                pronunciation: type === 'sport' ? document.getElementById('swal-sport-pron').value : '',
                icon: type === 'sport' ? document.getElementById('swal-sport-icon').value : '',
                date: dateStr,
                quizOptions: quizOpts,
                quizAnswer: quizAns
            }
        }
    });
    if (formValues) {
        Swal.fire({ title: 'Ekleniyor...', didOpen: () => { Swal.showLoading() } });
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "addCard", username: currentUser, token: getToken(), ...formValues })
        })
        .then(response => response.json()).then(data => {
            if (data.result === "success") {
                Swal.fire({icon: 'success', title: 'Başarılı', text: 'İçerik eklendi.', timer: 2000, showConfirmButton: false});
                setTimeout(loadContentData, 3500);
            }
            else {
                Swal.fire('Hata', data.message || 'Eklenemedi.', 'error');
            }
        }).catch(err => Swal.fire('Hata', 'Sunucu hatası: ' + err, 'error'));
    }
}
async function editContent(index) {
    const item = activeCards[index];
    const catSelectHTML = getCategorySelectHtml(item.category, 'swal-cat');
    const { value: formValues } = await Swal.fire({
        title: 'Kartı Düzenle',
        html: `
        <div id="preview-card-edit" class="card ${item.category}" style="text-align:left; box-shadow:none; border:1px solid #e0e0e0; margin-top:10px;">
            <div class="card-header" style="align-items: center; gap: 10px;">
                <input id="swal-title" class="swal2-input" style="margin:0; height:40px; flex-grow:1; border:none; border-bottom:2px solid #eee; padding:0 5px; font-weight:bold; color:#0e1b42;" value="${item.title}" placeholder="Başlık">
                <div style="width: 110px;">${catSelectHTML}</div>
            </div>
            <div class="card-content" style="margin-bottom:10px;">
                <textarea id="swal-text" class="swal2-textarea" style="margin:0; width:100%; box-sizing:border-box; border:none; resize:none; font-family:inherit; min-height:120px; padding:10px; background:#f9f9f9;" placeholder="İçerik metni...">${(item.text || '').toString().replace(/<br>/g,'\n')}</textarea>
            </div>
            <div class="script-box" style="padding:0; border:1px solid #f0e68c;">
                <textarea id="swal-script" class="swal2-textarea" style="margin:0; width:100%; box-sizing:border-box; border:none; background:transparent; font-style:italic; min-height:80px; font-size:0.9rem;" placeholder="Script metni...">${(item.script || '').toString().replace(/<br>/g,'\n')}</textarea>
            </div>
            <div class="card-actions" style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div style="position:relative;"><i class="fas fa-code" style="position:absolute; left:10px; top:10px; color:#aaa;"></i><input id="swal-code" class="swal2-input" style="margin:0; height:35px; font-size:0.85rem; padding-left:30px;" value="${item.code || ''}" placeholder="Kod"></div>
                <div style="position:relative;"><i class="fas fa-link" style="position:absolute; left:10px; top:10px; color:#aaa;"></i><input id="swal-link" class="swal2-input" style="margin:0; height:35px; font-size:0.85rem; padding-left:30px;" value="${item.link || ''}" placeholder="Link"></div>
            </div>
        </div>`,
        width: '700px',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-save"></i> Değişiklikleri Kaydet',
        cancelButtonText: 'İptal',
        focusConfirm: false,
        preConfirm: () => {
            // Başlık kontrolü
            if (!document.getElementById('swal-title').value.trim()) {
                Swal.showValidationMessage('Başlık alanı boş bırakılamaz.');
                return false;
            }
            return {
                cat: document.getElementById('swal-cat').value,
                title: document.getElementById('swal-title').value,
                text: document.getElementById('swal-text').value,
                script: document.getElementById('swal-script').value,
                code: document.getElementById('swal-code').value,
                link: document.getElementById('swal-link').value
            }
        }
    });
    if (formValues) {
        if(formValues.cat !== item.category) sendUpdate(item.title, "Category", formValues.cat, 'card');
        if(formValues.text !== (item.text || '').replace(/<br>/g,'\n')) setTimeout(() => sendUpdate(item.title, "Text", formValues.text, 'card'), 500);
        if(formValues.script !== (item.script || '').replace(/<br>/g,'\n')) setTimeout(() => sendUpdate(item.title, "Script", formValues.script, 'card'), 1000);
        if(formValues.code !== (item.code || '')) setTimeout(() => sendUpdate(item.title, "Code", formValues.code, 'card'), 1500);
        if(formValues.link !== (item.link || '')) setTimeout(() => sendUpdate(item.title, "Link", formValues.link, 'card'), 2000);
        if(formValues.title !== item.title) setTimeout(() => sendUpdate(item.title, "Title", formValues.title, 'card'), 2500);
    }
}
async function editSport(title) {
    event.stopPropagation();
    const s = sportsData.find(item => item.title === title);
    if (!s) return Swal.fire('Hata', 'İçerik bulunamadı.', 'error');
    const { value: formValues } = await Swal.fire({
        title: 'Spor İçeriğini Düzenle',
        html: `
        <div class="card" style="text-align:left; border-left: 5px solid var(--primary); padding:15px; background:#f8f9fa;">
            <label style="font-weight:bold;">Başlık</label>
            <input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.title}">
            <label style="font-weight:bold;">Açıklama (Kısa Metin)</label>
            <textarea id="swal-desc" class="swal2-textarea" style="margin-bottom:10px;">${s.desc || ''}</textarea>
            <label style="font-weight:bold;">İpucu (Tip)</label>
            <input id="swal-tip" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.tip || ''}">
            <label style="font-weight:bold;">Detay (Alt Metin)</label>
            <textarea id="swal-detail" class="swal2-textarea" style="margin-bottom:10px;">${s.detail || ''}</textarea>
            <label style="font-weight:bold;">Okunuşu (Pronunciation)</label>
            <input id="swal-pron" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.pronunciation || ''}">
            <label style="font-weight:bold;">İkon Sınıfı (Icon)</label>
            <input id="swal-icon" class="swal2-input" style="width:100%;" value="${s.icon || ''}">
        </div>`,
        width: '700px',
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        preConfirm: () => {
            if (!document.getElementById('swal-title').value.trim()) {
                Swal.showValidationMessage('Başlık alanı boş bırakılamaz.');
                return false;
            }
            return [
                document.getElementById('swal-title').value,
                document.getElementById('swal-desc').value,
                document.getElementById('swal-tip').value,
                document.getElementById('swal-detail').value,
                document.getElementById('swal-pron').value,
                document.getElementById('swal-icon').value
            ]
        }
    });
    if (formValues) {
        const originalTitle = s.title;
        if(formValues[1] !== s.desc) sendUpdate(originalTitle, "Text", formValues[1], 'sport');
        if(formValues[2] !== s.tip) setTimeout(() => sendUpdate(originalTitle, "Tip", formValues[2], 'sport'), 500);
        if(formValues[3] !== s.detail) setTimeout(() => sendUpdate(originalTitle, "Detail", formValues[3], 'sport'), 1000);
        if(formValues[4] !== s.pronunciation) setTimeout(() => sendUpdate(originalTitle, "Pronunciation", formValues[4], 'sport'), 1500);
        if(formValues[5] !== s.icon) setTimeout(() => sendUpdate(originalTitle, "Icon", formValues[5], 'sport'), 2000);
        if(formValues[0] !== originalTitle) setTimeout(() => sendUpdate(originalTitle, "Title", formValues[0], 'sport'), 2500);
    }
}
async function editSales(title) {
    event.stopPropagation();
    const s = salesScripts.find(item => item.title === title);
    if (!s) return Swal.fire('Hata', 'İçerik bulunamadı.', 'error');
    const { value: formValues } = await Swal.fire({
        title: 'Satış Metnini Düzenle',
        html: `<div class="card" style="text-align:left; border-left: 5px solid var(--sales); padding:15px; background:#ecfdf5;"><label style="font-weight:bold;">Başlık</label><input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;"
        value="${s.title}"><label style="font-weight:bold;">Metin</label><textarea id="swal-text" class="swal2-textarea" style="min-height:150px;">${s.text || ''}</textarea></div>`,
        width: '700px',
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        preConfirm: () => {
            if (!document.getElementById('swal-title').value.trim()) {
                Swal.showValidationMessage('Başlık alanı boş bırakılamaz.');
                return false;
            }
            return [ document.getElementById('swal-title').value, document.getElementById('swal-text').value ]
        }
    });
    if (formValues) {
        const originalTitle = s.title;
        if(formValues[1] !== s.text) sendUpdate(originalTitle, "Text", formValues[1], 'sales');
        if(formValues[0] !== originalTitle) setTimeout(() => sendUpdate(originalTitle, "Title", formValues[0], 'sales'), 500);
    }
}
async function editNews(index) {
    const i = newsData[index];
    let statusOptions = `<option value="Aktif" ${i.status !== 'Pasif' ? 'selected' : ''}>Aktif</option><option value="Pasif" ${i.status === 'Pasif' ? 
    'selected' : ''}>Pasif (Gizle)</option>`;
    let typeOptions = `<option value="info" ${i.type === 'info' ? 'selected' : ''}>Bilgi</option><option value="update" ${i.type === 'update' ? 
    'selected' : ''}>Değişiklik</option><option value="fix" ${i.type === 'fix' ? 'selected' : ''}>Çözüldü</option>`;
    
    const { value: formValues } = await Swal.fire({
        title: 'Duyuruyu Düzenle',
        html: `<div class="card" style="text-align:left; border-left: 5px solid var(--secondary); padding:15px; background:#fff8e1;"><label style="font-weight:bold;">Başlık</label><input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;"
        value="${i.title || ''}"><div style="display:flex; gap:10px; margin-bottom:10px;"><div style="flex:1;"><label style="font-weight:bold;">Tarih</label><input id="swal-date" class="swal2-input" style="width:100%;"
        value="${i.date || ''}"></div><div style="flex:1;"><label style="font-weight:bold;">Tür</label><select id="swal-type" class="swal2-input" style="width:100%;">${typeOptions}</select></div></div><label style="font-weight:bold;">Metin</label><textarea id="swal-desc" class="swal2-textarea" style="margin-bottom:10px;">${i.desc || ''}</textarea><label style="font-weight:bold;">Durum</label><select id="swal-status" class="swal2-input" style="width:100%;">${statusOptions}</select></div>`,
        width: '600px',
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        preConfirm: () => {
            if (!document.getElementById('swal-title').value.trim()) {
                Swal.showValidationMessage('Başlık alanı boş bırakılamaz.');
                return false;
            }
            return [
                document.getElementById('swal-title').value,
                document.getElementById('swal-date').value,
                document.getElementById('swal-desc').value,
                document.getElementById('swal-type').value,
                document.getElementById('swal-status').value
            ]
        }
    });
    if (formValues) {
        const originalTitle = i.title;
        if(formValues[1] !== i.date) sendUpdate(originalTitle, "Date", formValues[1], 'news');
        if(formValues[2] !== i.desc) setTimeout(() => sendUpdate(originalTitle, "Text", formValues[2], 'news'), 500);
        if(formValues[3] !== i.type) setTimeout(() => sendUpdate(originalTitle, "Category", formValues[3], 'news'), 1000);
        if(formValues[4] !== i.status) setTimeout(() => sendUpdate(originalTitle, "Status", formValues[4], 'news'), 1500);
        if(formValues[0] !== originalTitle) setTimeout(() => sendUpdate(originalTitle, "Title", formValues[0], 'news'), 2000);
    }
}
// --- MODALS ---
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function startTicker() {
    const t = document.getElementById('ticker-content');
    const activeNews = newsData.filter(i => i.status !== 'Pasif');
    
    if(activeNews.length === 0) {
        t.innerHTML = "Güncel duyuru yok.";
        t.style.animation = 'none';
        return;
    }
    
    let tickerText = activeNews.map(i => {
        return `<span style="color:#fabb00; font-weight:bold;">[${i.date}]</span> <span style="color:#fff;">${i.title}:</span> <span style="color:#ddd;">${i.desc}</span>`;
    }).join(' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ');
    // Animasyonu başlatmak için metni tekrarlıyoruz.
    t.innerHTML = tickerText + ' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ' + tickerText + ' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ' + tickerText;
    // CSS'teki animasyon süresi ile tutarlı olması için
    t.style.animation = 'ticker-scroll 30s linear infinite';
}
function openNews() {
    document.getElementById('news-modal').style.display = 'flex';
    const c = document.getElementById('news-container');
    c.innerHTML = '';
    newsData.forEach((i, index) => {
        let cl = i.type === 'fix' ? 'tag-fix' : (i.type === 'update' ? 'tag-update' : 'tag-info');
        let tx = i.type === 'fix' ? 'Çözüldü' : (i.type === 'update' ? 'Değişiklik' : 'Bilgi');
        let passiveStyle = i.status === 'Pasif' ? 'opacity:0.5; background:#eee;' : '';
        let passiveBadge = i.status === 'Pasif' ? '<span class="news-tag" style="background:#555; color:white;">PASİF</span>' : '';
        let editBtn = (isAdminMode && isEditingActive) 
            ? `<i class="fas fa-pencil-alt edit-icon" style="top:0; right:0; font-size:0.9rem; padding:4px;" onclick="event.stopPropagation(); editNews(${index})"></i>` 
            : '';
        
        c.innerHTML += `<div class="news-item" style="${passiveStyle}">${editBtn}<span class="news-date">${i.date}</span><span class="news-title">${i.title} ${passiveBadge}</span><div class="news-desc">${i.desc}</div><span class="news-tag ${cl}">${tx}</span></div>`;
    });
}
function openGuide() {
    document.getElementById('guide-modal').style.display = 'flex';
    const grid = document.getElementById('guide-grid');
    grid.innerHTML = '';
    
    sportsData.forEach((s, index) => {
        let pronHtml = s.pronunciation ? `<div class="pronunciation-badge">    🗣️     ${s.pronunciation}</div>` : '';
        let editIconHtml = (isAdminMode && isEditingActive) 
            ? `<i class="fas fa-pencil-alt edit-icon" onclick="editSport('${escapeForJsString(s.title)}')"></i>` 
            : '';
            
        // Yeni card yapısına uyumlu render (guide-card-new kullanıldı)
        grid.innerHTML += `
        <div class="guide-card-new" onclick="showSportDetail(${index})">
            <div class="guide-edit-btn">${editIconHtml}</div>
            <div class="guide-icon-area">
                <i class="fas ${s.icon || 'fa-info-circle'} guide-icon-large"></i>
            </div>
            <div class="guide-content-area">
                <div class="guide-card-title">${s.title}</div>
                ${pronHtml}
                <div class="guide-card-desc">${s.desc || ''}</div>
                <div class="guide-tip-box"><i class="fas fa-lightbulb"></i> ${s.tip || 'İpucu yok'}</div>
            </div>
            <div class="guide-footer">(Detay için tıkla)</div>
        </div>`;
    });
}
function showSportDetail(index) {
    const sport = sportsData[index];
    const detailText = sport.detail ? sport.detail.replace(/\n/g,'<br>') : "Bu içerik için henüz detay eklenmemiş.";
    const pronDetail = sport.pronunciation ? `<div style="color:#e65100; font-weight:bold; margin-bottom:15px;">    🗣️     Okunuşu: ${sport.pronunciation}</div>` : '';
    
    Swal.fire({
        title: `<i class="fas ${sport.icon}" style="color:#0e1b42;"></i> ${sport.title}`,
        html: `${pronDetail}<div style="text-align:left; font-size:1rem; line-height:1.6;">${detailText}</div>`,
        showCloseButton: true,
        showConfirmButton: false,
        width: '600px',
        background: '#f8f9fa'
    });
}
function openSales() {
    document.getElementById('sales-modal').style.display = 'flex';
    const c = document.getElementById('sales-grid');
    c.innerHTML = '';
    
    salesScripts.forEach((s, index) => {
        // Edit butonu artık sales-item'ın içine yerleştiriliyor
        let editBtn = (isAdminMode && isEditingActive) 
            ? `<i class="fas fa-pencil-alt edit-icon" style="position:absolute; top:10px; right:40px; z-index:50;" onclick="event.stopPropagation(); editSales('${escapeForJsString(s.title)}')"></i>` 
            : '';
            
        c.innerHTML += `<div class="sales-item" id="sales-${index}" onclick="toggleSales('${index}')">${editBtn}<div class="sales-header"><span class="sales-title">${s.title}</span><i class="fas fa-chevron-down" id="icon-${index}" style="color:#10b981;"></i></div><div class="sales-text">${(s.text || '').replace(/\n/g,'<br>')}<div style="text-align:right; margin-top:15px;"><button class="btn btn-copy" onclick="event.stopPropagation(); copyText('${escapeForJsString(s.text || '')}')"><i class="fas fa-copy"></i> Kopyala</button></div></div></div>`;
    });
}
function toggleSales(index) {
    const item = document.getElementById(`sales-${index}`);
    const icon = document.getElementById(`icon-${index}`);
    item.classList.toggle('active');
    if(item.classList.contains('active')){
        icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}
// --- WIZARD FONKSİYONLARI ---
function openWizard(){
    document.getElementById('wizard-modal').style.display='flex';
    if (Object.keys(wizardStepsData).length === 0) {
        Swal.fire({ title: 'İade Asistanı Verisi Yükleniyor...', didOpen: () => Swal.showLoading() });
        loadWizardData().then(() => {
            Swal.close();
            if (wizardStepsData && wizardStepsData['start']) {
                renderStep('start');
            } else {
                document.getElementById('wizard-body').innerHTML = '<h2 style="color:red;">Asistan verisi eksik veya hatalı. Lütfen yöneticinizle iletişime geçin.</h2>';
            }
        }).catch(() => {
            Swal.close();
            document.getElementById('wizard-body').innerHTML = '<h2 style="color:red;">Sunucudan veri çekme hatası oluştu.</h2>';
        });
    } else {
        renderStep('start');
    }
}
function renderStep(k){
    const s = wizardStepsData[k];
    if (!s) {
        document.getElementById('wizard-body').innerHTML = `<h2 style="color:red;">HATA: Adım ID'si (${k}) bulunamadı. Lütfen yöneticinizle iletişime geçin.</h2>`;
        return;
    }
    const b = document.getElementById('wizard-body');
    let h = `<h2 style="color:var(--primary);">${s.title || ''}</h2>`;
    
    if(s.result) {
        let i = s.result === 'red' ? '    🛑    ' : (s.result === 'green' ? '    ✅    ' : '    ⚠️    ');
        let c = s.result === 'red' ? 'res-red' : (s.result === 'green' ? 'res-green' : 'res-yellow');
        h += `<div class="result-box ${c}"><div style="font-size:3rem;margin-bottom:10px;">${i}</div><h3>${s.title}</h3><p>${s.text}</p>${s.script ? `<div class="script-box">${s.script}</div>` : ''}</div><button class="restart-btn" onclick="renderStep('start')"><i class="fas fa-redo"></i> Başa Dön</button>`;
    } else {
        h += `<p>${s.text}</p><div class="wizard-options">`;
        s.options.forEach(o => {
            h += `<button class="option-btn" onclick="renderStep('${o.next}')"><i class="fas fa-chevron-right"></i> ${o.text}</button>`;
        });
        h += `</div>`;
        if(k !== 'start')
            h += `<button class="restart-btn" onclick="renderStep('start')" style="background:#eee;color:#333;margin-top:15px;">Başa Dön</button>`;
    }
    b.innerHTML = h;
}
// --- TEKNİK SİHİRBAZ MODÜLÜ (DİNAMİK VERİ İLE) ---
// State Yönetimi
const twState = {
    currentStep: 'start',
    history: []
};
// Modal Açma Fonksiyonu
function openTechWizard() {
    document.getElementById('tech-wizard-modal').style.display = 'flex';
    // Eğer veri henüz yüklenmediyse tekrar dene
    if (Object.keys(techWizardData).length === 0) {
        Swal.fire({ title: 'Veriler Yükleniyor...', didOpen: () => Swal.showLoading() });
        loadTechWizardData().then(() => {
            Swal.close();
            twResetWizard();
        });
    } else {
        twRenderStep();
    }
}
// Navigasyon ve Render Mantığı
function twRenderStep() {
    const contentDiv = document.getElementById('tech-wizard-content');
    const backBtn = document.getElementById('tw-btn-back');
    const stepData = techWizardData[twState.currentStep];
    // Geri butonu kontrolü
    if (twState.history.length > 0) backBtn.style.display = 'block';
    else backBtn.style.display = 'none';
    if (!stepData) {
        contentDiv.innerHTML = `<div class="alert" style="color:red;">Hata: Adım bulunamadı (${twState.currentStep}). Lütfen tabloyu kontrol edin.</div>`;
        return;
    }
    let html = `<div class="tech-step-title">${stepData.title || ''}</div>`;
    // Metin (Varsa)
    if (stepData.text) {
        html += `<p style="font-size:1rem; margin-bottom:15px;">${stepData.text}</p>`;
    }
    // Script Kutusu (Varsa) - GÜVENLİ KOPYALAMA BUTONU EKLENDİ
    if (stepData.script) {
        // Encode URI Component ile metni güvenli hale getiriyoruz (Tırnak ve satır hatalarını önler)
        const safeScript = encodeURIComponent(stepData.script);
        html += `
        <div class="tech-script-box">
            <span class="tech-script-label">Müşteriye iletilecek:</span>
            "${stepData.script}"
            <div style="margin-top:10px; text-align:right;">
                <button class="btn btn-copy" style="font-size:0.8rem; padding:5px 10px;" onclick="copyScriptContent('${safeScript}')">
                    <i class="fas fa-copy"></i> Kopyala
                </button>
            </div>
        </div>`;
    }
    // Uyarı/Alert (Varsa)
    if (stepData.alert) {
        html += `<div class="tech-alert">${stepData.alert}</div>`;
    }
    // Butonlar
    if (stepData.buttons && stepData.buttons.length > 0) {
        html += `<div class="tech-buttons-area">`;
        stepData.buttons.forEach(btn => {
            let btnClass = btn.style === 'option' ? 'tech-btn-option' : 'tech-btn-primary';
            html += `<button class="tech-btn ${btnClass}" onclick="twChangeStep('${btn.next}')">${btn.text}</button>`;
        });
        html += `</div>`;
    }
    contentDiv.innerHTML = html;
}
// Navigasyon Fonksiyonları
function twChangeStep(newStep) {
    // Özel komutlar (Eski hardcoded mantıktan kalanlar varsa buraya eklenebilir ama şu an hepsi tabloda)
    twState.history.push(twState.currentStep);
    twState.currentStep = newStep;
    twRenderStep();
}
function twGoBack() {
    if (twState.history.length > 0) {
        twState.currentStep = twState.history.pop();
        twRenderStep();
    }
}
function twResetWizard() {
    twState.currentStep = 'start';
    twState.history = [];
    twRenderStep();
}
// --- PENALTY GAME FUNCTIONS ---
let pScore=0, pBalls=10, pCurrentQ=null;
function openPenaltyGame() {
    document.getElementById('penalty-modal').style.display = 'flex';
    showLobby();
}
function showLobby() {
    document.getElementById('penalty-lobby').style.display = 'flex';
    document.getElementById('penalty-game-area').style.display = 'none';
    fetchLeaderboard();
}
function startGameFromLobby() {
    document.getElementById('penalty-lobby').style.display = 'none';
    document.getElementById('penalty-game-area').style.display = 'block';
    startPenaltySession();
}
function startPenaltySession() {
    pScore = 0;
    pBalls = 10;
    jokers = { call: 1, half: 1, double: 1 };
    doubleChanceUsed = false;
    firstAnswerIndex = -1;
    updateJokerButtons();
    document.getElementById('p-score').innerText = pScore;
    document.getElementById('p-balls').innerText = pBalls;
    document.getElementById('p-restart-btn').style.display = 'none';
    document.getElementById('p-options').style.display = 'grid';
    resetField();
    loadPenaltyQuestion();
}
function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-body'),
    loader = document.getElementById('leaderboard-loader'),
    table = document.getElementById('leaderboard-table');
    tbody.innerHTML = '';
    loader.style.display = 'block';
    table.style.display = 'none';
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "getLeaderboard" })
    }).then(response => response.json())
    .then(data => {
        loader.style.display = 'none';
        if (data.result === "success") {
            table.style.display = 'table';
            let html = '';
            if(data.leaderboard.length === 0) {
                html = '<tr><td colspan="4" style="text-align:center; color:#666;">Henüz maç yapılmadı.</td></tr>';
            } else {
                data.leaderboard.forEach((u, i) => {
                    let medal = i===0 ? '    🥇    ' : (i===1 ? '    🥈    ' : (i===2 ? '    🥉    ' : `<span class="rank-badge">${i+1}</span>`));
                    let bgStyle = (u.username === currentUser) ? 'background:rgba(250, 187, 0, 0.1);' : '';
                    html += `<tr style="${bgStyle}"><td>${medal}</td><td style="text-align:left;">${u.username}</td><td>${u.games}</td><td>${u.average}</td></tr>`;
                });
            }
            tbody.innerHTML = html;
        } else {
            loader.innerText = "Yüklenemedi.";
            loader.style.display = 'block';
        }
    }).catch(err => {
        console.error(err);
        loader.innerText = "Bağlantı hatası.";
    });
}
function updateJokerButtons() {
    document.getElementById('joker-call').disabled = jokers.call === 0;
    document.getElementById('joker-half').disabled = jokers.half === 0;
    document.getElementById('joker-double').disabled = jokers.double === 0 || firstAnswerIndex !== -1;
    if (firstAnswerIndex !== -1) {
        document.getElementById('joker-call').disabled = true;
        document.getElementById('joker-half').disabled = true;
        document.getElementById('joker-double').disabled = true;
    }
}
function useJoker(type) {
    if (jokers[type] === 0 || (firstAnswerIndex !== -1 && type !== 'double')) return;
    jokers[type] = 0;
    updateJokerButtons();
    const currentQ = pCurrentQ, correctAns = currentQ.a, btns = document.querySelectorAll('.penalty-btn');
    
    if (type === 'call') {
        const experts = ["Umut Bey", "Doğuş Bey", "Deniz Bey", "Esra Hanım"];
        const expert = experts[Math.floor(Math.random() * experts.length)];
        let guess = correctAns;
        if (Math.random() > 0.8 && currentQ.opts.length > 1) {
            let incorrectOpts = currentQ.opts.map((_, i) => i).filter(i => i !== correctAns);
            guess = incorrectOpts[Math.floor(Math.random() * incorrectOpts.length)] || correctAns;
        }
        Swal.fire({ icon: 'info', title: '    📞     Telefon Jokeri', html: `${expert} soruyu cevaplıyor...<br><br>"Benim tahminim kesinlikle **${String.fromCharCode(65 + guess)}** şıkkı. Bundan ${Math.random() < 0.8 ? "çok eminim" : "emin değilim"}."`, confirmButtonText: 'Kapat' });
    } else if (type === 'half') {
        let incorrectOpts = currentQ.opts.map((_, i) => i).filter(i => i !== correctAns).sort(() => Math.random() - 0.5).slice(0, 2);
        incorrectOpts.forEach(idx => {
            btns[idx].disabled = true;
            btns[idx].style.textDecoration = 'line-through';
            btns[idx].style.opacity = '0.4';
        });
        Swal.fire({ icon: 'success', title: '    ✂️     Yarı Yarıya Kullanıldı', text: 'İki yanlış şık elendi!', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
    } else if (type === 'double') {
        doubleChanceUsed = true;
        Swal.fire({ icon: 'warning', title: '2️  Çift Cevap', text: 'Bu soruda bir kez yanlış cevap verme hakkınız var. İlk cevabınız yanlışsa, ikinci kez deneyebilirsiniz.', toast: true, position: 'top', showConfirmButton: false, timer: 2500 });
    }
}
function loadPenaltyQuestion() {
    if (pBalls <= 0) {
        finishPenaltyGame();
        return;
    }
    if (quizQuestions.length === 0) {
        Swal.fire('Hata', 'Soru yok!', 'warning');
        return;
    }
    pCurrentQ = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
    document.getElementById('p-question-text').innerText = pCurrentQ.q;
    doubleChanceUsed = false;
    firstAnswerIndex = -1;
    updateJokerButtons();
    let html = '';
    pCurrentQ.opts.forEach((opt, index) => {
        const letter = String.fromCharCode(65 + index);
        html += `<button class="penalty-btn" onclick="shootBall(${index})">${letter}: ${opt}</button>`;
    });
    document.getElementById('p-options').innerHTML = html;
}
function shootBall(idx) {
    const btns = document.querySelectorAll('.penalty-btn'),
    isCorrect = (idx === pCurrentQ.a);
    if (!isCorrect && doubleChanceUsed && firstAnswerIndex === -1) {
        firstAnswerIndex = idx;
        btns[idx].classList.add('wrong-first-try');
        btns[idx].disabled = true;
        Swal.fire({ toast: true, position: 'top', icon: 'info', title: 'İlk Hata! Kalan Hakkınız: 1', showConfirmButton: false, timer: 1500, background: '#ffc107' });
        updateJokerButtons();
        return;
    }
    btns.forEach(b => b.disabled = true);
    
    const ballWrap = document.getElementById('ball-wrap'),
    keeperWrap = document.getElementById('keeper-wrap'),
    shooterWrap = document.getElementById('shooter-wrap'),
    goalMsg = document.getElementById('goal-msg');
    
    const shotDir = Math.floor(Math.random() * 4);
    shooterWrap.classList.add('shooter-run');
    
    setTimeout(() => {
        if(isCorrect) {
            if(shotDir === 0 || shotDir === 2) keeperWrap.classList.add('keeper-dive-right');
            else keeperWrap.classList.add('keeper-dive-left');
        } else {
            if(shotDir === 0 || shotDir === 2) keeperWrap.classList.add('keeper-dive-left');
            else keeperWrap.classList.add('keeper-dive-right');
        }
        
        if (isCorrect) {
            if(shotDir === 0) ballWrap.classList.add('ball-shoot-left-top');
            else if(shotDir === 1) ballWrap.classList.add('ball-shoot-right-top');
            else if(shotDir === 2) ballWrap.classList.add('ball-shoot-left-low');
            else ballWrap.classList.add('ball-shoot-right-low');
            
            setTimeout(() => {
                goalMsg.innerText = "GOL!!!";
                goalMsg.style.color = "#fabb00";
                goalMsg.classList.add('show');
                pScore++;
                document.getElementById('p-score').innerText = pScore;
                Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Mükemmel Şut!', showConfirmButton: false, timer: 1000, background: '#a5d6a7' });
            }, 500);
        } else {
            if(Math.random() > 0.5) {
                ballWrap.style.bottom = "160px";
                ballWrap.style.left = (shotDir === 0 || shotDir === 2) ? "40%" : "60%";
                ballWrap.style.transform = "scale(0.6)";
                setTimeout(() => {
                    goalMsg.innerText = "KURTARDI!";
                    goalMsg.style.color = "#ef5350";
                    goalMsg.classList.add('show');
                    Swal.fire({ icon: 'error', title: 'Kaçırdın!', text: `Doğru cevap: ${String.fromCharCode(65 + pCurrentQ.a)}. ${pCurrentQ.opts[pCurrentQ.a]}`, showConfirmButton: true, timer: 2500, background: '#ef9a9a' });
                }, 500);
            } else {
                ballWrap.classList.add(Math.random() > 0.5 ? 'ball-miss-left' : 'ball-miss-right');
                setTimeout(() => {
                    goalMsg.innerText = "DIŞARI!";
                    goalMsg.style.color = "#ef5350";
                    goalMsg.classList.add('show');
                    Swal.fire({ icon: 'error', title: 'Kaçırdın!', text: `Doğru cevap: ${String.fromCharCode(65 + pCurrentQ.a)}. ${pCurrentQ.opts[pCurrentQ.a]}`, showConfirmButton: true, timer: 2500, background: '#ef9a9a' });
                }, 500);
            }
        }
    }, 300);
    
    pBalls--;
    document.getElementById('p-balls').innerText = pBalls;
    setTimeout(() => {
        resetField();
        loadPenaltyQuestion();
    }, 2500);
}
function resetField() {
    const ballWrap = document.getElementById('ball-wrap'),
    keeperWrap = document.getElementById('keeper-wrap'),
    shooterWrap = document.getElementById('shooter-wrap'),
    goalMsg = document.getElementById('goal-msg');
    
    ballWrap.className = 'ball-wrapper';
    ballWrap.style = "";
    keeperWrap.className = 'keeper-wrapper';
    shooterWrap.className = 'shooter-wrapper';
    goalMsg.classList.remove('show');
    
    document.querySelectorAll('.penalty-btn').forEach(b => {
        b.classList.remove('wrong-first-try');
        b.style.textDecoration = '';
        b.style.opacity = '';
        b.style.background = '#fabb00';
        b.style.color = '#0e1b42';
        b.style.borderColor = '#f0b500';
        b.disabled = false;
    });
}
function finishPenaltyGame() {
    let title = pScore >= 8 ? "EFSANE!    🏆   " : (pScore >= 5 ? "İyi Maçtı!    👏   " : "Antrenman Lazım    🤕   ");
    document.getElementById('p-question-text').innerHTML = `<span style="font-size:1.5rem; color:#fabb00;">MAÇ BİTTİ!</span><br>${title}<br>Toplam Skor: ${pScore}/10`;
    document.getElementById('p-options').style.display = 'none';
    document.getElementById('p-restart-btn').style.display = 'block';
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "logQuiz", username: currentUser, token: getToken(), score: pScore * 10, total: 100 })
    });
}
// --- KALİTE FONKSİYONLARI (GÜNCELLENMİŞ VERSİYON) ---
function populateMonthFilter() {
    const selectEl = document.getElementById('month-select-filter');
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    for (let i = 0; i < 6; i++) {
        let month = (currentMonth - i + 12) % 12;
        let year = currentYear;
        if (currentMonth - i < 0) { year = currentYear - 1; }
        const monthStr = (month + 1).toString().padStart(2, '0');
        const yearStr = year.toString();
        const value = `${monthStr}.${yearStr}`;
        const text = `${MONTH_NAMES[month]} ${yearStr}`;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        if (i === 0) { option.selected = true; }
        selectEl.appendChild(option);
    }
}
function openQualityArea() {
    document.getElementById('quality-modal').style.display = 'flex';
    document.getElementById('admin-quality-controls').style.display = isAdminMode ? 'block' : 'none';
    populateMonthFilter();
    
    // YENİ DASHBOARD ELEMENTLERİ (Hata Önlemi)
    const dashAvg = document.getElementById('dash-avg-score');
    const dashCount = document.getElementById('dash-eval-count');
    const dashTarget = document.getElementById('dash-target-rate');
    
    // Varsa sıfırla, yoksa hata verme
    if(dashAvg) dashAvg.innerText = "-";
    if(dashCount) dashCount.innerText = "-";
    if(dashTarget) dashTarget.innerText = "-%";
    
    const monthSelect = document.getElementById('month-select-filter');
    if (monthSelect) {
        // Olay dinleyicisini yenilemek için element klonlanır
        const newMonthSelect = monthSelect.cloneNode(true);
        monthSelect.parentNode.replaceChild(newMonthSelect, monthSelect);
        newMonthSelect.addEventListener('change', function() {
            // Sadece fetch çağır, parametreler oradan okunacak
            fetchEvaluationsForAgent();
        });
    }
    
    if (isAdminMode) {
        fetchUserListForAdmin().then(users => {
            const groupSelect = document.getElementById('group-select-admin');
            const agentSelect = document.getElementById('agent-select-admin');
            
            if(groupSelect && agentSelect) {
                // Grupları Çek (Unique)
                const groups = [...new Set(users.map(u => u.group))].sort();
                
                // Grup Seçimini Doldur
                groupSelect.innerHTML = `<option value="all">Tüm Gruplar</option>` + 
                    groups.map(g => `<option value="${g}">${g}</option>`).join('');
                
                // İlk açılışta tüm temsilcileri doldur
                updateAgentListBasedOnGroup();
            }
        });
    } else {
        fetchEvaluationsForAgent(currentUser);
    }
}
// YENİ FONKSİYON: Gruba Göre Temsilci Listesini Güncelleme
function updateAgentListBasedOnGroup() {
    const groupSelect = document.getElementById('group-select-admin');
    const agentSelect = document.getElementById('agent-select-admin');
    if(!groupSelect || !agentSelect) return;
    const selectedGroup = groupSelect.value;
    
    // Mevcut listeyi temizle
    agentSelect.innerHTML = '';
    
    let filteredUsers = adminUserList;
    
    if (selectedGroup !== 'all') {
        filteredUsers = adminUserList.filter(u => u.group === selectedGroup);
        // O grubun tamamını seçme seçeneği ekle
        agentSelect.innerHTML = `<option value="all">-- Tüm ${selectedGroup} Ekibi --</option>`;
    } else {
        // Tüm gruplar seçiliyse, tüm temsilciler seçeneği
        agentSelect.innerHTML = `<option value="all">-- Tüm Temsilciler --</option>`;
    }
    
    // Kullanıcıları ekle
    filteredUsers.forEach(u => {
        agentSelect.innerHTML += `<option value="${u.name}">${u.name}</option>`;
    });
    
    // Listeyi güncelledikten sonra otomatik veri çek
    fetchEvaluationsForAgent(); 
}
async function fetchEvaluationsForAgent(forcedName) {
    const listEl = document.getElementById('evaluations-list');
    const loader = document.getElementById('quality-loader');
    
    const dashAvg = document.getElementById('dash-avg-score');
    const dashCount = document.getElementById('dash-eval-count');
    const dashTarget = document.getElementById('dash-target-rate');
    listEl.innerHTML = '';
    loader.style.display = 'block';
    // Admin Panelindeki Seçimler
    const groupSelect = document.getElementById('group-select-admin');
    const agentSelect = document.getElementById('agent-select-admin');
    
    let targetAgent = forcedName || currentUser;
    let targetGroup = 'all';
    if (isAdminMode) {
        targetAgent = forcedName || (agentSelect ? agentSelect.value : currentUser);
        targetGroup = groupSelect ? groupSelect.value : 'all';
        
        // "Tüm Temsilciler" seçiliyse ve Grup "Tüm Gruplar" ise uyarı ver (Çok veri)
        if(targetAgent === 'all' && targetGroup === 'all') {
            loader.innerHTML = '<div style="padding:20px; text-align:center; color:#1976d2;"><i class="fas fa-users fa-2x"></i><br><br><b>Tüm Şirket Verisi</b><br>Detaylı analiz için yukarıdaki "Rapor" butonunu kullanın.</div>';
            if(dashAvg) dashAvg.innerText = "-";
            if(dashCount) dashCount.innerText = "-";
            if(dashTarget) dashTarget.innerText = "-%";
            return;
        }
    }
    if (!targetAgent) {
        loader.innerHTML = '<span style="color:red;">Lütfen listeden bir temsilci seçimi yapın.</span>';
        return;
    }
    const selectedMonth = document.getElementById('month-select-filter').value;
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ 
                action: "fetchEvaluations", 
                targetAgent: targetAgent, 
                targetGroup: targetGroup, // Backend'e grubu da gönderiyoruz
                username: currentUser, 
                token: getToken() 
            })
        });
        
        const data = await response.json();
        loader.style.display = 'none';
        if (data.result === "success") {
            allEvaluationsData = data.evaluations;
            let filteredEvals = allEvaluationsData.filter(evalItem => {
                const evalDate = evalItem.date.substring(3);
                return evalDate === selectedMonth;
            });
            const monthlyTotal = filteredEvals.reduce((sum, evalItem) => sum + (parseFloat(evalItem.score) || 0), 0);
            const monthlyCount = filteredEvals.length;
            const monthlyAvg = monthlyCount > 0 ? (monthlyTotal / monthlyCount) : 0;
            const targetScore = 90;
            const targetHitCount = filteredEvals.filter(e => (parseFloat(e.score) || 0) >= targetScore).length;
            const targetRate = monthlyCount > 0 ? Math.round((targetHitCount / monthlyCount) * 100) : 0;
            if(dashAvg) dashAvg.innerText = monthlyAvg % 1 === 0 ? monthlyAvg : monthlyAvg.toFixed(1);
            if(dashCount) dashCount.innerText = monthlyCount;
            if(dashTarget) dashTarget.innerText = `%${targetRate}`;
            if (filteredEvals.length === 0) {
                listEl.innerHTML = `<p style="text-align:center; color:#666; margin-top:20px;">Bu dönem için kayıt yok.</p>`;
                return;
            }
            let html = '';
            filteredEvals.reverse().forEach((evalItem, index) => {
                const scoreColor = evalItem.score >= 90 ? '#2e7d32' : (evalItem.score >= 70 ? '#ed6c02' : '#d32f2f');
                const displayCallDate = formatDateToDDMMYYYY(evalItem.callDate);
                const displayLogDate  = formatDateToDDMMYYYY(evalItem.date);
                
                let detailHtml = '';
                try {
                    const detailObj = JSON.parse(evalItem.details);
                    detailHtml = '<table style="width:100%; font-size:0.85rem; border-collapse:collapse; margin-top:10px;">';
                    detailObj.forEach(item => {
                        let rowColor = item.score < item.max ? '#ffebee' : '#f9f9f9';
                        let noteDisplay = item.note ? `<br><em style="color: #d32f2f; font-size:0.8rem;">(Not: ${item.note})</em>` : '';
                        detailHtml += `<tr style="background:${rowColor}; border-bottom:1px solid #fff;">
                            <td style="padding:8px; border-radius:4px;">${item.q}${noteDisplay}</td>
                            <td style="padding:8px; font-weight:bold; text-align:right;">${item.score}/${item.max}</td>
                        </tr>`;
                    });
                    detailHtml += '</table>';
                } catch (e) { detailHtml = `<p style="white-space:pre-wrap; margin:0; font-size:0.9rem;">${evalItem.details}</p>`; }
                let editBtn = isAdminMode ? `<i class="fas fa-pen" style="font-size:1rem; color:#fabb00; cursor:pointer; margin-right:5px; padding:5px;" onclick="event.stopPropagation(); editEvaluation('${evalItem.callId}')" title="Kaydı Düzenle"></i>` : '';
                // Eğer Toplu Gösterim modundaysak, her satırda Ajan adını da gösterelim ki karışmasın
                let agentNameDisplay = (targetAgent === 'all' || targetAgent === targetGroup) ? `<span style="font-size:0.8rem; font-weight:bold; color:#555; background:#eee; padding:2px 6px; border-radius:4px; margin-left:10px;">${evalItem.agent}</span>` : '';
                html += `<div class="evaluation-summary" id="eval-summary-${index}" style="position:relative; border:1px solid #eaedf2; border-left:4px solid ${scoreColor}; padding:15px; margin-bottom:10px; border-radius:8px; background:#fff; cursor:pointer; transition:all 0.2s ease;" onclick="toggleEvaluationDetail(${index})">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        
                        <!-- SOL TARAFI (TARİHLER VE ID) -->
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <!-- ÜST: ÇAĞRI TARİHİ + (Opsiyonel Ajan Adı) -->
                            <div style="display:flex; align-items:center; gap:8px;">
                                <i class="fas fa-phone-alt" style="color:#b0b8c1; font-size:0.9rem;"></i>
                                <span style="font-weight:700; color:#2c3e50; font-size:1.05rem;">${displayCallDate}</span>
                                ${agentNameDisplay}
                            </div>
                            
                            <!-- ALT: LOG TARİHİ VE ID -->
                            <div style="font-size:0.75rem; color:#94a3b8; margin-left:22px;">
                                <span style="font-weight:500;">Log:</span> ${displayLogDate} 
                                <span style="margin:0 4px; color:#cbd5e0;">|</span> 
                                <span style="font-weight:500;">ID:</span> ${evalItem.callId || '-'}
                            </div>
                        </div>
                        <!-- SAĞ TARAFI (PUAN VE EDİT İKONU) -->
                        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end;">
                            <div style="display:flex; align-items:center;">
                                ${editBtn} 
                                <span style="font-weight:800; font-size:1.6rem; color:${scoreColor}; line-height:1;">${evalItem.score}</span>
                            </div>
                            <span style="font-size:0.65rem; color:#a0aec0; letter-spacing:0.5px; font-weight:600;">PUAN</span>
                        </div>
                    </div>
                    <div class="evaluation-details-content" id="eval-details-${index}">
                        <hr style="border:none; border-top:1px dashed #eee; margin:12px 0;">
                        ${detailHtml}
                        <div style="margin-top:10px; background:#f8f9fa; padding:10px; border-radius:6px; border-left:3px solid #e2e8f0;">
                             <strong style="color:#4a5568; font-size:0.8rem;">Geri Bildirim:</strong>
                             <p style="color:#2d3748; font-size:0.9rem; margin:5px 0 0 0;">${evalItem.feedback || 'Geri bildirim girilmedi.'}</p>
                        </div>
                    </div>
                </div>`;
            });
            listEl.innerHTML = html;
        } else {
            listEl.innerHTML = `<p style="color:red; text-align:center;">Veri çekme hatası: ${data.message || 'Bilinmeyen Hata'}</p>`;
        }
    } catch(err) {
        loader.style.display = 'none';
        listEl.innerHTML = `<p style="color:red; text-align:center;">Bağlantı hatası.</p>`;
    }
}
// --- YENİ RAPOR EXPORT FONKSİYONU ---
async function exportEvaluations() {
    if (!isAdminMode) {
        Swal.fire('Hata', 'Bu işlem için yönetici yetkisi gereklidir.', 'error');
        return;
    }
    const agentSelect = document.getElementById('agent-select-admin');
    const groupSelect = document.getElementById('group-select-admin'); // Grup seçim elementini alıyoruz
    
    const targetAgent = agentSelect ? agentSelect.value : 'all';
    const targetGroup = groupSelect ? groupSelect.value : 'all'; // Grup değerini alıyoruz (yoksa 'all' varsayıyoruz)
    const agentName = targetAgent === 'all' ? (targetGroup === 'all' ? 'Tüm Şirket' : targetGroup + ' Ekibi') : targetAgent;
    const { isConfirmed } = await Swal.fire({
        icon: 'question',
        title: 'Raporu Onayla',
        html: `<strong>${agentName}</strong> için tüm değerlendirme kayıtları (kırılım detayları dahil) CSV formatında indirilecektir. Onaylıyor musunuz?`,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-download"></i> İndir',
        cancelButtonText: 'İptal'
    });
    if (!isConfirmed) return;
    
    Swal.fire({ title: 'Kırılım Raporu Hazırlanıyor...', didOpen: () => Swal.showLoading() });
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "exportEvaluations",
                targetAgent: targetAgent,
                targetGroup: targetGroup, // <-- KRİTİK NOKTA: Buraya targetGroup eklendi
                username: currentUser,
                token: getToken()
            })
        });
        
        const data = await response.json();
        if (data.result === "success" && data.csvData) {
            const blob = new Blob(["\ufeff" + data.csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", data.fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                Swal.fire('Başarılı', `Rapor <strong>${data.fileName}</strong> adıyla indirildi.`, 'success');
            } else {
                Swal.fire('Hata', 'Tarayıcınız otomatik indirmeyi desteklemiyor.', 'error');
            }
        } else {
            Swal.fire('Hata', data.message || 'Rapor verisi alınamadı.', 'error');
        }
    } catch (err) {
        console.error("Export Error:", err);
        Swal.fire('Hata', 'Sunucuya bağlanılamadı.', 'error');
    }
}
function fetchUserListForAdmin() {
    return new Promise((resolve) => {
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "getUserList", username: currentUser, token: getToken() })
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === "success") {
                const filteredUsers = data.users.filter(u => u.group !== 'Yönetim');
                adminUserList = filteredUsers;
                resolve(filteredUsers); 
            } else
                resolve([]);
        }).catch(err => resolve([]));
    });
}
function fetchCriteria(groupName) {
    return new Promise((resolve) => {
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "getCriteria", group: groupName, username: currentUser, token: getToken() })
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === "success")
                resolve(data.criteria || []);
            else
                resolve([]);
        }).catch(err => {
            console.error(err);
            resolve([]);
        });
    });
}
function toggleEvaluationDetail(index) {
    const detailEl = document.getElementById(`eval-details-${index}`);
    const isVisible = detailEl.style.maxHeight !== '0px' && detailEl.style.maxHeight !== '';
    if (isVisible) {
        detailEl.style.maxHeight = '0px';
        detailEl.style.marginTop = '0';
    } else {
        detailEl.style.maxHeight = detailEl.scrollHeight + 100 + 'px';
        detailEl.style.marginTop = '10px';
    }
}
// --- GÜNCELLENMİŞ logEvaluationPopup FONKSİYONU ---
async function logEvaluationPopup() {
    const agentSelect = document.getElementById('agent-select-admin');
    const agentName = agentSelect ? agentSelect.value : "";
    
    // Güvenlik: İsim seçili mi?
    if (!agentName || agentName === 'all') {
        Swal.fire('Uyarı', 'Lütfen işlem yapmak için listeden bir personel seçiniz.', 'warning');
        return;
    }
    
    // 1. ADIM: Grubun Doğru Belirlenmesi (Chat/Telesatış/Genel)
    let agentGroup = 'Genel';
    const foundUser = adminUserList.find(u => u.name.toLowerCase() === agentName.toLowerCase());
    if (foundUser && foundUser.group) {
        agentGroup = foundUser.group;
    }
    
    // Chat personeli için 'Chat' grubunu kullan, Telesatış için 'Telesatış'
    const isChat = agentGroup.indexOf('Chat') > -1;
    const isTelesatis = agentGroup.indexOf('Telesatış') > -1;
    
    if (isChat) agentGroup = 'Chat';
    else if (isTelesatis) agentGroup = 'Telesatış';
    
    Swal.fire({ title: 'Değerlendirme Formu Hazırlanıyor...', didOpen: () => Swal.showLoading() });
    
    let criteriaList = [];
    // 2. ADIM: Kriterleri Çekme
    if(agentGroup && agentGroup !== 'Genel') { 
        criteriaList = await fetchCriteria(agentGroup);
    } 
    Swal.close();
    
    const todayISO = new Date().toISOString().substring(0, 10);
    const isCriteriaBased = criteriaList.length > 0;
    
    let criteriaFieldsHtml = '';
    let manualScoreHtml = '';
    
    // 3. ADIM: Form Alanlarını Gruba Gööre Oluşturma
    if (isCriteriaBased) {
        criteriaFieldsHtml += `<div class="criteria-container">`;
        criteriaList.forEach((c, i) => {
            let pts = parseInt(c.points) || 0;
            let initialScore = pts; 
            
            if (pts === 0) return; // Pasif kriterleri atla
            if (isChat) {
                // CHAT: Butonlu Puanlama
                let mPts = parseInt(c.mediumScore) || 0;
                let bPts = parseInt(c.badScore) || 0;
                
                criteriaFieldsHtml += `
                    <div class="criteria-row" id="row-${i}" data-max-score="${pts}">
                        <div class="criteria-header">
                            <span>${i+1}. ${c.text}</span>
                            <span style="font-size:0.8rem; color:#999;">Max: ${pts}</span>
                        </div>
                        <div class="criteria-controls">
                            <div class="eval-button-group">
                                <button class="eval-button eval-good active" data-score="${pts}" onclick="setButtonScore(${i}, ${pts}, ${pts})">İyi (${pts})</button>
                                ${mPts > 0 ? `<button class="eval-button eval-medium" data-score="${mPts}" onclick="setButtonScore(${i}, ${mPts}, ${pts})">Orta (${mPts})</button>` : ''}
                                ${bPts > 0 ? `<button class="eval-button eval-bad" data-score="${bPts}" onclick="setButtonScore(${i}, ${bPts}, ${pts})">Kötü (${bPts})</button>` : ''}
                            </div>
                            <span class="score-badge" id="badge-${i}" style="margin-top: 8px; display:block; background:#2e7d32;">${initialScore}</span>
                        </div>
                        <input type="text" id="note-${i}" class="note-input" placeholder="Kırılım nedeni veya not ekle..." style="display:none;">
                    </div>`;
            } else if (isTelesatis) {
                 // TELESATIŞ: Slider Puanlama (Eski mantık geri getirildi)
                 criteriaFieldsHtml += `
                    <div class="criteria-row" id="row-${i}" data-max-score="${pts}">
                        <div class="criteria-header">
                            <span>${i+1}. ${c.text}</span>
                            <span style="font-size:0.8rem; color:#999;">Max: ${pts}</span>
                        </div>
                        <div class="criteria-controls" style="display: flex; align-items: center; gap: 15px; background: #f9f9f9; padding: 8px; border-radius: 6px;">
                            <input type="range" class="custom-range slider-input" id="slider-${i}" min="0" max="${pts}" value="${pts}" data-index="${i}" oninput="updateRowSliderScore(${i}, ${pts})" style="flex-grow: 1;">
                            <span class="score-badge" id="badge-${i}" style="background:#2e7d32;">${initialScore}</span>
                        </div>
                        <input type="text" id="note-${i}" class="note-input" placeholder="Kırılım nedeni veya not ekle..." style="display:none;">
                    </div>`;
            }
        });
        criteriaFieldsHtml += `</div>`;
    } else {
        // Manuel Puanlama (Kriter yoksa)
        manualScoreHtml = `
            <div style="padding:15px; border:1px dashed #ccc; background:#fff; border-radius:8px; text-align:center; margin-bottom:15px;">
                <p style="color:#e65100;">(Bu grup için otomatik kriter bulunamadı)</p>
                <label style="font-weight:bold;">Manuel Puan</label><br>
                <input id="eval-manual-score" type="number" class="swal2-input" value="100" min="0" max="100" style="width:100px; text-align:center; font-size:1.5rem; font-weight:bold;">
            </div>
            <textarea id="eval-details" class="swal2-textarea" placeholder="Değerlendirme detayları..." style="margin-bottom:15px;"></textarea>
        `;
    }
    
    // HTML Yapısı
    const contentHtml = `
        <div class="eval-modal-wrapper">
            <div class="score-dashboard">
                <div>
                    <div style="font-size:0.9rem; opacity:0.8;">Değerlendirilen</div>
                    <div style="font-size:1.2rem; font-weight:bold; color:#fabb00;">${agentName}</div>
                    <div style="font-size:0.8rem; opacity:0.7;">${agentGroup}</div>
                </div>
                <div class="score-circle-outer" id="score-ring">
                    <div class="score-circle-inner" id="live-score">${isCriteriaBased ? '100' : '100'}</div>
                </div>
            </div>
            <div class="eval-header-card">
                <div>
                    <label style="font-size:0.8rem; font-weight:bold; color:#555;">Call ID</label>
                    <input id="eval-callid" class="swal2-input" style="height:35px; margin:0; width:100%; font-size:0.9rem;" placeholder="Call ID giriniz">
                </div>
                <div>
                    <label style="font-size:0.8rem; font-weight:bold; color:#555;">Çağrı/Chat Tarihi</label>
                    <input type="date" id="eval-calldate" class="swal2-input" style="height:35px; margin:0; width:100%; font-size:0.9rem;" value="${todayISO}">
                </div>
            </div>
            ${manualScoreHtml}
            ${criteriaFieldsHtml}
            <div style="margin-top:15px; border:1px solid #f0f0f0; background:#fafafa; padding:10px; border-radius:8px;">
                <label style="font-size:0.85rem; font-weight:bold; color:#333; display:block; margin-bottom:5px;">Geri Bildirim Tipi (Raporlama İçin)</label>
                <select id="feedback-type" class="swal2-input" style="width:100%; height:40px; border:1px solid #ccc; border-radius:5px; margin:0;">
                    <option value="Yok">Geri Bildirim Yok</option>
                    <option value="Sözlü">Sözlü (Verbal)</option>
                    <option value="Mail">Mail (E-posta)</option>
                </select>
            </div>
            <div style="margin-top:15px;">
                <label style="font-size:0.85rem; font-weight:bold; color:#333;">Genel Geri Bildirim</label>
                <textarea id="eval-feedback" class="swal2-textarea" style="margin-top:5px; height:80px;" placeholder="Temsilciye iletilecek genel yorum..."></textarea>
            </div>
        </div>`;
    
    const { value: formValues } = await Swal.fire({
        title: '',
        html: contentHtml,
        width: '600px',
        padding: '0 0 20px 0',
        showCancelButton: true,
        confirmButtonText: '    💾     Kaydet',
        cancelButtonText: 'İptal',
        focusConfirm: false,
        didOpen: () => {
            if (isTelesatis) {
                // Telesatış için slider skorunu başlat
                window.recalcTotalSliderScore();
            } else if (isChat) {
                // Chat için buton skorunu başlat
                window.recalcTotalScore();
            }
        },
        preConfirm: () => {
            const callId = document.getElementById('eval-callid').value;
            const callDateRaw = document.getElementById('eval-calldate').value;
            const feedback = document.getElementById('eval-feedback').value;
            const feedbackType = document.getElementById('feedback-type').value; 
            
            if (!callId || !callDateRaw ) {
                Swal.showValidationMessage('Lütfen Çağrı ID, Tarih  alanlarını doldurun.');
                return false;
            }
            
            const dateParts = callDateRaw.split('-');
            const formattedCallDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : callDateRaw;
            
            if (isCriteriaBased) {
                let total = 0;
                let detailsArr = [];
                for (let i = 0; i < criteriaList.length; i++) {
                    const c = criteriaList[i];
                    if (parseInt(c.points) === 0) continue; 
                    
                    let val;
                    let note;
                    
                    if (isChat) {
                         // CHAT: Butonlardan Oku
                        val = parseInt(document.getElementById(`badge-${i}`).innerText) || 0;
                        note = document.getElementById(`note-${i}`).value;
                        
                    } else if (isTelesatis) {
                         // TELESATIŞ: Slider'dan Oku
                        val = parseInt(document.getElementById(`slider-${i}`).value) || 0;
                        note = document.getElementById(`note-${i}`).value;
                        
                    }
                    total += val;
                    detailsArr.push({ q: c.text, max: parseInt(c.points), score: val, note: note });
                }
                return { agentName, agentGroup, callId, callDate: formattedCallDate, score: total, details: JSON.stringify(detailsArr), feedback, feedbackType: feedbackType }; 
            } else {
                const score = document.getElementById('eval-manual-score').value;
                const details = document.getElementById('eval-details').value;
                if(score < 0 || score > 100) { Swal.showValidationMessage('Puan 0 ile 100 arasında olmalıdır.'); return false; }
                return { agentName, agentGroup, callId, callDate: formattedCallDate, score: parseInt(score), details: details, feedback, feedbackType: feedbackType }; 
            }
        }
    });
    if (formValues) {
        Swal.fire({ title: 'Kaydediliyor...', didOpen: () => { Swal.showLoading() } });
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "logEvaluation", username: currentUser, token: getToken(), ...formValues })
        })
        .then(r => r.json()).then(d => {
            if (d.result === "success") {
                Swal.fire({
                    icon: 'success',
                    title: 'Değerlendirme Kaydedildi',
                    text: `${formValues.agentName} için ${formValues.score} puan verildi.`,
                    timer: 2500,
                    showConfirmButton: false
                });
                fetchEvaluationsForAgent(formValues.agentName);
            }
            else {
                Swal.fire('Hata', d.message || 'Kaydedilemedi.', 'error');
            }
        }).catch(err => { Swal.fire('Hata', 'Sunucu hatası.', 'error'); });
    }
}
// --- GÜNCELLENMİŞ editEvaluation FONKSİYONU ---
async function editEvaluation(targetCallId) {
    // 1. ID Kontrolü (Güçlendirilmiş - String Eşleşmesi)
    const evalData = allEvaluationsData.find(item => String(item.callId).trim() === String(targetCallId).trim());
    
    if (!evalData) {
        Swal.fire('Hata', 'Kayıt verisi bulunamadı.', 'error');
        return;
    }
    
    const agentName = evalData.agent || evalData.agentName;
    // 2. Grup Kontrolü (Doğrudan Veriden Okuma)
    const agentGroupRaw = evalData.group || 'Genel';
    
    // Grup tipini belirle
    const isChat = agentGroupRaw.indexOf('Chat') > -1;
    const isTelesatis = agentGroupRaw.indexOf('Telesatış') > -1;
    const agentGroup = isChat ? 'Chat' : (isTelesatis ? 'Telesatış' : 'Genel');
    
    Swal.fire({ title: 'Kayıtlar İnceleniyor...', didOpen: () => Swal.showLoading() });
    
    let criteriaList = [];
    if(agentGroup && agentGroup !== 'Genel') {
        criteriaList = await fetchCriteria(agentGroup);
    }
    Swal.close();
    
    const isCriteriaBased = criteriaList.length > 0;
    let oldDetails = [];
    // JSON Parse Hatası Önlemi
    try { oldDetails = JSON.parse(evalData.details || "[]"); } catch(e) { oldDetails = []; }
    
    let contentHtml = `
    <div class="eval-modal-wrapper" style="border-top: 5px solid #1976d2;">
    <div class="score-dashboard">
    <div>
    <div style="font-size:0.9rem; opacity:0.8;">DÜZENLENEN</div>
    <div style="font-size:1.2rem; font-weight:bold; color:#1976d2;">${agentName}</div>
    <div style="font-size:0.8rem; opacity:0.7;">(${agentGroupRaw})</div>
    </div>
    <div class="score-circle-outer" id="score-ring">
    <div class="score-circle-inner" id="live-score">${evalData.score}</div>
    </div>
    </div>
    <div class="eval-header-card">
    <div>
    <label style="font-size:0.8rem; font-weight:bold; color:#555;">Call ID</label>
    <input id="eval-callid" class="swal2-input" style="height:35px; margin:0; width:100%; font-size:0.9rem; background:#eee;" value="${evalData.callId}" readonly>
    </div>
    <div>
    <label style="font-size:0.8rem; font-weight:bold; color:#555;">Çağrı Tarihi</label>
    <input type="text" class="swal2-input" style="height:35px; margin:0; width:100%; font-size:0.9rem; background:#eee;" value="${evalData.callDate}" readonly>
    </div>
    </div>
    `;
    if (isCriteriaBased) {
        contentHtml += `<div class="criteria-container">`;
        criteriaList.forEach((c, i) => {
            let pts = parseInt(c.points) || 0;
            let mPts = parseInt(c.mediumScore) || 0;
            let bPts = parseInt(c.badScore) || 0;
            if (pts === 0) return;
            
            // Eski Puan/Notu Bul
            let oldItem = oldDetails.find(d => d.q === c.text);
            if (!oldItem && oldDetails[i]) { oldItem = oldDetails[i]; }
            if (!oldItem) { oldItem = { score: pts, note: '' }; }
            let currentVal = parseInt(oldItem.score);
            let currentNote = oldItem.note || '';
            
            if (isChat) {
                // CHAT: Butonlu Düzenleme
                let goodActive = currentVal === pts ? 'active' : '';
                let mediumActive = currentVal === mPts && mPts !== 0 ? 'active' : '';
                let badActive = currentVal === bPts && bPts !== 0 ? 'active' : '';
                
                // Eğer puan, tanımlı buton puanlarından biri değilse (manuel girilmiş olabilir)
                if (currentVal !== pts && currentVal !== mPts && currentVal !== bPts) {
                    // Hiçbirini aktif yapma
                    goodActive = mediumActive = badActive = '';
                }
                
                contentHtml += `
                <div class="criteria-row" id="row-${i}" data-max-score="${pts}">
                    <div class="criteria-header"><span>${i+1}. ${c.text}</span><span style="font-size:0.8rem; color:#999;">Max: ${pts}</span></div>
                    <div class="criteria-controls">
                        <div class="eval-button-group">
                            <button class="eval-button eval-good ${goodActive}" data-score="${pts}" onclick="setButtonScore(${i}, ${pts}, ${pts})">İyi (${pts})</button>
                            ${mPts > 0 ? `<button class="eval-button eval-medium ${mediumActive}" data-score="${mPts}" onclick="setButtonScore(${i}, ${mPts}, ${pts})">Orta (${mPts})</button>` : ''}
                            ${bPts > 0 ? `<button class="eval-button eval-bad ${badActive}" data-score="${bPts}" onclick="setButtonScore(${i}, ${bPts}, ${pts})">Kötü (${bPts})</button>` : ''}
                        </div>
                        <span class="score-badge" id="badge-${i}" style="margin-top: 8px; display:block; background:${currentVal < pts ? '#d32f2f' : '#2e7d32'};">${currentVal}</span>
                    </div>
                    <input type="text" id="note-${i}" class="note-input" placeholder="Kırılım nedeni..." value="${currentNote}" style="display:${currentVal < pts ? 'block' : 'none'};">
                </div>`;
            } else if (isTelesatis) {
                // TELESATIŞ: Slider Düzenleme
                 contentHtml += `
                    <div class="criteria-row" id="row-${i}" data-max-score="${pts}">
                        <div class="criteria-header">
                            <span>${i+1}. ${c.text}</span>
                            <span style="font-size:0.8rem; color:#999;">Max: ${pts}</span>
                        </div>
                        <div class="criteria-controls" style="display: flex; align-items: center; gap: 15px; background: #f9f9f9; padding: 8px; border-radius: 6px;">
                            <input type="range" class="custom-range slider-input" id="slider-${i}" min="0" max="${pts}" value="${currentVal}" data-index="${i}" oninput="updateRowSliderScore(${i}, ${pts})" style="flex-grow: 1;">
                            <span class="score-badge" id="badge-${i}" style="background:${currentVal < pts ? '#d32f2f' : '#2e7d32'};">${currentVal}</span>
                        </div>
                        <input type="text" id="note-${i}" class="note-input" placeholder="Kırılım nedeni..." value="${currentNote}" style="display:${currentVal < pts ? 'block' : 'none'};">
                    </div>`;
            }
        });
        contentHtml += `</div>`;
    } else {
        contentHtml += `
        <div style="padding:15px; border:1px dashed #ccc; background:#fff; border-radius:8px; text-align:center;">
        <label style="font-weight:bold;">Manuel Puan</label><br>
        <input id="eval-manual-score" type="number" class="swal2-input" value="${evalData.score}" min="0" max="100" style="width:100px; text-align:center; font-size:1.5rem; font-weight:bold;">
        </div>
        <textarea id="eval-details" class="swal2-textarea" placeholder="Detaylar...">${typeof evalData.details === 'string' ? evalData.details : ''}</textarea>
        `;
    }
    contentHtml += `
    <div>
    <label style="font-size:0.85rem; font-weight:bold; color:#333;">Revize Geri Bildirim</label>
    <textarea id="eval-feedback" class="swal2-textarea" style="margin-top:5px; height:80px;"></textarea>
    </div>
    </div>`;
    
    const { value: formValues } = await Swal.fire({
        html: contentHtml,
        width: '600px',
        showCancelButton: true,
        confirmButtonText: '    💾     Güncelle',
        cancelButtonText: 'İptal',
        focusConfirm: false,
        didOpen: () => {
            document.getElementById('eval-feedback').value = evalData.feedback || '';
            
            // Edit açılırken tüm puanları güncelle
            if(isTelesatis) {
                // Sliderlar için total puanı hesapla ve slider event'ını tekrar bağla (gerekirse)
                window.recalcTotalSliderScore();
            } else if (isChat) {
                // Butonlar için total puanı hesapla
                window.recalcTotalScore();
            }
            
        },
        preConfirm: () => {
            const callId = document.getElementById('eval-callid').value;
            const feedback = document.getElementById('eval-feedback').value;
            if (isCriteriaBased) {
                let total = 0;
                let detailsArr = [];
                for (let i = 0; i < criteriaList.length; i++) {
                    const c = criteriaList[i];
                    if (parseInt(c.points) === 0) continue; 
                    
                    let val;
                    let maxPoints = parseInt(c.points) || 0;
                    let note = document.getElementById(`note-${i}`).value;
                    if (isChat) {
                         // CHAT: Butonlardan Oku
                        val = parseInt(document.getElementById(`badge-${i}`).innerText) || 0;
                        
                    } else if (isTelesatis) {
                         // TELESATIŞ: Slider'dan Oku
                        const slider = document.getElementById(`slider-${i}`);
                        val = parseInt(slider.value) || 0;
                        
                    } else {
                        val = maxPoints; // Varsayılan
                    }
                    total += val;
                    detailsArr.push({ q: c.text, max: maxPoints, score: val, note: note });
                }
                return { agentName, callId, score: total, details: JSON.stringify(detailsArr), feedback };
            } else {
                // Manuel Puanlama
                const score = document.getElementById('eval-manual-score').value;
                const details = document.getElementById('eval-details').value;
                return { agentName, callId, score: parseInt(score), details: details, feedback };
            }
        }
    });
    if (formValues) {
        Swal.fire({ title: 'Güncelleniyor...', didOpen: () => { Swal.showLoading() } });
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "updateEvaluation", username: currentUser, token: getToken(), ...formValues })
        })
        .then(r => r.json()).then(d => {
            if (d.result === "success") {
                Swal.fire({ icon: 'success', title: 'Güncellendi', text: 'Puan ve detaylar revize edildi.', timer: 1500, showConfirmButton: false });
                fetchEvaluationsForAgent(agentName);
            }
            else {
                Swal.fire('Hata', d.message || 'Güncellenemedi.', 'error');
            }
        }).catch(err => { Swal.fire('Hata', 'Sunucu hatası.', 'error'); });
    }
}
