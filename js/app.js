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

// --- YENİ KALİTE PUANLAMA LOGİĞİ: BUTON TABANLI ---

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
 * Toplam skoru hesaplar ve göstergeyi günceller.
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
    return `<select id="${id}" class="swal2-input" style="width:100%; margin-top:5px;">${options}</select>`;
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
                    title: '  ⚠️   Güvenlik Uyarısı',
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
        confirmButtonText: '  🔑   Şifre Değiştir',
        denyButtonText: '  🚪   Çıkış Yap',
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
        const favClass = isFavorite ? 'fas fa-star active' : 'far
