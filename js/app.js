const BAKIM_MODU = false;
// Apps Script URL'si
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby3kd04k2u9XdVDD1-vdbQQAsHNW6WLIn8bNYxTlVCL3U1a0WqZo6oPp9zfBWIpwJEinQ/exec";

// --- OYUN DEĞİŞKENLERİ ---
let jokers = { call: 1, half: 1, double: 1 };
let doubleChanceUsed = false;
let firstAnswerIndex = -1;

// --- GLOBAL DEĞİŞKENLER ---
const VALID_CATEGORIES = ['Teknik', 'İkna', 'Kampanya', 'Bilgi'];
let database = [], newsData = [], sportsData = [], salesScripts = [], quizQuestions = [];
let techWizardData = {}; 
let wizardStepsData = {};
let currentUser = "";
let isAdminMode = false;    
let isEditingActive = false;
let sessionTimeout;
let activeCards = [];
let currentCategory = 'all';
let adminUserList = [];
let allEvaluationsData = [];
const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// ==========================================================
// --- KALİTE PUANLAMA LOGİĞİ (ORTAK & DÜZELTİLMİŞ) ---
// ==========================================================

// CHAT İÇİN (BUTONLU)
window.setButtonScore = function(index, score, max) {
    const row = document.getElementById(`row-${index}`);
    const badge = document.getElementById(`badge-${index}`);
    const noteInput = document.getElementById(`note-${index}`);
    const buttons = row.querySelectorAll('.eval-button');
    
    // Buton aktiflik durumu
    buttons.forEach(b => b.classList.remove('active'));
    const activeBtn = row.querySelector(`.eval-button[data-score="${score}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Puanı yaz
    badge.innerText = score;
    
    // Görsel değişimler (Not zorunluluğu yok, sadece alan açılır)
    if (score < max) {
        noteInput.style.display = 'block';
        badge.style.background = '#d32f2f'; // Kırmızı
        row.style.borderColor = '#ffcdd2';
        row.style.background = '#fff5f5';
    } else {
        noteInput.style.display = 'none';
        noteInput.value = ''; // Notu temizle
        badge.style.background = '#2e7d32'; // Yeşil
        row.style.borderColor = '#eee';
        row.style.background = '#fff';
    }
    window.recalcTotalScore();
};

// TELESATIŞ İÇİN (SLIDER)
window.updateRowSliderScore = function(index, max) {
    const slider = document.getElementById(`slider-${index}`);
    const badge = document.getElementById(`badge-${index}`);
    const noteInput = document.getElementById(`note-${index}`);
    const row = document.getElementById(`row-${index}`);
    
    if(!slider) return;
    
    const val = parseInt(slider.value);
    badge.innerText = val;
    
    // Görsel değişimler
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

window.recalcTotalScore = function() {
    let currentTotal = 0;
    const scoreBadges = document.querySelectorAll('.score-badge');
    scoreBadges.forEach(b => { currentTotal += parseInt(b.innerText) || 0; });
    
    const liveScoreEl = document.getElementById('live-score');
    if(liveScoreEl) liveScoreEl.innerText = currentTotal;
    
    // Halka animasyonu (opsiyonel)
    const ringEl = document.getElementById('score-ring');
    if(ringEl) {
        /* Basit bir renk değişimi */
        ringEl.style.borderColor = currentTotal >= 90 ? '#2e7d32' : (currentTotal >= 70 ? '#ed6c02' : '#d32f2f');
    }
};

window.recalcTotalSliderScore = function() {
    let currentTotal = 0;
    const sliders = document.querySelectorAll('.slider-input');
    sliders.forEach(s => { currentTotal += parseInt(s.value) || 0; });
    
    const liveScoreEl = document.getElementById('live-score');
    if(liveScoreEl) liveScoreEl.innerText = currentTotal;
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
    if (dateString.match(/^\d{2}\.\d{2}\.\d{4}/)) return dateString;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
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
        const parts = dateStr.split(' ')[0].split('.');
        date = new Date(parts[2], parts[1] - 1, parts[0]);
    } else { date = new Date(dateStr); }
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
function copyScriptContent(encodedText) { copyText(decodeURIComponent(encodedText)); }
function copyText(t) {
    navigator.clipboard.writeText(t.replace(/\\n/g, '\n')).then(() => 
        Swal.fire({icon:'success', title:'Kopyalandı', toast:true, position:'top-end', showConfirmButton:false, timer:1500}) );
}

document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) { if(e.keyCode == 123) return false; }
document.addEventListener('DOMContentLoaded', () => { checkSession(); });

// --- SESSION & LOGIN & BİLDİRİM ---
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
        
        if (!BAKIM_MODU) {
            document.getElementById("main-app").style.display = "block";
            loadContentData();
            loadWizardData();
            loadTechWizardData();
            if (savedRole === 'qusers') { 
                document.getElementById('cardGrid').style.display = 'none';
                document.querySelector('.control-wrapper').style.display = 'none';
                document.querySelector('.news-ticker-box').style.display = 'none';
                openQualityArea(); 
            }
            checkNewFeedbacks(); // Yeni özellik: Bildirim kontrolü
        } else {
            document.getElementById("maintenance-screen").style.display = "flex";
        }
    }
}
function enterBas(e) { if (e.key === "Enter") girisYap(); }
function girisYap() {
    const uName = document.getElementById("usernameInput").value.trim();
    const uPass = document.getElementById("passInput").value.trim();
    const errorMsg = document.getElementById("error-msg");
    const loadingMsg = document.getElementById("loading-msg");

    if(!uName || !uPass) { errorMsg.style.display = "block"; return; }
    
    loadingMsg.style.display = "block";
    document.querySelector('.login-btn').disabled = true;
    
    fetch(SCRIPT_URL, {
        method: 'POST', 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "login", username: uName, password: CryptoJS.SHA256(uPass).toString() })
    }).then(r => r.json()).then(data => {
        loadingMsg.style.display = "none";
        document.querySelector('.login-btn').disabled = false;
        if (data.result === "success") {
            currentUser = data.username;
            localStorage.setItem("sSportUser", currentUser);
            localStorage.setItem("sSportToken", data.token);
            localStorage.setItem("sSportRole", data.role);
            
            if (data.forceChange === true) {
                Swal.fire({icon: 'warning', title: 'Güvenlik', text: 'İlk girişiniz. Şifrenizi değiştirin.', allowOutsideClick: false}).then(() => { changePasswordPopup(true); });
            } else {
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("user-display").innerText = currentUser;
                checkAdmin(data.role);
                startSessionTimer();
                if (!BAKIM_MODU) {
                    document.getElementById("main-app").style.display = "block";
                    checkNewFeedbacks(); // Girişte bildirim kontrolü
                    loadContentData();
                    loadWizardData();
                    loadTechWizardData();
                    if (data.role === 'qusers') { 
                        document.getElementById('cardGrid').style.display = 'none';
                        document.querySelector('.control-wrapper').style.display = 'none';
                        openQualityArea();
                    }
                } else {
                    document.getElementById("maintenance-screen").style.display = "flex";
                }
            }
        } else { errorMsg.innerText = data.message || "Hatalı giriş!"; errorMsg.style.display = "block"; }
    }).catch(e => { console.error(e); loadingMsg.style.display = "none"; document.querySelector('.login-btn').disabled = false; });
}

// --- BİLDİRİM POPUP SİSTEMİ (YENİ) ---
function checkNewFeedbacks() {
    const agentName = localStorage.getItem("sSportUser");
    if (!agentName || isAdminMode) return; 
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "checkNotifications", username: agentName })
    })
    .then(r => r.json())
    .then(data => {
        if (data.result === "success" && data.hasFeedback) {
            const lastSeenId = localStorage.getItem('lastSeenFeedbackId');
            
            if (lastSeenId !== String(data.id)) {
                let iconType = 'info';
                let titleColor = '#0e1b42';
                
                if (data.score === 0 || data.score < 70) { iconType = 'warning'; titleColor = '#d32f2f'; }
                else if (data.score >= 100) { iconType = 'success'; titleColor = '#2e7d32'; }
                else if (data.score >= 70 && data.score < 100) { iconType = 'info'; titleColor = '#ed6c02'; }
                
                Swal.fire({
                    title: `<span style="color:${titleColor}">🔔 Yeni Geri Bildirim!</span>`,
                    html: `
                        <div style="text-align:left; font-size:0.95rem; line-height:1.6;">
                            <p><strong>Tarih:</strong> ${data.date}</p>
                            <p><strong>Tür:</strong> ${data.type}</p>
                            <p><strong>Puan:</strong> <span style="font-weight:bold; font-size:1.1rem; color:${titleColor}">${data.score}</span></p>
                            <div style="background:#f8f9fa; padding:15px; border-left:5px solid ${titleColor}; border-radius:4px; margin-top:10px; font-style:italic; color:#555; white-space: pre-wrap;">
                                "${data.feedback}"
                            </div>
                        </div>
                    `,
                    icon: iconType,
                    confirmButtonText: 'Okudum, Anlaşıldı',
                    confirmButtonColor: titleColor,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    backdrop: `rgba(0,0,123,0.4)`
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.setItem('lastSeenFeedbackId', data.id);
                    }
                });
            }
        }
    });
}

function checkAdmin(role) { 
    const addBtn = document.getElementById('dropdownAddCard');
    const editBtn = document.getElementById('dropdownQuickEdit');
    isAdminMode = (role === "admin");
    const isQualityUser = (role === 'qusers');
    if(isAdminMode) {
        if(addBtn) addBtn.style.display = 'flex';
        if(editBtn) editBtn.style.display = 'flex';
        editBtn.innerHTML = '<i class="fas fa-pen" style="color:var(--secondary);"></i> Düzenlemeyi Aç';
        editBtn.classList.remove('active');
    } else {
        if(addBtn) addBtn.style.display = 'none';
        if(editBtn) editBtn.style.display = 'none';
    }
    
    // QUsers Menü Kısıtlaması
    const filterButtons = document.querySelectorAll('.filter-btn:not(.btn-fav)');
    if(isQualityUser) {
        filterButtons.forEach(btn => {
            if (btn.innerText.indexOf('Kalite') === -1) {
                btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; btn.style.filter = 'grayscale(100%)';
            }
        });
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.disabled = true; searchInput.placeholder = "Arama devre dışı"; searchInput.style.opacity = '0.6';
        }
    } else {
        filterButtons.forEach(btn => {
            btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.style.filter = 'none';
        });
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.disabled = false; searchInput.placeholder = "İçeriklerde hızlı ara..."; searchInput.style.opacity = '1';
        }
    }
}
function logout() { 
    currentUser = ""; isAdminMode = false; isEditingActive = false;
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
    sessionTimeout = setTimeout(() => { Swal.fire({ icon: 'warning', title: 'Oturum Doldu', confirmButtonText: 'Tamam' }).then(() => logout()); }, 28800000);
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
        html: `${isMandatory ? '<p style="color:#d32f2f;">İlk giriş için şifre değiştirin.</p>' : ''}<input id="swal-old-pass" type="password" class="swal2-input" placeholder="Eski Şifre"><input id="swal-new-pass" type="password" class="swal2-input" placeholder="Yeni Şifre">`,
        showCancelButton: !isMandatory,
        allowOutsideClick: !isMandatory,
        preConfirm: () => {
            const o = document.getElementById('swal-old-pass').value;
            const n = document.getElementById('swal-new-pass').value;
            if(!o || !n) Swal.showValidationMessage('Boş alan bırakılamaz');
            return [o, n];
        }
    });
    if (formValues) {
        Swal.fire({ title: 'İşleniyor...', didOpen: () => { Swal.showLoading() } });
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "changePassword", username: currentUser, oldPass: CryptoJS.SHA256(formValues[0]).toString(), newPass: CryptoJS.SHA256(formValues[1]).toString(), token: getToken() })
        }).then(r=>r.json()).then(d=>{
            if(d.result==="success") Swal.fire('Başarılı','Şifre değiştirildi.','success').then(()=>logout());
            else Swal.fire('Hata', d.message, 'error').then(() => { if(isMandatory) changePasswordPopup(true); });
        }).catch(err => { Swal.fire('Hata', 'Sunucu hatası.', 'error'); });
    } else if (isMandatory) { changePasswordPopup(true); }
}

// --- DATA FETCHING & CRUD ---
function loadContentData() { 
    document.getElementById('loading').style.display = 'block';
    fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "fetchData" }) }).then(r=>r.json()).then(data => {
        document.getElementById('loading').style.display = 'none';
        if (data.result === "success") {
            const raw = data.data;
            database = raw.filter(i => ['card','bilgi','teknik','kampanya','ikna'].includes(i.Type.toLowerCase())).map(i => ({ title: i.Title, category: i.Category, text: i.Text, script: i.Script, code: i.Code, link: i.Link, date: formatDateToDDMMYYYY(i.Date) }));
            newsData = raw.filter(i => i.Type.toLowerCase() === 'news').map(i => ({ date: formatDateToDDMMYYYY(i.Date), title: i.Title, desc: i.Text, type: i.Category, status: i.Status }));
            sportsData = raw.filter(i => i.Type.toLowerCase() === 'sport').map(i => ({ title: i.Title, icon: i.Icon, desc: i.Text, tip: i.Tip, detail: i.Detail, pronunciation: i.Pronunciation }));
            salesScripts = raw.filter(i => i.Type.toLowerCase() === 'sales').map(i => ({ title: i.Title, text: i.Text }));
            quizQuestions = raw.filter(i => i.Type.toLowerCase() === 'quiz').map(i => ({ q: i.Text, opts: i.QuizOptions ? i.QuizOptions.split(',') : [], a: parseInt(i.QuizAnswer) }));
            
            if(currentCategory === 'fav') filterCategory(document.querySelector('.btn-fav'), 'fav');
            else { activeCards = database; renderCards(database); }
            startTicker();
        } else { document.getElementById('loading').innerHTML = 'Veri hatası.'; }
    }).catch(e => document.getElementById('loading').innerHTML = 'Bağlantı hatası.');
}
function loadWizardData() { 
    fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "getWizardData" }) }).then(r=>r.json()).then(d=>{ if(d.result==="success") wizardStepsData=d.steps; });
}
function loadTechWizardData() { 
    fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "getTechWizardData" }) }).then(r=>r.json()).then(d=>{ if(d.result==="success") techWizardData=d.steps; });
}
function renderCards(data) { 
    const container = document.getElementById('cardGrid'); container.innerHTML = '';
    if (data.length === 0) { container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#777;">Kayıt bulunamadı.</div>'; return; }
    data.forEach((item, index) => {
        const editIcon = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" onclick="editContent(${index})" style="display:block;"></i>` : '';
        const newBadge = isNew(item.date) ? '<span class="new-badge">YENİ</span>' : '';
        const favClass = isFav(item.title) ? 'fas fa-star active' : 'far fa-star';
        let rawText = item.text || "";
        let formattedText = rawText.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<b>$1</b>');
        
        let html = `<div class="card ${item.category}">${newBadge}
            <div class="icon-wrapper">${editIcon}<i class="${favClass} fav-icon" onclick="toggleFavorite('${escapeForJsString(item.title)}')"></i></div>
            <div class="card-header"><h3 class="card-title">${highlightText(item.title)}</h3><span class="badge">${item.category}</span></div>
            <div class="card-content" onclick="showCardDetail('${escapeForJsString(item.title)}', '${escapeForJsString(item.text)}')"><div class="card-text-truncate">${highlightText(formattedText)}</div><div style="font-size:0.8rem;color:#999;text-align:right;">(Tamamını oku)</div></div>
            <div class="script-box">${highlightText(item.script)}</div>
            <div class="card-actions"><button class="btn btn-copy" onclick="copyText('${escapeForJsString(item.script)}')"><i class="fas fa-copy"></i> Kopyala</button>
            ${item.code ? `<button class="btn btn-copy" style="background:var(--secondary);color:#333;" onclick="copyText('${escapeForJsString(item.code)}')">Kod</button>`:''}
            ${item.link ? `<a href="${item.link}" target="_blank" class="btn btn-link"><i class="fas fa-external-link-alt"></i> Link</a>`:''}</div>
        </div>`;
        container.innerHTML += html;
    });
}
function highlightText(text) { 
    const term = document.getElementById('searchInput').value.toLocaleLowerCase('tr-TR').trim();
    if(!term || !text) return text;
    try {
        return text.toString().replace(new RegExp(`(${term})`, "gi"), '<span class="highlight">$1</span>');
    } catch(e) { return text; }
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
    if (currentCategory === 'fav') filtered = filtered.filter(i => isFav(i.title));
    else if (currentCategory !== 'all') filtered = filtered.filter(i => i.category === currentCategory);
    if (search) filtered = filtered.filter(i => (i.title+i.text+i.script).toLowerCase().includes(search));
    activeCards = filtered;
    renderCards(filtered);
}
function showCardDetail(title, text) { 
    Swal.fire({ title: title, html: `<div style="text-align:left;font-size:1rem;line-height:1.6;">${text.replace(/\\n/g,'<br>')}</div>`, width: '600px', showCloseButton: true, showConfirmButton: false, background: '#f8f9fa' }); 
}
function toggleEditMode() {
    if (!isAdminMode) return;
    isEditingActive = !isEditingActive;
    document.body.classList.toggle('editing', isEditingActive);
    const btn = document.getElementById('dropdownQuickEdit');
    if(isEditingActive) {
        btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-times" style="color:var(--accent);"></i> Düzenlemeyi Kapat';
        Swal.fire({ icon: 'success', title: 'Düzenleme Modu AÇIK', timer: 1500, showConfirmButton: false });
    } else {
        btn.classList.remove('active'); btn.innerHTML = '<i class="fas fa-pen" style="color:var(--secondary);"></i> Düzenlemeyi Aç';
    }
    filterContent();
    if(document.getElementById('guide-modal').style.display === 'flex') openGuide();
    if(document.getElementById('sales-modal').style.display === 'flex') openSales();
    if(document.getElementById('news-modal').style.display === 'flex') openNews();
}
function sendUpdate(o, c, v, t='card') {
    if (!Swal.isVisible()) Swal.fire({ title: 'Kaydediliyor...', didOpen: () => { Swal.showLoading() } });
    fetch(SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "updateContent", title: o, column: c, value: v, type: t, originalText: o, username: currentUser, token: getToken() })
    }).then(r => r.json()).then(data => {
        if (data.result === "success") {
            Swal.fire({icon: 'success', title: 'Başarılı', timer: 1500, showConfirmButton: false});
            setTimeout(loadContentData, 1600);
        } else { Swal.fire('Hata', 'Kaydedilemedi.', 'error'); }
    }).catch(err => Swal.fire('Hata', 'Sunucu hatası.', 'error'));
}

// --- CRUD OPERASYONLARI (KART EKLEME/DÜZENLEME) ---
async function addNewCardPopup() {
    const catSelectHTML = getCategorySelectHtml('Bilgi', 'swal-new-cat');
    const { value: formValues } = await Swal.fire({
        title: 'Yeni İçerik Ekle',
        html: `
        <div style="margin-bottom:15px; text-align:left;">
            <label style="font-weight:bold;">Tip Seçin</label>
            <select id="swal-type-select" class="swal2-input" style="width:100%;" onchange="toggleAddFields()">
                <option value="card">Bilgi Kartı</option><option value="news">Duyuru</option><option value="sales">Satış Scripti</option><option value="sport">Spor İçeriği</option><option value="quiz">Quiz</option>
            </select>
        </div>
        <div id="preview-card" class="card Bilgi" style="text-align:left; border:1px solid #e0e0e0; margin-top:10px;">
            <div class="card-header"><input id="swal-new-title" class="swal2-input" style="margin:0; height:40px; flex-grow:1;" placeholder="Başlık"><div id="cat-container" style="width:110px;">${catSelectHTML}</div></div>
            <div class="card-content"><textarea id="swal-new-text" class="swal2-textarea" style="margin:0; width:100%; min-height:100px;" placeholder="İçerik..."></textarea></div>
            <div id="script-container" class="script-box" style="padding:0;"><textarea id="swal-new-script" class="swal2-textarea" style="margin:0; width:100%; background:transparent; font-style:italic;" placeholder="Script..."></textarea></div>
            <div id="extra-container" class="card-actions" style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <input id="swal-new-code" class="swal2-input" style="margin:0;" placeholder="Kod"><input id="swal-new-link" class="swal2-input" style="margin:0;" placeholder="Link">
            </div>
            <div id="sport-extra" style="display:none; padding:10px;">
                <input id="swal-sport-tip" class="swal2-input" placeholder="İpucu"><input id="swal-sport-detail" class="swal2-input" placeholder="Detay"><input id="swal-sport-pron" class="swal2-input" placeholder="Okunuş"><input id="swal-sport-icon" class="swal2-input" placeholder="İkon">
            </div>
            <div id="news-extra" style="display:none; padding:10px;">
                <select id="swal-news-type" class="swal2-input"><option value="info">Bilgi</option><option value="update">Değişiklik</option><option value="fix">Çözüldü</option></select>
                <select id="swal-news-status" class="swal2-input"><option value="Aktif">Aktif</option><option value="Pasif">Pasif</option></select>
            </div>
            <div id="quiz-extra" style="display:none; padding:10px;">
                <textarea id="swal-quiz-q" class="swal2-textarea" placeholder="Soru"></textarea><input id="swal-quiz-opts" class="swal2-input" placeholder="Şıklar (virgülle)"><input id="swal-quiz-ans" type="number" class="swal2-input" placeholder="Cevap İndeksi">
            </div>
        </div>`,
        width: '700px', showCancelButton: true, confirmButtonText: 'Ekle',
        didOpen: () => {
            window.toggleAddFields = function() {
                const type = document.getElementById('swal-type-select').value;
                const catCont = document.getElementById('cat-container'), scriptCont = document.getElementById('script-container'), extraCont = document.getElementById('extra-container');
                const sportExtra = document.getElementById('sport-extra'), newsExtra = document.getElementById('news-extra'), quizExtra = document.getElementById('quiz-extra');
                catCont.style.display='none'; scriptCont.style.display='none'; extraCont.style.display='none'; sportExtra.style.display='none'; newsExtra.style.display='none'; quizExtra.style.display='none';
                
                if (type === 'card') { catCont.style.display='block'; scriptCont.style.display='block'; extraCont.style.display='grid'; }
                else if (type === 'sales') { scriptCont.style.display='block'; }
                else if (type === 'sport') { sportExtra.style.display='block'; }
                else if (type === 'news') { newsExtra.style.display='block'; }
                else if (type === 'quiz') { quizExtra.style.display='block'; }
            };
        },
        preConfirm: () => {
            const type = document.getElementById('swal-type-select').value;
            const dateStr = new Date().getDate() + "." + (new Date().getMonth()+1) + "." + new Date().getFullYear();
            return {
                cardType: type,
                category: type === 'card' ? document.getElementById('swal-new-cat').value : (type === 'news' ? document.getElementById('swal-news-type').value : ''),
                title: document.getElementById('swal-new-title').value,
                text: type === 'quiz' ? document.getElementById('swal-quiz-q').value : document.getElementById('swal-new-text').value,
                script: (type === 'card' || type === 'sales') ? document.getElementById('swal-new-script').value : '',
                code: type === 'card' ? document.getElementById('swal-new-code').value : '',
                status: type === 'news' ? document.getElementById('swal-news-status').value : '',
                link: type === 'card' ? document.getElementById('swal-new-link').value : '',
                tip: type === 'sport' ? document.getElementById('swal-sport-tip').value : '',
                detail: type === 'sport' ? document.getElementById('swal-sport-detail').value : '',
                pronunciation: type === 'sport' ? document.getElementById('swal-sport-pron').value : '',
                icon: type === 'sport' ? document.getElementById('swal-sport-icon').value : '',
                date: dateStr,
                quizOptions: type === 'quiz' ? document.getElementById('swal-quiz-opts').value : '',
                quizAnswer: type === 'quiz' ? document.getElementById('swal-quiz-ans').value : ''
            }
        }
    });
    if (formValues) {
        if(!formValues.title) { Swal.fire('Hata', 'Başlık zorunlu!', 'error'); return; }
        Swal.fire({ title: 'Ekleniyor...', didOpen: () => { Swal.showLoading() } });
        fetch(SCRIPT_URL, {
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "addCard", username: currentUser, token: getToken(), ...formValues })
        }).then(r => r.json()).then(d => {
            if (d.result === "success") { Swal.fire({icon: 'success', title: 'Başarılı', timer: 2000, showConfirmButton: false}); setTimeout(loadContentData, 3500); }
            else { Swal.fire('Hata', d.message || 'Eklenemedi.', 'error'); }
        });
    }
}
async function editContent(index) {
    const item = activeCards[index];
    const catSelectHTML = getCategorySelectHtml(item.category, 'swal-cat');
    const { value: formValues } = await Swal.fire({
        title: 'Kartı Düzenle',
        html: `
        <div id="preview-card-edit" class="card ${item.category}" style="text-align:left; border:1px solid #e0e0e0;">
            <div class="card-header"><input id="swal-title" class="swal2-input" style="margin:0; height:40px; flex-grow:1;" value="${item.title}"><div style="width:110px;">${catSelectHTML}</div></div>
            <div class="card-content"><textarea id="swal-text" class="swal2-textarea" style="margin:0; width:100%; min-height:120px;">${(item.text || '').replace(/<br>/g,'\n')}</textarea></div>
            <div class="script-box"><textarea id="swal-script" class="swal2-textarea" style="margin:0; width:100%; background:transparent; font-style:italic;">${(item.script || '').replace(/<br>/g,'\n')}</textarea></div>
            <div class="card-actions" style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <input id="swal-code" class="swal2-input" style="margin:0;" value="${item.code || ''}" placeholder="Kod"><input id="swal-link" class="swal2-input" style="margin:0;" value="${item.link || ''}" placeholder="Link">
            </div>
        </div>`,
        width: '700px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => {
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
        if(formValues.cat !== item.category) sendUpdate(item.title, "Category", formValues.cat);
        if(formValues.text !== (item.text || '').replace(/<br>/g,'\n')) setTimeout(() => sendUpdate(item.title, "Text", formValues.text), 500);
        if(formValues.script !== (item.script || '').replace(/<br>/g,'\n')) setTimeout(() => sendUpdate(item.title, "Script", formValues.script), 1000);
        if(formValues.code !== (item.code || '')) setTimeout(() => sendUpdate(item.title, "Code", formValues.code), 1500);
        if(formValues.link !== (item.link || '')) setTimeout(() => sendUpdate(item.title, "Link", formValues.link), 2000);
        if(formValues.title !== item.title) setTimeout(() => sendUpdate(item.title, "Title", formValues.title), 2500);
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
            <input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.title}">
            <textarea id="swal-desc" class="swal2-textarea" style="margin-bottom:10px;">${s.desc || ''}</textarea>
            <input id="swal-tip" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.tip || ''}">
            <textarea id="swal-detail" class="swal2-textarea" style="margin-bottom:10px;">${s.detail || ''}</textarea>
            <input id="swal-pron" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.pronunciation || ''}">
            <input id="swal-icon" class="swal2-input" style="width:100%;" value="${s.icon || ''}">
        </div>`,
        width: '700px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => [
            document.getElementById('swal-title').value,
            document.getElementById('swal-desc').value,
            document.getElementById('swal-tip').value,
            document.getElementById('swal-detail').value,
            document.getElementById('swal-pron').value,
            document.getElementById('swal-icon').value
        ]
    });
    if (formValues) {
        if(formValues[1] !== s.desc) sendUpdate(s.title, "Text", formValues[1], 'sport');
        if(formValues[2] !== s.tip) setTimeout(() => sendUpdate(s.title, "Tip", formValues[2], 'sport'), 500);
        if(formValues[3] !== s.detail) setTimeout(() => sendUpdate(s.title, "Detail", formValues[3], 'sport'), 1000);
        if(formValues[4] !== s.pronunciation) setTimeout(() => sendUpdate(s.title, "Pronunciation", formValues[4], 'sport'), 1500);
        if(formValues[5] !== s.icon) setTimeout(() => sendUpdate(s.title, "Icon", formValues[5], 'sport'), 2000);
        if(formValues[0] !== s.title) setTimeout(() => sendUpdate(s.title, "Title", formValues[0], 'sport'), 2500);
    }
}
async function editSales(title) {
    event.stopPropagation();
    const s = salesScripts.find(item => item.title === title);
    if (!s) return Swal.fire('Hata', 'İçerik bulunamadı.', 'error');
    const { value: formValues } = await Swal.fire({
        title: 'Satış Metnini Düzenle',
        html: `<div class="card" style="text-align:left; border-left: 5px solid var(--sales); padding:15px; background:#ecfdf5;"><input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.title}"><textarea id="swal-text" class="swal2-textarea" style="min-height:150px;">${s.text || ''}</textarea></div>`,
        width: '700px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => [ document.getElementById('swal-title').value, document.getElementById('swal-text').value ]
    });
    if (formValues) {
        if(formValues[1] !== s.text) sendUpdate(s.title, "Text", formValues[1], 'sales');
        if(formValues[0] !== s.title) setTimeout(() => sendUpdate(s.title, "Title", formValues[0], 'sales'), 500);
    }
}
async function editNews(index) {
    const i = newsData[index];
    const { value: formValues } = await Swal.fire({
        title: 'Duyuruyu Düzenle',
        html: `<div class="card" style="text-align:left; border-left: 5px solid var(--secondary); padding:15px; background:#fff8e1;"><input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${i.title || ''}"><div style="display:flex; gap:10px; margin-bottom:10px;"><input id="swal-date" class="swal2-input" style="width:100%;" value="${i.date || ''}"><select id="swal-type" class="swal2-input" style="width:100%;"><option value="info">Bilgi</option><option value="update">Değişiklik</option><option value="fix">Çözüldü</option></select></div><textarea id="swal-desc" class="swal2-textarea" style="margin-bottom:10px;">${i.desc || ''}</textarea><select id="swal-status" class="swal2-input" style="width:100%;"><option value="Aktif">Aktif</option><option value="Pasif">Pasif</option></select></div>`,
        width: '600px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => [
            document.getElementById('swal-title').value,
            document.getElementById('swal-date').value,
            document.getElementById('swal-desc').value,
            document.getElementById('swal-type').value,
            document.getElementById('swal-status').value
        ]
    });
    if (formValues) {
        if(formValues[1] !== i.date) sendUpdate(i.title, "Date", formValues[1], 'news');
        if(formValues[2] !== i.desc) setTimeout(() => sendUpdate(i.title, "Text", formValues[2], 'news'), 500);
        if(formValues[3] !== i.type) setTimeout(() => sendUpdate(i.title, "Category", formValues[3], 'news'), 1000);
        if(formValues[4] !== i.status) setTimeout(() => sendUpdate(i.title, "Status", formValues[4], 'news'), 1500);
        if(formValues[0] !== i.title) setTimeout(() => sendUpdate(i.title, "Title", formValues[0], 'news'), 2000);
    }
}
let tickerIndex = 0;
function startTicker() {
    const t = document.getElementById('ticker-content');
    const activeNews = newsData.filter(i => i.status !== 'Pasif');
    if(activeNews.length === 0) { t.innerHTML = "Güncel duyuru yok."; t.style.animation = 'none'; return; }
    let tickerText = activeNews.map(i => `<span style="color:#fabb00; font-weight:bold;">[${i.date}]</span> <span style="color:#fff;">${i.title}:</span> <span style="color:#ddd;">${i.desc}</span>`).join(' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ');
    t.innerHTML = tickerText + ' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ' + tickerText + ' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ' + tickerText;
    t.style.animation = 'ticker-scroll 190s linear infinite';
}
function openNews() {
    document.getElementById('news-modal').style.display = 'flex';
    const c = document.getElementById('news-container'); c.innerHTML = '';
    newsData.forEach((i, index) => {
        let cl = i.type === 'fix' ? 'tag-fix' : (i.type === 'update' ? 'tag-update' : 'tag-info');
        let tx = i.type === 'fix' ? 'Çözüldü' : (i.type === 'update' ? 'Değişiklik' : 'Bilgi');
        let passiveStyle = i.status === 'Pasif' ? 'opacity:0.5; background:#eee;' : '';
        let editBtn = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" style="top:0; right:0; font-size:0.9rem; padding:4px;" onclick="event.stopPropagation(); editNews(${index})"></i>` : '';
        c.innerHTML += `<div class="news-item" style="${passiveStyle}">${editBtn}<span class="news-date">${i.date}</span><span class="news-title">${i.title}</span><div class="news-desc">${i.desc}</div><span class="news-tag ${cl}">${tx}</span></div>`;
    });
}
function openGuide() {
    document.getElementById('guide-modal').style.display = 'flex';
    const grid = document.getElementById('guide-grid'); grid.innerHTML = '';
    sportsData.forEach((s, index) => {
        let pronHtml = s.pronunciation ? `<div class="pronunciation-badge">🗣️ ${s.pronunciation}</div>` : '';
        let editBtn = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" style="top:5px; right:5px; z-index:50;" onclick="event.stopPropagation(); editSport('${escapeForJsString(s.title)}')"></i>` : '';
        grid.innerHTML += `<div class="guide-item" onclick="showSportDetail(${index})">${editBtn}<i class="fas ${s.icon} guide-icon"></i><span class="guide-title">${s.title}</span>${pronHtml}<div class="guide-desc">${s.desc}</div><div class="guide-tip"><i class="fas fa-lightbulb"></i> ${s.tip}</div><div style="font-size:0.8rem; color:#999; margin-top:5px;">(Detay için tıkla)</div></div>`;
    });
}
function showSportDetail(index) {
    const sport = sportsData[index];
    const detailText = sport.detail ? sport.detail.replace(/\n/g,'<br>') : "Bu içerik için henüz detay eklenmemiş.";
    Swal.fire({ title: `<i class="fas ${sport.icon}" style="color:#0e1b42;"></i> ${sport.title}`, html: `<div style="text-align:left; font-size:1rem; line-height:1.6;">${detailText}</div>`, width: '600px', showCloseButton: true, showConfirmButton: false, background: '#f8f9fa' });
}
function openSales() {
    document.getElementById('sales-modal').style.display = 'flex';
    const c = document.getElementById('sales-grid'); c.innerHTML = '';
    salesScripts.forEach((s, index) => {
        let editBtn = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" style="top:10px; right:40px; z-index:50;" onclick="event.stopPropagation(); editSales('${escapeForJsString(s.title)}')"></i>` : '';
        c.innerHTML += `<div class="sales-item" id="sales-${index}" onclick="toggleSales('${index}')">${editBtn}<div class="sales-header"><span class="sales-title">${s.title}</span><i class="fas fa-chevron-down" id="icon-${index}" style="color:#10b981;"></i></div><div class="sales-text">${(s.text || '').replace(/\n/g,'<br>')}<div style="text-align:right; margin-top:15px;"><button class="btn btn-copy" onclick="event.stopPropagation(); copyText('${escapeForJsString(s.text || '')}')"><i class="fas fa-copy"></i> Kopyala</button></div></div></div>`;
    });
}
function toggleSales(index) {
    const item = document.getElementById(`sales-${index}`);
    const icon = document.getElementById(`icon-${index}`);
    item.classList.toggle('active');
    if(item.classList.contains('active')){ icon.classList.replace('fa-chevron-down', 'fa-chevron-up'); } else { icon.classList.replace('fa-chevron-up', 'fa-chevron-down'); }
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// =================================================================
// --- KALİTE HUB (TAM EKRAN & YENİ ÖZELLİKLER) ---
// =================================================================

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
    document.getElementById('admin-filters').style.display = isAdminMode ? 'flex' : 'none';
    populateMonthFilter();
    
    if (isAdminMode) {
        fetchUserListForAdmin().then(users => {
            const groupSelect = document.getElementById('group-select-admin');
            const agentSelect = document.getElementById('agent-select-admin');
            
            if(groupSelect && agentSelect) {
                const groups = [...new Set(users.map(u => u.group))].sort();
                groupSelect.innerHTML = `<option value="all">Tüm Gruplar</option>` + groups.map(g => `<option value="${g}">${g}</option>`).join('');
                updateAgentListBasedOnGroup();
            }
        });
    } else {
        fetchEvaluationsForAgent(currentUser);
    }
    switchHubTab('dashboard');
}

function switchHubTab(tabId) {
    document.querySelectorAll('.hub-menu-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.hub-tab-content').forEach(t => t.classList.remove('active'));
    
    const btns = document.querySelectorAll('.hub-menu-btn');
    btns.forEach(btn => {
        if(btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active');
    });
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    if(tabId === 'dashboard') fetchEvaluationsForAgent();
    if(tabId === 'education') loadEducationData();
}

function updateAgentListBasedOnGroup() { 
    const groupSelect = document.getElementById('group-select-admin');
    const agentSelect = document.getElementById('agent-select-admin');
    if(!groupSelect || !agentSelect) return;
    const selectedGroup = groupSelect.value;
    agentSelect.innerHTML = '';
    
    let filteredUsers = adminUserList;
    if (selectedGroup !== 'all') {
        filteredUsers = adminUserList.filter(u => u.group === selectedGroup);
        agentSelect.innerHTML = `<option value="all">-- Tüm ${selectedGroup} Ekibi --</option>`;
    } else {
        agentSelect.innerHTML = `<option value="all">-- Tüm Temsilciler --</option>`;
    }
    filteredUsers.forEach(u => { agentSelect.innerHTML += `<option value="${u.name}">${u.name}</option>`; });
    fetchEvaluationsForAgent();
}
function hubAgentChanged() { 
    fetchEvaluationsForAgent();
    if(document.getElementById('tab-education').classList.contains('active')) loadEducationData();
}
async function fetchEvaluationsForAgent(forcedName) {
    const listEl = document.getElementById('evaluations-list');
    const agentSelect = document.getElementById('agent-select-admin');
    const groupSelect = document.getElementById('group-select-admin');
    
    let targetAgent = forcedName || (isAdminMode && agentSelect ? agentSelect.value : currentUser);
    let targetGroup = isAdminMode && groupSelect ? groupSelect.value : 'all';
    
    if (isAdminMode && targetAgent === 'all' && targetGroup === 'all') {
        listEl.innerHTML = '<div style="padding:20px;text-align:center;">Lütfen bir seçim yapın.</div>';
        return;
    }
    
    const selectedMonth = document.getElementById('month-select-filter').value;
    document.getElementById('quality-loader').style.display = 'block';
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "fetchEvaluations", targetAgent: targetAgent, targetGroup: targetGroup, username: currentUser, token: getToken() })
        });
        const data = await response.json();
        document.getElementById('quality-loader').style.display = 'none';

        if (data.result === "success") {
            allEvaluationsData = data.evaluations;
            let filteredEvals = allEvaluationsData.filter(e => e.date.substring(3) === selectedMonth);
            
            // Dashboard İstatistikleri
            const totalScore = filteredEvals.reduce((sum, e) => sum + (parseFloat(e.score) || 0), 0);
            const count = filteredEvals.length;
            const avg = count > 0 ? (totalScore / count).toFixed(1) : "-";
            const targetRate = count > 0 ? Math.round((filteredEvals.filter(e => e.score >= 90).length / count) * 100) : "-";
            
            if(document.getElementById('dash-avg-score')) document.getElementById('dash-avg-score').innerText = avg;
            if(document.getElementById('dash-eval-count')) document.getElementById('dash-eval-count').innerText = count;
            if(document.getElementById('dash-target-rate')) document.getElementById('dash-target-rate').innerText = "%" + targetRate;

            listEl.innerHTML = '';
            if (filteredEvals.length === 0) listEl.innerHTML = '<p style="text-align:center;color:#999;">Kayıt bulunamadı.</p>';
            
            filteredEvals.reverse().forEach((item, index) => {
                const scoreColor = item.score >= 90 ? '#2e7d32' : (item.score >= 70 ? '#ed6c02' : '#d32f2f');
                const displayCallDate = formatDateToDDMMYYYY(item.callDate);
                const displayLogDate  = formatDateToDDMMYYYY(item.date);
                let typeIcon = item.feedbackType === 'Manuel Log' ? '<i class="fas fa-bolt" title="Hızlı Feedback"></i>' : '<i class="fas fa-phone-alt"></i>';
                let editBtn = isAdminMode ? `<i class="fas fa-pen" style="float:right; cursor:pointer; color:#aaa;" onclick="editEvaluation('${item.callId}')"></i>` : '';
                let agentNameDisplay = (targetAgent === 'all' || targetAgent === targetGroup) ? `<span style="font-size:0.8rem; font-weight:bold; color:#555; background:#eee; padding:2px 6px; border-radius:4px; margin-left:10px;">${item.agent}</span>` : '';
                
                let detailHtml = '';
                try {
                    const detailObj = JSON.parse(item.details);
                    detailHtml = '<table style="width:100%; font-size:0.85rem; border-collapse:collapse; margin-top:10px;">';
                    detailObj.forEach(d_item => {
                        let rowColor = d_item.score < d_item.max ? '#ffebee' : '#f9f9f9';
                        let noteDisplay = d_item.note ? `<br><em style="color: #d32f2f; font-size:0.8rem;">(Not: ${d_item.note})</em>` : '';
                        detailHtml += `<tr style="background:${rowColor}; border-bottom:1px solid #fff;"><td style="padding:8px; border-radius:4px;">${d_item.q}${noteDisplay}</td><td style="padding:8px; font-weight:bold; text-align:right;">${d_item.score}/${d_item.max}</td></tr>`;
                    });
                    detailHtml += '</table>';
                } catch (e) { detailHtml = `<p style="white-space:pre-wrap; margin:0; font-size:0.9rem;">${item.details}</p>`; }

                listEl.innerHTML += `
                <div class="evaluation-summary" onclick="toggleEvaluationDetail(${index})" id="eval-summary-${index}" style="position:relative; border:1px solid #eaedf2; border-left:4px solid ${scoreColor}; padding:15px; margin-bottom:10px; border-radius:8px; background:#fff; cursor:pointer; transition:all 0.2s ease;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; align-items:center; gap:8px;">${typeIcon}<span style="font-weight:700; color:#2c3e50; font-size:1.05rem;">${displayCallDate}</span>${agentNameDisplay}</div>
                            <div style="font-size:0.75rem; color:#94a3b8; margin-left:22px;"><span style="font-weight:500;">Log:</span> ${displayLogDate} <span style="margin:0 4px; color:#cbd5e0;">|</span> <span style="font-weight:500;">ID:</span> ${item.callId || '-'}</div>
                        </div>
                        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end;">
                            <div style="display:flex; align-items:center;">${editBtn} <span style="font-weight:800; font-size:1.6rem; color:${scoreColor}; line-height:1;">${item.score}</span></div>
                            <span style="font-size:0.65rem; color:#a0aec0; letter-spacing:0.5px; font-weight:600;">PUAN</span>
                        </div>
                    </div>
                    <div class="evaluation-details-content" id="eval-details-${index}" style="max-height:0; overflow:hidden;">
                        <hr style="border:none; border-top:1px dashed #eee; margin:12px 0;">
                        ${item.feedbackType !== 'Manuel Log' ? detailHtml : ''}
                        <div style="margin-top:10px; background:#f8f9fa; padding:10px; border-radius:6px; border-left:3px solid #e2e8f0;">
                             <strong style="color:#4a5568; font-size:0.8rem;">Geri Bildirim:</strong>
                             <p style="color:#2d3748; font-size:0.9rem; margin:5px 0 0 0; white-space: pre-wrap;">${item.feedback || 'Geri bildirim girilmedi.'}</p>
                        </div>
                    </div>
                </div>`;
            });
        }
    } catch(err) {
        document.getElementById('quality-loader').style.display = 'none';
        listEl.innerHTML = `<p style="color:red; text-align:center;">Bağlantı hatası.</p>`;
    }
}
async function logEvaluationPopup() {
    const agentSelect = document.getElementById('agent-select-admin');
    const agentName = agentSelect ? agentSelect.value : "";
    
    if (!agentName || agentName === 'all') { Swal.fire('Uyarı', 'Lütfen bir temsilci seçin.', 'warning'); return; }
    
    let agentGroup = 'Genel';
    const foundUser = adminUserList.find(u => u.name === agentName);
    if(foundUser) agentGroup = foundUser.group;
    
    if (agentGroup.includes('Chat')) {
        const { value: type } = await Swal.fire({ title: 'Form Tipi', input: 'radio', inputOptions: {'Chat-Normal':'Normal','Chat-Teknik':'Teknik'}, inputValidator: (v) => !v && 'Seçim yapmalısınız.' });
        if(type) agentGroup = type; else return;
    }
    
    Swal.fire({title:'Form Yükleniyor...', didOpen:()=>Swal.showLoading()});
    const criteriaList = await fetchCriteria(agentGroup);
    Swal.close();
    
    const isChat = agentGroup.includes('Chat');
    const today = new Date().toISOString().split('T')[0];
    
    let html = `<div class="eval-modal-wrapper">
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input id="eval-callid" class="swal2-input" placeholder="Call ID" style="flex:1;">
            <input id="eval-calldate" type="date" class="swal2-input" value="${today}" style="flex:1;">
        </div>
        <div class="criteria-container">`;
        
    criteriaList.forEach((c, i) => {
        let max = parseInt(c.points);
        if (isChat) {
            html += `<div class="criteria-row" id="row-${i}" data-max-score="${max}">
                <div class="criteria-header"><span>${i+1}. ${c.text}</span><span>Max: ${max}</span></div>
                <div class="eval-button-group">
                    <button class="eval-button eval-good active" data-score="${max}" onclick="setButtonScore(${i}, ${max}, ${max})">İyi</button>
                    <button class="eval-button eval-bad" data-score="0" onclick="setButtonScore(${i}, 0, ${max})">Kötü</button>
                </div>
                <span id="badge-${i}" class="score-badge" style="display:none;">${max}</span>
                <input id="note-${i}" class="note-input" placeholder="Hata detayı..." style="display:none;">
            </div>`;
        } else {
            html += `<div class="criteria-row" id="row-${i}">
                <div class="criteria-header"><span>${i+1}. ${c.text}</span><span>Max: ${max}</span></div>
                <div class="criteria-controls" style="display:flex; align-items:center; gap:10px;">
                    <input type="range" class="slider-input" id="slider-${i}" min="0" max="${max}" value="${max}" oninput="updateRowSliderScore(${i}, ${max})" style="flex:1;">
                    <span id="badge-${i}" class="score-badge">${max}</span>
                </div>
                <input id="note-${i}" class="note-input" placeholder="Hata detayı..." style="display:none;">
            </div>`;
        }
    });
    
    html += `</div>
        <textarea id="eval-feedback" class="swal2-textarea" placeholder="Genel Geri Bildirim"></textarea>
        <div style="text-align:center; font-size:2rem; font-weight:bold; color:#0e1b42; margin-top:10px;">TOPLAM: <span id="live-score">100</span></div>
    </div>`;
    
    const { value: formValues } = await Swal.fire({
        title: `${agentName} Değerlendirme`, html: html, width: '800px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => {
            const callId = document.getElementById('eval-callid').value;
            if(!callId) { Swal.showValidationMessage('Call ID gerekli.'); return false; }
            let total = 0, details = [];
            criteriaList.forEach((c, i) => {
                let score = 0, note = "";
                if(isChat) { score = parseInt(document.getElementById(`badge-${i}`).innerText); note = document.getElementById(`note-${i}`).value; }
                else { score = parseInt(document.getElementById(`slider-${i}`).value); note = document.getElementById(`note-${i}`).value; }
                total += score;
                details.push({q:c.text, max:c.points, score:score, note:note});
            });
            return { agentName, agentGroup, callId, callDate: document.getElementById('eval-calldate').value, score: total, details: JSON.stringify(details), feedback: document.getElementById('eval-feedback').value, feedbackType: 'Yok' };
        }
    });
    
    if(formValues) {
        Swal.fire({title:'Kaydediliyor...', didOpen:()=>Swal.showLoading()});
        fetch(SCRIPT_URL, {
            method:'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({action:"logEvaluation", username:currentUser, token:getToken(), ...formValues})
        }).then(r=>r.json()).then(d=> {
            if(d.result==="success") { Swal.fire('Başarılı','Kaydedildi','success'); fetchEvaluationsForAgent(); }
            else Swal.fire('Hata', d.message, 'error');
        });
    }
}
async function editEvaluation(callId) {
    const item = allEvaluationsData.find(e => e.callId == callId);
    if(!item) return;
    const { value: text } = await Swal.fire({ input: 'textarea', inputLabel: 'Feedback Düzenle', inputValue: item.feedback, showCancelButton: true });
    if (text) {
        // Burada basitçe feedback güncelliyoruz, istenirse tam form açılabilir.
        Swal.fire('Bilgi', 'Şu an sadece feedback güncelleniyor. Tam düzenleme için logEvaluationPopup geliştirilebilir.', 'info');
    }
}
function saveManualFeedback() {
    const agentSelect = document.getElementById('agent-select-admin');
    const title = document.getElementById('mf-title').value;
    const date = document.getElementById('mf-date').value;
    const desc = document.getElementById('mf-desc').value;
    const impact = document.getElementById('mf-impact').value;
    const agentName = agentSelect ? agentSelect.value : currentUser;
    
    if(!isAdminMode || !agentName || agentName==='all' || !title || !desc) { Swal.fire('Eksik Bilgi', 'Temsilci, Konu ve Açıklama zorunludur.', 'warning'); return; }
    
    let scoreVal = impact === 'N/A' ? 'Bilgi' : parseInt(impact);
    let agentGroup = 'Genel';
    const foundUser = adminUserList.find(u => u.name === agentName);
    if(foundUser) agentGroup = foundUser.group;

    fetch(SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "logEvaluation", username: currentUser, token: getToken(), agentName: agentName, agentGroup: agentGroup, callId: "MANUEL-" + Math.floor(Math.random()*100000), callDate: date, score: scoreVal, details: JSON.stringify([{ q: title, note: desc, score: scoreVal }]), feedback: desc, feedbackType: "Manuel Log" })
    }).then(r => r.json()).then(d => {
        if(d.result === "success") { Swal.fire('Başarılı','Feedback gönderildi.','success'); document.getElementById('mf-desc').value = ''; fetchEvaluationsForAgent(); }
    });
}
function loadEducationData() {
    const listEl = document.getElementById('education-list');
    const agentSelect = document.getElementById('agent-select-admin');
    const target = isAdminMode ? (agentSelect ? agentSelect.value : 'all') : currentUser;
    document.getElementById('admin-edu-panel').style.display = isAdminMode ? 'block' : 'none';
    listEl.innerHTML = 'Yükleniyor...';
    
    fetch(SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: "getEducation", username: currentUser, token: getToken(), targetAgent: target })
    }).then(r => r.json()).then(data => {
        listEl.innerHTML = '';
        if(data.result === "success" && data.data) {
            if(data.data.length === 0) listEl.innerHTML = 'Atanmış eğitim yok.';
            data.data.forEach(edu => {
                let isDone = edu.status === 'Tamamlandı';
                let btn = isDone ? `<span style="color:green;float:right;">✔ ${edu.completedDate}</span>` : `<button class="edu-btn" onclick="completeEducation('${edu.id}')">Tamamla</button>`;
                let link = edu.link ? `<a href="${edu.link}" target="_blank" style="display:block;margin-bottom:10px;color:#007bff;">Eğitime Git</a>` : '';
                listEl.innerHTML += `<div class="edu-card ${isDone?'done':''}"><span class="edu-title">${edu.title}</span><p class="edu-desc">${edu.desc}</p>${link}${btn}</div>`;
            });
        }
    });
}
function assignEducation() {
    const title = document.getElementById('edu-assign-title').value;
    const link = document.getElementById('edu-assign-link').value;
    const desc = document.getElementById('edu-assign-desc').value;
    const agent = document.getElementById('agent-select-admin').value;
    if(!agent || agent === 'all' || !title) return Swal.fire('Uyarı', 'Kişi ve Başlık seçin.', 'warning');
    
    fetch(SCRIPT_URL, {
        method:'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action:"assignEducation", username:currentUser, token:getToken(), targetAgent:agent, title, link, desc })
    }).then(r=>r.json()).then(d=>{ if(d.result==="success") { Swal.fire('Atandı','','success'); loadEducationData(); } });
}
function completeEducation(id) {
    Swal.fire({title:'Tamamladın mı?', showCancelButton:true, confirmButtonText:'Evet'}).then(res=>{
        if(res.isConfirmed) fetch(SCRIPT_URL, { method:'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action:"completeEducation", eduId:id }) }).then(()=>loadEducationData());
    });
}
function fetchUserListForAdmin() { 
    return fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "getUserList", username: currentUser, token: getToken() }) })
    .then(r=>r.json()).then(d => { adminUserList = d.users || []; return adminUserList; });
}
function fetchCriteria(group) { 
    return fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "getCriteria", group: group }) })
    .then(r=>r.json()).then(d => d.criteria || []);
}

// --- PENALTY GAME ---
function openPenaltyGame() { document.getElementById('penalty-modal').style.display='flex'; showLobby(); }
function showLobby() { document.getElementById('penalty-lobby').style.display='flex'; document.getElementById('penalty-game-area').style.display='none'; fetchLeaderboard(); }
function startGameFromLobby() { document.getElementById('penalty-lobby').style.display='none'; document.getElementById('penalty-game-area').style.display='block'; startPenaltySession(); }
function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-body'), loader = document.getElementById('leaderboard-loader'), table = document.getElementById('leaderboard-table');
    tbody.innerHTML = ''; loader.style.display = 'block'; table.style.display = 'none';
    fetch(SCRIPT_URL, { method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "getLeaderboard" }) }).then(response => response.json()).then(data => {
        loader.style.display = 'none';
        if (data.result === "success") {
            table.style.display = 'table';
            let html = '';
            if(data.leaderboard.length === 0) { html = '<tr><td colspan="4" style="text-align:center; color:#666;">Henüz maç yapılmadı.</td></tr>'; } 
            else {
                data.leaderboard.forEach((u, i) => {
                    let medal = i===0 ? '    🥇    ' : (i===1 ? '    🥈    ' : (i===2 ? '    🥉    ' : `<span class="rank-badge">${i+1}</span>`));
                    let bgStyle = (u.username === currentUser) ? 'background:rgba(250, 187, 0, 0.1);' : '';
                    html += `<tr style="${bgStyle}"><td>${medal}</td><td style="text-align:left;">${u.username}</td><td>${u.games}</td><td>${u.average}</td></tr>`;
                });
            }
            tbody.innerHTML = html;
        } else { loader.innerText = "Yüklenemedi."; loader.style.display = 'block'; }
    });
}
function startPenaltySession() {
    pScore = 0; pBalls = 10; jokers = { call: 1, half: 1, double: 1 };
    doubleChanceUsed = false; firstAnswerIndex = -1;
    updateJokerButtons();
    document.getElementById('p-score').innerText = pScore;
    document.getElementById('p-balls').innerText = pBalls;
    document.getElementById('p-restart-btn').style.display = 'none';
    document.getElementById('p-options').style.display = 'grid';
    resetField();
    loadPenaltyQuestion();
}
function loadPenaltyQuestion() {
    if (pBalls <= 0) { finishPenaltyGame(); return; }
    if (quizQuestions.length === 0) { Swal.fire('Hata', 'Soru yok!', 'warning'); return; }
    pCurrentQ = quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
    document.getElementById('p-question-text').innerText = pCurrentQ.q;
    doubleChanceUsed = false; firstAnswerIndex = -1; updateJokerButtons();
    let html = '';
    pCurrentQ.opts.forEach((opt, index) => {
        const letter = String.fromCharCode(65 + index);
        html += `<button class="penalty-btn" onclick="shootBall(${index})">${letter}: ${opt}</button>`;
    });
    document.getElementById('p-options').innerHTML = html;
}
function shootBall(idx) {
    const btns = document.querySelectorAll('.penalty-btn'), isCorrect = (idx === pCurrentQ.a);
    if (!isCorrect && doubleChanceUsed && firstAnswerIndex === -1) {
        firstAnswerIndex = idx; btns[idx].classList.add('wrong-first-try'); btns[idx].disabled = true;
        Swal.fire({ toast: true, position: 'top', icon: 'info', title: 'İlk Hata! Kalan Hakkınız: 1', showConfirmButton: false, timer: 1500, background: '#ffc107' });
        updateJokerButtons(); return;
    }
    btns.forEach(b => b.disabled = true);
    const ballWrap = document.getElementById('ball-wrap'), keeperWrap = document.getElementById('keeper-wrap'), shooterWrap = document.getElementById('shooter-wrap'), goalMsg = document.getElementById('goal-msg');
    const shotDir = Math.floor(Math.random() * 4);
    shooterWrap.classList.add('shooter-run');
    
    setTimeout(() => {
        if(isCorrect) {
            if(shotDir === 0 || shotDir === 2) keeperWrap.classList.add('keeper-dive-right'); else keeperWrap.classList.add('keeper-dive-left');
        } else {
            if(shotDir === 0 || shotDir === 2) keeperWrap.classList.add('keeper-dive-left'); else keeperWrap.classList.add('keeper-dive-right');
        }
        if (isCorrect) {
            if(shotDir === 0) ballWrap.classList.add('ball-shoot-left-top');
            else if(shotDir === 1) ballWrap.classList.add('ball-shoot-right-top');
            else if(shotDir === 2) ballWrap.classList.add('ball-shoot-left-low');
            else ballWrap.classList.add('ball-shoot-right-low');
            setTimeout(() => {
                goalMsg.innerText = "GOL!!!"; goalMsg.style.color = "#fabb00"; goalMsg.classList.add('show');
                pScore++; document.getElementById('p-score').innerText = pScore;
                Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Mükemmel Şut!', showConfirmButton: false, timer: 1000, background: '#a5d6a7' });
            }, 500);
        } else {
            if(Math.random() > 0.5) {
                ballWrap.style.bottom = "160px"; ballWrap.style.left = (shotDir === 0 || shotDir === 2) ? "40%" : "60%"; ballWrap.style.transform = "scale(0.6)";
                setTimeout(() => {
                    goalMsg.innerText = "KURTARDI!"; goalMsg.style.color = "#ef5350"; goalMsg.classList.add('show');
                    Swal.fire({ icon: 'error', title: 'Kaçırdın!', text: `Doğru cevap: ${String.fromCharCode(65 + pCurrentQ.a)}. ${pCurrentQ.opts[pCurrentQ.a]}`, showConfirmButton: true, timer: 2500, background: '#ef9a9a' });
                }, 500);
            } else {
                ballWrap.classList.add(Math.random() > 0.5 ? 'ball-miss-left' : 'ball-miss-right');
                setTimeout(() => {
                    goalMsg.innerText = "DIŞARI!"; goalMsg.style.color = "#ef5350"; goalMsg.classList.add('show');
                    Swal.fire({ icon: 'error', title: 'Kaçırdın!', text: `Doğru cevap: ${String.fromCharCode(65 + pCurrentQ.a)}. ${pCurrentQ.opts[pCurrentQ.a]}`, showConfirmButton: true, timer: 2500, background: '#ef9a9a' });
                }, 500);
            }
        }
    }, 300);
    pBalls--; document.getElementById('p-balls').innerText = pBalls;
    setTimeout(() => { resetField(); loadPenaltyQuestion(); }, 2500);
}
function resetField() {
    const ballWrap = document.getElementById('ball-wrap'), keeperWrap = document.getElementById('keeper-wrap'), shooterWrap = document.getElementById('shooter-wrap'), goalMsg = document.getElementById('goal-msg');
    ballWrap.className = 'ball-wrapper'; ballWrap.style = ""; keeperWrap.className = 'keeper-wrapper'; shooterWrap.className = 'shooter-wrapper'; goalMsg.classList.remove('show');
    document.querySelectorAll('.penalty-btn').forEach(b => {
        b.classList.remove('wrong-first-try'); b.style.textDecoration = ''; b.style.opacity = ''; b.style.background = '#fabb00'; b.style.color = '#0e1b42'; b.style.borderColor = '#f0b500'; b.disabled = false;
    });
}
function finishPenaltyGame() {
    let title = pScore >= 8 ? "EFSANE!    🏆   " : (pScore >= 5 ? "İyi Maçtı!    👏   " : "Antrenman Lazım    🤕   ");
    document.getElementById('p-question-text').innerHTML = `<span style="font-size:1.5rem; color:#fabb00;">MAÇ BİTTİ!</span><br>${title}<br>Toplam Skor: ${pScore}/10`;
    document.getElementById('p-options').style.display = 'none';
    document.getElementById('p-restart-btn').style.display = 'block';
    fetch(SCRIPT_URL, {
        method: 'POST', headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "logQuiz", username: currentUser, token: getToken(), score: pScore * 10, total: 100 })
    });
}
// --- WIZARD FONKSİYONLARI ---
function openWizard(){
    document.getElementById('wizard-modal').style.display='flex';
    if (Object.keys(wizardStepsData).length === 0) {
        Swal.fire({ title: 'İade Asistanı Verisi Yükleniyor...', didOpen: () => Swal.showLoading() });
        loadWizardData().then(() => {
            Swal.close();
            if (wizardStepsData && wizardStepsData['start']) { renderStep('start'); } 
            else { document.getElementById('wizard-body').innerHTML = '<h2 style="color:red;">Asistan verisi eksik.</h2>'; }
        }).catch(() => { Swal.close(); document.getElementById('wizard-body').innerHTML = '<h2 style="color:red;">Veri çekme hatası.</h2>'; });
    } else { renderStep('start'); }
}
function renderStep(k){
    const s = wizardStepsData[k];
    if (!s) { document.getElementById('wizard-body').innerHTML = `<h2 style="color:red;">HATA: Adım ID'si (${k}) bulunamadı.</h2>`; return; }
    const b = document.getElementById('wizard-body');
    let h = `<h2 style="color:var(--primary);">${s.title || ''}</h2>`;
    if(s.result) {
        let i = s.result === 'red' ? '    🛑    ' : (s.result === 'green' ? '    ✅    ' : '    ⚠️    ');
        let c = s.result === 'red' ? 'res-red' : (s.result === 'green' ? 'res-green' : 'res-yellow');
        h += `<div class="result-box ${c}"><div style="font-size:3rem;margin-bottom:10px;">${i}</div><h3>${s.title}</h3><p>${s.text}</p>${s.script ? `<div class="script-box">${s.script}</div>` : ''}</div><button class="restart-btn" onclick="renderStep('start')"><i class="fas fa-redo"></i> Başa Dön</button>`;
    } else {
        h += `<p>${s.text}</p><div class="wizard-options">`;
        s.options.forEach(o => { h += `<button class="option-btn" onclick="renderStep('${o.next}')"><i class="fas fa-chevron-right"></i> ${o.text}</button>`; });
        h += `</div>`;
        if(k !== 'start') h += `<button class="restart-btn" onclick="renderStep('start')" style="background:#eee;color:#333;margin-top:15px;">Başa Dön</button>`;
    }
    b.innerHTML = h;
}
// --- TEKNİK SİHİRBAZ ---
function openTechWizard() {
    document.getElementById('tech-wizard-modal').style.display = 'flex';
    if (Object.keys(techWizardData).length === 0) {
        Swal.fire({ title: 'Veriler Yükleniyor...', didOpen: () => Swal.showLoading() });
        loadTechWizardData().then(() => { Swal.close(); twResetWizard(); });
    } else { twRenderStep(); }
}
function twRenderStep() {
    const contentDiv = document.getElementById('tech-wizard-content');
    const backBtn = document.getElementById('tw-btn-back');
    const stepData = techWizardData[twState.currentStep];
    if (twState.history.length > 0) backBtn.style.display = 'block'; else backBtn.style.display = 'none';
    if (!stepData) { contentDiv.innerHTML = `<div class="alert" style="color:red;">Hata: Adım bulunamadı (${twState.currentStep}).</div>`; return; }
    let html = `<div class="tech-step-title">${stepData.title || ''}</div>`;
    if (stepData.text) html += `<p style="font-size:1rem; margin-bottom:15px;">${stepData.text}</p>`;
    if (stepData.script) {
        const safeScript = encodeURIComponent(stepData.script);
        html += `<div class="tech-script-box"><span class="tech-script-label">Müşteriye iletilecek:</span>"${stepData.script}"<div style="margin-top:10px; text-align:right;"><button class="btn btn-copy" style="font-size:0.8rem; padding:5px 10px;" onclick="copyScriptContent('${safeScript}')"><i class="fas fa-copy"></i> Kopyala</button></div></div>`;
    }
    if (stepData.alert) html += `<div class="tech-alert">${stepData.alert}</div>`;
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
function twChangeStep(newStep) { twState.history.push(twState.currentStep); twState.currentStep = newStep; twRenderStep(); }
function twGoBack() { if (twState.history.length > 0) { twState.currentStep = twState.history.pop(); twRenderStep(); } }
function twResetWizard() { twState.currentStep = 'start'; twState.history = []; twRenderStep(); }
