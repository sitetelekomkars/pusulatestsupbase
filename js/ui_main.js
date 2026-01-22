function loadHomeBlocks() {
    apiCall('getHomeBlocks').then(data => {
        if (data.result === 'success') {
            homeBlocks = data.blocks || {};
            try { localStorage.setItem('homeBlocksCache', JSON.stringify(homeBlocks)); } catch (e) { }
            if (currentCategory === 'home') renderHomePanels();
        }
    }).catch(() => {
        const cached = localStorage.getItem('homeBlocksCache');
        if (cached) { try { homeBlocks = JSON.parse(cached); if (currentCategory === 'home') renderHomePanels(); } catch (e) { } }
    });
}

function loadContentData() {
    const CACHE_KEY = "sSportContentCache";
    let loadedFromCache = false;

    // 1. Try Cache
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                console.log("[Cache] Veriler önbellekten yüklendi.");
                document.getElementById('loading').style.display = 'none';
                processRawData(parsed);
                loadedFromCache = true;
            }
        }
    } catch (e) { console.warn("Cache read error:", e); }

    // If no cache, show loader
    if (!loadedFromCache) {
        document.getElementById('loading').style.display = 'block';
    }

    // 2. Fetch Fresh Data
    apiCall('fetchData').then(data => {
        if (!loadedFromCache) document.getElementById('loading').style.display = 'none';

        if (data.result === "success") {
            // Update Cache
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(data.data)); } catch (e) { }
            // Render
            processRawData(data.data);
        } else {
            if (!loadedFromCache) document.getElementById('loading').innerHTML = `Veriler alınamadı: ${data.message || 'Bilinmeyen Hata'}`;
        }
    }).catch(error => {
        if (!loadedFromCache) document.getElementById('loading').innerHTML = 'Bağlantı Hatası! Sunucuya ulaşılamıyor.';
    }).finally(() => { try { __dataLoadedResolve && __dataLoadedResolve(); } catch (e) { } });
}

function processRawData(data) {
    if (!data || !Array.isArray(data)) return;

    // Filtreleme ve global stores güncelleme
    database = data.filter(item => VALID_CATEGORIES.includes(item.category));
    newsData = data.filter(item => item.category === 'Duyuru');
    sportsData = data.filter(item => item.category === 'Spor');
    salesScripts = data.filter(item => item.category === 'Script');

    // Duyuruları tarihe göre sırala
    newsData.sort((a, b) => parseDateTRToTS(b.date) - parseDateTRToTS(a.date));

    // Arayüz tetikleyicileri
    startTicker();
    if (currentCategory === 'home') renderHomePanels();
    else filterContent();
}

function renderCards(data) {
    try {
        activeCards = data;
        const container = document.getElementById('cardGrid');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#777;">Kayıt bulunamadı.</div>';
            return;
        }

        const htmlChunks = data.map((item, index) => {
            const safeTitle = escapeForJsString(item.title);
            const isFavorite = isFav(item.title);
            const favClass = isFavorite ? 'fas fa-star active' : 'far fa-star';
            const newBadge = isNew(item.date) ? '<span class="new-badge">YENİ</span>' : '';
            const editIconHtml = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" onclick="editContent(${index})" style="display:block;"></i>` : '';
            let formattedText = (item.text || "").replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<b>$1</b>');

            const imgNotif = item.image ? `<div style="margin-bottom:8px;"><img src="${processImageUrl(item.image)}" loading="lazy" onerror="this.style.display='none'" style="max-width:100%;border-radius:6px;max-height:150px;object-fit:cover;"></div>` : '';

            return `<div class="card ${item.category}">${newBadge}
                <div class="icon-wrapper">${editIconHtml}<i class="${favClass} fav-icon" onclick="toggleFavorite('${safeTitle}')"></i></div>
                <div class="card-header"><h3 class="card-title">${highlightText(item.title)}</h3><span class="badge">${item.category}</span></div>
                <div class="card-content" onclick="showCardDetailByIndex(${index})">
                    ${imgNotif}
                    <div class="card-text-truncate">${highlightText(formattedText)}</div>
                    <div style="font-size:0.8rem; color:#999; margin-top:5px; text-align:right;">(Tamamını oku)</div>
                </div>
                <div class="script-box">${highlightText(item.script)}</div>
                <div class="card-actions">
                    <button class="btn btn-copy" onclick="copyText('${escapeForJsString(item.script)}')"><i class="fas fa-copy"></i> Kopyala</button>
                    ${item.code ? `<button class="btn btn-copy" style="background:var(--secondary); color:#333;" onclick="copyText('${escapeForJsString(item.code)}')">Kod</button>` : ''}
                    ${item.link ? `<a href="${item.link}" target="_blank" class="btn btn-link"><i class="fas fa-external-link-alt"></i> Link</a>` : ''}
                </div>
            </div>`;
        });
        container.innerHTML = htmlChunks.join('');
    } catch (e) {
        showGlobalError('Kartlar yüklenemedi: ' + (e && e.message ? e.message : String(e)));
    }
}

function highlightText(htmlContent) {
    if (!htmlContent) return "";
    const searchTerm = document.getElementById('searchInput').value.toLocaleLowerCase('tr-TR').trim();
    if (!searchTerm) return htmlContent;
    try { const regex = new RegExp(`(${searchTerm})`, "gi"); return htmlContent.toString().replace(regex, '<span class="highlight">$1</span>'); } catch (e) { return htmlContent; }
}

function updateSearchResultCount(count, total) {
    const el = document.getElementById('searchResultCount');
    if (!el) return;
    const search = (document.getElementById('searchInput')?.value || '').trim();
    const show = !!search || (currentCategory && currentCategory !== 'all');
    if (!show) { el.style.display = 'none'; el.innerText = ''; return; }
    el.style.display = 'block';
    el.innerText = `🔎 ${count} sonuç${total != null ? ' / ' + total : ''}`;
}

function filterCategory(btn, cat) {
    if (cat === "home") {
        currentCategory = "home";
        setActiveFilterButton(btn);
        showHomeScreen();
        return;
    }
    const catNorm = String(cat || '').toLowerCase();
    if (catNorm.includes('teknik')) { hideHomeScreen(); openTechArea('broadcast'); return; }
    if (catNorm.includes('telesat')) { hideHomeScreen(); openTelesalesArea(); return; }

    currentCategory = cat;
    hideHomeScreen();

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    filterContent();
}

function filterContent() {
    const search = document.getElementById('searchInput').value.toLocaleLowerCase('tr-TR').trim();
    if (currentCategory === 'home') {
        if (!search) { updateSearchResultCount(database.length, database.length); showHomeScreen(); return; }
        hideHomeScreen();
    }

    let filtered = database;
    if (currentCategory === 'fav') { filtered = filtered.filter(i => isFav(i.title)); }
    else if (currentCategory !== 'all' && currentCategory !== 'home') { filtered = filtered.filter(i => i.category === currentCategory); }

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
    updateSearchResultCount(filtered.length, database.length);
    renderCards(filtered);
}

function showCardDetail(title, text) {
    if (title && typeof title === 'object') {
        const c = title;
        const t = c.title || c.name || 'Detay';
        const body = (c.text || c.desc || '').toString();
        const script = (c.script || '').toString();
        const alertTxt = (c.alert || '').toString();
        const link = (c.link || '').toString();
        const html = `
          <div style="text-align:left; font-size:1rem; line-height:1.6; white-space:pre-line;">
            ${escapeHtml(body).replace(/\n/g, '<br>')}
            ${link ? `<div style="margin-top:12px"><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer" style="font-weight:800;color:var(--info);text-decoration:none"><i class=\"fas fa-link\"></i> Link</a></div>` : ''}
            ${script ? `<div class="tech-script-box" style="margin-top:12px"><span class="tech-script-label">Müşteriye iletilecek:</span>${escapeHtml(script).replace(/\n/g, '<br>')}</div>` : ''}
            ${alertTxt ? `<div class="tech-alert" style="margin-top:12px">${escapeHtml(alertTxt).replace(/\n/g, '<br>')}</div>` : ''}
          </div>`;
        Swal.fire({ title: t, html, showCloseButton: true, showConfirmButton: false, width: '820px', background: '#f8f9fa' });
        return;
    }
    const safeText = (text ?? '').toString();
    Swal.fire({
        title: title,
        html: `<div style="text-align:left; font-size:1rem; line-height:1.6;">${escapeHtml(safeText).replace(/\n/g, '<br>')}</div>`,
        showCloseButton: true, showConfirmButton: false, width: '600px', background: '#f8f9fa'
    });
}

function showCardDetailByIndex(index) {
    const item = activeCards[index];
    if (!item) return;
    const t = item.title || 'Detay';
    const body = (item.text || '').toString();
    const script = (item.script || '').toString();
    const link = (item.link || '').toString();
    const img = (item.image || '').toString();
    const processedImg = processImageUrl(img);

    const html = `
      <div style="text-align:left; font-size:1rem; line-height:1.6; white-space:pre-line;">
        ${img ? `<div style="margin-bottom:15px;text-align:center;"><img src="${escapeHtml(processedImg)}" onerror="this.style.display='none'" style="max-width:100%;border-radius:8px;"></div>` : ''}
        ${escapeHtml(body).replace(/\n/g, '<br>')}
        ${link ? `<div style="margin-top:12px"><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer" style="font-weight:800;color:var(--info);text-decoration:none"><i class="fas fa-link"></i> Link</a></div>` : ''}
        ${script ? `<div class="tech-script-box" style="margin-top:12px"><span class="tech-script-label">Müşteriye iletilecek:</span>${escapeHtml(script).replace(/\n/g, '<br>')}</div>` : ''}
      </div>`;
    Swal.fire({ title: t, html, showCloseButton: true, showConfirmButton: false, width: '820px', background: '#f8f9fa' });
}

function openCardDetail(cardId) {
    const card = (database || []).find(x => String(x.id) === String(cardId));
    if (!card) { Swal.fire('Hata', 'Kart bulunamadı.', 'error'); return; }
    showCardDetail(card);
}

function showHomeScreen() {
    const home = document.getElementById('home-screen');
    const grid = document.getElementById('cardGrid');
    const empty = document.getElementById('emptyMessage');
    if (home) home.style.display = 'block';
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'none';
    renderHomePanels();
}

function hideHomeScreen() {
    const home = document.getElementById('home-screen');
    if (home) home.style.display = 'none';
    const grid = document.getElementById('cardGrid');
    if (grid) grid.style.display = 'grid';
}

function setActiveFilterButton(btn) {
    try {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    } catch (e) { }
}

function renderHomePanels() {
    const todayEl = document.getElementById('home-today');
    if (todayEl) {
        todayEl.innerHTML = '<div class="home-mini-item">Yayın akışı yükleniyor...</div>';
        (async () => {
            try {
                const items = await fetchBroadcastFlow();
                const d = new Date();
                const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                const toISO = (val) => {
                    const s = String(val || '').trim();
                    if (!s) return '';
                    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
                    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
                    return '';
                };

                const todays = (items || []).filter(it => {
                    const iso = toISO(it.dateISO || it.date);
                    if (iso !== todayISO) return false;
                    const now = Date.now();
                    const se = Number(it.startEpoch || 0);
                    if (se) return se > now;
                    const t = String(it.time || '').trim();
                    const m = t.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
                    if (!m) return true;
                    const hh = parseInt(m[1], 10), mm = parseInt(m[2], 10), ss = parseInt(m[3] || '0', 10);
                    const dt = new Date();
                    dt.setHours(hh, mm, ss, 0);
                    return dt.getTime() > now;
                });

                if (!todays.length) {
                    todayEl.innerHTML = '<div class="home-mini-item">Bugün için yayın akışı kaydı bulunamadı.</div>';
                } else {
                    const shown = todays.slice(0, 4);
                    todayEl.innerHTML = shown.map(it => {
                        return `
                          <div class="home-mini-item">
                            <div class="home-mini-date">${escapeHtml(it.time || '')}${it.league ? ` • ${escapeHtml(it.league)}` : ''}${it.channel ? ` • ${escapeHtml(it.channel)}` : ''}</div>
                            <div class="home-mini-title">${escapeHtml(it.match || it.title || it.event || 'Maç')}</div>
                            ${it.spiker ? `<div class="home-mini-desc" style="margin-top:4px;color:#555">🎙 ${escapeHtml(it.spiker)}</div>` : ''}
                          </div>`;
                    }).join('') + (todays.length > shown.length ? `<div style="color:#666;font-size:.9rem;margin-top:6px">+${todays.length - shown.length} maç daha…</div>` : '');
                }
                const card = todayEl.closest('.home-card');
                if (card) { card.classList.add('clickable'); card.onclick = () => openBroadcastFlow(); }
            } catch (e) { todayEl.innerHTML = '<div class="home-mini-item">Yayın akışı alınamadı.</div>'; }
        })();
    }

    const annEl = document.getElementById('home-ann');
    if (annEl) {
        const latest = (newsData || []).slice(0, 3);
        if (latest.length === 0) { annEl.innerHTML = '<div class="home-mini-item">Henüz duyuru yok.</div>'; }
        else {
            annEl.innerHTML = latest.map(n => `
                <div class="home-mini-item">
                  <div class="home-mini-date">${escapeHtml(n.date || '')}</div>
                  <div class="home-mini-title">${escapeHtml(n.title || '')}</div>
                  <div class="home-mini-desc" style="white-space: pre-line">${escapeHtml(String(n.desc || '')).slice(0, 160)}${(n.desc || '').length > 160 ? '...' : ''}</div>
                </div>`).join('');
        }
        const card = annEl.closest('.home-card');
        if (card) { card.classList.add('clickable'); card.onclick = () => openNews(); }
    }

    const quoteEl = document.getElementById('home-quote');
    if (quoteEl) {
        const q = String((homeBlocks && homeBlocks.quote && homeBlocks.quote.content) ? homeBlocks.quote.content : (localStorage.getItem('homeQuote') || '')).trim();
        quoteEl.innerHTML = q ? escapeHtml(q) : '<span style="color:#999">Bugün için bir söz eklenmemiş.</span>';
    }

    try {
        const b3 = document.getElementById('home-edit-quote');
        if (b3) b3.style.display = (isAdminMode && isEditingActive ? 'inline-flex' : 'none');
    } catch (e) { }
}

function editHomeBlock(kind) {
    if (!isAdminMode || !isEditingActive) return;
    if (kind !== 'quote') { Swal.fire("Bilgi", "Bu alan artık otomatik güncelleniyor.", "info"); return; }
    const cur = String((homeBlocks && homeBlocks.quote && homeBlocks.quote.content) ? homeBlocks.quote.content : (localStorage.getItem('homeQuote') || '')).trim();
    Swal.fire({
        title: "Günün Sözü", input: "textarea", inputValue: cur, inputPlaceholder: "Bugünün sözünü yaz…", showCancelButton: true, confirmButtonText: "Kaydet", cancelButtonText: "Vazgeç",
        preConfirm: (val) => (val || '').trim()
    }).then(res => {
        if (!res.isConfirmed) return;
        const val = res.value || '';
        apiCall('updateHomeBlock', { key: 'quote', title: 'Günün Sözü', content: val, visibleGroups: '' })
            .then(() => {
                homeBlocks = homeBlocks || {};
                homeBlocks.quote = { key: 'quote', title: 'Günün Sözü', content: val, visibleGroups: '' };
                try { localStorage.setItem('homeBlocksCache', JSON.stringify(homeBlocks || {})); } catch (e) { }
                renderHomePanels();
                Swal.fire("Kaydedildi", "Günün sözü güncellendi.", "success");
            })
            .catch(() => { renderHomePanels(); Swal.fire("Kaydedildi", "Günün sözü güncellendi (yerel).", "success"); });
    });
}

function toggleEditMode() {
    if (!isAdminMode) return;
    isEditingActive = !isEditingActive;
    document.body.classList.toggle('editing', isEditingActive);
    const btn = document.getElementById('dropdownQuickEdit');
    if (isEditingActive) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-times" style="color:var(--accent);"></i> Düzenlemeyi Kapat';
        Swal.fire({ icon: 'success', title: 'Düzenleme Modu AÇIK', text: 'Kalem ikonlarına tıklayarak içerikleri düzenleyebilirsiniz.', timer: 1500, showConfirmButton: false });
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-pen" style="color:var(--secondary);"></i> Düzenlemeyi Aç';
    }
    filterContent();
    try { if (currentCategory === 'home') renderHomePanels(); } catch (e) { }
    if (document.getElementById('guide-modal').style.display === 'flex') openGuide();
    if (document.getElementById('sales-modal').style.display === 'flex') openSales();
    if (document.getElementById('news-modal').style.display === 'flex') openNews();
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function startTicker() {
    const ticker = document.getElementById('ticker-text');
    if (!ticker) return;
    const activeNews = newsData.filter(n => n.status === 'Aktif');
    if (activeNews.length === 0) { ticker.innerHTML = '<span>Duyuru yok. Bilgi Merkezi Yayında!</span>'; return; }
    ticker.innerHTML = activeNews.map(n => `<span onclick="openNews()"><i class="fas fa-bullhorn"></i> ${n.title}</span>`).join('');
}

function openNews() {
    document.getElementById('news-modal').style.display = 'flex';
    const grid = document.getElementById('news-container');
    grid.innerHTML = '';
    newsData.filter(n => isAdminMode || n.status === 'Aktif').forEach((n, index) => {
        let typeClass = n.type === 'update' ? 'update' : n.type === 'fix' ? 'fix' : 'info';
        let statusBadge = (isAdminMode && n.status === 'Pasif') ? '<span style="color:red;font-weight:bold;"> [PASİF]</span>' : '';
        let editBtn = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" style="top:5px; right:5px;" onclick="editNews(${index})"></i>` : '';
        grid.innerHTML += `<div class="news-item ${typeClass}">${editBtn}<div class="news-title">${n.title}${statusBadge}</div><div class="news-date">${n.date}</div><div class="news-desc" style="white-space: pre-line">${n.desc}</div></div>`;
    });
}

async function fetchBroadcastFlow() {
    try {
        const data = await apiCall("fetchBroadcastFlow");
        return data.items || [];
    } catch (e) { return []; }
}

async function openBroadcastFlow() {
    Swal.fire({ title: "Yayın Akışı", didOpen: () => Swal.showLoading(), showConfirmButton: false });
    try {
        const itemsRaw = await fetchBroadcastFlow();
        if (!itemsRaw || !itemsRaw.length) { Swal.fire("Yayın Akışı", "Kayıt bulunamadı.", "info"); return; }
        const items = [...itemsRaw].sort((a, b) => {
            const ae = Number(a?.startEpoch || 0);
            const be = Number(b?.startEpoch || 0);
            if (ae && be) return ae - be;
            const ak = String(a?.dateISO || a?.date || "") + " " + String(a?.time || "");
            const bk = String(b?.dateISO || b?.date || "") + " " + String(b?.time || "");
            return ak.localeCompare(bk);
        });
        const now = Date.now();
        const byDate = {};
        const dateLabelByKey = {};
        items.forEach(it => {
            const key = String(it?.dateISO || it?.date || "Tarih Yok");
            if (!byDate[key]) byDate[key] = [];
            byDate[key].push(it);
            if (!dateLabelByKey[key]) dateLabelByKey[key] = String(it?.dateLabelTr || "");
        });

        const css = `<style>.ba-wrap{ text-align:left; max-height:62vh; overflow:auto; padding-right:6px; }.ba-day{ margin:14px 0 8px; font-weight:900; color:#0e1b42; display:flex; align-items:center; gap:10px; }.ba-section{ margin:16px 0 8px; font-weight:900; color:#0e1b42; font-size:1rem; }.ba-divider{ margin:14px 0; height:1px; background:#e9e9e9; }.ba-empty{ padding:10px 12px; border:1px dashed #ddd; border-radius:12px; background:#fafafa; color:#666; margin:10px 0; font-weight:700; }.ba-badge{ font-size:.75rem; padding:4px 8px; border-radius:999px; border:1px solid #e9e9e9; background:#f8f8f8; color:#444; }.ba-grid{ display:grid; gap:8px; }.ba-row{ border:1px solid #eee; border-left:4px solid var(--secondary); border-radius:12px; padding:10px 12px; background:#fff; }.ba-row.past{ border-left-color:#d9534f; background:#fff5f5; }.ba-top{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }.ba-title{ font-weight:900; color:#222; line-height:1.25; }.ba-time{ font-weight:900; color:#0e1b42; white-space:nowrap; }.ba-sub{ margin-top:6px; font-size:.86rem; color:#666; display:flex; gap:14px; flex-wrap:wrap; }.ba-legend{ display:flex; gap:10px; flex-wrap:wrap; margin:6px 0 10px; }.ba-dot{ display:inline-flex; align-items:center; gap:6px; font-size:.8rem; color:#444; }.ba-dot i{ width:10px; height:10px; border-radius:50%; display:inline-block; }.ba-dot .up{ background:var(--secondary); }.ba-dot .pa{ background:#d9534f; }</style>`;
        let html = `${css}<div class="ba-wrap"><div class="ba-legend"><span class="ba-dot"><i class="up"></i> Yaklaşan / Gelecek</span><span class="ba-dot"><i class="pa"></i> Tarihi Geçmiş</span></div>`;

        const upcomingByDate = {}; const pastByDate = {};
        const dateKeys = Object.keys(byDate);
        dateKeys.forEach(key => {
            byDate[key].forEach(it => {
                const isPast = Number(it?.startEpoch || 0) ? (Number(it.startEpoch) < now) : false;
                const bucket = isPast ? pastByDate : upcomingByDate;
                if (!bucket[key]) bucket[key] = [];
                bucket[key].push(it);
            });
        });

        const renderSection = (title, bucket, emptyText) => {
            const keys = dateKeys.filter(k => (bucket[k] && bucket[k].length));
            if (!keys.length) { html += `<div class="ba-empty">${escapeHtml(emptyText)}</div>`; return; }
            html += `<div class="ba-section">${escapeHtml(title)}</div>`;
            keys.forEach(key => {
                html += `<div class="ba-day">${escapeHtml(dateLabelByKey[key] || key)}</div><div class="ba-grid">`;
                bucket[key].forEach(it => {
                    const isPast = Number(it?.startEpoch || 0) ? (Number(it.startEpoch) < now) : false;
                    html += `<div class="ba-row ${isPast ? "past" : ""}"><div class="ba-top"><div class="ba-title">${escapeHtml(it.event || it.match || it.title || "-")}</div><div class="ba-time">${escapeHtml(it.time || "")}</div></div><div class="ba-sub"><span><i class="fas fa-microphone"></i> ${escapeHtml(it.announcer || it.spiker || "-")}</span></div></div>`;
                });
                html += `</div>`;
            });
        };

        renderSection("Yaklaşan / Gelecek", upcomingByDate, "Yaklaşan yayın bulunamadı.");
        html += `<div class="ba-divider"></div>`;
        renderSection("Geçmiş", pastByDate, "Geçmiş yayın bulunamadı.");
        html += `</div>`;

        Swal.fire({ title: "Yayın Akışı", html, width: 980, confirmButtonText: "Kapat" });
    } catch (err) { Swal.fire("Hata", err?.message || "Yayın akışı alınamadı.", "error"); }
}

function _formatBroadcastDateTr(it) {
    const iso = it.dateISO || it.date;
    if (!iso) return "-";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" });
    } catch (e) { return iso; }
}

function openGuide() {
    document.getElementById('guide-modal').style.display = 'flex';
    const grid = document.getElementById('guide-grid');
    grid.innerHTML = '';
    sportsData.forEach((s, index) => {
        let pronHtml = s.pronunciation ? `<div class="pronunciation-badge"> 🗣️  ${s.pronunciation}</div>` : '';
        let editBtn = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" style="top:5px; right:5px; z-index:50;" onclick="event.stopPropagation(); editSport('${escapeForJsString(s.title)}')"></i>` : '';
        grid.innerHTML += `<div class="guide-item" onclick="showSportDetail(${index})">${editBtn}<i class="fas ${s.icon} guide-icon"></i><span class="guide-title">${s.title}</span>${pronHtml}<div class="guide-desc" style="white-space: pre-line">${s.desc}</div><div class="guide-tip"><i class="fas fa-lightbulb"></i> ${s.tip}</div><div style="font-size:0.8rem; color:#999; margin-top:5px;">(Detay için tıkla)</div></div>`;
    });
}

function showSportDetail(index) {
    const sport = sportsData[index];
    const detailText = sport.detail ? sport.detail.replace(/\n/g, '<br>') : "Bu içerik için henüz detay eklenmemiş.";
    const pronDetail = sport.pronunciation ? `<div style="color:#e65100; font-weight:bold; margin-bottom:15px;"> 🗣️  Okunuşu: ${sport.pronunciation}</div>` : '';
    Swal.fire({
        title: `<i class="fas ${sport.icon}" style="color:#0e1b42;"></i> ${sport.title}`,
        html: `${pronDetail}<div style="text-align:left; font-size:1rem; line-height:1.6;">${detailText}</div>`,
        showCloseButton: true, showConfirmButton: false, width: '600px', background: '#f8f9fa'
    });
}

function openSales() {
    document.getElementById('sales-modal').style.display = 'flex';
    const grid = document.getElementById('sales-grid');
    grid.innerHTML = '';
    salesScripts.forEach((s, index) => {
        let editBtn = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" style="top:5px; right:5px;" onclick="editSales('${escapeForJsString(s.title)}')"></i>` : '';
        grid.innerHTML += `<div class="sales-item" onclick="toggleSales(${index})">${editBtn}<div class="sales-title">${s.title}</div><div id="sales-detail-${index}" class="sales-detail">${s.text}</div></div>`;
    });
}

function toggleSales(index) {
    const detail = document.getElementById(`sales-detail-${index}`);
    if (detail.style.display === 'block') { detail.style.display = 'none'; } else { detail.style.display = 'block'; }
}

function getFavs() { try { return JSON.parse(localStorage.getItem("sSportFavs") || "[]"); } catch (e) { return []; } }
function toggleFavorite(title) {
    let favs = getFavs();
    if (favs.includes(title)) { favs = favs.filter(f => f !== title); } else { favs.push(title); }
    try { localStorage.setItem("sSportFavs", JSON.stringify(favs)); } catch (e) { }
    filterContent();
    if (document.getElementById('guide-modal').style.display === 'flex') openGuide();
}
function isFav(title) { return getFavs().includes(title); }

function setHomeWelcomeUser(userName) {
    const el = document.getElementById('home-welcome-user');
    if (!el) return;
    const hour = new Date().getHours();
    let msg = "Merhabalar";
    if (hour >= 6 && hour < 12) msg = "Günaydın";
    else if (hour >= 12 && hour < 18) msg = "İyi Günler";
    else if (hour >= 18 && hour < 24) msg = "İyi Akşamlar";
    else msg = "İyi Geceler";
    el.innerHTML = `${msg}, <span style="color:var(--secondary)">${userName}</span>`;
}
