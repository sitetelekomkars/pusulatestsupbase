

function formatWeekLabel(raw) {
    try {
        if (!raw) return '';
        const s = String(raw);
        const parts = s.split('-');
        if (parts.length >= 2) {
            const startStr = parts[0].trim();
            const endStr = parts[1].trim();
            const d1 = new Date(startStr);
            const d2 = new Date(endStr);
            if (!isNaN(d1) && !isNaN(d2)) {
                const sameMonth = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
                if (sameMonth) {
                    const day1 = d1.toLocaleDateString('tr-TR', { day: '2-digit' });
                    const day2 = d2.toLocaleDateString('tr-TR', { day: '2-digit' });
                    const monthYear = d1.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                    return `${day1} - ${day2} ${monthYear}`;
                } else {
                    const full1 = d1.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
                    const full2 = d2.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
                    return `${full1} - ${full2}`;
                }
            }
        }
    } catch (e) { }
    return raw || '';
}

function formatShiftDate(d) {
    try {
        const dt = new Date(d);
        if (!isNaN(dt)) {
            return dt.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        }
    } catch (e) { }
    return d;
}

const BAKIM_MODU = false;

function showGlobalError(message) {
    // Kullanıcılara kırmızı bant gösterme (istek: ekran temiz kalsın)
    // Sadece konsola yaz ve (locadmin/admin ise) küçük bir toast göster.
    try { console.warn("[Pusula]", message); } catch (e) { }
    try {
        const role = localStorage.getItem("sSportRole") || "";
        if (role === "admin" || role === "locadmin") {
            Swal.fire({ toast: true, position: 'bottom-end', icon: 'warning', title: String(message || 'Uyarı'), showConfirmButton: false, timer: 2500 });
        }
    } catch (e) { }
}

// Base64 to Blob helper
function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    try {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    } catch (e) {
        console.error("b64toBlob error:", e);
        return null;
    }
}

// --- SUPABASE BAĞLANTISI ---
const SUPABASE_URL = "https://psauvjohywldldgppmxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_ITFx76ndmOc3UJkNbHOSlQ_kD91kq45";
const sb = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// ✅ YENİ: Mail Bildirim Ayarları (Google Apps Script Web App URL buraya gelecek)
const GAS_MAIL_URL = "https://script.google.com/macros/s/AKfycbwZZbRVksffgpu_WvkgCoZehIBVTTTm5j5SEqffwheCU44Q_4d9b64kSmf40wL1SR8/exec"; // Burayı kendi Web App URL'niz ile güncelleyin

async function sendMailNotification(to, subject, body, cc = null, bcc = null) {
    if (!GAS_MAIL_URL || GAS_MAIL_URL.includes("X0X0")) {
        console.warn("[Pusula Mail] Mail servisi URL'si ayarlanmamış.");
        return;
    }
    try {
        const payload = { action: "sendEmail", to, subject, body };
        if (cc) payload.cc = cc;
        if (bcc) payload.bcc = bcc;

        await fetch(GAS_MAIL_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("[Pusula Mail] Gönderim tetiklendi:", to);
    } catch (e) { console.error("[Pusula Mail] Hata:", e); }
}

async function saveLog(action, details) {
    if (!sb) return;
    try {
        await sb.from('Logs').insert([{
            Username: currentUser || localStorage.getItem("sSportUser") || '-',
            Action: action,
            Details: details,
            "İP ADRESİ": globalUserIP || '-',
            Date: new Date().toISOString()
        }]);
    } catch (e) { console.error("[Pusula Log] Hata:", e); }
}

// ⚠️ KRİTİK FIX: Supabase PascalCase/Türkçe → Frontend camelCase dönüşümü
function normalizeKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(normalizeKeys);

    const n = {};
    Object.keys(obj).forEach(k => {
        // Orijinal key'i koru
        n[k] = obj[k];

        // Lowercase versiyonu her zaman ekle
        const lower = k.toLowerCase().replace(/\s+/g, '');
        n[lower] = obj[k];

        // --- ÖZEL MAPPINGLER (Ekran görüntülerinden analiz edildi) ---

        // Personel / Kullanıcı
        if (k === 'AgentName' || k === 'Username' || k === 'Temsilci' || k === 'Name' || k === 'İsim') {
            n.agent = obj[k]; n.agentName = obj[k]; n.username = obj[k]; n.temsilci = obj[k]; n.name = obj[k];
        }

        // Çağrı / Değerlendirme Bilgileri
        if (k === 'CallID' || k === 'CallId' || k === 'Call_ID') n.callId = obj[k];
        if (k === 'CallDate') n.callDate = formatDateToDDMMYYYY(obj[k]);
        if (k === 'Date') n.date = formatDateToDDMMYYYY(obj[k]);
        if (k === 'Tarih') {
            const formatted = formatDateToDDMMYYYY(obj[k]);
            if (!n.callDate) n.callDate = formatted;
            if (!n.date) n.date = formatted;
        }
        if (k === 'Score' || k === 'Puan' || k === 'Points') { n.score = obj[k]; n.points = obj[k]; }
        if (k === 'Orta Puan' || k === 'MediumScore') n.mediumScore = obj[k];
        if (k === 'Kötü Puan' || k === 'BadScore') n.badScore = obj[k];
        if (k === 'Okundu') n.isSeen = (obj[k] === 1 || obj[k] === true);
        if (k === 'Durum' || k === 'Status') n.status = obj[k];
        if (k === 'FeedbackType') n.feedbackType = obj[k];

        // İçerik / Başlık / Metin
        if (k === 'Başlık' || k === 'Teklif Adı' || k === 'Title') {
            n.title = obj[k]; n.head = obj[k];
        }
        if (k === 'Key') { n.key = obj[k]; }
        if (k === 'BlockId' || k === 'blockId') { n.blockId = obj[k]; }
        if (k === 'İçerik' || k === 'Açıklama' || k === 'Description' || k === 'Metin' || k === 'Soru_Metinleri' || k === 'Soru' || k === 'Text' || k === 'Content') {
            n.content = obj[k]; n.text = obj[k]; n.description = obj[k]; n.questions = obj[k];
        }
        if (k === 'Script' || k === 'Senaryo') { n.script = obj[k]; }
        if (k === 'Kategori' || k === 'Segment' || k === 'TargetGroup' || k === 'Konu' || k === 'VisibleGroups') {
            n.category = obj[k]; n.segment = obj[k]; n.group = obj[k]; n.subject = obj[k]; n.visibleGroups = obj[k];
        }
        if (k === 'Görsel' || k === 'Image' || k === 'Link') { n.image = obj[k]; n.link = obj[k]; }

        // Trainings (Eğitimler)
        if (k === 'ContentLink') { n.link = obj[k]; }
        if (k === 'DocLink') { n.docLink = obj[k]; }
        if (k === 'TargetUser') { n.targetUser = obj[k]; }
        if (k === 'TargetGroup') { n.target = obj[k]; }
        if (k === 'CreatedBy') { n.creator = obj[k]; }
        if (k === 'StartDate') { n.startDate = obj[k]; }
        if (k === 'EndDate') { n.endDate = obj[k]; }
        if (k === 'Duration') { n.duration = obj[k]; }

        // Yayın Akışı (Special table keys)
        // Yayın Akışı – normalize edilmiş anahtarlar
        const kk = String(k || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();

        // DATE
        if (kk === 'DATE' || kk === 'TARİH' || kk === 'TARIH') {
            if (!n.date) n.date = obj[k]; // Zaten formatlanmışsa ezme
            n.dateISO = obj[k];
        }

        // EVENT / MATCH
        if (
            kk === 'EVENT NAME - TURKISH' ||
            kk === 'MAC' ||
            kk === 'EVENT' ||
            kk === 'TITLE' ||
            kk === 'BAŞLIK' ||
            kk === 'BASLIK'
        ) {
            n.match = obj[k];
            n.event = obj[k];
        }

        // TIME / START TIME / TSİ
        if (
            kk === 'SAAT' ||
            kk === 'TIME' ||
            kk === 'START_TIME_TSI' ||
            kk === 'START TIME TSI' ||
            (kk.includes('START') && kk.includes('TIME'))
        ) {
            n.time = obj[k];
        }

        // ANNOUNCER / PLATFORM
        if (
            kk === 'ANNOUNCER' ||
            kk === 'KANAL' ||
            kk === 'PLATFORM'
        ) {
            n.channel = obj[k];
            n.announcer = obj[k];
        }

        // StartEpoch hesaplama (Yayın Akışı için)
        const dVal = n.date || n.dateISO;
        const tVal = n.time;

        if (dVal && tVal) {
            try {
                const datePart = String(dVal).includes('.')
                    ? String(dVal).split('.').reverse().join('-')
                    : String(dVal).split(' ')[0];

                const timePart = String(tVal).trim().length === 5
                    ? `${String(tVal).trim()}:00`
                    : String(tVal).trim();

                const isoStr = `${datePart}T${timePart}`;
                const dt = new Date(isoStr);

                if (!isNaN(dt.getTime())) {
                    n.startEpoch = dt.getTime();
                }
            } catch (e) { }
        }


        // Notlar / Detaylar
        if (k === 'Details' || k === 'Detay') n.details = obj[k];
        if (k === 'Feedback' || k === 'Geri Bildirim') n.feedback = obj[k];
        if (k === 'Temsilci Notu' || k === 'AgentNote') n.agentNote = obj[k];
        if (k === 'Yönetici Cevabı' || k === 'ManagerReply') n.managerReply = obj[k];

        // --- SİHİRBAZLAR (Wizard / TechWizard) ---
        if (k === 'StepID' || k === 'StepId' || k === 'AdımID') n.stepId = obj[k];
        if (k.toLowerCase().includes('option') || k.toLowerCase().includes('button') || k === 'Seçenekler' || k === 'Butonlar') {
            if (!n.options || String(obj[k]).includes('|')) n.options = obj[k];
        }
        if (k === 'Alert' || k === 'Uyarı') n.alert = obj[k];
        if (k === 'Result' || k === 'Sonuç') n.result = obj[k];

        // Quiz / Game Results
        if (k === 'SuccessRate' || k === 'Başarı') n.average = obj[k];
        if (k === 'TotalQuestions') n.total = obj[k];
    });
    return n;
}

async function apiCall(action, params = {}) {
    console.log(`[Pusula] apiCall: ${action}`, params);
    try {
        switch (action) {
            case "getRolePermissions": {
                const { data, error } = await sb.from('RolePermissions').select('*');
                if (error) throw error;
                const perms = (data || []).map(normalizeKeys);
                const groups = [...new Set(perms.map(p => p.role || p.Role).filter(Boolean))];
                return { result: "success", permissions: perms, groups: groups };
            }
            case "setRolePermissions": {
                const { role, perms } = params;
                // Önce bu role ait eski yetkileri temizle (veya direkt upsert kullan)
                // Daha verimli olması için her resource bazında tek tek upsert:
                for (const p of perms) {
                    await sb.from('RolePermissions').upsert({
                        Role: role,
                        Resource: p.resource || p.Resource,
                        Permission: p.permission || p.Permission,
                        Value: (typeof p.value !== 'undefined') ? p.value : p.Value
                    }, { onConflict: 'Role,Resource,Permission' });
                }
                saveLog("Yetki Güncelleme", `${role} rolü için yetkiler güncellendi.`);
                return { result: "success" };
            }
            case "fetchEvaluations": {
                let query = sb.from('Evaluations').select('*');
                if (params.targetAgent && params.targetAgent !== 'all') {
                    query = query.eq('AgentName', params.targetAgent);
                } else if (params.targetGroup && params.targetGroup !== 'all') {
                    // ✅ GRUP FİLTRESİ (Bug 4 & 10 Fix: Case-insensitive match)
                    query = query.ilike('Group', params.targetGroup);
                }
                // En yeni kayıtlar her zaman en üstte gelsin (ID descending)
                const { data, error } = await query.order('id', { ascending: false });
                if (error) throw error;
                return { result: "success", evaluations: data.map(normalizeKeys) };
            }
            case "logEvaluation": {
                const { data, error } = await sb.from('Evaluations').insert([{
                    AgentName: params.agentName,
                    Evaluator: currentUser,
                    CallID: params.callId,
                    CallDate: params.callDate,
                    Score: params.score,
                    Details: params.details,
                    Feedback: params.feedback,
                    FeedbackType: params.feedbackType,
                    Group: params.agentGroup,
                    Date: new Date().toISOString(),
                    Okundu: 0,
                    Durum: params.status || 'Tamamlandı'
                }]).select('id').single();
                if (error) throw error;

                saveLog("Değerlendirme Kaydı", `${params.agentName} | ${params.callId} | ${params.score}`);

                // ✅ MAİL BİLDİRİMİ TETİKLE
                (async () => {
                    try {
                        const { data: userData } = await sb.from('Users').select('Email').ilike('Username', params.agentName).maybeSingle();
                        if (userData && userData.Email) {
                            const subject = `Yeni Kalite Değerlendirmesi: ${params.callId}`;
                            const body = `Merhaba ${params.agentName},\n\nYeni bir kalite değerlendirmesi kaydedildi.\n\nÇağrı ID: ${params.callId}\nPuan: ${params.score}\nGeri Bildirim: ${params.feedback}\n\nDetayları Pusula üzerinden inceleyebilirsin.\nİyi çalışmalar.\nS Sport Plus Kalite Ekibi`;

                            // Kalite değerlendirmeleri için CC ve BCC ekle
                            const cc = "kalite@ssportplus.com";
                            const bcc = "dogus.yalcinkaya@sitetelekom.com.tr";

                            sendMailNotification(userData.Email, subject, body, cc, bcc);
                        }
                    } catch (e) { }
                })();

                return { result: "success" };
            }
            case "logCard": {
                // Sütun isimleri için robust mapping (Data tablosu)
                const payload = {
                    Type: params.type,
                    Category: params.category,
                    Title: params.title,
                    Text: params.text,
                    Script: params.script,
                    Code: params.code,
                    Status: params.status,
                    Link: params.link,
                    Tip: params.tip,
                    Detail: params.detail,
                    Pronunciation: params.pronunciation,
                    Icon: params.icon,
                    Date: params.date || new Date().toISOString(),
                    QuizOptions: params.quizOptions,
                    QuizAnswer: params.quizAnswer
                };
                const { error } = await sb.from('Data').insert([payload]);
                if (error) throw error;
                saveLog("Yeni Kart Ekleme", `${params.title} (${params.type})`);
                return { result: "success" };
            }
            case "addCard": return await apiCall("logCard", params);
            case "editCard": {
                const { error } = await sb.from('Data').update({
                    Category: params.category,
                    Title: params.title,
                    Text: params.text,
                    Script: params.script,
                    Code: params.code,
                    Link: params.link,
                    Image: params.image
                }).eq('id', params.id);
                if (error) throw error;
                saveLog("Kart Düzenleme", `${params.title} (ID: ${params.id})`);
                return { result: "success" };
            }
            case "deleteCard": {
                const { error } = await sb.from('Data').delete().eq('id', params.id);
                if (error) throw error;
                saveLog("Kart Silme", `ID: ${params.id}`);
                return { result: "success" };
            }
            case "saveUser": {
                const { id, username, fullName, role, group, password } = params;
                const payload = {
                    Username: username,
                    FullName: fullName,
                    Name: fullName,
                    "Tam İsim": fullName,
                    "İsim": fullName,
                    Role: role,
                    Group: group
                };
                if (password) {
                    const hashed = CryptoJS.SHA256(password).toString();
                    payload.Password = hashed;
                    payload.ForceChange = '1';
                }

                let res;
                if (id) {
                    res = await sb.from('Users').update(payload).eq('id', id);
                    if (res.error) throw res.error;
                    saveLog("Kullanıcı Güncelleme", `${username} (ID: ${id})`);
                } else {
                    res = await sb.from('Users').insert([payload]);
                    if (res.error) throw res.error;
                    saveLog("Yeni Kullanıcı Ekleme", `${username}`);
                }
                return { result: "success" };
            }
            case "deleteUser": {
                const { error } = await sb.from('Users').delete().eq('id', params.id);
                if (error) throw error;
                saveLog("Kullanıcı Silme", `ID: ${params.id}`);
                return { result: "success" };
            }
            case "exportEvaluations": {
                // Rapor için verileri çek ve formatla
                let query = sb.from('Evaluations').select('*');
                if (params.targetAgent !== 'all') query = query.ilike('AgentName', params.targetAgent);
                if (params.targetGroup !== 'all') query = query.ilike('Group', params.targetGroup);

                const { data, error } = await query.order('id', { ascending: false });
                if (error) throw error;

                const normalized = (data || []).map(normalizeKeys);
                const filtered = params.targetPeriod === 'all' ? normalized : normalized.filter(e => {
                    // Tarih formatı: "DD.MM.YYYY" veya ISO
                    const d = e.callDate || e.date;
                    if (!d) return false;

                    if (d.includes('.')) {
                        const p = d.split('.');
                        if (p.length >= 3) {
                            const mm = p[1];
                            const yyyy = p[2].split(' ')[0];
                            return `${mm}-${yyyy}` === params.targetPeriod;
                        }
                    } else if (d.includes('-')) {
                        const p = d.split('-');
                        if (p.length >= 2) {
                            const yyyy = p[0];
                            const mm = p[1];
                            return `${mm}-${yyyy}` === params.targetPeriod;
                        }
                    }
                    return false;
                });

                // --- DİNAMİK KIRILIM SÜTUNLARI (BUG FIX: Kırılım Kırılım Göster) ---
                let dynamicHeaders = [];
                let questionMap = new Set();

                // 1. Tüm benzersiz kriterleri (soruları) topla
                filtered.forEach(e => {
                    try {
                        const dObj = typeof e.details === 'string' ? JSON.parse(e.details) : e.details;
                        if (Array.isArray(dObj)) {
                            dObj.forEach(it => {
                                if (it.q) questionMap.add(it.q);
                            });
                        }
                    } catch (err) { }
                });

                const uniqueQuestions = Array.from(questionMap);
                uniqueQuestions.forEach(q => {
                    dynamicHeaders.push(q);
                    dynamicHeaders.push(`Not (${q})`);
                });

                // Zengin Rapor Formatı (Old System Style)
                const headers = [
                    "Log Tarihi", "Değerleyen", "Temsilci", "Grup", "Call ID",
                    "Puan", "Genel Geri Bildirim", "Durum", "Temsilci Notu",
                    "Yönetici Cevabı", "Çağrı Tarihi", ...dynamicHeaders
                ];

                const rows = filtered.map(e => {
                    let baseRow = [
                        e.date || '', // Log Tarihi (Zaten DD.MM.YYYY formatında)
                        e.evaluator || '',
                        e.agentName || e.agent || '',
                        e.group || '',
                        e.callId || '',
                        e.score || 0,
                        e.feedback || '',
                        e.status || e.durum || '',
                        e.agentNote || '',
                        e.managerReply || '',
                        e.callDate || ''
                    ];

                    // Kriter detaylarını ayıkla
                    let evalDetails = [];
                    try {
                        evalDetails = typeof e.details === 'string' ? JSON.parse(e.details) : (e.details || []);
                        if (!Array.isArray(evalDetails)) evalDetails = [];
                    } catch (err) { evalDetails = []; }

                    // Her bir benzersiz soru için puan ve not sütunlarını doldur
                    uniqueQuestions.forEach(q => {
                        const match = evalDetails.find(it => it.q === q);
                        if (match) {
                            baseRow.push(match.score);
                            baseRow.push(match.note || '');
                        } else {
                            baseRow.push('');
                            baseRow.push('');
                        }
                    });

                    return baseRow;
                });
                return { result: "success", headers, data: rows, fileName: `Evaluations_${params.targetPeriod}.xls` };
            }
            case "updateEvaluation": {
                const { error } = await sb.from('Evaluations').update({
                    CallDate: params.callDate,
                    Score: params.score,
                    Details: params.details,
                    Feedback: params.feedback,
                    Durum: params.status
                }).eq('CallID', params.callId);
                if (error) throw error;
                saveLog("Değerlendirme Güncelleme", `CallID: ${params.callId}`);
                return { result: "success" };
            }
            case "markEvaluationSeen": {
                const { error } = await sb.from('Evaluations').update({ Okundu: 1 }).eq('CallID', params.callId);
                if (error) throw error;
                saveLog("Değerlendirme Okundu İşaretleme", `CallID: ${params.callId}`);
                return { result: "success" };
            }
            case "getTrainings": {
                const username = localStorage.getItem("sSportUser") || "";
                const userGroup = localStorage.getItem("sSportGroup") || "";
                const asAdmin = !!params.asAdmin;

                const { data: tData, error: tErr } = await sb.from('Trainings').select('*').order('Date', { ascending: false });
                if (tErr) throw tErr;

                // Kullanıcı logları
                let completedSet = new Set();
                try {
                    const { data: lData, error: lErr } = await sb.from('Training_Logs').select('*').eq('Username', username);
                    if (!lErr && Array.isArray(lData)) {
                        lData.forEach(l => {
                            const st = String(l.Status || '').toLowerCase();
                            if (st === 'completed' || st === 'tamamlandi' || st === 'tamamlandı' || l.Status === 1 || l.Status === true) {
                                completedSet.add(String(l.TrainingID));
                            }
                        });
                    }
                } catch (e) { }

                const filtered = (tData || []).filter(t => {
                    if (asAdmin) return true;
                    const tg = String(t.TargetGroup || '').toLowerCase();
                    const tu = String(t.TargetUser || '').toLowerCase();
                    const st = String(t.Status || '').toLowerCase();
                    if (st && st !== 'aktif' && st !== 'active') return false;

                    if (!tg || tg === 'all' || tg === 'herkes') return true;
                    if (tg === 'group' || tg === 'grup') return String(userGroup || '').toLowerCase() === tu;
                    if (tg === 'individual' || tg === 'bireysel') return String(username || '').toLowerCase() === tu;
                    return String(userGroup || '').toLowerCase() === tg;
                });

                const trainings = filtered.map(t => {
                    const n = normalizeKeys(t);
                    n.title = n.title || t.Title || '';
                    n.desc = n.desc || t.Description || '';
                    n.link = n.link || t.ContentLink || '';
                    n.docLink = n.docLink || t.DocLink || '';
                    n.target = n.target || t.TargetGroup || 'All';
                    n.targetUser = n.targetUser || t.TargetUser || '';
                    n.creator = n.creator || t.CreatedBy || '';
                    n.startDate = n.startDate || t.StartDate || '';
                    n.endDate = n.endDate || t.EndDate || '';
                    n.duration = n.duration || t.Duration || '';
                    n.date = n.date || formatDateToDDMMYYYY(t.Date);

                    const idStr = String(t.id || t.ID || n.id || '');
                    n.isCompleted = completedSet.has(idStr);
                    return n;
                });

                return { result: "success", trainings };
            }
            case "startTraining": {
                const username = localStorage.getItem("sSportUser") || "";
                const trainingId = params.trainingId;

                // completed ise tekrar started yazma
                const { data: existing } = await sb.from('Training_Logs')
                    .select('*')
                    .eq('TrainingID', trainingId)
                    .eq('Username', username)
                    .maybeSingle();

                if (existing && String(existing.Status || '').toLowerCase() === 'completed') {
                    return { result: "success" };
                }

                const { error } = await sb.from('Training_Logs').upsert([{
                    TrainingID: trainingId,
                    Username: username,
                    Status: 'started',
                    Date: new Date().toISOString()
                }], { onConflict: 'TrainingID,Username' });

                if (error) throw error;
                saveLog("Eğitim Başlatma", `ID: ${params.trainingId}`);
                return { result: "success" };
            }
            case "completeTraining": {
                const username = localStorage.getItem("sSportUser") || "";
                const trainingId = params.trainingId;

                const { error } = await sb.from('Training_Logs').upsert([{
                    TrainingID: trainingId,
                    Username: username,
                    Status: 'completed',
                    Date: new Date().toISOString()
                }], { onConflict: 'TrainingID,Username' });

                if (error) throw error;
                saveLog("Eğitim Tamamlama", `ID: ${params.trainingId}`);
                return { result: "success" };
            }
            case "assignTraining": {
                const payload = {
                    Title: params.title || '',
                    Description: params.desc || '',
                    ContentLink: params.link || '',
                    DocLink: params.docLink || '',
                    TargetGroup: params.target || 'All',
                    TargetUser: params.targetAgent || '',
                    CreatedBy: params.creator || (localStorage.getItem("sSportUser") || ''),
                    StartDate: params.startDate || '',
                    EndDate: params.endDate || '',
                    Duration: params.duration || '',
                    Status: 'Aktif',
                    Date: new Date().toISOString()
                };
                const { error } = await sb.from('Trainings').insert([payload]);
                if (error) throw error;
                saveLog("Eğitim Atama", `${params.title} -> ${params.target}`);
                return { result: "success" };
            }
            case "getUserList": {
                const { data, error } = await sb.from('Users').select('*');
                if (error) return { result: "success", users: [] };
                const users = (data || []).map(normalizeKeys).filter(u => u.name || u.username);
                return { result: "success", users: users };
            }
            case "getCriteria": {
                let q = sb.from('Settings').select('*');
                if (params.group) q = q.eq('Grup', params.group);
                const { data, error } = await q.order('Sira', { ascending: true });
                if (error) throw error;

                const criteria = (data || []).map(normalizeKeys).filter(c => c.text);
                return { result: "success", criteria };
            }
            case "getShiftData": {
                // User screenshot shows table name is "Vardiya" and schema is horizontal (columns are dates)
                const { data, error } = await sb.from('Vardiya').select('*');
                if (error) throw error;

                if (!data || data.length === 0) return { result: "success", shifts: {} };

                // Sabit gün sütunları (yeni yapı)
                const dayHeaders = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

                const rows = data.map(r => ({
                    name: r.Temsilci || r.temsilci || r.Name || r.username || '-',
                    cells: dayHeaders.map(h => r[h] || '')
                }));

                // Mevcut kullanıcının satırını bul
                const myRow = rows.find(r =>
                    String(r.name).trim().toLowerCase() === String(currentUser).trim().toLowerCase()
                );

                return {
                    result: "success",
                    shifts: {
                        headers: dayHeaders,
                        rows: rows,
                        myRow: myRow,
                        weekLabel: 'Haftalık Vardiya Planı'
                    }
                };
            }
            case "submitShiftRequest": {
                const { error } = await sb.from('ShiftRequests').insert([{
                    username: currentUser,
                    ...params,
                    timestamp: new Date().toISOString()
                }]);
                if (error) throw error;
                saveLog("Vardiya Talebi Gönderme", `${currentUser} -> ${params.date} ${params.shift}`);
                return { result: "success" };
            }

            case "fetchFeedbackLogs": {
                const { data, error } = await sb.from('Feedback_Logs').select('*');
                if (error) throw error;
                return { result: "success", feedbackLogs: (data || []).map(normalizeKeys) };
            }
            case "getTelesalesOffers": {
                const { data, error } = await sb.from('Telesatis_DataTeklifleri').select('*');
                return { result: "success", data: (data || []).map(normalizeKeys) };
            }
            case "saveAllTelesalesOffers": {
                // Mevcut tüm teklifleri tek seferde değiştiren bir yapı
                await sb.from('Telesatis_DataTeklifleri').delete().neq('id', -1);
                // Database kolon isimlerine geri map et
                const dbOffers = (params.offers || []).map(o => ({
                    Segment: o.segment || '',
                    "Teklif Adı": o.title || '',
                    "Açıklama": o.desc || '',
                    Not: o.note || '',
                    Durum: o.status || 'Aktif',
                    Görsel: o.image || ''
                }));
                const { error } = await sb.from('Telesatis_DataTeklifleri').insert(dbOffers);
                saveLog("Telesatış Teklifleri Güncelleme", `${dbOffers.length} teklif kaydedildi.`);
                return { result: error ? "error" : "success" };
            }
            case "getTelesalesScripts": {
                const { data, error } = await sb.from('Telesatis_Scripts').select('*');
                return { result: "success", items: (data || []).map(normalizeKeys) };
            }
            case "saveTelesalesScripts": {
                // Scripts verisini Sheets'e veya varsa DB tablosuna kaydet
                // Burada Telesatis_Scripts tablosu kullanılıyor olabilir
                const { scripts } = params;
                // Mevcutları silip yenileri ekle (veya tek tek upsert)
                await sb.from('Telesatis_Scripts').delete().neq('id', -1);
                const { error } = await sb.from('Telesatis_Scripts').insert((scripts || []).map(s => ({
                    "Başlık": s.title || '',
                    "Metin": s.text || '',
                    UpdatedAt: new Date().toISOString(),
                    UpdatedBy: (localStorage.getItem("sSportUser") || '')
                })));
                saveLog("Telesatış Script Güncelleme", `${scripts.length} script kaydedildi.`);
                return { result: error ? "error" : "success" };
            }
            case "getTechDocs": {
                const { data, error } = await sb.from('Teknik_Dokumanlar').select('*');
                return { result: "success", data: (data || []).map(normalizeKeys) };
            }
            case "getTechDocCategories": {
                const { data, error } = await sb.from('Teknik_Dokumanlar').select('Kategori');
                const cats = [...new Set(data.filter(x => x.Kategori).map(x => x.Kategori))];
                return { result: "success", categories: cats };
            }
            case "upsertTechDoc": {
                // Teknik_Dokumanlar: Kategori, Başlık, İçerik, Görsel, Adım, Not, Link
                const { data: sampleData } = await sb.from('Teknik_Dokumanlar').select('*').limit(1);
                const dbCols = sampleData && sampleData[0] ? Object.keys(sampleData[0]) : [];

                const findCol = (choices) => {
                    for (let c of choices) {
                        const found = dbCols.find(x => x.toLowerCase() === c.toLowerCase());
                        if (found) return found;
                    }
                    return null;
                };

                const payload = {};
                const add = (choices, val) => {
                    const col = findCol(choices);
                    if (col) payload[col] = val;
                };

                if (params.id) add(['id', 'ID'], params.id);
                add(['Kategori', 'Category'], params.kategori);
                add(['Başlık', 'Baslik', 'Title'], params.baslik);
                add(['İçerik', 'Icerik', 'Content'], params.icerik);
                add(['Adım', 'Adim', 'Step'], params.adim || '');
                add(['Not', 'Note'], params.not || '');
                add(['Link'], params.link || '');
                add(['Görsel', 'Gorsel', 'Image', 'Resim'], params.image || null);
                add(['Durum', 'Status'], params.durum || 'Aktif');

                const { error } = await sb.from('Teknik_Dokumanlar').upsert(payload, { onConflict: findCol(['id', 'ID']) || 'id' });
                if (error) {
                    console.error("[Pusula] upsertTechDoc error:", error);
                    return { result: "error", message: error.message };
                }
                saveLog("Teknik Döküman Kayıt", `${params.baslik} (${params.kategori})`);
                return { result: "success" };
            }
            case "updateHomeBlock": {
                // Supabase'de kolon adı 'Key' (Görüntülerden teyit edildi)
                const { error } = await sb.from('HomeBlocks').upsert({
                    Key: params.key,
                    Title: params.title,
                    Content: params.content,
                    VisibleGroups: params.visibleGroups
                }, { onConflict: 'Key' });
                if (error) throw error;
                saveLog("Blok İçerik Güncelleme", `${params.key}`);
                return { result: error ? "error" : "success" };
            }
            case "updateDoc": {
                // Database kolon isimleri: Başlık, İçerik, Kategori, Görsel, Link
                const { error } = await sb.from('Teknik_Dokumanlar').update({
                    Başlık: params.title,
                    İçerik: params.content,
                    Kategori: params.category,
                    Görsel: params.image,
                    Link: params.link
                }).eq('id', params.id);
                return { result: error ? "error" : "success" };
            }
            case "getActiveUsers": {
                // Feature: Real-time Users (Heartbeat tabanlı)
                // Son 24 saat içinde sinyal vermiş kullanıcıları getir (Offline görünümü için)
                const heartbeatThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

                const { data: activeUsers, error: uErr } = await sb
                    .from('Users')
                    .select('Username, Role, Group, last_seen')
                    .gt('last_seen', heartbeatThreshold)
                    .order('last_seen', { ascending: false });

                if (uErr) {
                    console.error("Active Users Error:", uErr);
                    return { result: "error", message: uErr.message };
                }

                const users = (activeUsers || []).map(u => ({
                    username: u.Username,
                    role: u.Role,
                    group: u.Group,
                    last_seen: u.last_seen
                }));
                return { result: "success", users: users };
            }
            case "logAction": {
                // Bug 7 Fix: Sistem logları
                const { error } = await sb.from('Logs').insert([{
                    Username: params.username || currentUser,
                    Action: params.action,
                    Details: params.details,
                    "İP ADRESİ": params.ip || '-',
                    Date: new Date().toISOString()
                }]);
                return { result: error ? "error" : "success" };
            }
            case "submitAgentNote": {
                // Bug 6 Fix: Not ekleme (Görseldeki kolon isimlerine göre: "Temsilci Notu")
                const { error } = await sb.from('Evaluations').update({
                    "Temsilci Notu": params.note,
                    "Durum": params.status || 'Bekliyor'
                }).ilike('CallID', String(params.callId).replace('#', '').trim());

                if (error) console.error("[Pusula Note Error]", error);
                return { result: error ? "error" : "success", message: error ? error.message : "" };
            }
            case "logQuiz": {
                // Feature: Quiz Logging (QuizResults tablosu)
                const { error } = await sb.from('QuizResults').insert([{
                    Username: params.username,
                    Score: params.score,
                    TotalQuestions: params.total,
                    SuccessRate: params.successRate,
                    Date: new Date().toISOString()
                }]);
                if (error) console.error("[Pusula Quiz Error]", error);
                return { result: error ? "error" : "success" };
            }
            case "getLogs": {
                const { data, error } = await sb.from('Logs')
                    .select('*')
                    .order('Date', { ascending: false })
                    .limit(500);
                if (error) throw error;
                return { result: "success", logs: data };
            }
            case "resolveAgentFeedback": {
                const { error } = await sb.from('Evaluations').update({
                    "Yönetici Cevabı": params.reply,
                    "Durum": params.status || 'Tamamlandı'
                }).ilike('CallID', String(params.callId).replace('#', '').trim());
                return { result: error ? "error" : "success" };
            }
            case "getBroadcastFlow": {
                // ...existing...
                const { data, error } = await sb.from('YayinAkisi').select('*');
                if (error) {
                    console.warn("[Pusula] BroadcastFlow fetch error:", error);
                    return { result: "success", items: [] };
                }
                return { result: "success", items: (data || []).map(normalizeKeys) };
            }
            case "uploadImage":
            case "uploadTrainingDoc": {
                const { fileName, mimeType, base64 } = params;
                const blob = b64toBlob(base64, mimeType);
                if (!blob) throw new Error("Dosya işlenemedi (Base64 Hatası)");

                const folder = (action === 'uploadImage') ? 'images' : 'trainings';
                const filePath = `${folder}/${Date.now()}_${fileName}`;

                const { data, error } = await sb.storage.from('pusula').upload(filePath, blob, {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false
                });

                if (error) throw error;

                const { data: publicURL } = sb.storage.from('pusula').getPublicUrl(filePath);
                saveLog("Dosya Yükleme", `${fileName} (${folder})`);
                return { result: "success", url: publicURL.publicUrl };
            }
            case "deleteTechDoc": {
                const { error } = await sb.from('Teknik_Dokumanlar').delete().eq('id', params.id);
                if (error) {
                    console.error("[Pusula] deleteTechDoc error:", error);
                    return { result: "error", message: error.message };
                }
                saveLog("Teknik Döküman Silme", `ID: ${params.id}`);
                return { result: "success" };
            }
            default:
                console.warn(`[Pusula] Bilinmeyen apiCall action: ${action}`);
                return { result: "error", message: `Hizmet taşınıyor: ${action}` };
        }
    } catch (err) {
        console.error(`[Pusula] apiCall Error (${action}):`, err);
        return { result: "error", message: err.message };
    }
}

// SweetAlert2 yoksa minimal yedek (sessiz kırılma olmasın)
if (typeof Swal === "undefined") {
    window.Swal = {
        fire: (a, b, c) => { try { alert((a && a.title) || a || b || c || ""); } catch (e) { } },
    };
}



// Oyun Değişkenleri
let jokers = { call: 1, half: 1, double: 1 };
let doubleChanceUsed = false;
let firstAnswerIndex = -1;
const VALID_CATEGORIES = ['Teknik', 'İkna', 'Kampanya', 'Bilgi'];
const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
// --- GLOBAL DEĞİŞKENLER ---
let database = [], newsData = [], sportsData = [], salesScripts = [], quizQuestions = [], quickDecisionQuestions = [];

// Data load barrier (prevents Tech/Telesales first-render flicker)
let __dataLoadedResolve;
window.__dataLoadedPromise = new Promise(r => { __dataLoadedResolve = r; });
let techWizardData = {}; // Teknik Sihirbaz Verisi
let currentUser = "";
let globalUserIP = "";
let isAdminMode = false;
let isLocAdmin = false;
let isEditingActive = false;
let activeRole = "";
let allRolePermissions = [];
let adminUserList = [];
let sessionTimeout;
let activeCards = [];
let currentCategory = "home";
let allEvaluationsData = [];
let trainingData = [];
let feedbackLogsData = [];

// -------------------- HomeBlocks (Ana Sayfa blok içerikleri) --------------------
let homeBlocks = {}; // { quote:{...}, ... }

async function loadHomeBlocks() {
    try {
        const { data, error } = await sb.from('HomeBlocks').select('*');
        if (error) throw error;

        homeBlocks = {};
        data.forEach(row => {
            const normalized = normalizeKeys(row);
            // blockId veya key/Key alanını tespit et
            const id = (normalized.key || row.Key || normalized.blockId || row.BlockId || row.id || '').toString().toLowerCase();
            if (id) homeBlocks[id] = normalized;
        });

        console.log("[Pusula] HomeBlocks yüklendi:", Object.keys(homeBlocks));

        try { localStorage.setItem('homeBlocksCache', JSON.stringify(homeBlocks || {})); } catch (e) { }
        try { renderHomePanels(); } catch (e) { }
        return homeBlocks;
    } catch (err) {
        console.error("[Pusula] HomeBlocks Fetch Error:", err);
        try { homeBlocks = JSON.parse(localStorage.getItem('homeBlocksCache') || '{}') || {}; } catch (_) { homeBlocks = {}; }
        try { renderHomePanels(); } catch (_) { }
        return homeBlocks;
    }
}

function normalizeRole(v) {
    return String(v || '').trim().toLowerCase();
}
function normalizeGroup(v) {
    if (!v) return "";
    let s = String(v).trim().toLowerCase()
        .replace(/i̇/g, 'i').replace(/ı/g, 'i')
        .replace(/ş/g, 's').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ö/g, 'o')
        .replace(/ç/g, 'c');

    // NOT: Grup bazlı form eşleşmesi logEvaluationPopup içinde yapılıyor.
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeList(v) {
    if (!v) return [];
    return String(v).split(',').map(s => s.trim()).filter(Boolean);
}
function getMyGroup() { return normalizeGroup(localStorage.getItem("sSportGroup") || ""); }
function getMyRole() { return normalizeRole(localStorage.getItem("sSportRole") || ""); }


// --------------------------------------------------------------------
function enterBas(e) {
    if (e.key === 'Enter') girisYap();
}
let wizardStepsData = {};
// YENİ: Chart instance'ı tutmak için
let dashboardChart = null;
let dashTrendChart = null;
let dashChannelChart = null;
let dashScoreDistChart = null;
let dashGroupAvgChart = null;
// YENİ: Feedback Log Verisi (Manuel kayıt detayları için)
// ==========================================================
// --- KALİTE PUANLAMA LOGİĞİ V2 (PROFESYONEL) ---
// ==========================================================

window.v2_setScore = function (index, score, max, type) {
    const itemEl = document.getElementById(`criteria-${index}`);
    const noteRow = document.getElementById(`note-row-${index}`);
    const buttons = itemEl.querySelectorAll('.eval-btn-v2');

    // Aktif butonu güncelle
    buttons.forEach(b => b.classList.remove('active'));
    const targetBtn = itemEl.querySelector(`.eval-btn-v2.${type}`);
    if (targetBtn) targetBtn.classList.add('active');

    // Not alanını göster/gizle
    const isFailed = Number(score) < Number(max);
    if (noteRow) {
        noteRow.style.display = isFailed ? 'block' : 'none';
    }

    // Fallback: noteRow yoksa direkt input'u bulmayı dene (Edit modunda bazen wrapper olmayabilir ama artık ekleyeceğiz)
    const noteInp = document.getElementById(`note-${index}`);
    if (noteInp && !noteRow) {
        noteInp.style.display = isFailed ? 'block' : 'none';
    }

    if (isFailed) {
        itemEl.classList.add('failed');
    } else {
        if (noteInp) noteInp.value = '';
        itemEl.classList.remove('failed');
    }

    // Buton verisini güncelle
    itemEl.setAttribute('data-current-score', score);
    window.v2_recalc();
}

window.v2_updateSlider = function (index, max) {
    const itemEl = document.getElementById(`criteria-${index}`);
    const slider = document.getElementById(`slider-${index}`);
    const valEl = document.getElementById(`val-${index}`);
    const noteRow = document.getElementById(`note-row-${index}`);

    if (!slider) return;
    const val = parseInt(slider.value);

    if (valEl) valEl.innerText = `${val} / ${max}`;

    const isFailed = Number(val) < Number(max);
    if (noteRow) {
        noteRow.style.display = isFailed ? 'block' : 'none';
    }

    // Fallback
    const noteInp = document.getElementById(`note-${index}`);
    if (noteInp && !noteRow) {
        noteInp.style.display = isFailed ? 'block' : 'none';
    }

    if (isFailed) {
        itemEl.classList.add('failed');
    } else {
        if (noteInp) noteInp.value = '';
        itemEl.classList.remove('failed');
    }

    window.v2_recalc();
}

window.v2_recalc = function () {
    let total = 0;

    // Butonlu kriterler
    document.querySelectorAll('.criteria-item-v2').forEach(item => {
        const slider = item.querySelector('input[type="range"]');
        if (slider) {
            total += parseInt(slider.value) || 0;
        } else {
            const activeBtn = item.querySelector('.eval-btn-v2.active');
            if (activeBtn) total += parseInt(activeBtn.getAttribute('data-score')) || 0;
        }
    });

    const scoreEl = document.getElementById('v2-live-score');
    if (scoreEl) {
        scoreEl.innerText = total;
        scoreEl.style.color = total >= 90 ? '#2f855a' : (total >= 75 ? '#ed8936' : '#e53e3e');
    }
}

// Eski fonksiyonları V2'ye yönlendir (Geriye dönük uyumluluk için)
window.setButtonScore = (i, s, m) => window.v2_setScore(i, s, m, s === m ? 'good' : (s === 0 ? 'bad' : 'medium'));
window.recalcTotalScore = () => window.v2_recalc();
window.updateRowSliderScore = (i, m) => window.v2_updateSlider(i, m);
window.recalcTotalSliderScore = () => window.v2_recalc();

// --- YARDIMCI FONKSİYONLAR ---
function getToken() { return localStorage.getItem("sSportToken"); }
function setHomeWelcomeUser(name) {
    try {
        const el = document.getElementById("home-welcome-user");
        if (el) el.textContent = (name || "Misafir");
    } catch (e) { }
}

function getFavs() { return JSON.parse(localStorage.getItem('sSportFavs') || '[]'); }
function toggleFavorite(title) {
    event.stopPropagation();
    let favs = getFavs();
    if (favs.includes(title)) { favs = favs.filter(t => t !== title); }
    else { favs.push(title); }
    localStorage.setItem('sSportFavs', JSON.stringify(favs));
    try {
        const added = favs.includes(title);
        Swal.fire({ toast: true, position: 'top-end', icon: added ? 'success' : 'info', title: added ? 'Favorilere eklendi' : 'Favorilerden kaldırıldı', showConfirmButton: false, timer: 1200 });
    } catch (e) { }

    if (currentCategory === 'fav') { filterCategory(document.querySelector('.btn-fav'), 'fav'); }
    else { renderCards(activeCards); }
    try { updateSearchResultCount(activeCards.length || 0, database.length); } catch (e) { }
}
function isFav(title) { return getFavs().includes(title); }
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return 'N/A';
    // Eğer format dd.MM.yyyy olarak geliyorsa direkt dön
    if (dateString.match(/^\d{2}\.\d{2}\.\d{4}/)) { return dateString.split(' ')[0]; }
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { return dateString; }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    } catch (e) { return dateString; }
}

function processImageUrl(url) {
    if (!url) return '';
    // Drive linki düzeltme: /d/ID veya id=ID -> thumbnail?sz=w1000
    try {
        let id = '';
        const m = url.match(/\/d\/([-\w]+)/) || url.match(/id=([-\w]+)/);
        if (m && m[1]) id = m[1];
        if (id && url.includes('drive.google.com')) {
            return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1000';
        }
    } catch (e) { }
    return url;
}

function parseDateTRToTS(s) {
    try {
        if (!s) return 0;
        const clean = String(s).split(' ')[0];
        if (clean.includes('.')) {
            const parts = clean.split('.');
            if (parts.length >= 3) {
                const dd = parseInt(parts[0], 10);
                const mm = parseInt(parts[1], 10);
                const yy = parseInt(parts[2], 10);
                const d = new Date(yy, mm - 1, dd);
                return d.getTime() || 0;
            }
        }
        const d = new Date(s);
        return d.getTime() || 0;
    } catch (e) { return 0; }
}

function isNew(dateStr) {
    if (!dateStr) return false;
    let date;
    if (dateStr.indexOf('.') > -1) {
        const cleanDate = dateStr.split(' ')[0];
        const parts = cleanDate.split('.');
        // GG.AA.YYYY -> YYYY-AA-GG formatına çevir
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
function copyScriptContent(encodedText) {
    const text = decodeURIComponent(encodedText);
    copyText(text);
}
function copyText(t) {
    // navigator.clipboard.writeText yerine execCommand kullanıldı (iFrame uyumluluğu için)
    const textarea = document.createElement('textarea');
    textarea.value = t.replace(/\\n/g, '\n');
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        Swal.fire({ icon: 'success', title: 'Kopyalandı', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Kopyalanamadı', text: 'Lütfen manuel kopyalayın.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    }
    document.body.removeChild(textarea);
}
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function (e) { if (e.keyCode == 123) return false; }
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    // IP Fetch (Konum destekli)
    fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => { globalUserIP = `${d.ip} [${d.city || '-'}, ${d.region || '-'}]`; })
        .catch(() => { });
});
// --- BROADCAST FLOW ---
// (Duplicate fetchBroadcastFlow removed)

// (Duplicate openBroadcastFlow removed)

// --- SESSION & LOGIN ---
function checkSession() {
    const savedUser = localStorage.getItem("sSportUser");
    const savedToken = localStorage.getItem("sSportToken");
    const savedRole = localStorage.getItem("sSportRole");
    const savedGroup = localStorage.getItem("sSportGroup");

    // ✅ Oturumun tarayıcı/PC kapat-aç sonrası ertesi güne sarkmaması için:
    // - Aynı gün değilse otomatik çıkış
    // - Ayrıca 12 saati geçtiyse otomatik çıkış
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const sessionDay = localStorage.getItem("sSportSessionDay") || "";
    const loginAt = parseInt(localStorage.getItem("sSportLoginAt") || "0", 10);
    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 saat

    if (savedUser && savedToken) {
        const isOtherDay = (!sessionDay || sessionDay !== todayKey);
        const isTooOld = (!loginAt || (Date.now() - loginAt) > maxAgeMs);

        if (isOtherDay || isTooOld) {
            try { logout(); } catch (e) {
                localStorage.removeItem("sSportUser");
                localStorage.removeItem("sSportToken");
                localStorage.removeItem("sSportRole");
                localStorage.removeItem("sSportGroup");
                localStorage.removeItem("sSportSessionDay");
                localStorage.removeItem("sSportLoginAt");
            }
            return;
        }

        currentUser = savedUser;
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("user-display").innerText = currentUser;
        setHomeWelcomeUser(currentUser);

        checkAdmin(savedRole);

        // Heartbeat başlat
        startSessionTimer();

        // ✅ Başarılı girişte yönetici listesini önceden çek
        if (savedRole === "admin" || savedRole === "locadmin") {
            try { fetchUserListForAdmin(); } catch (e) { }
        }

        // ✅ Zorunlu şifre değişimi kontrolü (Sayfa yenilense de kaçamaz)
        if (localStorage.getItem("sSportForceChange") === "true") {
            changePasswordPopup(true);
            return;
        }


        try {
            if (savedGroup) {
                const el = document.getElementById("t-side-role"); if (el) el.textContent = savedGroup;
                const el2 = document.getElementById("tech-side-role"); if (el2) el2.textContent = savedGroup;
            }
        } catch (e) { }


        // ✅ Oturum sayacı ve Heartbeat başlat
        startSessionTimer();

        // ✅ YENİ: Yenilemede de menü/blok yetkilerini uygula
        try { loadHomeBlocks(); } catch (e) { }
        try { loadPermissionsOnStartup(); } catch (e) { }
        if (BAKIM_MODU) {
            document.getElementById("maintenance-screen").style.display = "flex";
        } else {
            document.getElementById("main-app").style.display = "block";

            loadContentData();
            loadWizardData();
            loadTechWizardData();

            // qusers auto-open kaldırıldı (istek üzerine)
        }
    }
}
function enterBas(e) { if (e.key === "Enter") girisYap(); }
async function girisYap() {
    const uName = document.getElementById("usernameInput").value.trim().toLowerCase();
    const uPass = document.getElementById("passInput").value.trim();
    const loadingMsg = document.getElementById("loading-msg");
    const errorMsg = document.getElementById("error-msg");
    if (!uName || !uPass) { errorMsg.innerText = "Lütfen bilgileri giriniz."; errorMsg.style.display = "block"; return; }

    loadingMsg.style.display = "block";
    loadingMsg.innerText = "Supabase ile doğrulanıyor...";
    errorMsg.style.display = "none";
    document.querySelector('.login-btn').disabled = true;

    if (!globalUserIP) {
        try {
            const ipResponse = await fetch('https://ipapi.co/json/');
            const ipData = await ipResponse.json();
            globalUserIP = `${ipData.ip} [${ipData.city || '-'}, ${ipData.region || '-'}]`;
        } catch (e) { globalUserIP = ""; }
    }

    try {
        const hashedPass = CryptoJS.SHA256(uPass).toString();

        // --- SUPABASE LOGIN (Enhanced Diagnostics) ---
        // 1. Önce tam eşleşme veya büyük/küçük harf duyarsız dene
        let { data: user, error: loginErr } = await sb
            .from('Users')
            .select('*')
            .ilike('Username', uName.trim())
            .maybeSingle();

        // 2. Eğer ilk sorguda bulunamadıysa, belki sütun adı küçük harftir?
        if (!user && !loginErr) {
            console.warn("[Pusula Login] 'Username' sütununda bulunamadı, 'username' (küçük harf) deneniyor...");
            const { data: altUser } = await sb
                .from('Users')
                .select('*')
                .ilike('username', uName.trim())
                .maybeSingle();
            user = altUser;
        }

        loadingMsg.style.display = "none";
        document.querySelector('.login-btn').disabled = false;

        if (loginErr) {
            console.error("[Pusula Login] Sorgu sırasında hata oluştu:", loginErr);
            errorMsg.innerText = "Bağlantı Hatası: Sunucuya erişilemedi.";
            errorMsg.style.display = "block";
            return;
        }

        if (!user) {
            dlog("[Pusula Login] Kullanıcı bulunamadı.");
            errorMsg.innerText = "Kullanıcı Adı veya Şifre Hatalı!";
            errorMsg.style.display = "block";
            return;
        }

        // Şifre kontrolü
        if (user.Password !== hashedPass && user.password !== hashedPass) {
            console.warn("[Pusula Login] Şifre eşleşmedi.");
            saveLog("Giriş Denemesi (Hatalı Şifre)", uName);
            errorMsg.innerText = "Kullanıcı Adı veya Şifre Hatalı!";
            errorMsg.style.display = "block";
            return;
        }

        saveLog("Sisteme Giriş", uName);

        // Veri eşleme (Geriye uyumluluk için büyük harf/küçük harf karmaşasını çöz)
        const data = {
            Username: user.Username || user.username,
            Role: user.Role || user.role,
            Group: user.Group || user.group,
            ForceChange: user.ForceChange ?? user.forcechange
        };

        // Oturum Verilerini Kaydet
        currentUser = data.Username;
        const sessionToken = "sb_" + Math.random().toString(36).substr(2) + Date.now().toString(36);

        localStorage.setItem("sSportUser", currentUser);
        localStorage.setItem("sSportToken", sessionToken);
        localStorage.setItem("sSportRole", data.Role);
        if (data.Group) localStorage.setItem("sSportGroup", data.Group);

        // ✅ Tokens tablosuna kaydet (Single Session & Force Kick Altyapısı)
        const { error: tokenError } = await sb.from('Tokens').upsert({
            Username: currentUser,
            Token: sessionToken,
            Role: data.Role,
            IP: globalUserIP || '-',
            CreatedAt: new Date().toISOString()
        }, { onConflict: 'Username' });

        if (tokenError) {
            console.error("[Pusula Token Sync] Hata:", tokenError);
            // Eğer upsert hata veriyorsa, muhtemelen RLS veya Constraint hatasıdır.
            // Kritik bir hata olduğu için kullanıcıyı uyaralım.
            Swal.fire({
                icon: 'warning',
                title: 'Oturum Senkronizasyon Hatası',
                text: 'Token tablosuna yazılamadı. Lütfen RLS politikalarını veya tablo izinlerini kontrol edin. Hata: ' + tokenError.message,
                confirmButtonText: 'Devam Et'
            });
        }
        localStorage.setItem("sSportSessionDay", new Date().toISOString().slice(0, 10));
        localStorage.setItem("sSportLoginAt", String(Date.now()));

        // Zorunlu Şifre Değişimi (Sadece değer tam olarak 0 ise)
        const needsForceChange = (data.ForceChange === 0 || data.ForceChange === "0" || data.ForceChange === "0.0");

        if (needsForceChange) {
            localStorage.setItem("sSportForceChange", "true");
            Swal.fire({
                icon: 'warning', title: ' ⚠️  Güvenlik Uyarısı',
                text: 'Yeni sistem için şifrenizi bir kez güncellemeniz gerekmektedir.',
                allowOutsideClick: false, confirmButtonText: 'Şifremi Güncelle'
            }).then(() => { changePasswordPopup(true); });
        } else {
            localStorage.removeItem("sSportForceChange");
            document.getElementById("login-screen").style.display = "none";
            document.getElementById("user-display").innerText = currentUser;
            setHomeWelcomeUser(currentUser);
            checkAdmin(data.Role);
            startSessionTimer();

            if (BAKIM_MODU) {
                document.getElementById("maintenance-screen").style.display = "flex";
            } else {
                document.getElementById("main-app").style.display = "block";
                loadPermissionsOnStartup().then(() => {
                    loadHomeBlocks();
                    loadContentData();
                    loadWizardData();
                    loadTechWizardData();
                });
            }

            // Loglama: Google yerine doğrudan Supabase'e yazıyoruz
            try {
                // Bug 13 Fix: logAction kullan (Centralized)
                apiCall("logAction", {
                    action: "Giriş",
                    details: "Supabase Login",
                    ip: globalUserIP
                });
            } catch (e) { console.warn("Log hatası:", e); }
        }
    } catch (err) {
        console.error("Login Error:", err);
        loadingMsg.style.display = "none";
        document.querySelector('.login-btn').disabled = false;
        errorMsg.innerText = "Giriş yapılamadı: " + err.message;
        errorMsg.style.display = "block";
    }
}

async function forgotPasswordPopup() {
    const { value: username } = await Swal.fire({
        title: 'Şifremi Unuttum',
        input: 'text',
        inputLabel: 'Kullanıcı Adınız',
        inputPlaceholder: 'Örn: ahmet.yilmaz',
        showCancelButton: true,
        confirmButtonText: 'Şifre Gönder',
        cancelButtonText: 'İptal',
        inputValidator: (value) => {
            if (!value) return 'Lütfen kullanıcı adınızı giriniz!';
        }
    });

    if (username) {
        Swal.fire({ title: 'İşleniyor...', didOpen: () => { Swal.showLoading() } });

        try {
            // 1. Kullanıcıyı ve Email adresini bul
            const { data: user, error: fetchErr } = await sb.from('Users')
                .select('*')
                .ilike('Username', username.trim())
                .maybeSingle();

            if (fetchErr || !user) {
                Swal.fire('Hata', 'Kullanıcı bulunamadı.', 'error');
                return;
            }

            const email = user.Email || user.email;
            if (!email || !email.includes('@')) {
                Swal.fire('Bilgi', 'Hesabınıza tanımlı e-posta bulunamadı. Lütfen yöneticinizle irtibata geçin.', 'warning');
                return;
            }

            // 2. Geçici Şifre Oluştur
            const tempPass = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedPass = CryptoJS.SHA256(tempPass).toString();

            // 3. Veritabanını Güncelle (Dinamik Kolon Tespiti)
            const updatePayload = {};
            if ("Password" in user) updatePayload.Password = hashedPass;
            else if ("password" in user) updatePayload.password = hashedPass;
            else updatePayload.Password = hashedPass;

            if ("ForceChange" in user) updatePayload.ForceChange = '1';
            else if ("forcechange" in user) updatePayload.forcechange = '1';
            else updatePayload.ForceChange = '1';

            const { error: updErr } = await sb.from('Users')
                .update(updatePayload)
                .ilike('Username', username.trim());

            if (updErr) throw updErr;

            // 4. Mail Gönder
            const subject = "Pusula - Şifre Sıfırlama";
            const body = `Merhaba ${username},\n\nSistem giriş şifreniz sıfırlandı.\n\nGeçici Şifreniz: ${tempPass}\n\nLütfen giriş yaptıktan sonra şifrenizi değiştirmeyi unutmayın.`;
            await sendMailNotification(email, subject, body);
            saveLog("Şifremi Unuttum", `${username} için geçici şifre gönderildi.`);

            Swal.fire('Başarılı', 'Geçici şifreniz e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.', 'success');
        } catch (e) {
            console.error("[Pusula] Forgot Pass Error:", e);
            Swal.fire('Hata', 'İşlem sırasında bir sorun oluştu: ' + (e.message || e), 'error');
        }
    }
}

function checkAdmin(role) {
    const addCardDropdown = document.getElementById('dropdownAddCard');
    const imageDropdown = document.getElementById('dropdownImage');
    const quickEditDropdown = document.getElementById('dropdownQuickEdit');

    activeRole = role;
    isAdminMode = (role === "admin" || role === "locadmin");
    isLocAdmin = (role === "locadmin");
    isEditingActive = false;
    document.body.classList.remove('editing');


    if (isAdminMode) {
        if (addCardDropdown) addCardDropdown.style.display = 'flex';
        if (imageDropdown) imageDropdown.style.display = 'flex';
        if (quickEditDropdown) {
            quickEditDropdown.style.display = 'flex';
            // Yetkiler applyPermissionsToUI() ile granular olarak yönetilecek.
        }
    } else {
        if (addCardDropdown) addCardDropdown.style.display = 'none';
        if (imageDropdown) imageDropdown.style.display = 'none';
        if (quickEditDropdown) {
            quickEditDropdown.style.display = 'none';
            quickEditDropdown.innerHTML = '<i class="fas fa-pen" style="color:var(--secondary);"></i> Düzenlemeyi Aç';
            quickEditDropdown.classList.remove('active');
        }

        ['dropdownPerms', 'dropdownActiveUsers', 'dropdownUserMgmt', 'dropdownLogs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    // RBAC Yetkilerini uygula
    try { applyPermissionsToUI(); } catch (e) { }
}

function logout() {
    currentUser = ""; isAdminMode = false; isEditingActive = false;
    try { document.getElementById("user-display").innerText = "Misafir"; } catch (e) { }
    setHomeWelcomeUser("Misafir");
    document.body.classList.remove('editing');
    localStorage.removeItem("sSportUser"); localStorage.removeItem("sSportToken"); localStorage.removeItem("sSportRole"); localStorage.removeItem("sSportGroup"); localStorage.removeItem("sSportSessionDay"); localStorage.removeItem("sSportLoginAt");
    localStorage.removeItem("sSportForceChange"); // Bayrağı temizle
    if (sessionTimeout) clearTimeout(sessionTimeout);
    document.getElementById("main-app").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("passInput").value = "";
    document.getElementById("usernameInput").value = "";
    document.getElementById("error-msg").style.display = "none";

    // Fullscreen'i kapat
    document.getElementById('quality-fullscreen').style.display = 'none';
    try { document.getElementById('tech-fullscreen').style.display = 'none'; } catch (e) { }
    try { document.getElementById('telesales-fullscreen').style.display = 'none'; } catch (e) { }
}
// --- HEARTBEAT SYSTEM ---
let sessionInterval;
let heartbeatInterval; // Yeni Heartbeat Timer

async function sendHeartbeat() {
    if (!currentUser) return;
    try {
        // 1. Heartbeat gönderirken aynı zamanda force_logout kontrolü yap
        const { data, error } = await sb.from('Users')
            .update({ last_seen: new Date().toISOString() })
            .eq('Username', currentUser)
            .select('force_logout')
            .single();

        if (data && data.force_logout === true) {
            await sb.from('Users').update({ force_logout: false }).eq('Username', currentUser);
            Swal.fire({
                icon: 'error', title: 'Oturum Sonlandırıldı',
                text: 'Yönetici tarafından sistemden çıkarıldınız.',
                allowOutsideClick: false, confirmButtonText: 'Tamam'
            }).then(() => { logout(); });
            return;
        }

        // 2. Token Kontrolü (Single Session Enforcement)
        const localToken = localStorage.getItem("sSportToken");
        const { data: tokenData } = await sb.from('Tokens')
            .select('Token')
            .eq('Username', currentUser)
            .maybeSingle();

        if (!tokenData || tokenData.Token !== localToken) {
            Swal.fire({
                icon: 'warning', title: 'Oturum Kesildi',
                text: 'Oturumunuz başka bir cihazda açılmış veya sonlandırılmış olabilir.',
                allowOutsideClick: false, confirmButtonText: 'Tamam'
            }).then(() => { logout(); });
        }

    } catch (e) { console.warn("Heartbeat failed", e); }
}

function startSessionTimer() {
    if (sessionInterval) clearInterval(sessionInterval);
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    // Initial heartbeat
    sendHeartbeat();

    // Her 30 saniyede bir heartbeat gönder
    heartbeatInterval = setInterval(() => {
        sendHeartbeat();
    }, 30000);

    // 8 saat (28800000 ms) session timeout check
    sessionTimeout = setTimeout(() => {
        Swal.fire({ icon: 'warning', title: 'Oturum Süresi Doldu', text: 'Güvenlik nedeniyle otomatik çıkış yapıldı.', confirmButtonText: 'Tamam' }).then(() => { logout(); });
    }, 28800000);
}
function openUserMenu() { toggleUserDropdown(); }
async function changePasswordPopup(isMandatory = false) {
    const { value: formValues } = await Swal.fire({
        title: isMandatory ? 'Yeni Şifre Belirleyin' : 'Şifre Değiştir',
        html: `${isMandatory ? '<p style="font-size:0.9rem; color:#d32f2f;">İlk giriş şifrenizi değiştirmeden devam edemezsiniz.</p>' : ''}<input id="swal-old-pass" type="password" class="swal2-input" placeholder="Eski Şifre (Mevcut)"><input id="swal-new-pass" type="password" class="swal2-input" placeholder="Yeni Şifre">`,
        focusConfirm: false, showCancelButton: !isMandatory, allowOutsideClick: !isMandatory, allowEscapeKey: !isMandatory,
        confirmButtonText: 'Değiştir', cancelButtonText: 'İptal',
        preConfirm: () => {
            const o = document.getElementById('swal-old-pass').value;
            const n = document.getElementById('swal-new-pass').value;
            if (!o || !n) { Swal.showValidationMessage('Alanlar boş bırakılamaz'); }
            return [o, n]
        }
    });
    if (formValues) {
        Swal.fire({ title: 'İşleniyor...', didOpen: () => { Swal.showLoading() } });
        try {
            const oldHashed = CryptoJS.SHA256(formValues[0]).toString();
            const newHashed = CryptoJS.SHA256(formValues[1]).toString();

            // 1. Önce eski şifreyi doğrula (Supabase'den tekrar çekerek)
            const { data: userRecord, error: checkError } = await sb
                .from('Users')
                .select('*')
                .ilike('Username', currentUser)
                .single();

            if (checkError) throw checkError;
            if (!userRecord) throw new Error("Kullanıcı bulunamadı.");

            const currentPassDB = userRecord.Password || userRecord.password;
            if (currentPassDB !== oldHashed) {
                throw new Error("Mevcut şifreniz hatalı!");
            }

            // 2. Yeni şifreyi güncelle (Hangi kolon varsa onu güncelle)
            const updatePayload = {};
            if ("Password" in userRecord) updatePayload.Password = newHashed;
            else if ("password" in userRecord) updatePayload.password = newHashed;
            else updatePayload.Password = newHashed; // Fallback to PascalCase

            if ("ForceChange" in userRecord) updatePayload.ForceChange = '0';
            else if ("forcechange" in userRecord) updatePayload.forcechange = '0';
            else updatePayload.ForceChange = '0';

            const { error: updateError } = await sb
                .from('Users')
                .update(updatePayload)
                .ilike('Username', currentUser);

            if (updateError) throw updateError;

            saveLog("Şifre Değiştirme", `${currentUser} şifresini güncelledi.`);

            localStorage.removeItem("sSportForceChange"); // Başarılı olunca bayrağı kaldır
            Swal.fire('Başarılı!', 'Şifreniz güncellendi. Yeniden giriş yapınız.', 'success').then(() => { logout(); });
        } catch (err) {
            console.error("Password change error:", err);
            Swal.fire('Hata', err.message || 'Şifre değiştirme başarısız.', 'error').then(() => {
                if (isMandatory) changePasswordPopup(true);
            });
        }
    } else if (isMandatory) { changePasswordPopup(true); }
}
// --- DATA FETCHING (Supabase Optimized) ---
async function loadContentData() {
    try {
        console.log("[Pusula] Fetching data from Supabase...");
        const { data, error } = await sb
            .from('Data')
            .select('*');

        if (error) throw error;

        processRawData(data || []);
        console.log("[Pusula] Data loaded successfully.");

        // Barrier resolve
        if (typeof __dataLoadedResolve === "function") __dataLoadedResolve();

        // Post-render
        if (typeof filterContent === "function") filterContent();
        if (typeof startTicker === "function") startTicker();

    } catch (err) {
        console.error("[Pusula] Supabase Fetch Error:", err);
        // Fallback to Apps Script if Supabase fails
        apiCall("getData").then(res => processRawData(res.data)).catch(() => { });
    }
}
// --- DATA PROCESSING (Refactored for Cache Support) ---
function processRawData(rawData) {
    if (!Array.isArray(rawData)) return;

    // Reset arrays
    database = []; newsData = []; sportsData = []; salesScripts = []; quizQuestions = []; quickDecisionQuestions = [];

    // Single pass optimization
    rawData.forEach(i => {
        const type = (i.Type || '').toLowerCase();
        const category = (i.Category || '').toLowerCase();

        // Database (Cards)
        if (['card', 'bilgi', 'teknik', 'kampanya', 'ikna'].includes(type)) {
            database.push({
                title: i.Title, category: i.Category, text: i.Text, script: i.Script, code: i.Code, link: i.Link, image: i.Image, date: formatDateToDDMMYYYY(i.Date)
            });
        }
        // News
        else if (type === 'news') {
            newsData.push({
                date: formatDateToDDMMYYYY(i.Date), title: i.Title, desc: i.Text, type: i.Category, status: i.Status, image: i.Image
            });
        }
        // Sport
        else if (type === 'sport') {
            sportsData.push({
                title: i.Title, icon: i.Icon, desc: i.Text, tip: i.Tip, detail: i.Detail, pronunciation: i.Pronunciation
            });
        }
        // Sales
        else if (type === 'sales') {
            salesScripts.push({ title: i.Title, text: i.Text });
        }
        // Quiz
        else if (type === 'quiz') {
            quizQuestions.push({
                q: i.Text, opts: i.QuizOptions ? i.QuizOptions.split(',').map(o => o.trim()) : [], a: parseInt(i.QuizAnswer)
            });
        }
        // Quick Decision
        else if (type === 'quickdecision') {
            const opts = String(i.QuizOptions || '').split('|').map(x => x.trim()).filter(Boolean);
            let a = parseInt(i.QuizAnswer, 10);
            if (isNaN(a)) a = 0;
            if (a < 0) a = 0;
            if (opts.length && a >= opts.length) a = opts.length - 1;
            const exp = (i.Detail || '').toString().trim();
            if ((i.Text || '').toString().trim() && Array.isArray(opts) && opts.length >= 2) {
                quickDecisionQuestions.push({ q: (i.Text || '').toString().trim(), opts, a, exp });
            }
        }
    });

    // Post-process
    database.sort((a, b) => parseDateTRToTS(b.date) - parseDateTRToTS(a.date));
    newsData.sort((a, b) => parseDateTRToTS(b.date) - parseDateTRToTS(a.date));
    try { applySportsRights(); } catch (e) { }

    // cardsData alias removed

    if (currentCategory === 'fav') { filterCategory(document.querySelector('.btn-fav'), 'fav'); }
    else {
        activeCards = database;
        if (currentCategory === 'home') { showHomeScreen(); }
        else { hideHomeScreen(); renderCards(database); }
    }
    startTicker();
    try { updateSearchResultCount(activeCards.length || database.length, database.length); } catch (e) { }
}

async function loadContentData() {
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
    } catch (e) { }

    if (!loadedFromCache) {
        document.getElementById('loading').style.display = 'block';
    }

    // 2. Fetch Fresh Data (Strictly Supabase)
    try {
        const { data, error } = await sb.from('Data').select('*');
        if (error) throw error;

        if (!loadedFromCache) document.getElementById('loading').style.display = 'none';

        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        processRawData(data);
    } catch (err) {
        console.error("[Pusula] Supabase Load error:", err);
        if (!loadedFromCache) {
            document.getElementById('loading').innerHTML = 'Veriler yüklenirken bir hata oluştu: ' + err.message;
        }
    } finally {
        if (typeof __dataLoadedResolve === "function") __dataLoadedResolve();
    }
}
// --- WIZARD İŞLEMLERİ (Supabase) ---
async function loadWizardData() {
    try {
        const { data, error } = await sb.from('WizardSteps').select('*');
        if (error) throw error;

        wizardStepsData = {};
        (data || []).map(normalizeKeys).forEach(row => {
            if (!row.stepId) return;
            const stepId = String(row.stepId).trim();

            const opts = [];
            let optRaw = row.options || "";
            if (optRaw) {
                String(optRaw).split(',').forEach(p => {
                    const parts = p.trim().split('|');
                    // Format: "Text | NextId" veya "Text | NextId | Style"
                    if (parts.length >= 2) {
                        opts.push({
                            text: parts[0].trim(),
                            next: parts[1].trim(),
                            style: parts[2] ? parts[2].trim() : 'primary'
                        });
                    }
                });
            }

            wizardStepsData[stepId] = {
                title: row.title || row.Title || "",
                text: row.text || row.Text || "",
                script: row.script || "",
                result: row.result || "",
                alert: row.alert || "",
                options: opts
            };
        });
        console.log("[Wizard] Data Loaded:", Object.keys(wizardStepsData).length, "steps");
    } catch (err) {
        console.error("[Pusula] Wizard Fetch Error:", err);
    }
}

async function loadTechWizardData() {
    try {
        const { data, error } = await sb.from('TechWizardSteps').select('*');
        if (error) throw error;

        techWizardData = {};
        (data || []).map(normalizeKeys).forEach(row => {
            if (!row.stepId) return;
            const stepId = String(row.stepId).trim();

            const btns = [];
            let optRaw = row.options || ""; // normalizeKeys sayesinde Buttons da options oldu
            if (optRaw) {
                String(optRaw).split(',').forEach(b => {
                    const parts = b.trim().split('|');
                    if (parts.length >= 2) {
                        btns.push({
                            text: parts[0].trim(),
                            next: parts[1].trim(),
                            style: parts[2] ? parts[2].trim() : 'primary'
                        });
                    }
                });
            }

            techWizardData[stepId] = {
                title: row.title || row.Title || "",
                text: row.text || row.Text || "",
                script: row.script || "",
                alert: row.alert || "",
                result: row.result || "",
                buttons: btns,
                options: btns // her ihtimale karşı
            };
        });
        console.log("[TechWizard] Data Loaded:", Object.keys(techWizardData).length, "steps");
    } catch (err) {
        console.error("[Pusula] TechWizard Fetch Error:", err);
    }
}
// --- RENDER & FILTERING ---
const DISPLAY_LIMIT = 50;
let currentDisplayCount = DISPLAY_LIMIT;

function renderCards(data) {
    try {
        activeCards = data;
        const container = document.getElementById('cardGrid');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#777;">Kayıt bulunamadı.</div>';
            return;
        }

        // Reset display count on new render
        currentDisplayCount = DISPLAY_LIMIT;

        const renderSlice = (count) => {
            const listToRender = data.slice(0, count);
            const htmlChunks = listToRender.map((item, index) => {
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

            if (data.length > count) {
                htmlChunks.push(`<div id="load-more-container" style="grid-column:1/-1; text-align:center; padding:20px;">
                    <button class="btn" style="background:var(--primary); color:white; padding:10px 40px;" onclick="loadMoreCards()">Daha Fazla Yükle (${data.length - count} kaldı)</button>
                </div>`);
            }
            container.innerHTML = htmlChunks.join('');
        };

        renderSlice(currentDisplayCount);
        window.loadMoreCards = () => {
            currentDisplayCount += DISPLAY_LIMIT;
            renderSlice(currentDisplayCount);
        };

    } catch (e) {
        console.error('[renderCards]', e);
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
    // sadece arama yazıldığında veya filtre fav/tekil seçildiğinde göster
    const search = (document.getElementById('searchInput')?.value || '').trim();
    const show = !!search || (currentCategory && currentCategory !== 'all');
    if (!show) { el.style.display = 'none'; el.innerText = ''; return; }
    el.style.display = 'block';
    el.innerText = `🔎 ${count} sonuç${total != null ? ' / ' + total : ''}`;
}



function filterCategory(btn, cat) {
    // Ana Sayfa özel ekran
    if (cat === "home") {
        currentCategory = "home";
        setActiveFilterButton(btn);
        showHomeScreen();
        return;
    }


    // Tam ekran modüller
    const catNorm = String(cat || '').toLowerCase();
    if (catNorm.includes('teknik')) {
        hideHomeScreen();
        openTechArea('broadcast');
        return;
    }
    if (catNorm.includes('telesat')) {
        hideHomeScreen();
        openTelesalesArea();
        return;
    }
    if (catNorm.includes('kalite')) {
        hideHomeScreen();
        // kalite için mevcut davranış: card list (varsa) - burada özel modül yoksa devam
    }
    currentCategory = cat;
    hideHomeScreen();

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterContent();
}
function filterContent() {
    const search = document.getElementById('searchInput').value.toLocaleLowerCase('tr-TR').trim();
    // Ana sayfa (home) özel ekran:
    // - Arama boşsa ana sayfa kartları görünür (home-screen)
    // - Arama yapılırsa ana sayfadan çıkıp kartlar üzerinde filtre uygulanır
    if (currentCategory === 'home') {
        if (!search) {
            updateSearchResultCount(database.length, database.length);
            showHomeScreen();
            return;
        }
        // Arama varsa: home ekranını gizle ve tüm kartlar içinde ara
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
    // Geriye dönük uyumluluk: showCardDetail(cardObj) çağrısını da destekle
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
            ${script ? `<div class="tech-script-box" style="margin-top:12px">
                <span class="tech-script-label">Müşteriye iletilecek:</span>${escapeHtml(script).replace(/\n/g, '<br>')}
              </div>` : ''}
            ${alertTxt ? `<div class="tech-alert" style="margin-top:12px">${escapeHtml(alertTxt).replace(/\n/g, '<br>')}</div>` : ''}
          </div>`;
        Swal.fire({ title: t, html, showCloseButton: true, showConfirmButton: false, width: '820px', background: '#f8f9fa' });
        return;
    }

    const safeText = (text ?? '').toString();
    // Image support (passed via different flow usually, but handle basic text case)
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
        ${script ? `<div class="tech-script-box" style="margin-top:12px">
            <span class="tech-script-label">Müşteriye iletilecek:</span>${escapeHtml(script).replace(/\n/g, '<br>')}
          </div>` : ''}
      </div>`;

    Swal.fire({ title: t, html, showCloseButton: true, showConfirmButton: false, width: '820px', background: '#f8f9fa' });
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
    // Fullscreen alanlarını güncelle (eğer açıklarsa butonların gelmesi için)
    if (document.getElementById('quality-fullscreen').style.display === 'flex') openQualityArea();
    if (document.getElementById('shift-fullscreen').style.display === 'flex') openShiftArea();

    if (document.getElementById('guide-modal').style.display === 'flex') openGuide();
    if (document.getElementById('sales-modal').style.display === 'flex') openSales();
    if (document.getElementById('news-modal').style.display === 'flex') openNews();
}
async function sendUpdate(o, c, v, t = 'card') {
    if (!Swal.isVisible()) Swal.fire({ title: 'Kaydediliyor...', didOpen: () => { Swal.showLoading() } });

    try {
        const { error } = await sb
            .from('Data')
            .update({ [c]: v })
            .eq('Title', o);

        if (error) throw error;

        Swal.fire({ icon: 'success', title: 'Başarılı', timer: 1500, showConfirmButton: false });
        setTimeout(loadContentData, 1600);
    } catch (err) {
        console.error("Update error:", err);
        Swal.fire('Hata', 'Kaydedilemedi: ' + err.message, 'error');
    }
}
// --- CRUD OPERASYONLARI (ADMIN) ---
async function addNewCardPopup() {
    const catSelectHTML = getCategorySelectHtml('Bilgi', 'swal-new-cat');
    const { value: formValues } = await Swal.fire({
        title: 'Yeni İçerik Ekle',
        html: `
        <div style="margin-bottom:15px; text-align:left;">
            <label style="font-weight:bold; font-size:0.9rem;">Ne Ekleyeceksin?</label>
            <select id="swal-type-select" class="swal2-input" style="width:100%; margin-top:5px; height:35px; font-size:0.9rem;" onchange="toggleAddFields()">
                <option value="card"> 📌  Bilgi Kartı</option>
                <option value="news"> 📢  Duyuru</option>
                <option value="sales"> 📞  Telesatış Scripti</option>
                <option value="sport"> 🏆  Spor İçeriği</option>
                <option value="quiz"> ❓  Quiz Sorusu</option>
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
        width: '700px', showCancelButton: true, confirmButtonText: '<i class="fas fa-plus"></i> Ekle', cancelButtonText: 'İptal', focusConfirm: false,
        didOpen: () => {
            const selectEl = document.getElementById('swal-new-cat');
            const cardEl = document.getElementById('preview-card');
            selectEl.style.margin = "0"; selectEl.style.height = "30px"; selectEl.style.fontSize = "0.8rem"; selectEl.style.padding = "0 5px";
            selectEl.addEventListener('change', function () { cardEl.className = 'card ' + this.value; });

            window.toggleAddFields = function () {
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
                document.getElementById('swal-new-title').value = ''; document.getElementById('swal-new-text').value = '';
                cardPreview.style.borderLeft = "5px solid var(--info)"; cardPreview.className = 'card Bilgi';

                if (type === 'card') {
                    catCont.style.display = 'block'; scriptCont.style.display = 'block'; extraCont.style.display = 'grid';
                    cardPreview.className = 'card ' + document.getElementById('swal-new-cat').value;
                    document.getElementById('swal-new-title').placeholder = "Başlık Giriniz..."; document.getElementById('swal-new-text').placeholder = "İçerik metni...";
                } else if (type === 'sales') {
                    scriptCont.style.display = 'block';
                    document.getElementById('swal-new-script').placeholder = "Satış Metni...";
                    cardPreview.style.borderLeft = "5px solid var(--sales)";
                    document.getElementById('swal-new-title').placeholder = "Script Başlığı..."; document.getElementById('swal-new-text').placeholder = "Sadece buraya metin girilecek.";
                } else if (type === 'sport') {
                    sportExtra.style.display = 'block';
                    cardPreview.style.borderLeft = "5px solid var(--primary)";
                    document.getElementById('swal-new-title').placeholder = "Spor Terimi Başlığı..."; document.getElementById('swal-new-text').placeholder = "Kısa Açıklama (Desc)...";
                } else if (type === 'news') {
                    newsExtra.style.display = 'block';
                    cardPreview.style.borderLeft = "5px solid var(--secondary)";
                    document.getElementById('swal-new-title').placeholder = "Duyuru Başlığı..."; document.getElementById('swal-new-text').placeholder = "Duyuru Metni (Desc)...";
                } else if (type === 'quiz') {
                    quizExtra.style.display = 'block';
                    document.getElementById('swal-new-title').placeholder = "Quiz Başlığı (Örn: Soru 1)"; document.getElementById('swal-new-text').placeholder = "Bu alan boş bırakılacak.";
                    cardPreview.style.borderLeft = "5px solid var(--quiz)";
                }
            };
        },
        preConfirm: () => {
            const type = document.getElementById('swal-type-select').value;
            const today = new Date();
            const dateStr = today.getDate() + "." + (today.getMonth() + 1) + "." + today.getFullYear();
            const quizOpts = type === 'quiz' ? document.getElementById('swal-quiz-opts').value : '';
            const quizAns = type === 'quiz' ? document.getElementById('swal-quiz-ans').value : '';
            const quizQ = type === 'quiz' ? document.getElementById('swal-quiz-q').value : '';
            if (type === 'quiz' && (!quizQ || !quizOpts || quizAns === '')) { Swal.showValidationMessage('Quiz sorusu için tüm alanlar zorunludur.'); return false; }
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
                date: dateStr, quizOptions: quizOpts, quizAnswer: quizAns
            }
        }
    });
    if (formValues) {
        if (!formValues.title) { Swal.fire('Hata', 'Başlık zorunlu!', 'error'); return; }
        Swal.fire({ title: 'Ekleniyor...', didOpen: () => { Swal.showLoading() } });

        try {
            const d = await apiCall("logCard", {
                type: formValues.cardType,
                category: formValues.category,
                title: formValues.title,
                text: formValues.text,
                script: formValues.script,
                code: formValues.code,
                status: formValues.status,
                link: formValues.link,
                tip: formValues.tip,
                detail: formValues.detail,
                pronunciation: formValues.pronunciation,
                icon: formValues.icon,
                date: new Date(),
                quizOptions: formValues.quizOptions,
                quizAnswer: formValues.quizAnswer
            });

            if (d.result !== "success") throw new Error(d.message || "Eklenemedi");

            Swal.fire({ icon: 'success', title: 'Başarılı', text: 'İçerik eklendi.', timer: 2000, showConfirmButton: false });
            setTimeout(loadContentData, 3500);
        } catch (err) {
            console.error("Add content error:", err);
            Swal.fire('Hata', err.message || 'Eklenemedi.', 'error');
        }
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
                <textarea id="swal-text" class="swal2-textarea" style="margin:0; width:100%; box-sizing:border-box; border:none; resize:none; font-family:inherit; min-height:120px; padding:10px; background:#f9f9f9;" placeholder="İçerik metni...">${(item.text || '').toString().replace(/<br>/g, '\n')}</textarea>
            </div>
            <div class="script-box" style="padding:0; border:1px solid #f0e68c;">
                <textarea id="swal-script" class="swal2-textarea" style="margin:0; width:100%; box-sizing:border-box; border:none; background:transparent; font-style:italic; min-height:80px; font-size:0.9rem;" placeholder="Script metni...">${(item.script || '').toString().replace(/<br>/g, '\n')}</textarea>
            </div>
            <div class="card-actions" style="margin-top:15px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div style="position:relative;"><i class="fas fa-code" style="position:absolute; left:10px; top:10px; color:#aaa;"></i><input id="swal-code" class="swal2-input" style="margin:0; height:35px; font-size:0.85rem; padding-left:30px;" value="${item.code || ''}" placeholder="Kod"></div>
                <div style="position:relative;"><i class="fas fa-link" style="position:absolute; left:10px; top:10px; color:#aaa;"></i><input id="swal-link" class="swal2-input" style="margin:0; height:35px; font-size:0.85rem; padding-left:30px;" value="${item.link || ''}" placeholder="Link"></div>
                <div style="position:relative;grid-column: 1 / -1;"><i class="fas fa-image" style="position:absolute; left:10px; top:10px; color:#aaa;"></i><input id="swal-image" class="swal2-input" style="margin:0; height:35px; font-size:0.85rem; padding-left:30px; width: 100%; box-sizing: border-box;" value="${item.image || ''}" placeholder="Görsel Linki (Drive vb.)"></div>
            </div>
        </div>`,
        width: '700px', showCancelButton: true, confirmButtonText: '<i class="fas fa-save"></i> Kaydet', cancelButtonText: 'İptal', focusConfirm: false,
        didOpen: () => {
            const selectEl = document.getElementById('swal-cat');
            const cardEl = document.getElementById('preview-card-edit');
            selectEl.style.margin = "0"; selectEl.style.height = "30px"; selectEl.style.fontSize = "0.8rem"; selectEl.style.padding = "0 5px";
            selectEl.addEventListener('change', function () { cardEl.className = 'card ' + this.value; });
        },
        preConfirm: () => {
            return {
                cat: document.getElementById('swal-cat').value,
                title: document.getElementById('swal-title').value,
                text: document.getElementById('swal-text').value,
                script: document.getElementById('swal-script').value,
                code: document.getElementById('swal-code').value,
                link: document.getElementById('swal-link').value,
                image: document.getElementById('swal-image').value
            }
        }
    });
    if (formValues) {
        if (formValues.cat !== item.category) sendUpdate(item.title, "Category", formValues.cat, 'card');
        if (formValues.text !== (item.text || '').replace(/<br>/g, '\n')) setTimeout(() => sendUpdate(item.title, "Text", formValues.text, 'card'), 500);
        if (formValues.script !== (item.script || '').replace(/<br>/g, '\n')) setTimeout(() => sendUpdate(item.title, "Script", formValues.script, 'card'), 1000);
        if (formValues.code !== (item.code || '')) setTimeout(() => sendUpdate(item.title, "Code", formValues.code, 'card'), 1500);
        if (formValues.link !== (item.link || '')) setTimeout(() => sendUpdate(item.title, "Link", formValues.link, 'card'), 2000);
        if (formValues.image !== (item.image || '')) setTimeout(() => sendUpdate(item.title, "Image", formValues.image, 'card'), 2250);
        if (formValues.title !== item.title) setTimeout(() => sendUpdate(item.title, "Title", formValues.title, 'card'), 2500);
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
            <label style="font-weight:bold;">Başlık</label><input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.title}">
            <label style="font-weight:bold;">Açıklama (Kısa)</label><textarea id="swal-desc" class="swal2-textarea" style="margin-bottom:10px;">${s.desc || ''}</textarea>
            <label style="font-weight:bold;">İpucu (Tip)</label><input id="swal-tip" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.tip || ''}">
            <label style="font-weight:bold;">Detay (Alt Metin)</label><textarea id="swal-detail" class="swal2-textarea" style="margin-bottom:10px;">${s.detail || ''}</textarea>
            <label style="font-weight:bold;">Okunuşu</label><input id="swal-pron" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${s.pronunciation || ''}">
            <label style="font-weight:bold;">İkon Sınıfı</label><input id="swal-icon" class="swal2-input" style="width:100%;" value="${s.icon || ''}">
        </div>`,
        width: '700px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => [
            document.getElementById('swal-title').value, document.getElementById('swal-desc').value, document.getElementById('swal-tip').value,
            document.getElementById('swal-detail').value, document.getElementById('swal-pron').value, document.getElementById('swal-icon').value
        ]
    });
    if (formValues) {
        const originalTitle = s.title;
        if (formValues[1] !== s.desc) sendUpdate(originalTitle, "Text", formValues[1], 'sport');
        if (formValues[2] !== s.tip) setTimeout(() => sendUpdate(originalTitle, "Tip", formValues[2], 'sport'), 500);
        if (formValues[3] !== s.detail) setTimeout(() => sendUpdate(originalTitle, "Detail", formValues[3], 'sport'), 1000);
        if (formValues[4] !== s.pronunciation) setTimeout(() => sendUpdate(originalTitle, "Pronunciation", formValues[4], 'sport'), 1500);
        if (formValues[5] !== s.icon) setTimeout(() => sendUpdate(originalTitle, "Icon", formValues[5], 'sport'), 2000);
        if (formValues[0] !== originalTitle) setTimeout(() => sendUpdate(originalTitle, "Title", formValues[0], 'sport'), 2500);
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
        width: '700px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => [document.getElementById('swal-title').value, document.getElementById('swal-text').value]
    });
    if (formValues) {
        const originalTitle = s.title;
        if (formValues[1] !== s.text) sendUpdate(originalTitle, "Text", formValues[1], 'sales');
        if (formValues[0] !== originalTitle) setTimeout(() => sendUpdate(originalTitle, "Title", formValues[0], 'sales'), 500);
    }
}
async function editNews(index) {
    const i = newsData[index];
    let statusOptions = `<option value="Aktif" ${i.status !== 'Pasif' ? 'selected' : ''}>Aktif</option><option value="Pasif" ${i.status === 'Pasif' ? 'selected' : ''}>Pasif</option>`;
    let typeOptions = `<option value="info" ${i.type === 'info' ? 'selected' : ''}>Bilgi</option><option value="update" ${i.type === 'update' ? 'selected' : ''}>Değişiklik</option><option value="fix" ${i.type === 'fix' ? 'selected' : ''}>Çözüldü</option>`;

    const { value: formValues } = await Swal.fire({
        title: 'Duyuruyu Düzenle',
        html: `<div class="card" style="text-align:left; border-left: 5px solid var(--secondary); padding:15px; background:#fff8e1;"><label style="font-weight:bold;">Başlık</label><input id="swal-title" class="swal2-input" style="width:100%; margin-bottom:10px;"
        value="${i.title || ''}"><div style="display:flex; gap:10px; margin-bottom:10px;"><div style="flex:1;"><label style="font-weight:bold;">Tarih</label><input id="swal-date" class="swal2-input" style="width:100%;"
        value="${i.date || ''}"></div><div style="flex:1;"><label style="font-weight:bold;">Tür</label><select id="swal-type" class="swal2-input" style="width:100%;">${typeOptions}</select></div></div><label style="font-weight:bold;">Metin</label><textarea id="swal-desc" class="swal2-textarea" style="margin-bottom:10px;">${i.desc || ''}</textarea><label style="font-weight:bold;">Görsel Linki</label><input id="swal-image" class="swal2-input" style="width:100%; margin-bottom:10px;" value="${i.image || ''}" placeholder="Görsel URL (opsiyonel)"><label style="font-weight:bold;">Durum</label><select id="swal-status" class="swal2-input" style="width:100%;">${statusOptions}</select></div>`,
        width: '600px', showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => [
            document.getElementById('swal-title').value, document.getElementById('swal-date').value,
            document.getElementById('swal-desc').value, document.getElementById('swal-type').value, document.getElementById('swal-status').value,
            document.getElementById('swal-image').value
        ]
    });
    if (formValues) {
        const originalTitle = i.title;
        if (formValues[1] !== i.date) sendUpdate(originalTitle, "Date", formValues[1], 'news');
        if (formValues[2] !== i.desc) setTimeout(() => sendUpdate(originalTitle, "Text", formValues[2], 'news'), 500);
        if (formValues[3] !== i.type) setTimeout(() => sendUpdate(originalTitle, "Category", formValues[3], 'news'), 1000);
        if (formValues[4] !== i.status) setTimeout(() => sendUpdate(originalTitle, "Status", formValues[4], 'news'), 1500);
        if (formValues[5] !== (i.image || '')) setTimeout(() => sendUpdate(originalTitle, "Image", formValues[5], 'news'), 1750);
        if (formValues[0] !== originalTitle) setTimeout(() => sendUpdate(originalTitle, "Title", formValues[0], 'news'), 2000);
    }
}
// --- STANDARD MODALS (TICKER, NEWS, GUIDE, SALES) ---
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function startTicker() {
    const t = document.getElementById('ticker-content');
    const activeNews = newsData.filter(i => i.status !== 'Pasif');
    if (activeNews.length === 0) { t.innerHTML = "Güncel duyuru yok."; t.style.animation = 'none'; return; }

    let tickerText = activeNews.map(i => {
        return `<span style="color:#fabb00; font-weight:bold;">[${i.date}]</span> <span style="color:#fff;">${i.title}:</span> <span style="color:#ddd;">${i.desc}</span>`;
    }).join(' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ');

    t.innerHTML = tickerText + ' &nbsp;&nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp;&nbsp; ' + tickerText;

    // Dynamic Speed Calculation
    // Estimate characters (removing tags for calculation)
    const rawText = t.innerText || t.textContent;
    const charCount = rawText.length;

    // Base speed: 
    // - 50 chars ~ 10s
    // - 500 chars ~ 100s
    // Formula: length / 5 (higher divider = faster, lower = slower)
    // Let's try length / 6 for a very calm speed
    let duration = Math.max(30, Math.round(charCount / 6));

    t.style.animation = `ticker-scroll ${duration}s linear infinite`;
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
        let editBtn = (isAdminMode && isEditingActive) ? `<i class="fas fa-pencil-alt edit-icon" style="top:0; right:0; font-size:0.9rem; padding:4px;" onclick="event.stopPropagation(); editNews(${index})"></i>` : '';
        let imageHtml = i.image ? `<div style="margin:10px 0;"><img src="${processImageUrl(i.image)}" loading="lazy" onerror="this.style.display='none'" style="max-width:100%; border-radius:8px; max-height:300px; object-fit:cover;"></div>` : '';
        c.innerHTML += `<div class="news-item" style="${passiveStyle}">${editBtn}<span class="news-date">${i.date}</span><span class="news-title">${i.title} ${passiveBadge}</span>${imageHtml}<div class="news-desc" style="white-space: pre-line">${i.desc}</div><span class="news-tag ${cl}">${tx}</span></div>`;
    });
}


// =========================
// ✅ Yayın Akışı (E-Tablo'dan)
// =========================
async function fetchBroadcastFlow() {
    try {
        const { data, error } = await sb.from('YayinAkisi').select('*');
        if (error) throw error;
        return (data || []).map(normalizeKeys);
    } catch (err) {
        console.error("[Pusula] YayinAkisi Fetch Error:", err);
        return [];
    }
}

async function openBroadcastFlow() {
    Swal.fire({
        title: "Yayın Akışı",
        html: '',
        didOpen: () => Swal.showLoading(),
        showConfirmButton: false
    });

    try {
        const itemsRaw = await fetchBroadcastFlow();

        if (!itemsRaw || !itemsRaw.length) {
            Swal.fire("Yayın Akışı", "Kayıt bulunamadı.", "info");
            return;
        }

        // ✅ Sıralama (epoch varsa kesin, yoksa tarih+saate göre)
        const items = [...itemsRaw].sort((a, b) => {
            const ae = Number(a?.startEpoch || 0);
            const be = Number(b?.startEpoch || 0);
            if (ae && be) return ae - be;

            const ak = String(a?.dateISO || a?.date || "") + " " + String(a?.time || "");
            const bk = String(b?.dateISO || b?.date || "") + " " + String(b?.time || "");
            return ak.localeCompare(bk);
        });

        const now = Date.now();

        // ✅ Tarihe göre grupla (dateISO)
        const byDate = {};
        const dateLabelByKey = {};
        items.forEach(it => {
            const key = String(it?.dateISO || it?.date || "Tarih Yok");
            if (!byDate[key]) byDate[key] = [];
            byDate[key].push(it);

            if (!dateLabelByKey[key]) {
                dateLabelByKey[key] = String(it?.dateLabelTr || "");
            }
        });

        // ✅ Popup CSS (Swal içi)
        const css = `
      <style>
        .ba-wrap{ text-align:left; max-height:62vh; overflow:auto; padding-right:6px; }
        .ba-day{ margin:14px 0 8px; font-weight:900; color:#0e1b42; display:flex; align-items:center; gap:10px; }

        .ba-section{ margin:16px 0 8px; font-weight:900; color:#0e1b42; font-size:1rem; }
        .ba-divider{ margin:14px 0; height:1px; background:#e9e9e9; }
        .ba-empty{ padding:10px 12px; border:1px dashed #ddd; border-radius:12px; background:#fafafa; color:#666; margin:10px 0; font-weight:700; }
        .ba-badge{ font-size:.75rem; padding:4px 8px; border-radius:999px; border:1px solid #e9e9e9; background:#f8f8f8; color:#444; }
        .ba-grid{ display:grid; gap:8px; }
        .ba-row{
          border:1px solid #eee;
          border-left:4px solid var(--secondary);
          border-radius:12px;
          padding:10px 12px;
          background:#fff;
        }
        .ba-row.past{
          border-left-color:#d9534f;
          background:#fff5f5;
        }
        .ba-top{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
        .ba-title{ font-weight:900; color:#222; line-height:1.25; }
        .ba-time{ font-weight:900; color:#0e1b42; white-space:nowrap; }
        .ba-sub{ margin-top:6px; font-size:.86rem; color:#666; display:flex; gap:14px; flex-wrap:wrap; }
        .ba-legend{ display:flex; gap:10px; flex-wrap:wrap; margin:6px 0 10px; }
        .ba-dot{ display:inline-flex; align-items:center; gap:6px; font-size:.8rem; color:#444; }
        .ba-dot i{ width:10px; height:10px; border-radius:50%; display:inline-block; }
        .ba-dot .up{ background:var(--secondary); }
        .ba-dot .pa{ background:#d9534f; }
      </style>
    `;

        let btnHtml = '';
        let html = `${css}${btnHtml}<div class="ba-wrap">`;
        html += `
      <div class="ba-legend">
        <span class="ba-dot"><i class="up"></i> Yaklaşan / Gelecek</span>
        <span class="ba-dot"><i class="pa"></i> Tarihi Geçmiş</span>
      </div>
    `;

        // ✅ Yaklaşan / Gelecek ve Geçmiş olarak ayır
        const upcomingByDate = {};
        const pastByDate = {};
        const dateKeys = Object.keys(byDate);

        dateKeys.forEach(key => {
            const arr = byDate[key] || [];
            arr.forEach(it => {
                const startEpoch = Number(it?.startEpoch || 0);
                const isPast = startEpoch ? (startEpoch < now) : false;
                const bucket = isPast ? pastByDate : upcomingByDate;
                if (!bucket[key]) bucket[key] = [];
                bucket[key].push(it);
            });
        });

        const renderSection = (title, bucket, emptyText) => {
            const keys = dateKeys.filter(k => (bucket[k] && bucket[k].length));
            if (!keys.length) {
                html += `<div class="ba-empty">${escapeHtml(emptyText)}</div>`;
                return;
            }
            html += `<div class="ba-section">${escapeHtml(title)}</div>`;
            keys.forEach(key => {
                const label = dateLabelByKey[key] || _formatBroadcastDateTr({ dateISO: key });
                html += `<div class="ba-day">${escapeHtml(label)}</div>`;
                html += `<div class="ba-grid">`;

                bucket[key].forEach(it => {
                    const startEpoch = Number(it?.startEpoch || 0);
                    const isPast = startEpoch ? (startEpoch < now) : false;

                    const time = String(it?.time || "").trim();
                    const event = String(it?.event || "").trim();
                    const announcer = String(it?.announcer || "").trim();

                    html += `
            <div class="ba-row ${isPast ? "past" : ""}">
              <div class="ba-top">
                <div class="ba-title">${escapeHtml(event || "-")}</div>
                <div class="ba-time">${escapeHtml(time || "")}</div>
              </div>
              <div class="ba-sub">
                <span><i class="fas fa-microphone"></i> ${escapeHtml(announcer || "-")}</span>
                ${it.date ? `<span><i class="far fa-calendar"></i> ${escapeHtml(it.date)}</span>` : ''}
              </div>
            </div>`;
                });

                html += `</div>`;
            });
        };

        // ✅ Önce yaklaşanlar, sonra geçmişler
        renderSection("Yaklaşan / Gelecek", upcomingByDate, "Yaklaşan yayın bulunamadı.");
        html += `<div class="ba-divider"></div>`;
        renderSection("Geçmiş", pastByDate, "Geçmiş yayın bulunamadı.");

        html += `</div>`;

        Swal.fire({
            title: "Yayın Akışı",
            html,
            width: 980,
            confirmButtonText: "Kapat"
        });

    } catch (err) {
        Swal.fire("Hata", err?.message || "Yayın akışı alınamadı.", "error");
    }
}

// XSS koruması

function _formatBroadcastDateTr(it) {
    // Backend yeni alanları gönderiyorsa kullan
    if (it && it.dateLabelTr) return String(it.dateLabelTr);

    // Fallback: it.dateISO (yyyy-mm-dd) veya it.date
    const s = String(it?.dateISO || it?.date || "").trim();
    if (!s) return "Tarih Yok";

    // ISO yyyy-mm-dd
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" }).format(d);
    }

    // dd.mm.yyyy / dd/mm/yyyy
    const m2 = s.match(/^(\d{1,2})[\./-](\d{1,2})[\./-](\d{4})/);
    if (m2) {
        const d = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
        return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "long" }).format(d);
    }

    return s; // en kötü haliyle göster
}

function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
const __escapeHtml = escapeHtml;
const _escapeHtml = escapeHtml;

// ------------------------------------------------------------
// Sağlamlaştırma (hata yönetimi + localStorage güvenli yazma)
// ------------------------------------------------------------
// 🔒 GÜVENLİK & DEBUG: Sadece adminler için detaylı log
function dlog(msg, data) {
    if (isAdminMode || isLocAdmin) {
        if (data) console.log(`[Pusula Debug] ${msg}`, data);
        else console.log(`[Pusula Debug] ${msg}`);
    }
}

function safeLocalStorageSet(key, value, maxBytes = 4 * 1024 * 1024) { // ~4MB
    try {
        const str = JSON.stringify(value);
        // Basit boyut kontrolü (UTF-16 yaklaşığı)
        if (str.length * 2 > maxBytes) {
            try { Swal.fire('Uyarı', 'Veri çok büyük, kaydedilemedi', 'warning'); } catch (e) { }
            return false;
        }
        localStorage.setItem(key, str);
        return true;
    } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            try { Swal.fire('Hata', 'Depolama alanı dolu', 'error'); } catch (x) { }
        } else {
            dlog('[safeLocalStorageSet]', e);
        }
        return false;
    }
}

function safeLocalStorageGet(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

const storage = {
    set: (k, v) => safeLocalStorageSet(k, v),
    get: (k, fb = null) => safeLocalStorageGet(k, fb),
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { } }
};

// Global error handlers (kullanıcıya sade mesaj, admin'e detay log)
window.addEventListener('error', function (e) {
    try { if (isAdminMode || isLocAdmin) dlog('[Global Error]', e && (e.error || e.message) ? (e.error || e.message) : e); } catch (_) { }
    try { if (typeof showGlobalError === 'function') showGlobalError('Beklenmeyen hata: ' + (e && e.message ? e.message : 'Bilinmeyen')); } catch (_) { }
});

window.addEventListener('unhandledrejection', function (e) {
    try { if (isAdminMode || isLocAdmin) dlog('[Unhandled Promise]', e && e.reason ? e.reason : e); } catch (_) { }
    try { if (typeof showGlobalError === 'function') showGlobalError('Beklenmeyen hata: ' + (e && e.reason && e.reason.message ? e.reason.message : 'Bilinmeyen')); } catch (_) { }
});


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
    // TeleSatış artık tam ekran modül
    openTelesalesArea();
}
function toggleSales(index) {
    const item = document.getElementById(`sales-${index}`);
    const icon = document.getElementById(`icon-${index}`);
    item.classList.toggle('active');
    if (item.classList.contains('active')) { icon.classList.replace('fa-chevron-down', 'fa-chevron-up'); }
    else { icon.classList.replace('fa-chevron-up', 'fa-chevron-down'); }
}

// --- PENALTY GAME ---
// Tasarım/Güncelleme: Tekrarlayan soru engeli, akıllı 50:50, double rozet, daha net maç sonu ekranı

let pScore = 0, pBalls = 10, pCurrentQ = null;
let pQuestionQueue = [];        // oturum boyunca sorulacak soru indeksleri (karıştırılmış)
let pAskedCount = 0;            // kaç soru soruldu
let pCorrectCount = 0;          // kaç doğru
let pWrongCount = 0;            // kaç yanlış

function setDoubleIndicator(isActive) {
    const el = document.getElementById('double-indicator');
    if (!el) return;
    el.style.display = isActive ? 'inline-flex' : 'none';
}

function updateJokerButtons() {
    const callBtn = document.getElementById('joker-call');
    const halfBtn = document.getElementById('joker-half');
    const doubleBtn = document.getElementById('joker-double');

    if (callBtn) callBtn.disabled = jokers.call === 0;
    if (halfBtn) halfBtn.disabled = jokers.half === 0;
    if (doubleBtn) doubleBtn.disabled = jokers.double === 0 || firstAnswerIndex !== -1;

    // Double aktifken diğerleri kilitlensin
    if (firstAnswerIndex !== -1) {
        if (callBtn) callBtn.disabled = true;
        if (halfBtn) halfBtn.disabled = true;
        if (doubleBtn) doubleBtn.disabled = true;
    }
}

function useJoker(type) {
    if (!pCurrentQ) return;
    if (jokers[type] === 0) return;
    if (firstAnswerIndex !== -1 && type !== 'double') return;

    jokers[type] = 0;
    updateJokerButtons();

    const currentQ = pCurrentQ;
    const correctAns = currentQ.a;
    const btns = document.querySelectorAll('.penalty-btn');

    if (type === 'call') {
        const experts = ["Umut Bey", "Doğuş Bey", "Deniz Bey", "Esra Hanım"];
        const expert = experts[Math.floor(Math.random() * experts.length)];

        let guess = correctAns;
        // %80 doğru, %20 yanlış tahmin
        if (Math.random() > 0.8 && currentQ.opts.length > 1) {
            const incorrect = currentQ.opts.map((_, i) => i).filter(i => i !== correctAns);
            guess = incorrect[Math.floor(Math.random() * incorrect.length)] ?? correctAns;
        }

        Swal.fire({
            icon: 'info',
            title: ' 📞 Telefon Jokeri',
            html: `${expert} soruyu cevaplıyor...<br><br>"Benim tahminim **${String.fromCharCode(65 + guess)}** şıkkı. Bundan ${Math.random() < 0.8 ? "çok eminim" : "emin değilim"}."`,
            confirmButtonText: 'Kapat'
        });

    } else if (type === 'half') {
        const optLen = Array.isArray(currentQ.opts) ? currentQ.opts.length : 0;
        if (optLen <= 2) {
            Swal.fire({ icon: 'info', title: '✂️ 50:50', text: 'Bu soruda 50:50 uygulanamaz.', toast: true, position: 'top', showConfirmButton: false, timer: 1800 });
            return;
        }

        // 4+ şıkta 2 yanlış, 3 şıkta 1 yanlış ele
        const removeCount = optLen >= 4 ? 2 : 1;
        const incorrect = currentQ.opts.map((_, i) => i).filter(i => i !== correctAns);
        incorrect.sort(() => Math.random() - 0.5).slice(0, removeCount).forEach(idx => {
            const b = btns[idx];
            if (!b) return;
            b.disabled = true;
            b.style.textDecoration = 'line-through';
            b.style.opacity = '0.4';
        });

        Swal.fire({
            icon: 'success',
            title: ' ✂️ 50:50',
            text: removeCount === 2 ? 'İki yanlış şık elendi!' : 'Bir yanlış şık elendi!',
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 1400
        });

    } else if (type === 'double') {
        doubleChanceUsed = true;
        setDoubleIndicator(true);
        Swal.fire({
            icon: 'warning',
            title: '2️ ⃣ Çift Cevap',
            text: 'Bir kez yanlış cevap hakkın var.',
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 2200
        });
    }
}


function openGameHub() {
    document.getElementById('game-hub-modal').style.display = 'flex';
}

function openQuickDecisionGame() {
    try { closeModal('game-hub-modal'); } catch (e) { }
    document.getElementById('quick-modal').style.display = 'flex';

    // Lobby ekranı
    const lobby = document.getElementById('qd-lobby');
    const game = document.getElementById('qd-game');
    if (lobby) lobby.style.display = 'block';
    if (game) game.style.display = 'none';

    // Reset göstergeler
    const t = document.getElementById('qd-time'); if (t) t.innerText = '30';
    const s = document.getElementById('qd-score'); if (s) s.innerText = '0';
    const st = document.getElementById('qd-step'); if (st) st.innerText = '0';
}

// --- HIZLI KARAR OYUNU ---
let qdTimer = null;
let qdTimeLeft = 30;
let qdScore = 0;
let qdStep = 0;
let qdQueue = [];

const QUICK_DECISION_BANK = [
    {
        q: 'Müşteri: "Fiyat pahalı, iptal edeceğim." İlk yaklaşımın ne olmalı?',
        opts: [
            'Hemen iptal işlemini başlatalım.',
            'Haklısınız, sizi anlıyorum. Paket/avantajlara göre alternatif sunayım mı?',
            'Kampanya yok, yapacak bir şey yok.'
        ],
        a: 1,
        exp: 'Empati + ihtiyaç analizi itirazı yumuşatır ve iknayı artırır.'
    },
    {
        q: 'Müşteri: "Uygulama açılmıyor." En hızlı ilk kontrol ne?',
        opts: [
            'Şifreyi sıfırlat.',
            'İnternet bağlantısı / VPN / DNS kontrolü yaptır.',
            'Hemen cihazı fabrika ayarlarına döndür.'
        ],
        a: 1,
        exp: 'Önce kök nedeni daralt: bağlantı mı uygulama mı? Büyük adımları sona bırak.'
    },
    {
        q: 'Müşteri: "Yayın donuyor." Teknikte doğru soru hangisi?',
        opts: [
            'Hangi cihazda (TV/telefon) ve hangi ağda (Wi‑Fi/kablo) oluyor?',
            'Kaç gündür böyle?',
            'Şimdi kapatıp açın.'
        ],
        a: 0,
        exp: 'Cihaz + ağ bilgisi, sorunu hızlı izole etmeyi sağlar.'
    },
    {
        q: 'Müşteri: "İade istiyorum." En doğru yönlendirme?',
        opts: [
            'Hemen kapatalım.',
            'İade koşulları ve adımları net anlat, doğru kanala yönlendir (asistan/rehber).',
            'Tekrar arayın.'
        ],
        a: 1,
        exp: 'Net süreç + doğru kanal = memnuniyet + tekrar aramayı azaltır.'
    },
    {
        q: 'Müşteri: "Kampanyadan yararlanamıyorum." İlk adım?',
        opts: [
            'Kampanya koşulları (tarih/paket/cihaz) uygun mu kontrol et.',
            'Direkt kampanyayı tanımla.',
            'Sorun yok deyip kapat.'
        ],
        a: 0,
        exp: 'Uygunluk kontrolü yapılmadan işlem yapmak hataya sürükler.'
    },
    {
        q: 'Müşteri sinirli: "Kimse çözmedi!" Ne yaparsın?',
        opts: [
            'Sakinleştirici bir cümle + özet + net aksiyon planı.',
            'Sıraya alalım.',
            'Ses yükselt.'
        ],
        a: 0,
        exp: 'Kontrolü geri almak için empati + özet + plan üçlüsü çalışır.'
    }
];

function resetQuickDecision() {
    if (qdTimer) { clearInterval(qdTimer); qdTimer = null; }
    qdTimeLeft = 30; qdScore = 0; qdStep = 0; qdQueue = [];
    openQuickDecisionGame();
}

// --- REKABET VE OYUN LOGIĞİ (Gamer Modu) ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getGameQuestionQueue(pool, storageKey, count) {
    if (!pool || pool.length === 0) return [];

    // LocalStorage'dan son görülenleri al
    let seenIds = [];
    try {
        seenIds = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (e) { seenIds = []; }

    // Soruları index bazlı filtrele (Title veya text bazlı unique ID varsayıyoruz)
    let availableIndices = pool.map((_, i) => i);

    // Eğer pool yeterince büyükse (istenen sayının 2 katı kadar), görülenleri ele
    if (pool.length > count * 2) {
        availableIndices = availableIndices.filter(idx => {
            const q = pool[idx];
            const qId = q.q || q.title || idx.toString();
            return !seenIds.includes(qId);
        });
    }

    // Eğer kalan soru yoksa veya çok azsa temizle (döngüye girsin)
    if (availableIndices.length < count) {
        availableIndices = pool.map((_, i) => i);
    }

    shuffleArray(availableIndices);
    const resultIndices = availableIndices.slice(0, count);

    // Yeni seçilenleri "seen" listesine ekle (en fazla 30 tane sakla)
    resultIndices.forEach(idx => {
        const q = pool[idx];
        const qId = q.q || q.title || idx.toString();
        if (!seenIds.includes(qId)) seenIds.push(qId);
    });
    if (seenIds.length > 30) seenIds = seenIds.slice(-30);
    localStorage.setItem(storageKey, JSON.stringify(seenIds));

    return resultIndices;
}

function startQuickDecision() {
    const bank = (Array.isArray(quickDecisionQuestions) && quickDecisionQuestions.length) ? quickDecisionQuestions : QUICK_DECISION_BANK;
    if (!bank.length) {
        Swal.fire('Hata', 'Hızlı Karar verisi yok.', 'warning');
        return;
    }

    // Modal UI
    const lobby = document.getElementById('qd-lobby');
    const game = document.getElementById('qd-game');
    if (lobby) lobby.style.display = 'none';
    if (game) game.style.display = 'block';

    // Skor ve Soru Sıfırla
    qdScore = 0; qdStep = 0; qdTimeLeft = 30;

    // Rastgele 5 soru seç (Unseen tracking ile)
    const indices = getGameQuestionQueue(bank, 'seenQuickQuestions', 5);
    qdQueue = indices.map(idx => bank[idx]);

    updateQuickHud();
    if (qdTimer) clearInterval(qdTimer);
    qdTimer = setInterval(() => {
        qdTimeLeft--;
        if (qdTimeLeft <= 0) {
            qdTimeLeft = 0;
            finishQuickDecision(true);
        }
    }, 1000);

    renderQuickQuestion();
}

function updateQuickHud() {
    const t = document.getElementById('qd-time'); if (t) t.innerText = String(Math.max(0, qdTimeLeft));
    const s = document.getElementById('qd-score'); if (s) s.innerText = String(qdScore);
    const st = document.getElementById('qd-step'); if (st) st.innerText = String(qdStep);
}

function renderQuickQuestion() {
    const q = qdQueue[qdStep];
    const qEl = document.getElementById('qd-question');
    const optEl = document.getElementById('qd-options');
    if (!qEl || !optEl || !q) return;

    qEl.innerText = q.q;
    optEl.innerHTML = '';

    q.opts.forEach((txt, i) => {
        const b = document.createElement('button');
        b.className = 'quick-opt';
        b.innerText = txt;
        b.onclick = () => answerQuick(i);
        optEl.appendChild(b);
    });
}

function answerQuick(idx) {
    const q = qdQueue[qdStep];
    const optEl = document.getElementById('qd-options');
    if (!q || !optEl) return;

    const btns = Array.from(optEl.querySelectorAll('button'));
    btns.forEach(b => b.disabled = true);

    const correct = (idx === q.a);

    // Görsel Feedback
    if (btns[idx]) {
        btns[idx].style.borderColor = correct ? "#00f2ff" : "#ff5252";
        btns[idx].style.background = correct ? "rgba(0, 242, 255, 0.2)" : "rgba(255, 82, 82, 0.2)";
        btns[idx].style.boxShadow = correct ? "0 0 15px #00f2ff" : "0 0 15px #ff5252";
    }
    if (!correct && btns[q.a]) {
        btns[q.a].style.borderColor = "#00f2ff";
        btns[q.a].style.boxShadow = "0 0 10px #00f2ff";
    }

    // Puanlama: doğru +10, yanlış -5 (Gamer puanlama daha tatmin edicidir)
    qdScore += correct ? 10 : -5;
    if (qdScore < 0) qdScore = 0;
    updateQuickHud();

    Swal.fire({
        toast: true,
        position: 'top',
        icon: correct ? 'success' : 'warning',
        title: correct ? 'DOĞRU!' : 'YANLIŞ!',
        text: q.exp,
        showConfirmButton: false,
        background: '#0a1428',
        color: '#fff',
        timer: 1500
    });

    setTimeout(() => {
        qdStep += 1;
        updateQuickHud();
        if (qdStep >= qdQueue.length) finishQuickDecision(false);
        else renderQuickQuestion();
    }, 1200);
}

function finishQuickDecision(timeout) {
    if (qdTimer) { clearInterval(qdTimer); qdTimer = null; }

    const msg = timeout ? 'SÜRE BİTTİ!' : 'TAMAMLANDI!';
    const scoreColor = qdScore >= 40 ? "#00f2ff" : (qdScore >= 20 ? "#ffcc00" : "#ff5252");

    Swal.fire({
        icon: 'info',
        title: msg,
        background: '#0a1428',
        color: '#fff',
        html: `
            <div style="text-align:center; padding: 10px;">
                <div style="font-size:1.2rem; color:#fff; margin-bottom:15px; font-weight:bold;">🧠 Hızlı Karar Sonucu</div>
                <div style="font-size:3rem; font-weight:900; color:${scoreColor}; text-shadow: 0 0 15px ${scoreColor}cc;">${qdScore}</div>
                <div style="margin-top:10px; color:#fff; font-weight:600;">TOPLAM PUAN</div>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:20px 0;">
                <div style="color:#00f2ff; font-size:1rem; font-weight:600;">Daha hızlı karar vererek rekorunu geliştirebilirsin!</div>
            </div>`,
        confirmButtonText: '<i class="fas fa-redo"></i> Tekrar Oyna',
        confirmButtonColor: '#00f2ff',
        showCancelButton: true,
        cancelButtonText: 'Kapat',
        cancelButtonColor: '#444'
    }).then((r) => {
        if (r.isConfirmed) resetQuickDecision();
        else closeModal('quick-modal');
    });
}

function openPenaltyGame() {
    try { closeModal('game-hub-modal'); } catch (e) { }
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

async function fetchLeaderboard(targetTbodyId = 'leaderboard-body', targetLoaderId = 'leaderboard-loader', targetTableId = 'leaderboard-table') {
    const tbody = document.getElementById(targetTbodyId);
    const loader = document.getElementById(targetLoaderId);
    const table = document.getElementById(targetTableId);

    if (!tbody) return;

    if (loader) loader.style.display = 'block';
    if (table) table.style.display = 'none';
    tbody.innerHTML = '';

    try {
        // TABLO İSMİ DÜZELTME: Scoreboard -> QuizResults (Ekran görüntüsünden teyit edildi)
        const { data, error } = await sb.from('QuizResults').select('*').order('Score', { ascending: false }).limit(20);

        if (loader) loader.style.display = 'none';
        if (error) throw error;

        if (table) table.style.display = 'table';
        let html = '';

        if (!data || data.length === 0) {
            html = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">Henüz maç yapılmadı.</td></tr>`;
        } else {
            const normalizedData = normalizeKeys(data);

            // Kullanıcı bazlı istatistikleri ayıkla
            const userStats = {};
            normalizedData.forEach(u => {
                const name = u.username || u.agent || u.name || 'Anonim';
                const score = parseInt(u.score || 0);
                if (!userStats[name]) {
                    userStats[name] = { maxScore: 0, games: 0, bestRate: '%0' };
                }
                userStats[name].games++;
                if (score > userStats[name].maxScore) {
                    userStats[name].maxScore = score;
                    userStats[name].bestRate = u.average || u.successrate || '%0';
                }
            });

            // En iyiden en kötüye sırala
            const sortedUsers = Object.keys(userStats)
                .map(name => ({ name, ...userStats[name] }))
                .sort((a, b) => b.maxScore - a.maxScore)
                .slice(0, targetTbodyId === 'home-leaderboard-body' ? 5 : 10);

            sortedUsers.forEach((u, i) => {
                const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `<span class="rank-badge">${i + 1}</span>`));
                const name = u.name;
                const score = u.maxScore;
                const games = u.games;
                const rate = u.bestRate;
                const isMe = (name === currentUser);
                const bgStyle = isMe ? 'background:rgba(250, 187, 0, 0.15);' : '';
                const textColor = isMe ? '#fabb00' : (targetTbodyId === 'home-leaderboard-body' ? '#333' : '#eee');

                html += `<tr style="${bgStyle} border-bottom:1px solid rgba(0,0,0,0.05);">
                    <td style="padding:8px 5px; text-align:center;">${medal}</td>
                    <td style="padding:8px 5px; font-weight:${isMe ? '800' : '600'}; color:${textColor}">${escapeHtml(name)}</td>
                    <td style="padding:8px 5px; text-align:center; color:${textColor}">${games}</td>
                    <td style="padding:8px 5px; text-align:center; font-weight:800; color:${textColor}">${rate}</td>
                </tr>`;
            });
        }
        tbody.innerHTML = html;
    } catch (err) {
        console.warn("Leaderboard fetch error:", err);
        if (loader) {
            loader.innerText = "Yüklenemedi.";
            loader.style.display = 'block';
        }
    }
}

function renderHomeLeaderboard() {
    fetchLeaderboard('home-leaderboard-body', 'home-leaderboard-loader', 'home-leaderboard-table');
}

function buildQuestionQueue() {
    return getGameQuestionQueue(quizQuestions, 'seenArenaQuestions', 10);
}

function startPenaltySession() {
    // Session reset
    pScore = 0;
    pBalls = 10;
    pAskedCount = 0;
    pCorrectCount = 0;
    pWrongCount = 0;

    jokers = { call: 1, half: 1, double: 1 };
    doubleChanceUsed = false;
    firstAnswerIndex = -1;
    setDoubleIndicator(false);

    // Soru kuyruğu
    pQuestionQueue = buildQuestionQueue();

    updateJokerButtons();
    document.getElementById('p-score').innerText = pScore;
    document.getElementById('p-balls').innerText = pBalls;

    const restartBtn = document.getElementById('p-restart-btn');
    const optionsEl = document.getElementById('p-options');
    if (restartBtn) restartBtn.style.display = 'none';
    if (optionsEl) optionsEl.style.display = 'grid';

    resetField();
    loadPenaltyQuestion();
}

function pickNextQuestion() {
    if (quizQuestions.length === 0) return null;

    // Önce kuyruktan tüket
    if (pQuestionQueue.length > 0) {
        const i = pQuestionQueue.shift();
        return quizQuestions[i];
    }

    // Kuyruk bitti ama top devam ediyor: artık random (soru azsa)
    return quizQuestions[Math.floor(Math.random() * quizQuestions.length)];
}

function loadPenaltyQuestion() {
    if (pBalls <= 0) { finishPenaltyGame(); return; }
    if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
        Swal.fire('Hata', 'Soru yok!', 'warning');
        return;
    }

    pCurrentQ = pickNextQuestion();
    if (!pCurrentQ || !pCurrentQ.opts || pCurrentQ.opts.length < 2) {
        Swal.fire('Hata', 'Bu soru hatalı formatta (şık yok).', 'error');
        // bir sonraki soruyu dene
        pCurrentQ = pickNextQuestion();
        if (!pCurrentQ) return;
    }

    pAskedCount++;
    doubleChanceUsed = false;
    firstAnswerIndex = -1;
    setDoubleIndicator(false);
    updateJokerButtons();

    const qEl = document.getElementById('p-question-text');
    if (qEl) qEl.innerText = pCurrentQ.q || "Soru";

    let html = '';
    pCurrentQ.opts.forEach((opt, index) => {
        const letter = String.fromCharCode(65 + index);
        html += `<button class="penalty-btn" onclick="shootBall(${index})">${letter}: ${opt}</button>`;
    });

    const optionsEl = document.getElementById('p-options');
    if (optionsEl) optionsEl.innerHTML = html;
}

function shootBall(idx) {
    const btns = document.querySelectorAll('.penalty-btn');
    const isCorrect = (idx === pCurrentQ.a);

    // Double joker: ilk yanlışta bir hak daha
    if (!isCorrect && doubleChanceUsed && firstAnswerIndex === -1) {
        firstAnswerIndex = idx;
        if (btns[idx]) {
            btns[idx].classList.add('wrong-first-try');
            btns[idx].disabled = true;
        }
        Swal.fire({ toast: true, position: 'top', icon: 'info', title: 'İlk Hata! Kalan Hakkın: 1', showConfirmButton: false, timer: 1400, background: '#ffc107' });
        updateJokerButtons();
        return;
    }

    // Artık atış kesinleşti
    btns.forEach(b => b.disabled = true);

    const ballWrap = document.getElementById('ball-wrap');
    const keeperWrap = document.getElementById('keeper-wrap');
    const shooterWrap = document.getElementById('shooter-wrap');
    const goalMsg = document.getElementById('goal-msg');

    const shotDir = Math.floor(Math.random() * 4);
    if (shooterWrap) shooterWrap.classList.add('shooter-run');

    setTimeout(() => {
        if (keeperWrap) {
            if (isCorrect) {
                if (shotDir === 0 || shotDir === 2) keeperWrap.classList.add('keeper-dive-right');
                else keeperWrap.classList.add('keeper-dive-left');
            } else {
                if (shotDir === 0 || shotDir === 2) keeperWrap.classList.add('keeper-dive-left');
                else keeperWrap.classList.add('keeper-dive-right');
            }
        }

        if (isCorrect) {
            if (ballWrap) {
                if (shotDir === 0) ballWrap.classList.add('ball-shoot-left-top');
                else if (shotDir === 1) ballWrap.classList.add('ball-shoot-right-top');
                else if (shotDir === 2) ballWrap.classList.add('ball-shoot-left-low');
                else ballWrap.classList.add('ball-shoot-right-low');
            }

            setTimeout(() => {
                if (goalMsg) {
                    goalMsg.innerText = "GOOOOL!";
                    goalMsg.style.color = "#00f2ff";
                    goalMsg.style.textShadow = "0 0 20px #00f2ff";
                    goalMsg.classList.add('show');
                }
                pScore += (doubleChanceUsed ? 2 : 1);
                pCorrectCount++;
                document.getElementById('p-score').innerText = pScore;

                Swal.fire({
                    toast: true,
                    position: 'top',
                    icon: 'success',
                    title: 'MÜKEMMEL ŞUT!',
                    showConfirmButton: false,
                    timer: 1200,
                    background: '#0e1b42',
                    color: '#00f2ff'
                });
            }, 500);

        } else {
            pWrongCount++;

            const showWrong = () => {
                if (goalMsg) {
                    goalMsg.style.color = "#ff5252";
                    goalMsg.style.textShadow = "0 0 20px #ff5252";
                    goalMsg.classList.add('show');
                }
                Swal.fire({
                    icon: 'error',
                    title: 'KAÇIRDIN!',
                    text: `Doğru Cevap: ${String.fromCharCode(65 + pCurrentQ.a)}`,
                    showConfirmButton: true,
                    background: '#0a1428',
                    color: '#fff',
                    confirmButtonColor: '#ff5252'
                });
            };

            if (Math.random() > 0.5) {
                if (ballWrap) {
                    ballWrap.style.bottom = "160px";
                    ballWrap.style.left = (shotDir === 0 || shotDir === 2) ? "40%" : "60%";
                    ballWrap.style.transform = "scale(0.6)";
                }
                setTimeout(() => { if (goalMsg) goalMsg.innerText = "KURTARDI!"; showWrong(); }, 500);
            } else {
                if (ballWrap) ballWrap.classList.add(Math.random() > 0.5 ? 'ball-miss-left' : 'ball-miss-right');
                setTimeout(() => { if (goalMsg) goalMsg.innerText = "DIŞARI!"; showWrong(); }, 500);
            }
        }
    }, 400);

    // top azalt
    pBalls--;
    document.getElementById('p-balls').innerText = pBalls;

    setTimeout(() => { resetField(); loadPenaltyQuestion(); }, 3200);
}

function resetField() {
    const ballWrap = document.getElementById('ball-wrap');
    const keeperWrap = document.getElementById('keeper-wrap');
    const shooterWrap = document.getElementById('shooter-wrap');
    const goalMsg = document.getElementById('goal-msg');

    if (ballWrap) { ballWrap.className = 'ball-wrapper'; ballWrap.style = ""; }
    if (keeperWrap) keeperWrap.className = 'keeper-wrapper';
    if (shooterWrap) shooterWrap.className = 'shooter-wrapper';
    if (goalMsg) goalMsg.classList.remove('show');

    document.querySelectorAll('.penalty-btn').forEach(b => {
        b.classList.remove('wrong-first-try');
        b.style.textDecoration = '';
        b.style.opacity = '';
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
        b.style.boxShadow = '';
        b.disabled = false;
    });
}

function finishPenaltyGame() {
    const totalShots = 10;
    const title = pScore >= 8 ? "EFSANE! 🏆" : (pScore >= 5 ? "İyi Maçtı! 👏" : "Antrenman Lazım 🤕");
    const acc = Math.round((pCorrectCount / Math.max(1, (pCorrectCount + pWrongCount))) * 100);
    const scoreColor = pScore >= 8 ? "#00f2ff" : (pScore >= 5 ? "#ffcc00" : "#ff5252");

    const qEl = document.getElementById('p-question-text');
    if (qEl) {
        qEl.innerHTML = `
            <div style="text-align:center; padding:15px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid #333;">
                <div style="font-size:1.8rem; color:#00f2ff; font-weight:900; text-shadow:0 0 10px #00f2ff66;">MAÇ BİTTİ!</div>
                <div style="margin-top:8px; font-size:1.2rem; color:#fff; font-weight:600;">${title}</div>
                <div style="display:flex; justify-content:center; gap:20px; margin-top:20px;">
                    <div style="text-align:center;">
                        <div style="font-size:0.8rem; color:#888; text-transform:uppercase;">Skor</div>
                        <div style="font-size:2rem; font-weight:900; color:${scoreColor};">${pScore}/${totalShots}</div>
                    </div>
                    <div style="text-align:center; border-left:1px solid #333; padding-left:20px;">
                        <div style="font-size:0.8rem; color:#888; text-transform:uppercase;">Doğruluk</div>
                        <div style="font-size:2rem; font-weight:900; color:#fff;">${acc}%</div>
                    </div>
                </div>
                <div style="margin-top:15px; font-size:0.9rem; color:#aaa;">
                    Doğru: <span style="color:#00f2ff">${pCorrectCount}</span> &nbsp; | &nbsp; Yanlış: <span style="color:#ff5252">${pWrongCount}</span>
                </div>
            </div>
        `;
    }

    const optionsEl = document.getElementById('p-options');
    const restartBtn = document.getElementById('p-restart-btn');
    if (optionsEl) optionsEl.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'block';

    // Leaderboard log
    apiCall('logQuiz', {
        username: currentUser,
        score: pScore * 10,
        total: 10,
        successRate: acc + '%'
    }).finally(() => {
        setTimeout(fetchLeaderboard, 600);
    });
}


// --- WIZARD FUNCTIONS ---
function openWizard() {
    document.getElementById('wizard-modal').style.display = 'flex';
    if (Object.keys(wizardStepsData).length === 0) {
        Swal.fire({ title: 'İade Asistanı Verisi Yükleniyor...', didOpen: () => Swal.showLoading() });
        loadWizardData().then(() => { Swal.close(); if (wizardStepsData['start']) renderStep('start'); else document.getElementById('wizard-body').innerHTML = '<h2 style="color:red;">Asistan verisi eksik.</h2>'; })
            .catch(() => { Swal.close(); document.getElementById('wizard-body').innerHTML = '<h2 style="color:red;">Veri çekme hatası.</h2>'; });
    } else { renderStep('start'); }
}
function renderStep(k) {
    const s = wizardStepsData[k];
    if (!s) { document.getElementById('wizard-body').innerHTML = `<h2 style="color:red;">HATA: Adım ID (${k}) yok.</h2>`; return; }
    const b = document.getElementById('wizard-body');

    // Admin için Edit Butonu
    let editBtn = isAdminMode ? `<button class="btn-edit-wizard" onclick="openWizardEditor('WizardSteps', '${k}')" style="float:right; background:none; border:none; color:#999; cursor:pointer;" title="Bu adımı düzenle"><i class="fas fa-edit"></i></button>` : '';

    let h = `${editBtn}<h2 style="color:var(--primary);">${s.title || ''}</h2>`;
    if (s.result) {
        let i = s.result === 'red' ? ' 🛑 ' : (s.result === 'green' ? ' ✅ ' : ' ⚠️ ');
        let c = s.result === 'red' ? 'res-red' : (s.result === 'green' ? 'res-green' : 'res-yellow');
        h += `<div class="result-box ${c}"><div style="font-size:3rem;margin-bottom:10px;">${i}</div><h3>${s.title}</h3><p>${s.text}</p>${s.script ? `<div class="script-box">${s.script}</div>` : ''}</div><button class="restart-btn" onclick="renderStep('start')"><i class="fas fa-redo"></i> Başa Dön</button>`;
    } else {
        h += `<p>${s.text}</p><div class="wizard-options">`;
        s.options.forEach(o => { h += `<button class="option-btn" onclick="renderStep('${o.next}')"><i class="fas fa-chevron-right"></i> ${o.text}</button>`; });
        h += `</div>`; if (k !== 'start') h += `<button class="restart-btn" onclick="renderStep('start')" style="background:#eee;color:#333;margin-top:15px;">Başa Dön</button>`;
    }
    b.innerHTML = h;
}
// --- TECH WIZARD ---
const twState = { currentStep: 'start', history: [] };
function openTechWizard() {
    // Teknik Sihirbaz artık Teknik (tam ekran) içinde
    openTechArea('wizard');
}
function twRenderStep() {
    const contentDiv = document.getElementById('tech-wizard-content') || document.getElementById('x-wizard');
    const backBtn = document.getElementById('tw-btn-back');
    if (!contentDiv) return;
    const stepData = techWizardData[twState.currentStep];
    if (twState.history.length > 0) backBtn.style.display = 'block'; else backBtn.style.display = 'none';
    if (!stepData) { contentDiv.innerHTML = `<div class="alert" style="color:red;">Hata: Adım bulunamadı (${twState.currentStep}).</div>`; return; }
    let editBtn = isAdminMode ? `<button class="btn-edit-wizard" onclick="openWizardEditor('TechWizardSteps', '${twState.currentStep}')" style="float:right; background:none; border:none; color:#eee; cursor:pointer;" title="Bu adımı düzenle"><i class="fas fa-edit"></i></button>` : '';
    let html = `${editBtn}<div class="tech-step-title">${stepData.title || ''}</div>`;
    if (stepData.text) html += `<p style="font-size:1rem; margin-bottom:15px;">${stepData.text}</p>`;
    if (stepData.script) {
        const safeScript = encodeURIComponent(stepData.script);
        html += `<div class="tech-script-box"><span class="tech-script-label">Müşteriye iletilecek:</span>"${stepData.script}"<div style="margin-top:10px; text-align:right;"><button class="btn btn-copy" style="font-size:0.8rem; padding:5px 10px;" onclick="copyScriptContent('${safeScript}')"><i class="fas fa-copy"></i> Kopyala</button></div></div>`;
    }
    if (stepData.alert) html += `<div class="tech-alert">${stepData.alert}</div>`;
    if (stepData.buttons && stepData.buttons.length > 0) {
        html += `<div class="tech-buttons-area">`;
        stepData.buttons.forEach(btn => { let btnClass = btn.style === 'option' ? 'tech-btn-option' : 'tech-btn-primary'; html += `<button class="tech-btn ${btnClass}" onclick="twChangeStep('${btn.next}')">${btn.text}</button>`; });
        html += `</div>`;
    }
    contentDiv.innerHTML = html;
}
function twChangeStep(newStep) { twState.history.push(twState.currentStep); twState.currentStep = newStep; twRenderStep(); }
function twGoBack() { if (twState.history.length > 0) { twState.currentStep = twState.history.pop(); twRenderStep(); } }
function twResetWizard() { twState.currentStep = 'start'; twState.history = []; twRenderStep(); }
// ==========================================================
// --- YENİ KALİTE LMS MODÜLÜ (TAM EKRAN ENTEGRASYONU) ---
// ==========================================================
// Modülü Aç
// Redundant Quality functions removed.
function populateFeedbackMonthFilter() {
    const el = document.getElementById('q-feedback-month');
    if (!el) return;
    // if (el.innerHTML !== '') return; // Her ihtimale karşı doldur

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    el.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        let month = (currentMonth - i + 12) % 12;
        let year = currentYear - (currentMonth - i < 0 ? 1 : 0);
        const value = `${String(month + 1).padStart(2, '0')}.${year}`;
        const text = `${MONTH_NAMES[month]} ${year}`;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        if (i === 0) opt.selected = true;
        el.appendChild(opt);
    }
}
// --- DASHBOARD FONKSİYONLARI ---
function populateMonthFilterFull() {
    const selectIds = ['q-dash-month', 'q-eval-month', 'q-feedback-month']; // Tüm ay filtrelerini doldur
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    selectIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            let month = (currentMonth - i + 12) % 12;
            let year = currentYear - (currentMonth - i < 0 ? 1 : 0);
            const value = `${String(month + 1).padStart(2, '0')}.${year}`;
            const text = `${MONTH_NAMES[month]} ${year}`;
            const opt = document.createElement('option');
            opt.value = value; opt.textContent = text;
            if (i === 0) opt.selected = true;
            el.appendChild(opt);
        }
    });
}
// YENİ: Dashboard Filtrelerini Doldurma
// ✅ Tüm admin filtrelerini (Dashboard + Geçmiş) dolduran merkezi fonksiyon
function populateAllAdminFilters() {
    if (!isAdminMode) return;

    // 1. Dashboard Filtreleri
    populateDashboardFilters();

    // 2. Değerlendirme Geçmişi Filtreleri
    const groupSelect = document.getElementById('q-admin-group');
    if (groupSelect && adminUserList.length > 0) {
        const groups = [...new Set(adminUserList.map(u => u.group).filter(g => g))].sort();
        groupSelect.innerHTML = `<option value="all">Tüm Gruplar</option>` + groups.map(g => `<option value="${g}">${g}</option>`).join('');
        updateAgentListBasedOnGroup();
    }

    // 3. Geri Bildirim Filtreleri
    populateFeedbackFilters();
}

function populateDashboardFilters() {
    const groupSelect = document.getElementById('q-dash-group');
    const agentSelect = document.getElementById('q-dash-agent');
    const channelSelect = document.getElementById('q-dash-channel');
    if (!isAdminMode) {
        if (groupSelect) groupSelect.style.display = 'none';
        if (agentSelect) agentSelect.style.display = 'none';
        return;
    } else {
        if (groupSelect) groupSelect.style.display = 'block';
        if (agentSelect) agentSelect.style.display = 'block';
    }

    if (!groupSelect) return;

    // ✅ İstek: Sadece belirli takımlar gözüksün (Yönetim vs. gizli)
    const allowedWords = ['chat', 'istchat', 'satış', 'satis'];
    const groups = [...new Set(adminUserList.map(u => u.group).filter(g => {
        if (!g) return false;
        const low = g.toLowerCase();
        return allowedWords.some(word => low.includes(word));
    }))].sort();

    groupSelect.innerHTML = '<option value="all">Tüm Gruplar</option>';
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g; opt.innerText = g;
        groupSelect.appendChild(opt);
    });
    // İlk yüklemede tüm agentları listele
    updateDashAgentList();
}
// YENİ: Dashboard Agent Listesini Güncelleme
function updateDashAgentList() {
    const groupSelect = document.getElementById('q-dash-group');
    const agentSelect = document.getElementById('q-dash-agent');
    if (!agentSelect) return;
    const selectedGroup = groupSelect.value;
    agentSelect.innerHTML = '<option value="all">Tüm Temsilciler</option>';

    let filteredUsers = adminUserList;
    if (selectedGroup !== 'all') {
        filteredUsers = adminUserList.filter(u => u.group === selectedGroup);
    }
    filteredUsers.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.name;
        opt.innerText = u.name;
        agentSelect.appendChild(opt);
    });

    updateDashRingTitle();
    refreshQualityData();
}

// ✅ Dashboard ring başlığı + admin temsilci ortalamaları
function updateDashRingTitle() {
    const titleEl = document.getElementById('q-dash-ring-title') || document.getElementById('q-dash-ring-title'.replace('title', 'title'));
    // (id kesin: q-dash-ring-title)
    const tEl = document.getElementById('q-dash-ring-title');
    if (!tEl) return;

    if (!isAdminMode) {
        tEl.textContent = 'Puan Durumu';
        return;
    }

    const gSel = document.getElementById('q-dash-group');
    const aSel = document.getElementById('q-dash-agent');
    const g = gSel ? gSel.value : 'all';
    const a = aSel ? aSel.value : 'all';

    if (a && a !== 'all') {
        tEl.textContent = `${a} Puan Durumu`;
    } else if (g && g !== 'all') {
        tEl.textContent = `${g} Takım Ortalaması`;
    } else {
        tEl.textContent = 'Genel Puan Ortalaması';
    }
}

// Admin için: temsilci ortalamaları listesini bas
function renderDashAgentScores(evals) {
    const box = document.getElementById('q-dash-agent-scores');
    if (!box) return;

    // Sadece admin + agent=all iken göster (yoksa gereksiz kalabalık)
    if (!isAdminMode) { box.style.display = 'none'; return; }

    const gSel = document.getElementById('q-dash-group');
    const aSel = document.getElementById('q-dash-agent');
    const g = gSel ? gSel.value : 'all';
    const a = aSel ? aSel.value : 'all';

    if (a && a !== 'all') { box.style.display = 'none'; return; }

    // evals -> agent bazlı ortalama
    const byAgent = {};
    (evals || []).forEach(e => {
        const agent = e.agent || 'N/A';
        const group = e.group || '';
        const score = parseFloat(e.score) || 0;
        if (!byAgent[agent]) byAgent[agent] = { total: 0, count: 0, group: group };
        byAgent[agent].total += score;
        byAgent[agent].count += 1;
        // group boşsa son görüleni yaz
        if (!byAgent[agent].group && group) byAgent[agent].group = group;
    });

    const rows = Object.keys(byAgent).map(name => {
        const o = byAgent[name];
        return { name, group: o.group || (g !== 'all' ? g : ''), avg: o.count ? (o.total / o.count) : 0, count: o.count };
    });

    // Eğer group seçiliyse sadece o grubun kullanıcıları zaten geliyor; ama garanti olsun
    const filteredRows = (g && g !== 'all') ? rows.filter(r => (r.group || '') === g) : rows;

    // Sırala: en düşük ortalama üstte (iyileştirme alanı)
    filteredRows.sort((x, y) => x.avg - y.avg);

    if (filteredRows.length === 0) { box.style.display = 'none'; return; }

    // Tüm kişileri göster (CSS ile gerekirse kaydırılabilir)
    const top = filteredRows;

    box.innerHTML = top.map(r => `
        <div class="das-item">
            <div class="das-left">
                <span class="das-name">${escapeHtml(r.name)}</span>
                ${r.group ? `<span class="das-group">${escapeHtml(r.group)}</span>` : ``}
            </div>
            <div class="das-score">${(r.avg || 0).toFixed(1)}</div>
        </div>
    `).join('');

    box.style.display = 'grid';
}

// Detay alanını toleranslı parse et
function deriveChannelFromGroup(group) {
    const g = String(group || '').toLowerCase();
    if (!g) return 'other';
    if (g.includes('telesat') || g.includes('telesatış') || g === 'telesales') return 'sales';
    if (g.includes('chat')) return 'chat';
    return 'other';
}

function safeParseDetails(details) {
    if (!details) return null;
    if (Array.isArray(details)) return details;
    if (typeof details === 'object') return details;
    if (typeof details === 'string') {
        const s = details.trim();
        if (!s) return null;
        // Bazı eski kayıtlar çift tırnak kaçışlı gelebilir
        const tryList = [s, s.replace(/\"/g, '"'), s.replace(/'/g, '"')];
        for (const cand of tryList) {
            try {
                const parsed = JSON.parse(cand);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) { }
        }
    }
    return null;
}

// ✅ YENİ: Feedback (Geri Bildirimler) Filtrelerini Doldurma
function populateFeedbackFilters() {
    const groupSelect = document.getElementById('q-feedback-group');
    const agentSelect = document.getElementById('q-feedback-agent');
    if (!groupSelect || !agentSelect) return;

    if (!isAdminMode) {
        groupSelect.style.display = 'none';
        agentSelect.style.display = 'none';
        return;
    } else {
        groupSelect.style.display = 'block';
        agentSelect.style.display = 'block';
    }

    const groups = [...new Set(adminUserList.map(u => u.group).filter(g => g))].sort();
    groupSelect.innerHTML = '<option value="all">Tüm Gruplar</option>';
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        groupSelect.appendChild(opt);
    });

    // İlk yüklemede tüm agentları listele
    updateFeedbackAgentList(false);
}

function updateFeedbackAgentList(shouldRefresh = true) {
    const groupSelect = document.getElementById('q-feedback-group');
    const agentSelect = document.getElementById('q-feedback-agent');
    if (!groupSelect || !agentSelect) return;

    const selectedGroup = groupSelect.value;

    // seçilen gruba göre kullanıcıları filtrele
    const filteredUsers = adminUserList.filter(u => {
        if (!u || !u.username) return false;
        if (selectedGroup === 'all') return true;
        return u.group === selectedGroup;
    });

    const agents = filteredUsers
        .map(u => u.username)
        .filter(a => a)
        .sort((a, b) => a.localeCompare(b, 'tr'));

    agentSelect.innerHTML = '<option value="all">Tüm Temsilciler</option>';
    agents.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        agentSelect.appendChild(opt);
    });

    if (shouldRefresh) refreshFeedbackData();
}

async function fetchEvaluationsForFeedback() {
    const groupSelect = document.getElementById('q-feedback-group');
    const agentSelect = document.getElementById('q-feedback-agent');

    let targetAgent = currentUser;
    let targetGroup = 'all';

    if (isAdminMode) {
        targetAgent = agentSelect ? agentSelect.value : 'all';
        targetGroup = groupSelect ? groupSelect.value : 'all';
    }

    try {
        const d = await apiCall("fetchEvaluations", { targetAgent, targetGroup });
        if (d.result === "success") {
            allEvaluationsData = d.evaluations || []; // Ya reverse() ya da order DESC
        } else {
            allEvaluationsData = [];
        }
    } catch (e) {
        allEvaluationsData = [];
    }
}

async function refreshFeedbackData() {
    // Feedback ekranı için (admin filtrelerine göre) değerlendirmeleri + logları çek, sonra listeyi bas
    await fetchEvaluationsForFeedback();
    await fetchFeedbackLogs();
    loadFeedbackList();
}


function refreshQualityData() {
    loadQualityDashboard();
}
async function fetchEvaluationsForDashboard() {
    // Dashboard filtrelerine göre değerlendirmeleri çek (admin ise seçilen grup/temsilciye göre)
    const groupSelect = document.getElementById('q-dash-group');
    const agentSelect = document.getElementById('q-dash-agent');

    let targetAgent = currentUser;
    let targetGroup = 'all';

    if (isAdminMode) {
        targetAgent = agentSelect ? agentSelect.value : 'all';
        targetGroup = groupSelect ? groupSelect.value : 'all';
    }

    try {
        console.log("[Pusula] Fetching evaluations from Supabase...");
        const d = await apiCall("fetchEvaluations", { targetAgent, targetGroup });

        if (d.result === 'success') {
            allEvaluationsData = d.evaluations || [];
            console.log(`[Pusula] ${allEvaluationsData.length} evaluations loaded.`);
        } else {
            throw new Error(d.message);
        }
    } catch (err) {
        console.error("[Pusula] Evaluations Fetch Error:", err);
        allEvaluationsData = [];
    }
}

// safeParseDetails removed (using the one at 3259)
function loadQualityDashboard() {
    // Verileri çek (silent mode), veri gelince grafikleri çiz
    fetchEvaluationsForDashboard().then(() => {
        const monthSelect = document.getElementById('q-dash-month');
        const groupSelect = document.getElementById('q-dash-group');
        const agentSelect = document.getElementById('q-dash-agent');
        const selectedMonth = monthSelect ? monthSelect.value : '';
        const selectedGroup = groupSelect ? groupSelect.value : 'all';
        const selectedAgent = agentSelect ? agentSelect.value : 'all';
        const selectedChannel = "all";
        let filtered = allEvaluationsData.filter(e => {
            const rawDate = (e.callDate && e.callDate !== 'N/A') ? e.callDate : e.date;
            if (!rawDate || typeof rawDate !== 'string') return false;
            const eDate = rawDate.substring(3); // dd.MM.yyyy -> MM.yyyy
            const matchMonth = (eDate === selectedMonth);

            let matchGroup = true;
            let matchAgent = true;
            // Admin filtreleme mantığı
            if (isAdminMode) {
                // Eğer veri içinde grup bilgisi varsa onu kullan, yoksa adminUserList'ten bakmak gerekir.
                if (selectedGroup !== 'all') {
                    if (e.group) {
                        matchGroup = (e.group === selectedGroup);
                    } else {
                        const user = adminUserList.find(u => u.name === e.agent);
                        matchGroup = (user && user.group === selectedGroup);
                    }
                }

                if (selectedAgent !== 'all' && e.agent !== selectedAgent) matchAgent = false;
            } else {
                // Admin değilse sadece kendi verisi
                if (e.agent !== currentUser) matchAgent = false;
            }
            // MANUEL kayıtları dashboard'da gösterme
            const isManual = e.callId && String(e.callId).toUpperCase().startsWith('MANUEL-');
            return matchMonth && matchGroup && matchAgent && !isManual;
        });
        const total = filtered.reduce((acc, curr) => acc + (parseInt(curr.score) || 0), 0);
        const count = filtered.length;
        const avg = count > 0 ? (total / count).toFixed(1) : 0;
        const targetHit = filtered.filter(e => e.score >= 90).length;
        const rate = count > 0 ? Math.round((targetHit / count) * 100) : 0;
        // En zayıf kriter (detay varsa)
        let worstLabel = '-';
        try {
            const qs = {};
            filtered.forEach(item => {
                const details = safeParseDetails(item.details);
                if (!Array.isArray(details)) return;
                details.forEach(d => {
                    const key = String(d.q || '').trim();
                    if (!key) return;
                    const earned = parseFloat(d.score || 0) || 0;
                    const maxv = parseFloat(d.max || 0) || 0;
                    if (!qs[key]) qs[key] = { earned: 0, max: 0 };
                    qs[key].earned += earned;
                    qs[key].max += maxv;
                });
            });
            const arr = Object.keys(qs).map(k => {
                const o = qs[k];
                const pct = o.max > 0 ? (o.earned / o.max) * 100 : 100;
                return { k, pct };
            }).sort((a, b) => a.pct - b.pct);
            if (arr.length) {
                const k = arr[0].k;
                worstLabel = k.length > 28 ? (k.substring(0, 28) + '…') : k;
            }
        } catch (e) { }
        const worstEl = document.getElementById('q-dash-worst');
        if (worstEl) worstEl.innerText = worstLabel;

        // UI Güncelle
        document.getElementById('q-dash-score').innerText = avg;
        document.getElementById('q-dash-count').innerText = count;
        document.getElementById('q-dash-target').innerText = `%${rate}`;

        // Ring Chart Rengi
        const ring = document.getElementById('q-dash-ring');
        let color = '#2e7d32';
        if (avg < 70) color = '#d32f2f'; else if (avg < 85) color = '#ed6c02';
        const ratio = (avg / 100) * 100;
        if (ring) ring.style.background = `conic-gradient(${color} ${ratio}%, #eee ${ratio}%)`;
        if (document.getElementById('q-dash-ring-text')) document.getElementById('q-dash-ring-text').innerText = Math.round(avg);
        updateDashRingTitle();
        // Admin için: temsilci ortalamaları
        renderDashAgentScores(filtered);
        // Grafik Çizdir
        renderDashboardCharts(filtered);
    });
}
function renderDashboardChart(data) {
    const ctx = document.getElementById('q-breakdown-chart');
    if (!ctx) return;
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    // --- KRİTER BAZLI ANALİZ ---
    let questionStats = {};
    if (data.length > 0) {
        data.forEach(item => {
            try {
                // Detay verisini kontrol et, string ise parse et
                let details = safeParseDetails(item.details);

                if (Array.isArray(details)) {
                    details.forEach(d => {
                        let qFullText = d.q; // Tam metin
                        // Soruyu anahtar olarak kullan (kısaltılmış versiyonu)
                        let qShortText = qFullText.length > 25 ? qFullText.substring(0, 25) + '...' : qFullText;

                        if (!questionStats[qShortText]) {
                            // fullText'i tutuyoruz ki tooltip'te gösterebilelim
                            questionStats[qShortText] = { earned: 0, max: 0, fullText: qFullText };
                        }

                        questionStats[qShortText].earned += parseInt(d.score || 0);
                        questionStats[qShortText].max += parseInt(d.max || 0);
                    });
                }
            } catch (e) {
                // JSON parse hatası veya eski veri formatı
                console.log("Detay verisi işlenemedi", e);
            }
        });
    }
    // İstatistikleri diziye çevirip başarı oranına göre sırala
    let statsArray = Object.keys(questionStats).map(key => {
        let s = questionStats[key];
        // Başarı oranı %
        let percentage = s.max > 0 ? (s.earned / s.max) * 100 : 0;
        return { label: key, fullLabel: s.fullText, value: percentage };
    });

    // Başarı oranına göre artan sıralama (En düşük başarı en başta)
    statsArray.sort((a, b) => a.value - b.value);

    // Eğer detay kırılımı yoksa (eski/boş kayıtlar), temsilci ortalamasına göre kırılım göster
    if (statsArray.length === 0) {
        const byAgent = {};
        data.forEach(it => {
            const a = it.agent || 'N/A';
            const s = parseFloat(it.score) || 0;
            if (!byAgent[a]) byAgent[a] = { total: 0, count: 0 };
            byAgent[a].total += s;
            byAgent[a].count += 1;
        });
        const aArr = Object.keys(byAgent).map(name => ({
            label: name.length > 25 ? name.substring(0, 25) + '...' : name,
            fullLabel: name,
            value: byAgent[name].count ? (byAgent[name].total / byAgent[name].count) : 0
        }));
        aArr.sort((x, y) => x.value - y.value);
        let topIssues = aArr.slice(0, 6);
        let chartLabels = topIssues.map(i => i.label);
        let chartData = topIssues.map(i => i.value.toFixed(1));

        dashboardChart = new Chart(ctx, {
            type: 'bar',
            plugins: [valueLabelPlugin],
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Ortalama Puan',
                    data: chartData,
                    backgroundColor: (ctx) => {
                        const v = ctx.raw;
                        return v < 70 ? 'rgba(231, 76, 60, 0.8)' : (v < 85 ? 'rgba(241, 196, 15, 0.8)' : 'rgba(46, 204, 113, 0.8)');
                    },
                    borderRadius: 6,
                    borderWidth: 0,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                layout: { padding: { top: 45, right: 45, bottom: 10, left: 10 } },
                scales: {
                    x: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { font: { weight: '600', size: 11 } } }
                },
                plugins: {
                    legend: { display: false },
                    valueLabelPlugin: { formatter: (v) => `${Number(v).toFixed(1)}` },
                    tooltip: {
                        backgroundColor: 'rgba(14, 27, 66, 0.95)',
                        padding: 12,
                        titleFont: { size: 13, weight: 'bold' },
                        bodyFont: { size: 12 },
                        cornerRadius: 8,
                        callbacks: {
                            title: (context) => topIssues[context[0].dataIndex].fullLabel,
                            label: (context) => `Ortalama: ${context.parsed.x} Puan`
                        }
                    }
                }
            }
        });
        return;
    }

    // Sadece en düşük 6 kriteri göster
    let topIssues = statsArray.slice(0, 6);
    let chartLabels = topIssues.map(i => i.label);
    let chartData = topIssues.map(i => i.value.toFixed(1));

    dashboardChart = new Chart(ctx, {
        type: 'bar',
        plugins: [valueLabelPlugin],
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Başarı Oranı (%)',
                data: chartData,
                backgroundColor: (ctx) => {
                    const v = ctx.raw;
                    return v < 70 ? 'rgba(231, 76, 60, 0.85)' : (v < 90 ? 'rgba(241, 196, 15, 0.85)' : 'rgba(46, 204, 113, 0.85)');
                },
                borderRadius: 8,
                barThickness: 26
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            layout: { padding: { top: 45, right: 75, bottom: 10, left: 10 } },
            scales: {
                x: { beginAtZero: true, max: 135, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { display: false } },
                y: { grid: { display: false }, ticks: { font: { weight: '700', size: 12 } } }
            },
            plugins: {
                legend: { display: false },
                valueLabelPlugin: { formatter: (v) => `${Number(v).toFixed(1)}%` },
                tooltip: {
                    backgroundColor: 'rgba(14, 27, 66, 0.95)',
                    callbacks: {
                        title: (context) => topIssues[context[0].dataIndex].fullLabel,
                        label: (context) => `Başarı: ${context.parsed.x}%`
                    }
                }
            }
        }
    });
}


function destroyIfExists(chart) {
    try { if (chart) chart.destroy(); } catch (e) { }
}

// --- Chart veri etiketleri (harici plugin gerektirmez) ---
// Chart.js v3+ uyumlu, bar/line/doughnut üzerinde değerleri yazar.
const valueLabelPlugin = {
    id: 'valueLabelPlugin',
    afterDatasetsDraw(chart, args, pluginOptions) {
        const opt = pluginOptions || {};
        if (opt.display === false) return;
        const ctx = chart.ctx;
        const type = chart.config.type;
        const datasets = chart.data && chart.data.datasets ? chart.data.datasets : [];

        ctx.save();
        ctx.font = opt.font || '700 13px "Inter", sans-serif';
        ctx.fillStyle = opt.color || '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const format = typeof opt.formatter === 'function'
            ? opt.formatter
            : (v) => (v === null || typeof v === 'undefined' ? '' : String(v));

        if (type === 'doughnut' || type === 'pie') {
            const total = (datasets[0] && Array.isArray(datasets[0].data))
                ? datasets[0].data.reduce((a, b) => a + (parseFloat(b) || 0), 0)
                : 0;
            const meta = chart.getDatasetMeta(0);
            meta.data.forEach((arc, i) => {
                const raw = (datasets[0].data || [])[i];
                const val = parseFloat(raw) || 0;
                if (!val || !total) return;
                const pct = (val / total) * 100;
                if (pct < (opt.minPercentToShow || 4)) return;
                const p = arc.tooltipPosition();
                ctx.fillText((opt.showPercent ? `${pct.toFixed(0)}%` : format(raw, i, chart)), p.x, p.y);
            });
            ctx.restore();
            return;
        }

        datasets.forEach((ds, di) => {
            const meta = chart.getDatasetMeta(di);
            if (meta.hidden) return;
            meta.data.forEach((el, i) => {
                const raw = Array.isArray(ds.data) ? ds.data[i] : null;
                const txt = format(raw, i, chart);
                if (!txt) return;
                const pos = el.tooltipPosition();
                const isHorizontal = chart.config.options.indexAxis === 'y';
                if (isHorizontal && type === 'bar') {
                    ctx.textAlign = 'right';
                    ctx.fillText(txt, pos.x - 10, pos.y);
                } else {
                    const dy = (type === 'bar') ? -10 : -12;
                    ctx.fillText(txt, pos.x, pos.y + dy);
                }
            });
        });

        ctx.restore();
    }
};

function renderDashboardCharts(filtered) {
    renderDashboardChart(filtered); // mevcut: kriter bazlı bar
    renderDashboardTrendChart(filtered);
    renderDashboardChannelChart(filtered);
    renderDashboardScoreDistributionChart(filtered);
    renderDashboardGroupAvgChart(filtered);
}

function renderDashboardTrendChart(data) {
    const canvas = document.getElementById('q-trend-chart');
    if (!canvas) return;
    destroyIfExists(dashTrendChart);

    // Günlük ortalama (dd.MM.yyyy)
    const byDay = {};
    (data || []).forEach(e => {
        const day = String(e.callDate || e.date || '').trim();
        if (!day) return;
        const s = parseFloat(e.score) || 0;
        if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
        byDay[day].total += s;
        byDay[day].count += 1;
    });

    const days = Object.keys(byDay).sort((a, b) => {
        // dd.MM.yyyy
        const pa = a.split('.'); const pb = b.split('.');
        const da = new Date(Number(pa[2]), Number(pa[1]) - 1, Number(pa[0]));
        const db = new Date(Number(pb[2]), Number(pb[1]) - 1, Number(pb[0]));
        return da - db;
    });

    const labels = days.map(d => d.substring(0, 5)); // dd.MM
    const values = days.map(d => (byDay[d].count ? (byDay[d].total / byDay[d].count) : 0).toFixed(1));

    const sub = document.getElementById('q-trend-sub');
    if (sub) {
        sub.textContent = days.length ? `${days.length} gün • günlük ortalama` : 'Veri yok';
    }

    dashTrendChart = new Chart(canvas, {
        type: 'line',
        plugins: [valueLabelPlugin],
        data: {
            labels,
            datasets: [{
                label: 'Günlük Ortalama',
                data: values,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3498db',
                pointBorderWidth: 2,
                borderWidth: 3
            }]
        },
        options: {
            layout: { padding: { top: 45, right: 25, left: 10 } },
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 120, grid: { color: 'rgba(0,0,0,0.03)' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                valueLabelPlugin: { formatter: (v) => `${Number(v).toFixed(1)}` },
                tooltip: {
                    backgroundColor: 'rgba(14, 27, 66, 0.95)',
                    callbacks: { label: (ctx) => `Ortalama: ${ctx.parsed.y}` }
                }
            }
        }
    });
}

function renderDashboardChannelChart(data) {
    const canvas = document.getElementById('q-channel-chart');
    if (!canvas) return;
    destroyIfExists(dashChannelChart);

    const gSel = document.getElementById('q-dash-group');
    const aSel = document.getElementById('q-dash-agent');
    const chSel = document.getElementById('q-dash-channel');
    const g = gSel ? gSel.value : 'all';
    const a = aSel ? aSel.value : 'all';
    const ch = chSel ? chSel.value : 'all';

    let mode = 'channel';
    // Daraltılmış görünümde kanal dağılımı anlamlı değilse, feedbackType dağılımına dön
    if (ch !== 'all' || (a && a !== 'all')) mode = 'feedbackType';

    const buckets = {};
    (data || []).forEach(e => {
        const key = mode === 'channel' ? deriveChannelFromGroup(e.group) : String(e.feedbackType || 'Yok');
        if (!buckets[key]) buckets[key] = 0;
        buckets[key] += 1;
    });

    const labels = Object.keys(buckets);
    const values = labels.map(k => buckets[k]);

    const sub = document.getElementById('q-channel-sub');
    if (sub) {
        if (mode === 'channel') sub.textContent = 'Satış / Chat / Diğer';
        else sub.textContent = 'Feedback Type dağılımı';
    }

    dashChannelChart = new Chart(canvas, {
        type: 'doughnut',
        plugins: [valueLabelPlugin],
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: ['#3498db', '#9b59b6', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c'],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
                valueLabelPlugin: { showPercent: true, minPercentToShow: 5, color: '#fff' },
                tooltip: {
                    backgroundColor: 'rgba(14, 27, 66, 0.95)',
                    callbacks: { label: (ctx) => `${ctx.label}: ${ctx.formattedValue} Adet` }
                }
            }
        }
    });
}

function renderDashboardScoreDistributionChart(data) {
    const canvas = document.getElementById('q-score-dist-chart');
    if (!canvas) return;
    destroyIfExists(dashScoreDistChart);

    const ranges = [
        { label: '0-59', min: 0, max: 59 },
        { label: '60-69', min: 60, max: 69 },
        { label: '70-79', min: 70, max: 79 },
        { label: '80-89', min: 80, max: 89 },
        { label: '90-100', min: 90, max: 100 },
    ];
    const counts = ranges.map(() => 0);
    (data || []).forEach(e => {
        const s = Math.round(parseFloat(e.score) || 0);
        for (let i = 0; i < ranges.length; i++) {
            if (s >= ranges[i].min && s <= ranges[i].max) { counts[i]++; break; }
        }
    });

    dashScoreDistChart = new Chart(canvas, {
        type: 'bar',
        plugins: [valueLabelPlugin],
        data: {
            labels: ranges.map(r => r.label),
            datasets: [{
                label: 'Adet',
                data: counts,
                backgroundColor: ['#e74c3c', '#e67e22', '#f1c40f', '#3498db', '#2ecc71'],
                borderWidth: 0,
                borderRadius: 4,
                barThickness: 30
            }]
        },
        options: {
            layout: { padding: { top: 45 } },
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 120, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { precision: 0 } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                valueLabelPlugin: { formatter: (v) => `${v}` },
                tooltip: {
                    backgroundColor: 'rgba(14, 27, 66, 0.95)',
                    callbacks: { label: (ctx) => `${ctx.parsed.y} Kayıt` }
                }
            }
        }
    });
}

function renderDashboardGroupAvgChart(data) {
    const canvas = document.getElementById('q-group-avg-chart');
    if (!canvas) return;
    destroyIfExists(dashGroupAvgChart);

    // Grup ortalamaları (admin için anlamlı)
    const byGroup = {};
    (data || []).forEach(e => {
        const g = String(e.group || 'Genel');
        const s = parseFloat(e.score) || 0;
        if (!byGroup[g]) byGroup[g] = { total: 0, count: 0 };
        byGroup[g].total += s;
        byGroup[g].count += 1;
    });

    const rows = Object.keys(byGroup).map(g => ({
        g,
        avg: byGroup[g].count ? (byGroup[g].total / byGroup[g].count) : 0,
        count: byGroup[g].count
    })).sort((a, b) => a.avg - b.avg);

    const labels = rows.map(r => r.g.length > 22 ? (r.g.substring(0, 22) + '…') : r.g);
    const values = rows.map(r => r.avg.toFixed(1));

    const sub = document.getElementById('q-group-sub');
    if (sub) {
        sub.textContent = rows.length ? `${rows.length} takım • en düşükten en yükseğe` : 'Veri yok';
    }

    dashGroupAvgChart = new Chart(canvas, {
        type: 'bar',
        plugins: [valueLabelPlugin],
        data: {
            labels,
            datasets: [{
                label: 'Ortalama',
                data: values,
                backgroundColor: '#1e293b',
                hoverBackgroundColor: '#CF0A2C',
                borderRadius: 4,
                barThickness: 18
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            layout: { padding: { top: 35, right: 90, bottom: 5, left: 10 } },
            scales: {
                x: { beginAtZero: true, max: 140, grid: { display: false }, ticks: { display: false } },
                y: { grid: { display: false }, ticks: { font: { weight: '800', size: 13, family: '"Inter", sans-serif' }, color: '#1e293b' } }
            },
            plugins: {
                legend: { display: false },
                valueLabelPlugin: {
                    formatter: (v) => `${Number(v).toFixed(1)}`,
                    color: '#ffffff',
                    font: '900 13px "Inter", sans-serif'
                },
                tooltip: {
                    backgroundColor: 'rgba(14, 27, 66, 0.95)',
                    callbacks: {
                        title: (ctx) => rows[ctx[0].dataIndex].g,
                        label: (ctx) => `Ortalama: ${ctx.parsed.x} (${rows[ctx.dataIndex].count} Kayıt)`
                    }
                }
            }
        }
    });
}
// --- EĞİTİM MODÜLÜ (YENİ) ---
let allTrainingsData = []; // Global cache for filtering

function loadTrainingData() {
    const listEl = document.getElementById('training-list');
    listEl.innerHTML = '<div style="grid-column:1/-1; text-align:center;">Yükleniyor...</div>';

    apiCall("getTrainings", { asAdmin: isAdminMode }).then(data => {
        if (data.result === 'success') {
            allTrainingsData = data.trainings || [];
            renderTrainingList(allTrainingsData);
        } else {
            listEl.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#888;">Hata oluştu veya veri yok.</div>';
        }
    });
}

function renderTrainingList(trainings) {
    const listEl = document.getElementById('training-list');
    listEl.innerHTML = '';

    if (!trainings || trainings.length === 0) {
        listEl.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#888;">Görüntülenecek eğitim bulunmuyor.</div>';
        return;
    }

    trainings.forEach(t => {
        let statusHtml = t.isCompleted
            ? `<button class="t-btn t-btn-done"><i class="fas fa-check"></i> Tamamlandı</button>`
            : `<button class="t-btn t-btn-start" onclick="openTrainingLink('${t.id}', '${t.link}')">Eğitime Git</button>`;

        let docHtml = t.docLink && t.docLink !== 'N/A'
            ? `<a href="${t.docLink}" target="_blank" class="t-doc-link"><i class="fas fa-file-download"></i> Dökümanı İndir</a>`
            : '';

        listEl.innerHTML += `
        <div class="t-card">
            <div class="t-card-header">
                <span>${t.title}${isAdminMode ? ` <span style="font-weight:600; opacity:.8; font-size:.75rem">(${t.target}${t.target === 'Individual' && t.targetUser ? ' • ' + t.targetUser : ''})</span>` : ''}</span>
                <span class="t-status-badge">Atanma: ${t.date}</span>
            </div>
            <div class="t-card-body">
                ${t.desc}
                ${docHtml}
                <div style="margin-top:10px; display:flex; justify-content:space-between; font-size:0.8rem; color:#666; padding-top:10px; border-top:1px dashed #eee;">
                    <div><strong>Süre:</strong> ${t.duration || 'Belirtilmedi'}</div>
                    <div><strong>Başlangıç:</strong> ${t.startDate || 'N/A'} - <strong>Bitiş:</strong> ${t.endDate || 'N/A'}</div>
                </div>
                <div style="font-size:0.8rem; color:#999; margin-top:5px;">Atayan: ${t.creator}</div>
            </div>
            <div class="t-card-footer">
                ${statusHtml}
            </div>
        </div>`;
    });
}

function filterTrainingList() {
    const query = (document.getElementById('q-training-search').value || '').toLowerCase().trim();
    const type = document.getElementById('q-training-filter-type').value;

    const filtered = allTrainingsData.filter(t => {
        const matchType = (type === 'all' || t.target === type);
        const matchSearch = !query ||
            (t.title && t.title.toLowerCase().includes(query)) ||
            (t.desc && t.desc.toLowerCase().includes(query)) ||
            (t.targetUser && t.targetUser.toLowerCase().includes(query));

        return matchType && matchSearch;
    });

    renderTrainingList(filtered);
}
function startTraining(id) {
    apiCall("startTraining", { trainingId: id });
}

function openTrainingLink(id, link) {
    startTraining(id);
    if (link && link !== 'N/A') {
        window.open(link, '_blank');
    } else {
        Swal.fire('Uyarı', 'Bu eğitim için geçerli bir link bulunmamaktadır.', 'warning');
    }

    // Linke tıkladıktan sonra onay sor
    Swal.fire({
        title: 'Eğitimi Tamamladın mı?',
        text: "Eğitim içeriğini inceleyip anladıysan onayla.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet, Tamamladım',
        cancelButtonText: 'Daha Sonra'
    }).then((result) => {
        if (result.isConfirmed) {
            completeTraining(id);
        }
    });
}
function completeTraining(id) {
    apiCall("completeTraining", { trainingId: id }).then(d => {
        if (d.result === 'success') {
            Swal.fire('Harika!', 'Eğitim tamamlandı olarak işaretlendi.', 'success');
            loadTrainingData();
        } else {
            Swal.fire('Hata', d.message, 'error');
        }
    });
}
async function assignTrainingPopup() {
    const { value: formValues } = await Swal.fire({
        title: 'Yeni Eğitim & Döküman Ata',
        html: `
            <div class="t-modal-grid">
                <input id="swal-t-title" class="swal2-input" placeholder="Eğitim Başlığı" style="grid-column: 1 / 4;">
                <textarea id="swal-t-desc" class="swal2-textarea" style="height:100px; grid-column: 1 / 4;" placeholder="Eğitim açıklaması veya talimatlar..."></textarea>
                <input id="swal-t-link" class="swal2-input" placeholder="Video/Eğitim Linki (URL)" style="grid-column: 1 / 4;">
                <input id="swal-t-doc" class="swal2-input" placeholder="Döküman Linki (PDF/URL) (İsteğe Bağlı)" style="grid-column: 1 / 4;">
                <input id="swal-t-file" type="file" class="swal2-file" style="grid-column: 1 / 4; margin-top:6px;" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg">
                <div style="grid-column:1/4; font-size:0.78rem; color:#6b7280; margin-top:-4px;">
                  İstersen dosyayı buradan yükle (PDF/Word/PowerPoint...). Yüklenen dosya eğitim kartında “Dökümanı İndir” olarak görünür.
                </div>
                <input type="date" id="swal-t-start" class="swal2-input" value="${new Date().toISOString().substring(0, 10)}">
                <input type="date" id="swal-t-end" class="swal2-input">
                <input id="swal-t-duration" class="swal2-input" placeholder="Süre (Örn: 20dk)">
            </div>
            <select id="swal-t-target" class="swal2-input" onchange="updateTrainingTarget(this.value)" style="margin-top:10px;">
                <option value="Genel">Herkese (Tüm Ekip)</option>
                <option value="Telesatış">Telesatış Ekibi</option>
                <option value="Chat">Chat Ekibi</option>
                <option value="Individual">Kişiye Özel</option>
            </select>
            <select id="swal-t-agent" class="swal2-input" style="display:none; width:100%;"></select>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Ata',
        didOpen: () => {
            // Dosya upload (base64)
            window.__trainingUpload = { name: '', mime: '', b64: '' };
            const fileInp = document.getElementById('swal-t-file');
            if (fileInp) {
                fileInp.addEventListener('change', (ev) => {
                    const f = ev.target.files && ev.target.files[0];
                    if (!f) { window.__trainingUpload = { name: '', mime: '', b64: '' }; return; }
                    const reader = new FileReader();
                    reader.onload = () => {
                        const res = String(reader.result || '');
                        const b64 = res.includes(',') ? res.split(',')[1] : '';
                        window.__trainingUpload = { name: f.name, mime: f.type || 'application/octet-stream', b64 };
                    };
                    reader.readAsDataURL(f);
                });
            }
            window.updateTrainingTarget = function (val) {
                const agentSelect = document.getElementById('swal-t-agent');
                agentSelect.style.display = val === 'Individual' ? 'block' : 'none';
                if (val === 'Individual') {
                    agentSelect.innerHTML = adminUserList.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
                }
            };
            updateTrainingTarget('Genel');
        },
        preConfirm: () => {
            const target = document.getElementById('swal-t-target').value;
            const agent = target === 'Individual' ? document.getElementById('swal-t-agent').value : '';
            if (!document.getElementById('swal-t-title').value || (!target && !agent)) {
                Swal.showValidationMessage('Başlık ve Atama Alanı boş bırakılamaz');
                return false;
            }
            return {
                title: document.getElementById('swal-t-title').value,
                desc: document.getElementById('swal-t-desc').value,
                link: document.getElementById('swal-t-link').value,
                docLink: document.getElementById('swal-t-doc').value || 'N/A',
                docFile: (window.__trainingUpload && window.__trainingUpload.b64) ? window.__trainingUpload : null,
                target: target,
                targetAgent: agent, // Kişiye özel atama için
                creator: currentUser,
                startDate: document.getElementById('swal-t-start').value, // YYYY-MM-DD (raw)
                endDate: document.getElementById('swal-t-end').value,   // YYYY-MM-DD (raw)
                duration: document.getElementById('swal-t-duration').value
            }
        }
    });
    if (formValues) {
        try {
            Swal.fire({ title: 'Atanıyor...', didOpen: () => Swal.showLoading() });
            // Dosya seçildiyse önce Drive'a yükle
            if (formValues.docFile) {
                const up = await apiCall('uploadTrainingDoc', { fileName: formValues.docFile.name, mimeType: formValues.docFile.mime, base64: formValues.docFile.b64 });
                formValues.docLink = (up && up.url) ? up.url : formValues.docLink;
            }
            const d = await apiCall('assignTraining', { ...formValues });
            if (d && d.result === 'success') {
                Swal.fire('Başarılı', 'Eğitim atandı.', 'success');
                loadTrainingData();
            } else {
                Swal.fire('Hata', (d && d.message) || 'İşlem başarısız', 'error');
            }
        } catch (e) {
            Swal.fire('Hata', e.message || 'İşlem başarısız', 'error');
        }
    }
}
// --- FEEDBACK MODÜLÜ ---

// YENİ FONKSİYON: Feedback_Logs'u çekmek için
async function fetchFeedbackLogs() {
    try {
        const data = await apiCall("fetchFeedbackLogs", {});
        if (data.result === "success") {
            feedbackLogsData = data.feedbackLogs || [];
        } else {
            feedbackLogsData = [];
        }
    } catch (error) {
        console.error("Feedback Logs çekilirken hata oluştu:", error);
        feedbackLogsData = [];
    }
}

// YARDIMCI FONKSİYON: Dönem bilgisini MM.YYYY formatında döndürür
function formatPeriod(periodString) {
    if (!periodString || periodString === 'N/A') return 'N/A';

    // Zaten MM.YYYY formatındaysa direkt döndür
    if (periodString.match(/^\d{2}\.\d{4}$/)) {
        return periodString;
    }

    // Eğer uzun bir Date string'i ise (ör: Wed Oct 01 2025...) tarih nesnesine çevir
    try {
        const date = new Date(periodString);
        if (!isNaN(date.getTime())) {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}.${year}`;
        }
    } catch (e) {
        // Hata oluşursa olduğu gibi bırak veya N/A döndür
        console.error("Dönem formatlama hatası:", e);
    }

    return periodString; // Başka formatta gelirse yine de olduğu gibi döndür
}

function loadFeedbackList() {
    const listEl = document.getElementById('feedback-list');
    listEl.innerHTML = '';

    // Admin butonunu göster/gizle
    const manualBtn = document.getElementById('manual-feedback-admin-btn');
    if (manualBtn) manualBtn.style.display = isAdminMode ? 'flex' : 'none';

    // YENİ FİLTRELEME MANTIĞI: Seçili dönem + (Mail veya Manuel)
    const monthSelect = document.getElementById('q-feedback-month');
    const selectedMonth = monthSelect ? monthSelect.value : null;

    const feedbackItems = allEvaluationsData.filter(e => {
        // feedbackType kontrolü
        const isMailFeedback = e.feedbackType && e.feedbackType.toLowerCase() === 'mail';
        // Manuel kontrolü
        const isManualFeedback = e.callId && String(e.callId).toUpperCase().startsWith('MANUEL-');

        if (!isMailFeedback && !isManualFeedback) return false;

        // Dönem kontrolü
        if (selectedMonth) {
            const rawDate = (e.callDate && e.callDate !== 'N/A') ? e.callDate : e.date;
            if (!rawDate) return false;
            const parts = rawDate.split('.');
            if (parts.length < 3) return false;
            const eMonthYear = `${parts[1].padStart(2, '0')}.${parts[2]}`;
            return eMonthYear === selectedMonth;
        }
        return true;
    });
    if (feedbackItems.length === 0) {
        listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">Görüntülenecek filtrelenmiş geri bildirim yok (Sadece Mail veya Manuel).</div>';
        return;
    }

    feedbackItems.forEach(e => {
        // Geliştirme: Çağrı Tarihi ve ID eklendi (Gelişmiş Kart Tasarımı)
        const feedbackClass = e.feedbackType === 'Sözlü' ? '#2196f3' : (e.feedbackType === 'Mail' ? '#e65100' : (e.feedbackType === 'Bilgilendirme' ? '#0288d1' : (e.feedbackType === 'Feedback' ? '#2e7d32' : '#10b981')));

        // MANUEL CallID'den ön eki temizle
        const cleanCallId = String(e.callId).toUpperCase().startsWith('MANUEL-') ? String(e.callId).substring(7) : e.callId;

        // Konu/Başlık bilgisi 'details' alanından gelir (Manuel geri bildirim için)
        // Eğer detay alanı JSON ise (yani normal değerlendirme) veya boşsa varsayılan metin kullan
        const isEvaluationDetail = String(e.details).startsWith('[');
        const feedbackTopic = isEvaluationDetail ? 'Değerlendirme Konusu' : (e.details || 'Belirtilmemiş');

        // Dönem, Kanal ve Tipi belirle (Manuel kayıtlarda bu bilgileri Evaluations'tan değil, Feedback_Logs'tan çekiyoruz)
        const isManual = String(e.callId).toUpperCase().startsWith('MANUEL-');

        let period = e.period || e.date.substring(3);
        let channel = (e.channel && String(e.channel).trim()) ? String(e.channel).trim() : 'Yok';
        const infoType = e.feedbackType || 'Yok';

        // DÜZELTME MANTIĞI: Eğer kayıt Manuel ise, detaylı bilgiyi feedbackLogsData'dan çek.
        if (isManual) {
            // CallId'deki MANUEL- ön ekini atarak Feedback_Logs'taki Call_ID ile eşleştirme
            const logRow = feedbackLogsData.find(x => String(x.callId) === String(cleanCallId));
            if (logRow) {
                // Apps Script'ten gelen period değerini formatla (Tarih Nesnesi/String olma ihtimaline karşı)
                period = formatPeriod(logRow.period) || period;
                channel = logRow.channel && logRow.channel !== 'N/A' ? logRow.channel : 'Yok';
            }
        }

        listEl.innerHTML += `
            <div class="feedback-card" style="border-left-color: ${feedbackClass};">
                <div class="feedback-header">
                    <div style="font-weight:bold; color:#0e1b42; font-size:1.1rem;">${e.agent}</div>
                    <div class="feedback-info-right">
                        <span><i class="fas fa-user-check"></i> Değerleyen: ${e.evaluator}</span>
                        <span><i class="fas fa-id-badge"></i> Çağrı ID: ${cleanCallId}</span>
                        <span><i class="fas fa-calendar-alt"></i> Tarih: ${e.callDate}</span>
                    </div>
                </div>
                <div class="feedback-body">
                    <div style="font-weight:bold; color:#333; margin-bottom:5px;">Konu/Açıklama: ${feedbackTopic}</div>
                    <div style="color:#555; line-height:1.5; font-size:0.95rem;">${e.feedback}</div>
                </div>
                <div class="feedback-footer">
                     <div style="display:flex; gap:10px; font-size:0.7rem; color:#666; font-weight:600; margin-right:10px;">
                        <span><i class="fas fa-calendar-week"></i> Dönem: ${period}</span>
                        <span><i class="fas fa-comment-alt"></i> Kanal: ${channel}</span>
                        <span><i class="fas fa-tag"></i> Tip: ${infoType}</span>
                     </div>
                     
            </div>`;
    });
}
// Adminler için manuel geri bildirim ekleme (Çağrı dışı konular için)
async function addManualFeedbackPopup() {
    if (!isAdminMode) return;

    // Admin user listesi yoksa yükle
    if (adminUserList.length === 0) {
        Swal.fire({ title: 'Kullanıcı Listesi Yükleniyor...', didOpen: () => Swal.showLoading() });
        await fetchUserListForAdmin();
        Swal.close();
    }
    // Dönem filtre seçeneklerini oluştur
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let monthOptions = '';
    for (let i = 0; i < 6; i++) {
        let month = (currentMonth - i + 12) % 12;
        let year = currentYear - (currentMonth - i < 0 ? 1 : 0);
        const text = `${MONTH_NAMES[month]} ${year}`;
        const value = `${String(month + 1).padStart(2, '0')}.${year}`; // Backend'in beklediği MM.YYYY formatı
        const isCurrent = (i === 0);
        monthOptions += `<option value="${value}" ${isCurrent ? 'selected' : ''}>${text}</option>`;
    }

    // YENİ HTML TASARIMI: Daha düzenli ve etiketli form
    const newHtmlContent = `
        <div class="manual-feedback-form">
            <div class="form-group">
                <label for="manual-q-agent">Temsilci Adı <span class="required">*</span></label>
                <select id="manual-q-agent" class="swal2-input"></select>
            </div>
            <div class="form-group">
                <label for="manual-q-topic">Konu / Başlık <span class="required">*</span></label>
                <input id="manual-q-topic" class="swal2-input" placeholder="Geri bildirim konusu (Örn: Yeni Kampanya Bilgilendirmesi)">
            </div>
            
            <div class="grid-2-cols">
                <div class="form-group">
                    <label for="manual-q-callid">Çağrı/Etkileşim ID <span class="required">*</span></label>
                    <input id="manual-q-callid" class="swal2-input" placeholder="ID (Örn: 123456)">
                </div>
                <div class="form-group">
                    <label for="manual-q-date">Tarih <span class="required">*</span></label>
                    <input type="date" id="manual-q-date" class="swal2-input" value="${new Date().toISOString().substring(0, 10)}">
                </div>
            </div>
            <div class="grid-3-cols">
                <div class="form-group">
                    <label for="manual-q-channel">Kanal</label>
                    <select id="manual-q-channel" class="swal2-input">
                        <option value="Telefon">Telefon</option>
                        <option value="Canlı Destek">Canlı Destek</option>
                        <option value="E-posta">E-posta</option>
                        <option value="Sosyal Medya">Sosyal Medya</option>
                        <option value="Yok">Yok/Diğer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="manual-q-period">Dönem</label>
                    <select id="manual-q-period" class="swal2-input">${monthOptions}</select>
                </div>
                <div class="form-group">
                    <label for="manual-q-type">Tip</label>
                    <select id="manual-q-type" class="swal2-input">
                        <option value="Feedback">Feedback</option>
                        <option value="Bilgilendirme">Bilgilendirme</option>
                        <option value="Sözlü">Sözlü</option>
                        <option value="Mail">Mail</option>
                        <option value="Özel">Özel Konu</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="manual-q-feedback">Geri Bildirim Detayları <span class="required">*</span></label>
                <textarea id="manual-q-feedback" class="swal2-textarea" placeholder="Buraya geri bildirimin detaylı metnini giriniz..."></textarea>
            </div>
        </div>
        <style>
            /* Manuel Geri Bildirim Formu Stil İyileştirmeleri */
            .manual-feedback-form {
                text-align: left;
                padding: 10px;
                background: #fcfcfc;
                border-radius: 8px;
                border: 1px solid #eee;
            }
            .form-group {
                margin-bottom: 12px;
            }
            .form-group label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--primary);
                display: block;
                margin-bottom: 4px;
            }
            .grid-2-cols {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            .grid-3-cols {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
            }
            .required {
                color: var(--accent);
                font-size: 0.9rem;
            }
            /* Input/Select/Textarea stillerini genel swal2-input stilinden devraldık */
            .manual-feedback-form .swal2-input, .manual-feedback-form .swal2-textarea {
                width: 100% !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: 10px 12px !important;
                border: 1px solid #dcdcdc !important;
                border-radius: 6px !important;
                font-size: 0.95rem !important;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .manual-feedback-form .swal2-input:focus, .manual-feedback-form .swal2-textarea:focus {
                border-color: var(--secondary) !important;
                box-shadow: 0 0 0 2px rgba(250, 187, 0, 0.2) !important;
            }
            .manual-feedback-form .swal2-textarea {
                min-height: 100px;
                resize: vertical;
            }
        </style>
    `;

    // Modalı görüntüdeki gibi düzenledik (Agent Select ve sade alanlar)
    const { value: formValues } = await Swal.fire({
        title: 'Manuel Geri Bildirim Yaz',
        html: newHtmlContent,
        width: '600px', // Modal genişliğini artırdık
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-save"></i> Kaydet',
        didOpen: () => {
            const sel = document.getElementById('manual-q-agent');
            adminUserList.forEach(u => sel.innerHTML += `<option value="${u.name}">${u.name}</option>`);
        },
        preConfirm: () => {
            const agentName = document.getElementById('manual-q-agent').value;
            const topic = document.getElementById('manual-q-topic').value;
            const feedback = document.getElementById('manual-q-feedback').value;
            const feedbackType = document.getElementById('manual-q-type').value;

            // YENİ ALANLAR
            const channel = document.getElementById('manual-q-channel').value;
            const period = document.getElementById('manual-q-period').value; // MM.YYYY formatında

            // YENİ ZORUNLU KONTROLLER
            const callId = document.getElementById('manual-q-callid').value.trim();
            const rawCallDate = document.getElementById('manual-q-date').value;
            const callDate = formatDateToDDMMYYYY(rawCallDate);
            if (!agentName || !feedback || !callId || !rawCallDate || !topic) { // Konu/Başlık da zorunlu yapıldı
                Swal.showValidationMessage('Tüm (*) işaretli alanlar zorunludur!');
                return false;
            }

            // Konu sadece başlık olarak gönderiliyor. Dönem ve Kanal ayrı alanlar olarak gönderilecek.
            return {
                agentName,
                // Backend'de ayrı loglama için CallID'yi MANUEL ile başlatıyoruz.
                callId: "MANUEL-" + callId,
                callDate: callDate,
                score: 100, // Manuel olduğu için tam puan
                details: topic, // Sadece konuyu gönderiyoruz
                feedback,
                feedbackType,
                agentGroup: "Genel", // Manuel olduğu için Genel Grup olarak kaydedilir.
                // ÇÖZÜM: Yeni alanları ekliyoruz
                channel: channel,
                period: period
            };
        }
    });
    if (formValues) {
        // MÜKERRER KONTROL: Aynı temsilci + aynı Call ID daha önce kaydedildiyse uyar
        try {
            const normAgent = String(formValues.agentName || '').trim().toLowerCase();
            const normCallId = String(formValues.callId || '').trim();
            const isDup = Array.isArray(allEvaluationsData) && allEvaluationsData.some(e =>
                String(e.agent || e.agentName || '').trim().toLowerCase() === normAgent &&
                String(e.callId || '').trim() === normCallId
            );

            if (isDup) {
                const decision = await Swal.fire({
                    icon: 'warning',
                    title: 'Mükerrer Dinleme',
                    html: `<div style="text-align:left; line-height:1.4;">
                            <b>${formValues.agentName}</b> için <b>Call ID: ${escapeHtml(formValues.callId)}</b> daha önce kaydedilmiş görünüyor.<br>
                            <span style="color:#666; font-size:0.9rem;">Yine de yeni kayıt oluşturmak istiyor musun?</span>
                           </div>`,
                    showCancelButton: true,
                    confirmButtonText: 'Evet, kaydet',
                    cancelButtonText: 'Vazgeç',
                    reverseButtons: true
                });
                if (!decision.isConfirmed) return;
            }
        } catch (e) {
            console.warn('Duplicate check failed', e);
        }

        Swal.fire({ title: 'Kaydediliyor...', didOpen: () => Swal.showLoading() });
        apiCall("logEvaluation", { ...formValues }).then(async d => {
            if (d.result === "success") {
                Swal.fire({ icon: 'success', title: 'Kaydedildi', timer: 1500, showConfirmButton: false });

                fetchEvaluationsForAgent(formValues.agentName);
                fetchFeedbackLogs().then(() => { loadFeedbackList(); });
            } else {
                Swal.fire('Hata', d.message, 'error');
            }
        });
    }
}
async function fetchEvaluationsForAgent(forcedName, silent = false) {
    const listEl = document.getElementById('evaluations-list');
    if (!silent) listEl.innerHTML = 'Yükleniyor...';
    const groupSelect = document.getElementById('q-admin-group');
    const agentSelect = document.getElementById('q-admin-agent');

    let targetAgent = forcedName || currentUser;
    let targetGroup = 'all';

    if (isAdminMode && agentSelect) {
        targetAgent = forcedName || agentSelect.value;
        targetGroup = groupSelect ? groupSelect.value : 'all';
    }
    try {
        const periodSelect = document.getElementById('q-eval-month');
        const selectedPeriod = periodSelect ? periodSelect.value : null;

        const data = await apiCall("fetchEvaluations", {
            targetAgent: targetAgent,
            targetGroup: targetGroup,
            period: selectedPeriod
        });

        if (data.result === "success") {
            // Server'dan zaten descending (en yeni en üstte) geliyor, reverse() gereksiz veya hataya sebep olabilir
            allEvaluationsData = data.evaluations;
            if (silent) return; // Silent mode ise burada bitir (veri yüklendi)
            listEl.innerHTML = '';

            // Sadece normal değerlendirmeleri filtrele ve göster
            const normalEvaluations = allEvaluationsData.filter(e => !String(e.callId).toUpperCase().startsWith('MANUEL-'));

            // Dönem filtresini uygula (seçili ay / yıl)
            let filteredEvaluations = normalEvaluations;
            const periodSelectForList = document.getElementById('q-eval-month');
            const selectedPeriodForList = periodSelectForList ? periodSelectForList.value : null;
            if (selectedPeriodForList) {
                filteredEvaluations = normalEvaluations.filter(e => {
                    const dateVal = e.callDate || e.date; // CallDate'e öncelik verilmeli (Bug 5 Fix)
                    if (!dateVal) return false;
                    const parts = String(dateVal).split('.');
                    if (parts.length < 3) {
                        // ISO format fallback (YYYY-MM-DD ...)
                        const d = new Date(dateVal);
                        if (!isNaN(d)) {
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const y = d.getFullYear();
                            return `${m}.${y}` === selectedPeriodForList;
                        }
                        return false;
                    }
                    const monthYear = `${parts[1].padStart(2, '0')}.${parts[2].split(' ')[0]}`;
                    return monthYear === selectedPeriodForList;
                });
            }


            // Dinleme tarihine göre kronolojik (DESC) sırala
            const parseEvalDate = (e) => {
                const v = (e.date || e.callDate || '').toString().trim();
                if (!v) return 0;
                // dd.MM.yyyy
                const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
                if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`).getTime();
                const d = new Date(v);
                return isNaN(d) ? 0 : d.getTime();
            };
            filteredEvaluations.sort((a, b) => parseEvalDate(b) - parseEvalDate(a));

            if (filteredEvaluations.length === 0) {
                listEl.innerHTML = '<p style="padding:20px; text-align:center; color:#666;">Kayıt yok.</p>';
                return;
            }

            let listElBuffer = "";
            filteredEvaluations.forEach((evalItem, index) => {
                const scoreColor = evalItem.score >= 90 ? '#2f855a' : (evalItem.score >= 70 ? '#ed8936' : '#e53e3e');
                const scoreBg = evalItem.score >= 90 ? '#f0fff4' : (evalItem.score >= 70 ? '#fffaf0' : '#fff5f5');
                const scoreCircleColor = evalItem.score >= 90 ? '#48bb78' : (evalItem.score >= 70 ? '#ed8936' : '#f56565');

                let editBtn = isAdminMode ? `<i class="fas fa-pen" style="font-size:0.9rem; color:#718096; cursor:pointer; transition:0.2s;" onmouseover="this.style.color='#3182ce'" onmouseout="this.style.color='#718096'" onclick="event.stopPropagation(); editEvaluation('${evalItem.callId}')"></i>` : '';

                const baseAgent = escapeHtml(evalItem.agent || '');
                const altNameRaw = (evalItem.agentName != null) ? String(evalItem.agentName).trim() : '';
                const showAltName = altNameRaw && altNameRaw !== String(evalItem.agent || '').trim();
                let agentNameDisplay = (targetAgent === 'all' || targetAgent === targetGroup) && showAltName
                    ? `<span style="font-size:0.75rem; font-weight:700; color:#4a5568; background:#edf2f7; padding:2px 8px; border-radius:12px; margin-left:8px;">${escapeHtml(altNameRaw)}</span>`
                    : '';

                // Detay HTML oluşturma (V2 Compact Grid)
                let detailTableHtml = '';
                try {
                    let detailObj = evalItem.details;
                    if (typeof detailObj === 'string') {
                        detailObj = JSON.parse(detailObj);
                    }
                    if (Array.isArray(detailObj)) {
                        detailTableHtml = '<div class="eval-row-grid-v2">';
                        detailObj.forEach(item => {
                            let isFailed = item.score < item.max;
                            let noteDisplay = item.note ? `<div class="eval-note-v2" style="margin-top:4px; font-size:0.75rem;"><i class="fas fa-sticky-note"></i> ${item.note}</div>` : '';
                            detailTableHtml += `
                            <div class="eval-crit-card-v2 ${isFailed ? 'failed' : 'success'}">
                                <div class="eval-crit-text-v2">
                                    ${escapeHtml(item.q)}
                                    ${noteDisplay}
                                </div>
                                <div class="eval-crit-val-v2" style="color: ${isFailed ? '#ef4444' : '#10b981'}">
                                    ${item.score} / ${item.max}
                                </div>
                            </div>`;
                        });
                        detailTableHtml += '</div>';
                    } else {
                        detailTableHtml = `<div class="eval-feedback-box-v2">${(typeof evalItem.details === "object" ? escapeHtml(JSON.stringify(evalItem.details)) : escapeHtml(String(evalItem.details)))}</div>`;
                    }
                } catch (e) {
                    console.error("Detail parse error:", e);
                    detailTableHtml = `<div class="eval-feedback-box-v2">${(typeof evalItem.details === "object" ? escapeHtml(JSON.stringify(evalItem.details)) : escapeHtml(String(evalItem.details)))}</div>`;
                }

                const callDateDisplay = evalItem.callDate && evalItem.callDate !== 'N/A' ? evalItem.callDate : 'N/A';
                const listenDateDisplay = evalItem.date || evalItem.callDate || 'N/A';

                const isSeen = evalItem.isSeen;
                const agentNote = evalItem.agentNote || '';
                const managerReply = evalItem.managerReply || '';
                const status = evalItem.status || 'Tamamlandı';

                // Interaction HTML (V2)
                let interactionHtml = '';
                if (!isAdminMode) {
                    if (status !== 'Kapatıldı') {
                        interactionHtml += `
                         <div style="margin-top:20px; display:flex; justify-content:flex-end;">
                            <button class="eval-action-btn-v2 btn-warning-v2" 
                              onclick="event.stopPropagation(); openAgentNotePopup('${evalItem.callId}', '${scoreCircleColor}', true)">
                              <i class="fas fa-comment-dots"></i> Görüş / Not Ekle
                            </button>
                         </div>`;
                    }
                } else {
                    if (agentNote && status !== 'Kapatıldı') {
                        interactionHtml += `
                         <div style="margin-top:20px; display:flex; justify-content:flex-end;">
                            <button class="eval-action-btn-v2 btn-primary-v2" 
                              onclick="event.stopPropagation(); openAdminReplyPopup('${evalItem.callId}', '${escapeHtml(evalItem.agent)}', '${escapeHtml(agentNote)}')">
                              <i class="fas fa-reply"></i> Yanıtla / Kapat
                            </button>
                         </div>`;
                    }
                }

                // Interaction Bubbles (V2)
                let notesDisplay = '';
                if (agentNote || managerReply) {
                    notesDisplay += `<div class="eval-section-v2">
                        <div class="eval-section-title-v2"><i class="fas fa-comments"></i> Mesajlaşma</div>
                        <div class="eval-interaction-pane">`;
                    if (agentNote) {
                        notesDisplay += `<div class="eval-interaction-bubble bubble-agent">
                            <div class="bubble-header"><i class="fas fa-user-edit"></i> Temsilci Notu</div>
                            ${escapeHtml(agentNote)}
                        </div>`;
                    }
                    if (managerReply) {
                        notesDisplay += `<div class="eval-interaction-bubble bubble-manager" style="align-self: flex-end; border-bottom-left-radius: 12px;">
                            <div class="bubble-header"><i class="fas fa-user-shield"></i> Yönetici Cevabı</div>
                            ${escapeHtml(managerReply)}
                        </div>`;
                    }
                    notesDisplay += `</div></div>`;
                }

                const statusIconClass = isSeen ? 'seen' : 'unseen';
                const statusIcon = isSeen ? '<i class="fas fa-check-double"></i>' : '<i class="fas fa-eye-slash"></i>';
                const statusTitle = isSeen ? 'Görüldü' : 'Henüz Görülmedi';

                const statusBadge = status === 'Bekliyor'
                    ? `<span style="background:#fff3e0; color:#e65100; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px; margin-left:8px; border:1px solid #ffe0b2;">${status}</span>`
                    : '';

                listElBuffer += `
                <div class="eval-card-v2" id="eval-card-${index}" onclick="newToggleEvaluationDetail(${index}, '${evalItem.callId}', ${isSeen}, this)">
                    <div class="eval-card-main">
                        <div class="eval-card-left">
                            <div class="eval-score-orb" style="background:${scoreCircleColor}">
                                <span class="score-val">${evalItem.score}</span>
                                <span class="score-label">Puan</span>
                            </div>
                            <div class="eval-info-block">
                                <div class="eval-agent-name">
                                    ${baseAgent} ${agentNameDisplay} ${statusBadge}
                                </div>
                                <div class="eval-meta-row">
                                    <div class="eval-meta-item"><i class="fas fa-phone"></i> ${callDateDisplay}</div>
                                    <div class="eval-meta-item"><i class="fas fa-headphones"></i> ${listenDateDisplay}</div>
                                    <div class="eval-id-pill" onclick="event.stopPropagation(); copyText('${escapeHtml(evalItem.callId || '')}')" title="Kopyala">
                                        <i class="fas fa-hashtag"></i> ${escapeHtml(evalItem.callId || '')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="eval-card-right">
                             ${editBtn}
                             <div class="eval-status-icon ${statusIconClass}" title="${statusTitle}">
                                ${statusIcon}
                             </div>
                        </div>
                    </div>
                    <div class="eval-details-pane-v2" id="eval-details-${index}">
                        <div class="eval-details-inner">
                            <div class="eval-grid-v2">
                                <div class="eval-left-col">
                                    <div class="eval-section-v2">
                                        <div class="eval-section-title-v2"><i class="fas fa-tasks"></i> Değerlendirme Kriterleri</div>
                                        ${detailTableHtml}
                                    </div>
                                </div>
                                <div class="eval-right-col">
                                    <div class="eval-section-v2">
                                        <div class="eval-section-title-v2"><i class="fas fa-bullhorn"></i> Feedback</div>
                                        <div class="eval-feedback-box-v2">
                                            ${evalItem.feedback || 'Geri bildirim belirtilmemiş.'}
                                        </div>
                                    </div>
                                    ${notesDisplay}
                                    ${interactionHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            listEl.innerHTML = listElBuffer;
        }
    } catch (err) {
        console.error(err);
        if (!silent) {
            listEl.innerHTML = `
            <div style="text-align:center; padding:40px; color:#666;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; color:#e53e3e; margin-bottom:15px;"></i>
                <p style="font-weight:600;">Bağlantı Sorunu</p>
                <p style="font-size:0.9rem; margin-bottom:15px;">Veriler alınırken bir hata oluştu. Lütfen tekrar deneyin.</p>
                <button onclick="fetchEvaluationsForAgent()" class="q-btn-v2" style="background:var(--primary); color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer;">
                    <i class="fas fa-sync"></i> Yeniden Dene
                </button>
            </div>`;
        }
    }
}

// Yeni Toggle Fonksiyonu (V2)
function newToggleEvaluationDetail(index, callId, isAlreadySeen, element) {
    const detailEl = document.getElementById(`eval-details-${index}`);
    const cardEl = document.getElementById(`eval-card-${index}`);

    const isExpanding = !cardEl.classList.contains('expanded');

    // Tüm diğerlerini kapat (Opsiyonel: Akordeon etkisi için)
    // document.querySelectorAll('.eval-card-v2.expanded').forEach(el => {
    //    if(el !== cardEl) { ... }
    // });

    if (isExpanding) {
        cardEl.classList.add('expanded');
        detailEl.style.maxHeight = detailEl.scrollHeight + "px";

        // OTOMATİK OKUNDU İŞARETLEME
        if (!isAlreadySeen && callId && !isAdminMode) {
            apiCall("markEvaluationSeen", { callId: callId });
            const statusIcon = cardEl.querySelector('.eval-status-icon');
            if (statusIcon) {
                statusIcon.classList.remove('unseen');
                statusIcon.classList.add('seen');
                statusIcon.innerHTML = '<i class="fas fa-check-double"></i>';
                statusIcon.title = 'Görüldü';
            }
        }
    } else {
        cardEl.classList.remove('expanded');
        detailEl.style.maxHeight = "0px";
    }
}

function updateAgentListBasedOnGroup() {
    const groupSelect = document.getElementById('q-admin-group');
    const agentSelect = document.getElementById('q-admin-agent');
    if (!groupSelect || !agentSelect) return;
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
function fetchUserListForAdmin() {
    return new Promise((resolve) => {
        apiCall("getUserList", {}).then(data => {
            if (data.result === "success") {
                // Sadece rütbesi 'user' veya 'qusers' olanları (temsilcileri) göster
                // Yönetim grubunu ve Admin/LocAdmin rütbelerini listeden temizle
                const allowedWords = ['chat', 'istchat', 'satış', 'satis', 'telesatis', 'telesatış'];
                adminUserList = data.users.filter(u => {
                    if (!u.group) return false;
                    const r = String(u.role || '').toLowerCase().trim();
                    const g = String(u.group).toLowerCase().trim();
                    const isStaff = (r === 'user' || r === 'qusers');
                    const isAllowedGroup = allowedWords.some(w => g.includes(w));
                    return isStaff && isAllowedGroup;
                });
                resolve(adminUserList);
            }
            else resolve([]);
        }).catch(err => resolve([]));
    });
}
function fetchCriteria(groupName) {
    return new Promise((resolve) => {
        apiCall("getCriteria", { group: groupName }).then(data => {
            if (data.result === "success") resolve(data.criteria || []); else resolve([]);
        }).catch(err => resolve([]));
    });
}
function toggleEvaluationDetail(index, callId, isAlreadySeen, element) {
    const detailEl = document.getElementById(`eval-details-${index}`);

    // Aç/Kapa Mantığı
    if (detailEl.style.maxHeight && detailEl.style.maxHeight !== '0px') {
        detailEl.style.maxHeight = '0px';
        detailEl.style.marginTop = '0';
    } else {
        detailEl.style.maxHeight = detailEl.scrollHeight + 500 + 'px';
        detailEl.style.marginTop = '10px';

        // OTOMATİK OKUNDU İŞARETLEME
        // Eğer daha önce görülmemişse, şu an açılıyorsa ve ADMİN DEĞİLSE
        if (!isAlreadySeen && callId && !isAdminMode) {
            // Backend'e hissettirmeden istek at
            apiCall("markEvaluationSeen", { callId: callId });

            // Görsel olarak 'Yeni' etiketini kaldır (Varsa)
            const badge = document.getElementById(`badge-new-${index}`);
            if (badge) badge.style.display = 'none';

            // HTML içindeki onclick parametresini güncelle (tekrar istek atmasın diye)
            // element (tıklanan satır) üzerinden yapılabilir ama basitlik için global state veya reload beklenir.
            // En temiz yöntem: Bu oturumda tekrar tetiklenmemesi için flag koymak ama isAlreadySeen parametresi sabit string geliyor.
            // Neyse, mükerrer istek backende gitse de sorun değil, backend handle eder.
        }
    }
}
async function exportEvaluations() {
    if (!isAdminMode) return;

    // Son 12 ayın listesini oluştur
    let periodOptions = `<option value="all">Tüm Zamanlar</option>`;
    const d = new Date();
    for (let i = 0; i < 12; i++) {
        let title = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        let val = (d.getMonth() + 1).toString().padStart(2, '0') + "-" + d.getFullYear(); // "01-2026"
        periodOptions += `<option value="${val}">${title}</option>`;
        d.setMonth(d.getMonth() - 1);
    }

    const { value: selectedPeriod } = await Swal.fire({
        title: 'Rapor İndir',
        html: `
            <p style="font-size:0.9rem; color:#666; margin-bottom:15px;">Hangi dönem için rapor almak istersiniz?</p>
            <select id="swal-export-period" class="swal2-input" style="width:80%; margin:0 auto;">
                ${periodOptions}
            </select>
        `,
        showCancelButton: true,
        confirmButtonText: 'İndir',
        cancelButtonText: 'Vazgeç',
        preConfirm: () => {
            return document.getElementById('swal-export-period').value;
        }
    });

    if (!selectedPeriod) return; // Vazgeçildi

    const groupSelect = document.getElementById('q-admin-group');
    const agentSelect = document.getElementById('q-admin-agent');

    Swal.fire({ title: 'Rapor Hazırlanıyor...', html: 'Veriler işleniyor, lütfen bekleyin.<br>Bu işlem veri yoğunluğuna göre biraz sürebilir.', didOpen: () => Swal.showLoading() });

    Swal.fire({ title: 'Rapor Hazırlanıyor...', html: 'Veriler işleniyor, lütfen bekleyin.<br>Bu işlem veri yoğunluğuna göre biraz sürebilir.', didOpen: () => Swal.showLoading() });

    apiCall("exportEvaluations", {
        targetAgent: agentSelect ? agentSelect.value : 'all',
        targetGroup: groupSelect ? groupSelect.value : 'all',
        targetPeriod: selectedPeriod
    }).then(data => {
        if (data.result === "success" && data.data) {

            // --- EXCEL OLUŞTURUCU (HTML TABLE YÖNTEMİ) ---
            const headers = data.headers;
            const rows = data.data;

            // 1. İstatistik Hesapla
            let totalScore = 0;
            let count = rows.length;
            let maxScore = 0;
            let minScore = 100;

            rows.forEach(r => {
                let s = parseFloat(r[5]) || 0; // 5. index Puan
                totalScore += s;
                if (s > maxScore) maxScore = s;
                if (s < minScore) minScore = s;
            });
            let avg = count > 0 ? (totalScore / count).toFixed(2) : 0;

            // 2. Özet Tablosu HTML
            let excelHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="utf-8"></head>
            <body>
            <h2 style="font-family:Arial">Kalite Değerlendirme Raporu</h2>
            <table border="1" style="border-collapse:collapse; font-family:Arial; font-size:12px; margin-bottom:20px;">
                <tr style="background-color:#E0E0E0; font-weight:bold;">
                    <td colspan="2" style="padding:10px; font-size:14px;">Yönetici Özeti</td>
                </tr>
                <tr><td><strong>Rapor Tarihi:</strong></td><td>${new Date().toLocaleDateString()}</td></tr>
                <tr><td><strong>Toplam Kayıt:</strong></td><td>${count}</td></tr>
                <tr><td><strong>Genel Ortalama:</strong></td><td style="font-size:14px; font-weight:bold; color:${avg >= 85 ? 'green' : (avg < 70 ? 'red' : 'orange')}">${avg}</td></tr>
                <tr><td><strong>En Yüksek Puan:</strong></td><td>${maxScore}</td></tr>
                <tr><td><strong>En Düşük Puan:</strong></td><td>${minScore}</td></tr>
            </table>

            <br>

            <table border="1" style="border-collapse:collapse; font-family:Arial; font-size:11px;">
                <thead>
                    <tr style="background-color:#2c3e50; color:white; height:30px;">
                        ${headers.map(h => `<th style="padding:5px; white-space:nowrap;">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
            `;

            // 3. Detay Satırları
            rows.forEach(r => {
                // Puan Renklendirme (Index 5)
                let score = r[5];
                let scoreStyle = "";
                if (score >= 90) scoreStyle = "background-color:#C6EFCE; color:#006100; font-weight:bold;";
                else if (score < 70) scoreStyle = "background-color:#FFC7CE; color:#9C0006; font-weight:bold;";
                else scoreStyle = "background-color:#FFEB9C; color:#9C6500;";

                // Durum Renklendirme (Index 7: Durum)
                let status = r[7];
                let statusStyle = "";
                if (status === "İncelemede") statusStyle = "background-color:#FFF2CC; font-weight:bold;";

                // Satır Oluştur
                excelHtml += `<tr>`;
                r.forEach((cell, idx) => {
                    let cellStyle = "padding:5px; vertical-align:top;";
                    if (idx === 5) cellStyle += scoreStyle; // Puan
                    if (idx === 7) cellStyle += statusStyle; // Durum

                    // Metin Hücreleri (Notlar, Cevaplar)
                    let val = (cell === null || cell === undefined) ? "" : String(cell);
                    excelHtml += `<td style="${cellStyle} mso-number-format:'\@';">${val}</td>`;
                });
                excelHtml += `</tr>`;
            });

            excelHtml += `</tbody></table></body></html>`;

            // 4. İndirme Tetikle
            const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", data.fileName || "Rapor.xls");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            Swal.fire({ icon: 'success', title: 'Rapor İndirildi', text: 'Excel dosyası hazırlandı.', timer: 1500, showConfirmButton: false });

        } else { Swal.fire('Hata', data.message || 'Veri alınamadı.', 'error'); }
    }).catch(e => {
        console.error(e);
        Swal.fire('Hata', 'Sunucu hatası oluştu.', 'error');
    });
}
// --- EVALUATION POPUP & EDIT ---
async function logEvaluationPopup() {
    const agentSelect = document.getElementById('q-admin-agent');
    const agentName = agentSelect ? agentSelect.value : "";

    if (!agentName || agentName === 'all') { Swal.fire('Uyarı', 'Lütfen listeden bir temsilci seçiniz.', 'warning'); return; }

    let agentGroup = 'Genel';
    const foundUser = adminUserList.find(u => u.name.toLowerCase() === agentName.toLowerCase());
    if (foundUser && foundUser.group) { agentGroup = foundUser.group; }

    // Güçlü Normalizasyon
    const cleanGroup = agentGroup.toLowerCase()
        .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim();

    const isChat = cleanGroup.includes('chat') || cleanGroup === 'ob' || cleanGroup.includes('canli');
    const isTelesatis = cleanGroup.includes('telesat') || cleanGroup.includes('satis') || cleanGroup.includes('sales');

    let criteriaGroup = agentGroup;
    if (isChat) criteriaGroup = 'Chat';
    else if (isTelesatis) criteriaGroup = 'Telesatış';

    Swal.fire({ title: 'Hazırlanıyor...', didOpen: () => Swal.showLoading() });
    let criteriaList = [];
    if (criteriaGroup && criteriaGroup !== 'Genel') { criteriaList = await fetchCriteria(criteriaGroup); }
    Swal.close();

    const isCriteriaBased = criteriaList.length > 0;
    let criteriaFieldsHtml = '';

    if (isCriteriaBased) {
        criteriaFieldsHtml += `<div class="criteria-list-v2">`;
        criteriaList.forEach((c, i) => {
            let pts = parseInt(c.points) || 0;
            if (pts === 0) return;
            const fullText = escapeForJsString(c.text);

            if (isChat) {
                let mPts = parseInt(c.mediumScore) || 0; let bPts = parseInt(c.badScore) || 0;
                criteriaFieldsHtml += `
                    <div class="criteria-item-v2" id="criteria-${i}" data-max-score="${pts}" data-current-score="${pts}">
                        <div class="criteria-top">
                            <span class="criteria-name" title="${fullText}">${i + 1}. ${c.text}</span>
                            <span class="criteria-max">Maks: ${pts} Puan</span>
                        </div>
                        <div class="criteria-actions">
                            <div class="eval-btn-group-v2">
                                <button class="eval-btn-v2 active good" data-score="${pts}" onclick="v2_setScore(${i}, ${pts}, ${pts}, 'good')">İyi</button>
                                ${mPts > 0 ? `<button class="eval-btn-v2 medium" data-score="${mPts}" onclick="v2_setScore(${i}, ${mPts}, ${pts}, 'medium')">Orta</button>` : ''}
                                <button class="eval-btn-v2 bad" data-score="${bPts}" onclick="v2_setScore(${i}, ${bPts}, ${pts}, 'bad')">Kötü</button>
                            </div>
                        </div>
                        <div class="criteria-note-row" id="note-row-${i}" style="display:none; margin-top:8px;">
                            <input type="text" id="note-${i}" class="eval-input-v2" placeholder="Durum notu ekleyin..." style="width:100%; height:34px; font-size:0.85rem;">
                        </div>
                    </div>`;
            } else if (isTelesatis) {
                criteriaFieldsHtml += `
                    <div class="criteria-item-v2" id="criteria-${i}" data-max-score="${pts}" data-current-score="${pts}">
                        <div class="criteria-top">
                            <span class="criteria-name" title="${fullText}">${i + 1}. ${c.text}</span>
                            <span class="criteria-max" id="val-${i}">${pts} / ${pts}</span>
                        </div>
                        <div class="criteria-actions">
                            <input type="range" class="custom-range" id="slider-${i}" min="0" max="${pts}" value="${pts}" 
                                   oninput="v2_updateSlider(${i}, ${pts})" style="width:100%;">
                        </div>
                        <div class="criteria-note-row" id="note-row-${i}" style="display:none; margin-top:8px;">
                            <input type="text" id="note-${i}" class="eval-input-v2" placeholder="Eksik/Gelişim notu..." style="width:100%; height:34px; font-size:0.85rem;">
                        </div>
                    </div>`;
            }
        });
        criteriaFieldsHtml += `</div>`;
    }

    const contentHtml = `
        <div class="eval-modal-v2">
            <div class="eval-form-header">
                <div class="eval-form-user">
                    <div class="eval-form-avatar">${agentName.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-size:0.8rem; color:#718096; font-weight:700;">DEĞERLENDİRİLEN</div>
                        <div style="font-size:1.1rem; font-weight:800; color:#2d3748;">${agentName}</div>
                    </div>
                </div>
                <div class="eval-form-score-box">
                    <div class="eval-form-score-val" id="v2-live-score">100</div>
                    <div class="eval-form-score-label">TOPLAM PUAN</div>
                </div>
            </div>

            <div class="eval-form-grid">
                <div class="eval-input-group">
                    <label>Call ID <span style="color:#e53e3e">*</span></label>
                    <input id="eval-callid" class="eval-input-v2" placeholder="Örn: 123456">
                </div>
                <div class="eval-input-group">
                    <label>Çağrı Tarihi</label>
                    <input type="date" id="eval-calldate" class="eval-input-v2" value="${new Date().toISOString().substring(0, 10)}">
                </div>
            </div>

            ${isCriteriaBased ? criteriaFieldsHtml : `
                <div style="padding:20px; background:#f8fafc; border:1px dashed #cbd5e0; border-radius:12px; text-align:center; margin-bottom:20px;">
                    <label style="display:block; margin-bottom:8px; font-weight:700;">Manuel Puan</label>
                    <input id="eval-manual-score" type="number" class="eval-input-v2" value="100" min="0" max="100" style="width:80px; text-align:center; font-size:1.2rem; font-weight:800;">
                </div>
                <div class="eval-input-group" style="margin-bottom:20px;">
                    <label>Değerlendirme Detayları</label>
                    <textarea id="eval-details" class="eval-input-v2" style="height:100px;" placeholder="Detaylı analizlerinizi buraya yazın..."></textarea>
                </div>
            `}

            <div class="eval-form-grid" style="margin-bottom:15px;">
                <div class="eval-input-group">
                    <label>Geri Bildirim Tipi</label>
                    <select id="feedback-type" class="eval-input-v2">
                        <option value="Yok" selected>Yok</option>
                        <option value="Sözlü">Sözlü</option>
                        <option value="Mail">Mail</option>
                    </select>
                </div>
            </div>

            <div class="eval-input-group">
                <label>Genel Geri Bildirim / Koçluk Notu</label>
                <textarea id="eval-feedback" class="eval-input-v2" style="height:80px;" placeholder="Temsilciye iletilecek gelişim mesajı..."></textarea>
            </div>
        </div>`;


    const { value: formValues } = await Swal.fire({
        html: contentHtml,
        width: '600px',
        showCancelButton: true,
        confirmButtonText: ' 💾  Kaydet',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            if (isTelesatis) window.recalcTotalSliderScore();
            else if (isChat) window.recalcTotalScore();
        },
        preConfirm: () => {
            const callId = document.getElementById('eval-callid').value.trim();
            if (!callId) {
                Swal.showValidationMessage('Call ID alanı boş bırakılamaz!');
                return false;
            }

            const callDateRaw = document.getElementById('eval-calldate').value;
            const dateParts = callDateRaw.split('-');
            const formattedCallDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : callDateRaw;

            if (isCriteriaBased) {
                let total = 0; let detailsArr = [];
                for (let i = 0; i < criteriaList.length; i++) {
                    const c = criteriaList[i]; if (parseInt(c.points) === 0) continue;
                    let val = 0; let note = document.getElementById(`note-${i}`).value;

                    const itemEl = document.getElementById(`criteria-${i}`);
                    if (isChat) {
                        const activeBtn = itemEl.querySelector('.eval-btn-v2.active');
                        val = activeBtn ? parseInt(activeBtn.getAttribute('data-score')) : 0;
                    } else if (isTelesatis) {
                        val = parseInt(document.getElementById(`slider-${i}`).value) || 0;
                    }
                    total += val; detailsArr.push({ q: c.text, max: parseInt(c.points), score: val, note: note });
                }
                return { agentName, agentGroup, callId, callDate: formattedCallDate, score: total, details: JSON.stringify(detailsArr), feedback: document.getElementById('eval-feedback').value, feedbackType: document.getElementById('feedback-type').value, status: 'Tamamlandı' };
            } else {
                return { agentName, agentGroup, callId, callDate: formattedCallDate, score: parseInt(document.getElementById('eval-manual-score').value), details: document.getElementById('eval-details').value, feedback: document.getElementById('eval-feedback').value, feedbackType: document.getElementById('feedback-type').value, status: 'Tamamlandı' };
            }
        }
    });
    if (formValues) {
        Swal.fire({ title: 'Kaydediliyor...', didOpen: () => Swal.showLoading() });
        apiCall("logEvaluation", { ...formValues })
            .then(d => {
                if (d.result === "success") {
                    Swal.fire({ icon: 'success', title: 'Kaydedildi', timer: 1500, showConfirmButton: false });
                    // DÜZELTME: Hem evaluations hem de feedback logs güncellenmeli
                    fetchEvaluationsForAgent(formValues.agentName);
                    fetchFeedbackLogs().then(() => {
                        loadFeedbackList();
                    });
                } else {
                    Swal.fire('Hata', d.message, 'error');
                }
            });
    }
}
async function editEvaluation(targetCallId) {
    const evalData = allEvaluationsData.find(item => String(item.callId).trim() === String(targetCallId).trim());
    if (!evalData) { Swal.fire('Hata', 'Kayıt bulunamadı.', 'error'); return; }

    const agentName = evalData.agent;
    const agentGroup = evalData.group || 'Genel';

    const cleanGroup = agentGroup.toLowerCase()
        .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim();

    const isChat = cleanGroup.includes('chat') || cleanGroup === 'ob';
    const isTelesatis = cleanGroup.includes('telesat');

    let criteriaGroup = agentGroup;
    if (isChat) criteriaGroup = 'Chat';
    else if (isTelesatis) criteriaGroup = 'Telesatış';

    Swal.fire({ title: 'İnceleniyor...', didOpen: () => Swal.showLoading() });
    let criteriaList = [];
    if (criteriaGroup && criteriaGroup !== 'Genel') criteriaList = await fetchCriteria(criteriaGroup);
    Swal.close();

    const isCriteriaBased = criteriaList.length > 0;
    let oldDetails = evalData.details;
    if (typeof oldDetails === 'string') {
        try { oldDetails = JSON.parse(oldDetails || "[]"); } catch (e) { oldDetails = []; }
    }
    if (!Array.isArray(oldDetails)) oldDetails = [];

    let safeDateVal = "";
    if (evalData.callDate) {
        let parts = evalData.callDate.split('.');
        if (parts.length === 3) safeDateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
        else safeDateVal = evalData.callDate;
    }

    let criteriaFieldsHtml = '';
    if (isCriteriaBased) {
        criteriaFieldsHtml += `<div class="criteria-list-v2">`;
        criteriaList.forEach((c, i) => {
            let pts = parseInt(c.points) || 0; if (pts === 0) return;
            const fullText = escapeForJsString(c.text);
            const currentCriterionText = String(c.text || '').trim().toLowerCase();
            let oldItem = oldDetails.find(d => String(d.q || d.text || '').trim().toLowerCase() === currentCriterionText)
                || (oldDetails[i] ? oldDetails[i] : { score: pts, note: '' });

            // cVal'ın sayı olduğundan emin olalım, eğer bulunamazsa veya hatalıysa varsayılan (max) puanı verelim
            let savedScore = oldItem.score !== undefined ? oldItem.score : (oldItem.points !== undefined ? oldItem.points : pts);
            let cVal = parseInt(savedScore);
            if (isNaN(cVal)) cVal = pts;
            let cNote = oldItem.note || '';

            if (isChat) {
                let mPts = parseInt(c.mediumScore) || 0; let bPts = parseInt(c.badScore) || 0;
                let gAct = cVal === pts ? 'active' : '';
                let mAct = (cVal === mPts && mPts !== 0) ? 'active' : '';
                let bAct = (cVal === bPts || (cVal === 0 && bPts === 0)) ? 'active' : '';
                criteriaFieldsHtml += `
                    <div class="criteria-item-v2 ${cVal < pts ? 'failed' : ''}" id="criteria-${i}" data-max-score="${pts}">
                        <div class="criteria-top"><span class="criteria-name" title="${fullText}">${i + 1}. ${c.text}</span><span class="criteria-max">Maks: ${pts} Puan</span></div>
                        <div class="criteria-actions">
                            <div class="eval-btn-group-v2">
                                <button type="button" class="eval-btn-v2 ${gAct} good" data-score="${pts}" onclick="v2_setScore(${i}, ${pts}, ${pts}, 'good')">İyi</button>
                                ${mPts > 0 ? `<button type="button" class="eval-btn-v2 ${mAct} medium" data-score="${mPts}" onclick="v2_setScore(${i}, ${mPts}, ${pts}, 'medium')">Orta</button>` : ''}
                                <button type="button" class="eval-btn-v2 ${bAct} bad" data-score="${bPts}" onclick="v2_setScore(${i}, ${bPts}, ${pts}, 'bad')">Kötü</button>
                            </div>
                        </div>
                        <div class="criteria-note-row" id="note-row-${i}" style="display:${cVal < pts ? 'block' : 'none'}; margin-top:8px;">
                             <input type="text" id="note-${i}" class="eval-input-v2" value="${cNote}" placeholder="Not ekle..." style="width:100%; height:32px; padding:4px 10px; font-size:0.8rem;">
                        </div>
                    </div>`;
            } else if (isTelesatis) {
                criteriaFieldsHtml += `
                    <div class="criteria-item-v2 ${cVal < pts ? 'failed' : ''}" id="criteria-${i}" data-max-score="${pts}">
                        <div class="criteria-top"><span class="criteria-name" title="${fullText}">${i + 1}. ${c.text}</span><span class="criteria-max" id="val-${i}">${cVal} / ${pts}</span></div>
                        <div class="criteria-actions" style="flex-wrap: wrap;">
                            <input type="range" class="custom-range" id="slider-${i}" min="0" max="${pts}" value="${cVal}" oninput="v2_updateSlider(${i}, ${pts})" style="width:100%;">
                        </div>
                        <div class="criteria-note-row" id="note-row-${i}" style="display:${cVal < pts ? 'block' : 'none'}; margin-top:8px; width: 100%;">
                            <input type="text" id="note-${i}" class="eval-input-v2" value="${cNote}" placeholder="Not..." style="width:100%; height:32px; padding:4px 10px; font-size:0.8rem;">
                        </div>
                    </div>`;
            }
        });
        criteriaFieldsHtml += `</div>`;
    }

    const contentHtml = `
        <div class="eval-modal-v2">
            <div class="eval-form-header" style="border-bottom-color:#1976d2;"><div class="eval-form-user"><div class="eval-form-avatar" style="background:#1976d2;">${agentName.charAt(0).toUpperCase()}</div><div><div style="font-size:0.8rem; color:#718096; font-weight:700;">DÜZENLENEN</div><div style="font-size:1.1rem; font-weight:800; color:#1976d2;">${agentName}</div></div></div><div class="eval-form-score-box"><div class="eval-form-score-val" id="v2-live-score">${evalData.score}</div><div class="eval-form-score-label">MEVCUT PUAN</div></div></div>
            <div class="eval-form-grid" style="background:#f0f7ff; border:1px solid #cde4ff;"><div class="eval-input-group"><label>Call ID</label><input id="eval-callid" class="eval-input-v2" value="${evalData.callId}" readonly style="background:#e1efff; cursor:not-allowed;"></div><div class="eval-input-group"><label>Çağrı Tarihi</label><input type="date" id="eval-calldate" class="eval-input-v2" value="${safeDateVal}"></div></div>
            <div style="margin:15px 0; font-weight:800; font-size:0.9rem; color:#4a5568;"><i class="fas fa-edit" style="color:#1976d2;"></i> KRİTERLERİ GÜNCELLE</div>
            ${isCriteriaBased ? criteriaFieldsHtml : `<div style="padding:20px; background:#f8fafc; border:1px dashed #cbd5e0; border-radius:12px; text-align:center; margin-bottom:20px;"><label style="display:block; margin-bottom:8px; font-weight:700;">Manuel Puan</label><input id="eval-manual-score" type="number" class="eval-input-v2" value="${evalData.score}" min="0" max="100" style="width:80px; text-align:center;"></div><textarea id="eval-details" class="eval-input-v2" style="height:100px;">${typeof evalData.details === 'string' ? evalData.details : ''}</textarea>`}
            <div class="eval-input-group"><label>Revize Feedback / Notlar</label><textarea id="eval-feedback" class="eval-input-v2" style="height:100px;">${evalData.feedback || ''}</textarea></div>
        </div>`;

    const { value: formValues } = await Swal.fire({
        html: contentHtml, width: '600px', showCancelButton: true, confirmButtonText: ' 💾  Değişiklikleri Kaydet', allowOutsideClick: false, allowEscapeKey: false,
        didOpen: () => { window.v2_recalc(); },
        preConfirm: () => {
            const callId = document.getElementById('eval-callid').value;
            const rawDate = document.getElementById('eval-calldate').value;
            let callDate = rawDate;
            if (rawDate.includes('-')) { const p = rawDate.split('-'); if (p.length === 3) callDate = `${p[2]}.${p[1]}.${p[0]}`; }
            const feedback = document.getElementById('eval-feedback').value;
            if (isCriteriaBased) {
                let total = 0; let detailsArr = [];
                for (let i = 0; i < criteriaList.length; i++) {
                    const c = criteriaList[i]; if (parseInt(c.points) === 0) continue;
                    let val = 0; let note = document.getElementById(`note-${i}`).value;
                    const itemEl = document.getElementById(`criteria-${i}`);
                    const slider = itemEl.querySelector('input[type="range"]');
                    if (slider) val = parseInt(slider.value) || 0;
                    else { const activeBtn = itemEl.querySelector('.eval-btn-v2.active'); val = activeBtn ? parseInt(activeBtn.getAttribute('data-score')) : 0; }
                    total += val; detailsArr.push({ q: c.text, max: parseInt(c.points), score: val, note: note });
                }
                return { agentName, callId, callDate, score: total, details: JSON.stringify(detailsArr), feedback, status: evalData.status || 'Tamamlandı' };
            } else {
                return { agentName, callId, callDate, score: parseInt(document.getElementById('eval-manual-score').value), details: document.getElementById('eval-details').value, feedback, status: evalData.status || 'Tamamlandı' };
            }
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Güncelleniyor...', didOpen: () => Swal.showLoading() });
        apiCall("updateEvaluation", { ...formValues }).then(d => {
            if (d.result === "success") {
                Swal.fire({ icon: 'success', title: 'Güncellendi', timer: 1500, showConfirmButton: false });
                fetchEvaluationsForAgent(agentName);
                fetchFeedbackLogs().then(() => { loadFeedbackList(); });
            } else { Swal.fire('Hata', d.message, 'error'); }
        });
    }
}




/* =========================================================
   ANA SAYFA + TEKNİK + TELESATIŞ (FULLSCREEN) GÜNCELLEMESİ
   ========================================================= */

const TELESales_OFFERS_FALLBACK = [{ "offer": "YILLIK - 1299 TL", "segment": "WİNBACK", "description": "Kullanıcı daha önce aylık ya da yıllık herhangi bir paket kullanmış, ardından paket sonlanmış ve şu anda aktif paketi olmayan kullanıcıları aradığımız bir data", "note": "Kullanıcının izleme geçmişi olabilir." }, { "offer": "AYLIK  - 6 AY 109 TL", "segment": "WİNBACK", "description": "Kullanıcı daha önce aylık ya da yıllık herhangi bir paket kullanmış, ardından paket sonlanmış ve şu anda aktif paketi olmayan kullanıcıları aradığımız bir data", "note": "Kullanıcının izleme geçmişi olabilir." }, { "offer": "YILLIK - 1399 TL", "segment": "CANCELLİNG", "description": "Aboneliğinde iptal talebinde bulunmuş, paket süresi bitimine kadar erişime devam eden, geri kazanım için aradığımız bir data", "note": "Kullanıcının izleme geçmişi olabilir. İndirim oranı yüksek + Kullanıcının bir iptal nedeni olabilir" }, { "offer": "AYLIK  - 6 AY 119 TL", "segment": "CANCELLİNG", "description": "Aboneliğinde iptal talebinde bulunmuş, paket süresi bitimine kadar erişime devam eden, geri kazanım için aradığımız bir data", "note": "Kullanıcının izleme geçmişi olabilir. İndirim oranı yüksek + Kullanıcının bir iptal nedeni olabilir" }, { "offer": "YILLIK - 1499 TL", "segment": "ACTİVE GRACE", "description": "Paket yenileme sürecine giren fakat ücret alınamadığı için paketi yenilenemeyen kullanıcıları aradığımız bir data", "note": "Paket yenileme sürecinden bir ödeme sorunu oluştuğunu bu nedenle aboneliğinin yenilenmediğini, kullanıcıya hem bu sorunu çözmek hem de indirimli fiyatlar üzerinden yardımcı olmak +İçerik" }, { "offer": "AYLIK  - 6 AY 109 TL", "segment": "ACTİVE GRACE", "description": "Paket yenileme sürecine giren fakat ücret alınamadığı için paketi yenilenemeyen kullanıcıları aradığımız bir data", "note": "Paket yenileme sürecinden bir ödeme sorunu oluştuğunu bu nedenle aboneliğinin yenilenmediğini, kullanıcıya hem bu sorunu çözmek hem de indirimli fiyatlar üzerinden yardımcı olmak +İçerik" }, { "offer": "YILLIK - 1499 TL", "segment": "INBOUND", "description": "Inbound üzerinden gelen satın alma talepleri ya da satışa ikna edilen kullanıcılar için sunulan teklif", "note": "" }, { "offer": "AYLIK - 6 AY 139,5 TL", "segment": "INBOUND", "description": "Inbound üzerinden gelen satın alma talepleri ya da satışa ikna edilen kullanıcılar için sunulan teklif", "note": "" }];
const SPORTS_RIGHTS_FALLBACK = [{ "item": "Euroleague maçları ve stüdyo programları", "period": "2025-2026 / 2026- 2027 / 2027-2028 / 2028-2029", "note": "" }, { "item": "Bundesliga", "period": "2025-2026 / 2026- 2027 / 2027-2028 / 2028-2029", "note": "" }, { "item": "Bundesliga 2", "period": "2025-2026 / 2026- 2027 / 2027-2028 / 2028-2029", "note": "" }, { "item": "İspanya LaLiga önemli maçları", "period": "2025 - 2026 / 2026 - 2027", "note": "" }, { "item": "LaLiga 2 önemli maçları", "period": "2025 - 2026 / 2026 - 2027", "note": "" }, { "item": "İtalya Serie A önemli maçları", "period": "2025 - 2026 / 2026 - 2027", "note": "" }, { "item": "Portekiz Liga Portugal önemli maçları", "period": "2025 - 2026", "note": "" }, { "item": "Suudi Arabistan Pro Lig önemli maçları", "period": "2025-2026 / 2026- 2027 / 2027-2028 / 2028-2029", "note": "" }, { "item": "Hollanda Ligi", "period": "2025-2026 / 2026- 2027 / 2027-2028 / 2028-2029", "note": "" }, { "item": "İskoçya Premiership önemli maçları", "period": "2025 - 2026 / 2026 - 2027", "note": "" }, { "item": "NCAA Amerikan Futbol", "period": "2025 - 2026 / 2026 - 2027", "note": "" }, { "item": "NCAA Basketbol", "period": "2025 - 2026 / 2026 - 2027", "note": "" }, { "item": "NFL", "period": "2025 - 2026", "note": "" }, { "item": "NBA", "period": "2025-2026 / 2026- 2027 / 2027-2028 / 2028-2029", "note": "" }, { "item": "EuroCup", "period": "2025-2026 / 2026- 2027 / 2027-2028 / 2028-2029", "note": "" }, { "item": "Yunanistan Basketbol Ligi önemli maçları", "period": "2025 - 2026 Sezon belirsiz", "note": "" }, { "item": "NCAA", "period": "2025 - 2026 / 2026 - 2027", "note": "" }, { "item": "Libertadores Kupası", "period": "2027, 2028, 2029, 2030 (4 seasons)", "note": "" }, { "item": "Copa Sudamericana", "period": "2027, 2028, 2029, 2030 (4 seasons)", "note": "" }, { "item": "WRC", "period": "2025", "note": "2026 da alınabilir net değil" }, { "item": "Nascar", "period": "2025 - 2026 - 2027 - 2028 ve 2029", "note": "" }, { "item": "IndyCar", "period": "2025 - 2026 - 2027", "note": "" }, { "item": "MotoGP - Moto2 - Moto3", "period": "2025 - 2026 - 2027", "note": "" }, { "item": "ATP Tenis Turnuvaları önemli maçlar", "period": "2025 - 2026 - 2027 and 2028", "note": "" }, { "item": "Wimbledon Tenis önemli maçlar", "period": "2025 - 2026 - 2027", "note": "" }, { "item": "UFC Dövüş Gecesi yayınları", "period": "2027 sonuna kadar bizde", "note": "" }, { "item": "Oktagon", "period": "2025", "note": "" }, { "item": "PFL MMA", "period": "2025", "note": "" }, { "item": "Cage Warriors Boks Maçları", "period": "2025", "note": "" }, { "item": "BKFC", "period": "Kaldırıldı", "note": "" }];

function setActiveFilterButton(btn) {
    try {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    } catch (e) { }
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

function renderHomePanels() {
    // --- BUGÜN NELER VAR? (Yayın Akışı / bugünün maçları) ---
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
                    // dd.MM.yyyy
                    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
                    return '';
                };

                const todays = (items || []).filter(it => {
                    const iso = toISO(it.dateISO || it.date);
                    if (iso !== todayISO) return false;

                    // Saati geçen karşılaşmalar görünmesin
                    const now = Date.now();
                    const se = Number(it.startEpoch || 0);
                    if (se) return se > now;
                    const t = String(it.time || '').trim();
                    const m = t.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
                    if (!m) return true; // saat formatı yoksa göster
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
                        const time = escapeHtml(it.time || '');
                        const title = escapeHtml(it.match || it.title || it.event || '');
                        const ch = escapeHtml(it.channel || it.platform || '');
                        const league = escapeHtml(it.league || it.category || '');
                        const spk = escapeHtml(it.spiker || it.spikers || it.commentator || it.commentators || '');
                        return `
                          <div class="home-mini-item">
                            <div class="home-mini-date">${time}${league ? ` • ${league}` : ''}${ch ? ` • ${ch}` : ''}</div>
                            <div class="home-mini-title">${title || 'Maç'}</div>
                            ${spk ? `<div class="home-mini-desc" style="margin-top:4px;color:#555">🎙 ${spk}</div>` : ''}
                          </div>
                        `;
                    }).join('') + (todays.length > shown.length ? `<div style="color:#666;font-size:.9rem;margin-top:6px">+${todays.length - shown.length} maç daha…</div>` : '');
                }


                // kartı tıklayınca yayın akışına git
                const card = todayEl.closest('.home-card');
                if (card) {
                    card.classList.add('clickable');
                    card.onclick = () => openBroadcastFlow();
                }
            } catch (e) {
                todayEl.innerHTML = '<div class="home-mini-item">Yayın akışı alınamadı.</div>';
            }
        })();
    }

    // --- DUYURULAR (son 3 duyuru) ---
    const annEl = document.getElementById('home-ann');
    if (annEl) {
        const latest = (newsData || []).slice(0, 3);
        if (latest.length === 0) {
            annEl.innerHTML = '<div class="home-mini-item">Henüz duyuru yok.</div>';
        } else {
            annEl.innerHTML = latest.map(n => `
                <div class="home-mini-item">
                  <div class="home-mini-date">${escapeHtml(n.date || '')}</div>
                  <div class="home-mini-title">${escapeHtml(n.title || '')}</div>
                  <div class="home-mini-desc" style="white-space: pre-line">${escapeHtml(String(n.desc || '')).slice(0, 160)}${(n.desc || '').length > 160 ? '...' : ''}</div>
                </div>
            `).join('');
        }
        const card = annEl.closest('.home-card');
        if (card) {
            card.classList.add('clickable');
            card.onclick = () => openNews();
        }
    }

    // --- GÜNÜN SÖZÜ (HomeBlocks -> e-tabla) ---
    const quoteEl = document.getElementById('home-quote');
    if (quoteEl) {
        // blockId veya key farketmeksizin "quote" olarak indexliyoruz
        const qObj = homeBlocks['quote'];
        const content = (qObj?.content || qObj?.text || localStorage.getItem('homeQuote') || '').trim();
        const author = qObj?.title || qObj?.head || '';

        if (content) {
            quoteEl.innerHTML = `
                <div class="home-quote-content">
                    <i class="fas fa-quote-left quote-icon-start"></i>
                    <p class="quote-text">${escapeHtml(content)}</p>
                    ${author ? `<p class="quote-author">— ${escapeHtml(author)}</p>` : ''}
                </div>
            `;
            quoteEl.style.display = '';
        } else {
            quoteEl.innerHTML = '<span style="color:#999">Bugün için bir söz eklenmemiş.</span>';
            // Fallback: cache boşsa Supabase'den tekil çekmeyi bir kez dene
            try {
                if (sb) {
                    sb.from('HomeBlocks').select('*').eq('Key', 'quote').single().then(({ data, error }) => {
                        if (!error && data) {
                            const qn = normalizeKeys(data);
                            homeBlocks = homeBlocks || {};
                            homeBlocks.quote = qn;
                            try { localStorage.setItem('homeBlocksCache', JSON.stringify(homeBlocks || {})); } catch (e) { }
                            try { renderHomePanels(); } catch (e) { }
                        }
                    });
                }
            } catch (e) { }
        }
    }

    // --- LİDERLİK TABLOSU (Home-Screen) ---
    try { renderHomeLeaderboard(); } catch (e) { }

    // Admin: edit butonlarını aç
    try {
        const b1 = document.getElementById('home-edit-today');
        const b2 = document.getElementById('home-edit-ann');
        const b3 = document.getElementById('home-edit-quote');
        if (b1) b1.style.display = 'none'; // artık dinamik
        if (b2) b2.style.display = 'none'; // duyuru dinamik
        if (b3) b3.style.display = (isAdminMode && isEditingActive ? 'inline-flex' : 'none');
    } catch (e) { }
}



// Ana Sayfa - Günün Sözü düzenleme (sadece admin mod + düzenleme açıkken)
function editHomeBlock(kind) {
    if (!isAdminMode) {
        Swal.fire("Yetkisiz", "Bu işlem için admin yetkisi gerekli.", "warning");
        return;
    }
    if (!isEditingActive) {
        Swal.fire("Kapalı", "Düzenleme modu kapalı. Önce 'Düzenlemeyi Aç' demelisin.", "info");
        return;
    }
    const curContent = String((homeBlocks && homeBlocks.quote && homeBlocks.quote.content) ? homeBlocks.quote.content : (localStorage.getItem('homeQuote') || '')).trim();
    const curAuthor = String((homeBlocks && homeBlocks.quote && homeBlocks.quote.title) ? homeBlocks.quote.title : '').trim();

    Swal.fire({
        title: "Günün Sözü Düzenle",
        html: `
            <div style="text-align:left; margin-bottom:10px;">
                <label style="font-weight:bold; display:block; margin-bottom:5px;">Söz İçeriği:</label>
                <textarea id="edit-quote-content" class="swal2-textarea" style="margin:0; width:100%; height:100px;">${escapeHtml(curContent)}</textarea>
            </div>
            <div style="text-align:left;">
                <label style="font-weight:bold; display:block; margin-bottom:5px;">Yazar / Kaynak:</label>
                <input id="edit-quote-author" class="swal2-input" style="margin:0; width:100%;" value="${escapeHtml(curAuthor)}">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Kaydet",
        cancelButtonText: "Vazgeç",
        preConfirm: () => {
            return {
                content: (document.getElementById('edit-quote-content').value || '').trim(),
                author: (document.getElementById('edit-quote-author').value || '').trim()
            };
        }
    }).then(res => {
        if (!res.isConfirmed) return;
        const { content, author } = res.value;

        // e-tabla (HomeBlocks)
        apiCall('updateHomeBlock', { key: 'quote', title: author, content: content, visibleGroups: '' })
            .then(() => {
                homeBlocks = homeBlocks || {};
                homeBlocks.quote = { key: 'quote', title: author, content: content, visibleGroups: '' };
                try { localStorage.setItem('homeBlocksCache', JSON.stringify(homeBlocks || {})); } catch (e) { }
                renderHomePanels();
                Swal.fire("Kaydedildi", "Günün sözü güncellendi.", "success");
            })
            .catch(err => {
                console.error("Home block update error:", err);
                Swal.fire("Hata", "Veritabanı güncellenemedi.", "error");
            });
    });
}

// Kart detayını doğrudan açmak için küçük bir yardımcı
function openCardDetail(cardId) {
    const card = (database || []).find(x => String(x.id) === String(cardId));
    if (!card) { Swal.fire('Hata', 'Kart bulunamadı.', 'error'); return; }
    showCardDetail(card);
}

/* -------------------------
   TELE SATIŞ FULLSCREEN
--------------------------*/

let telesalesOffers = [];
let telesalesScriptsLoaded = false;
function safeGetToken() {
    try { return (typeof getToken === 'function') ? getToken() : ''; } catch (e) { return ''; }
}
async function fetchSheetObjects(actionName) {
    const d = await apiCall(actionName);
    // backend handleFetchData returns {data:[...]} ; other handlers may use {items:[...]}
    return d.data || d.items || [];
}

async function maybeLoadTelesalesScriptsFromSheet() {
    if (telesalesScriptsLoaded) return;
    telesalesScriptsLoaded = true;
    // Eğer kullanıcı local override yaptıysa sheet'ten ezmeyelim
    try {
        const ov = JSON.parse(localStorage.getItem('telesalesScriptsOverride') || '[]');
        if (Array.isArray(ov) && ov.length) return;
    } catch (e) { }
    try {
        const loaded = await fetchSheetObjects('getTelesalesScripts');
        if (Array.isArray(loaded) && loaded.length) {
            // Sheet kolon adlarını normalize et
            window.salesScripts = loaded.map(s => ({
                id: s.id || s.ID || s.Id || '',
                title: s.title || s.Başlık || s.Baslik || s.Script || s['Script Başlığı'] || 'Script',
                text: s.text || s.Metin || s['Script Metni'] || s.content || ''
            })).filter(x => x.text);
        }
    } catch (e) {
        // sessiz fallback
    }
}

async function syncTelesalesScriptsToSheet(arr) {
    // Backend desteği varsa Sheets'e yaz; yoksa sessizce local'de kalsın.
    try {
        await apiCall('saveTelesalesScripts', { scripts: arr || [] });
    } catch (e) {
        // sessiz fallback
    }
}

// --- KALİTE YÖNETİMİ ALANI ---
async function openQualityArea() {
    const wrap = document.getElementById('quality-fullscreen');
    if (!wrap) return;

    // Menü yetkisi: quality
    try {
        const perm = (typeof menuPermissions !== "undefined" && menuPermissions) ? menuPermissions["quality"] : null;
        if (perm && !isAllowedByPerm(perm)) {
            Swal.fire("Yetkisiz", "Kalite ekranına erişimin yok.", "warning");
            return;
        }
    } catch (e) { }

    wrap.style.display = 'flex';
    document.body.classList.add('fs-open');
    document.body.style.overflow = 'hidden';

    // Sidebar profil
    const av = document.getElementById('q-side-avatar');
    const nm = document.getElementById('q-side-name');
    const rl = document.getElementById('q-side-role');
    if (av) av.innerText = (currentUser || 'U').trim().slice(0, 1).toUpperCase();
    if (nm) nm.innerText = currentUser || 'Kullanıcı';
    if (rl) rl.innerText = isAdminMode ? 'Yönetici' : 'Temsilci';
    // Yetki kontrolü (Admin butonlarını göster/gizle)
    const adminFilters = document.getElementById('q-admin-filters');
    const assignBtn = document.getElementById('assign-training-btn');
    const manualFeedbackBtn = document.getElementById('manual-feedback-admin-btn');

    if (isAdminMode) {
        if (adminFilters) {
            adminFilters.style.display = 'flex';
            // Buton bazlı yetki kontrolü
            const rptBtn = adminFilters.querySelector('.admin-btn');
            if (rptBtn) {
                if (isLocAdmin || hasPerm('Reports')) rptBtn.style.display = '';
                else rptBtn.style.display = 'none';
            }
            const addBtn = adminFilters.querySelector('.add-btn');
            if (addBtn) {
                if (isLocAdmin || hasPerm('AddContent')) addBtn.style.display = '';
                else addBtn.style.display = 'none';
            }
        }
        if (assignBtn) assignBtn.style.display = 'block';
        if (manualFeedbackBtn) manualFeedbackBtn.style.display = 'flex';

        // Grup filtresi dropdown'u admin kullanıcı listesi gelince dolacak
        if (adminUserList.length) {
            const groupSelect = document.getElementById('q-admin-group');
            if (groupSelect) {
                const allowedWords = ['chat', 'istchat', 'satış', 'satis'];
                const groups = [...new Set(adminUserList.map(u => u.group).filter(g => {
                    if (!g) return false;
                    const low = g.toLowerCase();
                    return allowedWords.some(w => low.includes(w));
                }))].sort();
                groupSelect.innerHTML = `<option value="all">Tüm Gruplar</option>` + groups.map(g => `<option value="${g}">${g}</option>`).join('');
                try { updateAgentListBasedOnGroup(); } catch (e) { }
            }
        }
    } else {
        if (adminFilters) adminFilters.style.display = 'none';
        if (assignBtn) assignBtn.style.display = 'none';
        if (manualFeedbackBtn) manualFeedbackBtn.style.display = 'none';
    }


    if (adminUserList.length === 0) {
        Swal.fire({ title: 'Temsilci Listesi Yükleniyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
        await fetchUserListForAdmin();
        Swal.close();
    }

    // Filtreleri doldur
    populateDashboardFilters();
    populateFeedbackFilters();
    populateFeedbackMonthFilter();
    populateMonthFilterFull();

    switchQualityTab('dashboard');
}

// Modülü Kapat
function closeFullQuality() {
    document.getElementById('quality-fullscreen').style.display = 'none';
    document.body.classList.remove('fs-open');
    document.body.style.overflow = '';
    // Eğer qusers ise (sadece kalite yetkisi varsa) logout yapmalı veya uyarı vermeli
    if (localStorage.getItem("sSportRole") === 'qusers') {
        logout();
    }
}

// Sekme Değiştirme
function switchQualityTab(tabName, element) {
    // Menu active class
    document.querySelectorAll('#quality-fullscreen .q-nav-item').forEach(item => item.classList.remove('active'));

    // Element varsa onu aktif yap, yoksa nav içerisinden bul
    if (element) {
        element.classList.add('active');
    } else {
        const navItem = document.querySelector(`#quality-fullscreen .q-nav-item[onclick*="${tabName}"]`);
        if (navItem) navItem.classList.add('active');
    }

    // View active class
    document.querySelectorAll('#quality-fullscreen .q-view-section').forEach(section => section.classList.remove('active'));
    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.add('active');

    // Veri Yükleme
    if (tabName === 'dashboard') loadQualityDashboard();
    else if (tabName === 'evaluations') fetchEvaluationsForAgent();
    else if (tabName === 'feedback') {
        populateFeedbackFilters();
        populateFeedbackMonthFilter();
        refreshFeedbackData();
    }
    else if (tabName === 'training') loadTrainingData();
}


async function openTelesalesArea() {
    // Menü yetkisi: telesales (TeleSatış) - yetkisiz kullanıcı fullscreen'e giremesin
    try {
        const perm = (typeof menuPermissions !== "undefined" && menuPermissions) ? menuPermissions["telesales"] : null;
        if (perm && !isAllowedByPerm(perm)) {
            Swal.fire("Yetkisiz", "TeleSatış ekranına erişimin yok.", "warning");
            return;
        }
    } catch (e) { }

    const wrap = document.getElementById('telesales-fullscreen');
    if (!wrap) return;
    wrap.style.display = 'flex';
    document.body.classList.add('fs-open');
    document.body.style.overflow = 'hidden';

    // Sidebar profil
    const av = document.getElementById('t-side-avatar');
    const nm = document.getElementById('t-side-name');
    const rl = document.getElementById('t-side-role');
    if (av) av.innerText = (currentUser || 'U').trim().slice(0, 1).toUpperCase();
    if (nm) nm.innerText = currentUser || 'Kullanıcı';
    if (rl) rl.innerText = isAdminMode ? 'Admin' : 'Temsilci';

    // Data teklifleri: önce e-tabladan çekmeyi dene, olmazsa fallback
    if (telesalesOffers.length === 0) {
        let loaded = [];
        try {
            loaded = await fetchSheetObjects("getTelesalesOffers");
        } catch (e) {
            // sessiz fallback
        }
        telesalesOffers = (Array.isArray(loaded) && loaded.length)
            ? loaded.map(o => ({
                segment: o.segment || o.Segment || o.SEGMENT || '',
                title: o.title || o.Başlık || o.Baslik || o.Teklif || o['Teklif Adı'] || o['Teklif Adi'] || '',
                desc: o.desc || o.Açıklama || o.Aciklama || o.Detay || o['Detay/Not'] || '',
                note: o.note || o.Not || o.Note || '',
                image: o.image || o.Image || o.Görsel || o.Gorsel || '',
                example: o.example || o.Örnek || o.Ornek || '',
                tips: o.tips || o.İpucu || o.Ipucu || '',
                objection: o.objection || o.Itiraz || '',
                reply: o.reply || o.Cevap || ''
            }))
            : (Array.isArray(window.telesalesOffersFromSheet) && window.telesalesOffersFromSheet.length
                ? window.telesalesOffersFromSheet
                : TELESales_OFFERS_FALLBACK);
    }

    // Segment filtresi kaldırıldı
    renderTelesalesDataOffers();
    // Scriptler: sheet'ten çekmeyi dene
    await maybeLoadTelesalesScriptsFromSheet();
    renderTelesalesScripts();
    switchTelesalesTab('data');
}

function closeFullTelesales() {
    const wrap = document.getElementById('telesales-fullscreen');
    if (wrap) wrap.style.display = 'none';
    document.body.classList.remove('fs-open');
    document.body.style.overflow = '';
}

function switchTelesalesTab(tab) {
    document.querySelectorAll('#telesales-fullscreen .q-nav-item').forEach(i => i.classList.remove('active'));
    // Set active nav by onclick marker
    document.querySelectorAll('#telesales-fullscreen .q-nav-item').forEach(i => {
        if ((i.getAttribute('onclick') || '').includes(`"${tab}"`)) i.classList.add('active');
    });

    document.querySelectorAll('#telesales-fullscreen .q-view-section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`t-view-${tab}`);
    if (el) el.classList.add('active');
}

function hydrateTelesalesSegmentFilter() {
    const sel = document.getElementById('t-data-seg');
    if (!sel) return;
    const segs = Array.from(new Set((telesalesOffers || []).map(o => o.segment).filter(Boolean))).sort();
    sel.innerHTML = '<option value="all">Tüm Segmentler</option>' + segs.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
}

function renderTelesalesDataOffers() {
    const grid = document.getElementById('t-data-grid');
    if (!grid) return;

    const q = (document.getElementById('t-data-search')?.value || '').toLowerCase();

    const list = (telesalesOffers || []).filter(o => {
        const hay = `${o.title || ''} ${o.desc || ''} ${o.segment || ''} ${o.tag || ''}`.toLowerCase();
        const okQ = !q || hay.includes(q);
        return okQ;
    });

    const bar = (isAdminMode && isEditingActive) ? `
        <div style="grid-column:1/-1;display:flex;gap:10px;align-items:center;margin:6px 0 12px;">
          <button class="x-btn x-btn-admin" onclick="addTelesalesOffer()"><i class="fas fa-plus"></i> Teklif Ekle</button>
        </div>
    ` : '';

    if (list.length === 0) {
        grid.innerHTML = bar + '<div style="opacity:.7;padding:20px;grid-column:1/-1">Sonuç bulunamadı.</div>';
        const cnt = document.getElementById('t-data-count'); if (cnt) cnt.innerText = '0 kayıt';
        return;
    }

    const cnt = document.getElementById('t-data-count');
    if (cnt) cnt.innerText = `${list.length} kayıt`;

    grid.innerHTML = bar + list.map((o, idx) => {
        const imgHtml = o.image ? `<div style="height:120px;overflow:hidden;border-radius:6px;margin-bottom:8px;"><img src="${processImageUrl(o.image)}" style="width:100%;height:100%;object-fit:cover;"></div>` : '';
        return `
        <div class="q-training-card" onclick="showTelesalesOfferDetail(${idx})" style="cursor:pointer">
          ${imgHtml}
          <div class="t-training-head">
            <div style="min-width:0">
              <div class="q-item-title" style="font-size:1.02rem">${escapeHtml(o.title || 'Teklif')}</div>
            </div>
            <div class="t-training-badge">${escapeHtml(o.segment || o.tag || '')}</div>
          </div>
          <div class="t-training-desc" style="white-space: pre-line">${escapeHtml((o.desc || '').slice(0, 140))}${(o.desc || '').length > 140 ? '...' : ''}</div>
          <div style="margin-top:10px;color:#999;font-size:.8rem">(Detay için tıkla)</div>
          ${(isAdminMode && isEditingActive) ? `
            <div style="margin-top:12px;display:flex;gap:10px">
              <button class="x-btn x-btn-admin" onclick="event.stopPropagation(); editTelesalesOffer(${idx});"><i class="fas fa-pen"></i> Düzenle</button>
              <button class="x-btn x-btn-admin" onclick="event.stopPropagation(); deleteTelesalesOffer(${idx});"><i class="fas fa-trash"></i> Sil</button>
            </div>
          ` : ``}
        </div>
    `;
    }).join('');
}

function addTelesalesOffer() {
    Swal.fire({
        title: "TeleSatış Teklifi Ekle",
        html: `
          <input id="to-title" class="swal2-input" placeholder="Başlık*" style="margin-bottom:10px">
          <input id="to-seg" class="swal2-input" placeholder="Segment" style="margin-bottom:10px">
           <input id="to-img" class="swal2-input" placeholder="Görsel URL (İsteğe bağlı)" style="margin-bottom:10px">
          <textarea id="to-desc" class="swal2-textarea" placeholder="Açıklama" style="margin-bottom:10px"></textarea>
          <textarea id="to-note" class="swal2-textarea" placeholder="Not (Kritik Bilgi)"></textarea>
         <textarea id="to-detail" class="swal2-textarea" placeholder="Diğer Detay"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Ekle",
        cancelButtonText: "Vazgeç",
        preConfirm: () => {
            const title = (document.getElementById('to-title').value || '').trim();
            if (!title) return Swal.showValidationMessage("Başlık zorunlu");
            return {
                title,
                segment: (document.getElementById('to-seg').value || '').trim(),
                image: (document.getElementById('to-img').value || '').trim(),
                desc: (document.getElementById('to-desc').value || '').trim(),
                note: (document.getElementById('to-note').value || '').trim(),
                detail: (document.getElementById('to-detail').value || '').trim(),
                pk: Date.now().toString()
            };
        }
    }).then(async res => {
        if (!res.isConfirmed) return;
        const v = res.value;
        Swal.fire({ title: 'Ekleniyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
        try {
            telesalesOffers.unshift(v);
            const d = await apiCall("saveAllTelesalesOffers", { offers: telesalesOffers });
            if (d.result === 'success') {
                Swal.fire({ icon: 'success', title: 'Eklendi', timer: 1200, showConfirmButton: false });
                renderTelesalesDataOffers();
            } else {
                telesalesOffers.shift();
                Swal.fire('Hata', d.message || 'Eklenemedi', 'error');
            }
        } catch (e) {
            Swal.fire('Hata', 'Sunucu hatası.', 'error');
        }
    });
}

async function editTelesalesOffer(idx) {
    const o = (telesalesOffers || [])[idx];
    if (!o) return;
    const { value: v } = await Swal.fire({
        title: "Teklifi Düzenle",
        html: `
          <label>Başlık</label><input id="to-title" class="swal2-input" value="${escapeHtml(o.title || '')}">
          <label>Segment</label><input id="to-seg" class="swal2-input" value="${escapeHtml(o.segment || '')}">
          <label>Görsel</label><input id="to-img" class="swal2-input" value="${escapeHtml(o.image || '')}">
          <label>Açıklama</label><textarea id="to-desc" class="swal2-textarea">${escapeHtml(o.desc || '')}</textarea>
           <label>Not</label><textarea id="to-note" class="swal2-textarea">${escapeHtml(o.note || '')}</textarea>
          <label>Detay</label><textarea id="to-detail" class="swal2-textarea">${escapeHtml(o.detail || '')}</textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Kaydet",
        preConfirm: () => {
            const title = (document.getElementById('to-title').value || '').trim();
            if (!title) return Swal.showValidationMessage("Başlık zorunlu");
            return {
                title,
                segment: (document.getElementById('to-seg').value || '').trim(),
                image: (document.getElementById('to-img').value || '').trim(),
                desc: (document.getElementById('to-desc').value || '').trim(),
                note: (document.getElementById('to-note').value || '').trim(),
                detail: (document.getElementById('to-detail').value || '').trim()
            };
        }
    });
    if (!v) return;

    Swal.fire({ title: 'Kaydediliyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
    const oldVal = telesalesOffers[idx];
    telesalesOffers[idx] = { ...oldVal, ...v };
    try {
        const d = await apiCall("saveAllTelesalesOffers", { offers: telesalesOffers });
        if (d.result === 'success') {
            Swal.fire({ icon: 'success', title: 'Kaydedildi', timer: 1200, showConfirmButton: false });
            renderTelesalesDataOffers();
        } else {
            telesalesOffers[idx] = oldVal;
            Swal.fire('Hata', d.message || 'Kaydedilemedi', 'error');
        }
    } catch (e) {
        telesalesOffers[idx] = oldVal;
        Swal.fire('Hata', 'Sunucu hatası.', 'error');
    }
}

function deleteTelesalesOffer(idx) {
    Swal.fire({
        title: "Silinsin mi?",
        text: "Bu teklif kalıcı olarak silinecek.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sil"
    }).then(async res => {
        if (!res.isConfirmed) return;
        const oldVal = telesalesOffers[idx];
        telesalesOffers.splice(idx, 1);
        try {
            const d = await apiCall("saveAllTelesalesOffers", { offers: telesalesOffers });
            if (d.result === 'success') {
                renderTelesalesDataOffers();
                Swal.fire({ icon: 'success', title: 'Silindi', timer: 1000, showConfirmButton: false });
            } else {
                telesalesOffers.splice(idx, 0, oldVal);
                Swal.fire('Hata', d.message || 'Silinemedi', 'error');
            }
        } catch (e) {
            telesalesOffers.splice(idx, 0, oldVal);
            Swal.fire('Hata', 'Sunucu hatası.', 'error');
        }
    });
}

function showTelesalesOfferDetail(idx) {
    const o = (telesalesOffers || [])[idx];
    if (!o) return;
    const imgHtml = o.image ? `<img src="${processImageUrl(o.image)}" style="max-width:100%;border-radius:6px;margin-bottom:15px;">` : '';
    Swal.fire({
        title: escapeHtml(o.title || ''),
        html: `<div style="text-align:left;line-height:1.6">
                ${imgHtml}
                <div style="margin-bottom:10px"><b>Segment:</b> ${escapeHtml(o.segment || '-')}</div>
                 ${o.note ? `<div style="margin-bottom:10px;background:#fff3cd;padding:8px;border-radius:4px;border-left:4px solid #ffc107;white-space: pre-line"><b>Not:</b> ${escapeHtml(o.note)}</div>` : ''}
                 <div style="white-space: pre-line">${escapeHtml(o.desc || 'Detay yok.')}</div>
                 ${o.detail ? `<hr><div style="font-size:0.9rem;color:#666;white-space: pre-line">${escapeHtml(o.detail)}</div>` : ''}
              </div>`,
        showCloseButton: true,
        showConfirmButton: false,
        width: '720px',
        background: '#f8f9fa'
    });
}

function renderTelesalesScripts() {
    const area = document.getElementById('t-scripts-grid');
    if (!area) return;

    let list = (salesScripts || []);
    try {
        const ov = JSON.parse(localStorage.getItem('telesalesScriptsOverride') || '[]');
        if (Array.isArray(ov) && ov.length) list = ov;
    } catch (e) { }

    // İstek: TeleSatış Scriptler'deki ayrı "Düzenlemeyi Aç" kalksın.
    // Düzenleme sadece üst kullanıcı menüsündeki global "Düzenlemeyi Aç" aktifken yapılabilsin.
    const bar = (isAdminMode && isEditingActive) ? `
        <div style="display:flex;gap:10px;align-items:center;margin:6px 0 12px;">
          <button class="x-btn x-btn-admin" onclick="addTelesalesScript()"><i class="fas fa-plus"></i> Script Ekle</button>
        </div>
    ` : '';

    if (list.length === 0) {
        area.innerHTML = bar + '<div style="padding:16px;opacity:.7">Script bulunamadı.</div>';
        return;
    }

    area.innerHTML = bar + list.map((s, i) => `
      <div class="news-item" style="border-left-color:#10b981;cursor:pointer" onclick="copyText('${escapeForJsString(s.text || '')}')">
        <span class="news-title">${escapeHtml(s.title || 'Script')}</span>
        <div class="news-desc" style="white-space:pre-line">${escapeHtml(s.text || '')}</div>
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-top:10px">
          <div class="news-tag" style="background:rgba(16,185,129,.08);color:#10b981;border:1px solid rgba(16,185,129,.25)">Tıkla & Kopyala</div>
          ${(isAdminMode && isEditingActive) ? `
            <div style="display:flex;gap:8px">
              <button class="x-btn x-btn-admin" onclick="event.stopPropagation(); editTelesalesScript(${i});"><i class="fas fa-pen"></i></button>
              <button class="x-btn x-btn-admin" onclick="event.stopPropagation(); deleteTelesalesScript(${i});"><i class="fas fa-trash"></i></button>
            </div>
          ` : ``}
        </div>
      </div>
    `).join('');
}

function getTelesalesScriptsStore() {
    try {
        const ov = JSON.parse(localStorage.getItem('telesalesScriptsOverride') || '[]');
        if (Array.isArray(ov) && ov.length) return ov;
    } catch (e) { }
    return (salesScripts || []);
}
function saveTelesalesScriptsStore(arr) {
    localStorage.setItem('telesalesScriptsOverride', JSON.stringify(arr || []));
}

function addTelesalesScript() {
    Swal.fire({
        title: "Script Ekle",
        html: `
          <input id="ts-title" class="swal2-input" placeholder="Başlık">
          <textarea id="ts-text" class="swal2-textarea" placeholder="Script metni"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Ekle",
        cancelButtonText: "Vazgeç",
        preConfirm: () => {
            const title = (document.getElementById('ts-title').value || '').trim();
            const text = (document.getElementById('ts-text').value || '').trim();
            if (!text) return Swal.showValidationMessage("Script metni zorunlu");
            return { id: 'local_' + Date.now(), title: title || 'Script', text };
        }
    }).then(res => {
        if (!res.isConfirmed) return;
        const arr = getTelesalesScriptsStore();
        arr.unshift(res.value);
        saveTelesalesScriptsStore(arr);
        // mümkünse sheet'e de yaz
        syncTelesalesScriptsToSheet(arr);
        renderTelesalesScripts();
    });
}

function editTelesalesScript(idx) {
    const arr = getTelesalesScriptsStore();
    const s = arr[idx];
    if (!s) return;
    Swal.fire({
        title: "Script Düzenle",
        html: `
          <input id="ts-title" class="swal2-input" placeholder="Başlık" value="${escapeHtml(s.title || '')}">
          <textarea id="ts-text" class="swal2-textarea" placeholder="Script metni">${escapeHtml(s.text || '')}</textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Kaydet",
        cancelButtonText: "Vazgeç",
        preConfirm: () => {
            const title = (document.getElementById('ts-title').value || '').trim();
            const text = (document.getElementById('ts-text').value || '').trim();
            if (!text) return Swal.showValidationMessage("Script metni zorunlu");
            return { ...s, title: title || 'Script', text };
        }
    }).then(res => {
        if (!res.isConfirmed) return;
        arr[idx] = res.value;
        saveTelesalesScriptsStore(arr);
        syncTelesalesScriptsToSheet(arr);
        renderTelesalesScripts();
    });
}
function deleteTelesalesScript(idx) {
    Swal.fire({ title: "Silinsin mi?", icon: "warning", showCancelButton: true, confirmButtonText: "Sil", cancelButtonText: "Vazgeç" }).then(res => {
        if (!res.isConfirmed) return;
        const arr = getTelesalesScriptsStore().filter((_, i) => i !== idx);
        saveTelesalesScriptsStore(arr);
        syncTelesalesScriptsToSheet(arr);
        renderTelesalesScripts();
    });
}

function renderTelesalesDocs() {
    const box = document.getElementById('t-docs');
    if (!box) return;
    const docs = (trainingData || []).filter(t => (t.target || '') === 'Telesatış' || (t.title || '').toLowerCase().includes('telesatış'));
    if (docs.length === 0) {
        box.innerHTML = '<div style="opacity:.7;padding:10px">Bu ekibe atanmış döküman/eğitim görünmüyor.</div>';
        return;
    }
    box.innerHTML = docs.map(d => `
      <div class="news-item" style="border-left-color:var(--secondary)">
        <span class="news-date">${escapeHtml((d.startDate || '') + (d.endDate ? (' → ' + d.endDate) : ''))}</span>
        <span class="news-title">${escapeHtml(d.title || '')}</span>
        <div class="news-desc">${escapeHtml(d.desc || '')}</div>
        ${d.link && d.link !== 'N/A' ? `<a class="btn btn-link" href="${escapeHtml(d.link)}" target="_blank">Link</a>` : ''}
        ${d.docLink && d.docLink !== 'N/A' ? `<a class="btn btn-link" href="${escapeHtml(d.docLink)}" target="_blank">Döküman</a>` : ''}
      </div>
    `).join('');
}

/* -------------------------
   TEKNİK FULLSCREEN
--------------------------*/
async function openTechArea(tab) {
    const wrap = document.getElementById('tech-fullscreen');
    if (!wrap) return;
    wrap.style.display = 'flex';
    document.body.classList.add('fs-open');
    document.body.style.overflow = 'hidden';

    // Sidebar profil
    const av = document.getElementById('x-side-avatar');
    const nm = document.getElementById('x-side-name');
    const rl = document.getElementById('x-side-role');
    if (av) av.innerText = (currentUser || 'U').trim().slice(0, 1).toUpperCase();
    if (nm) nm.innerText = currentUser || 'Kullanıcı';
    if (rl) rl.innerText = isAdminMode ? 'Admin' : 'Temsilci';

    // İlk açılışta "bozuk görünüm" (flicker) olmasın: veri gelene kadar bekle
    try {
        if ((!database || database.length === 0) && window.__dataLoadedPromise) {
            const lists = ['x-broadcast-list', 'x-access-list', 'x-app-list', 'x-activation-list', 'x-cards'];
            lists.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<div class="home-mini-item">Yükleniyor...</div>'; });
            await window.__dataLoadedPromise;
        }
    } catch (e) { }

    // İçerikleri (bucket/list) hazırla
    try { renderTechSections(); } catch (e) { }

    // Sekmeyi aç
    switchTechTab(tab || 'broadcast');
}

function closeFullTech() {
    const wrap = document.getElementById('tech-fullscreen');
    if (wrap) wrap.style.display = 'none';
    document.body.classList.remove('fs-open');
    document.body.style.overflow = '';
}

function switchTechTab(tab) {
    // Sidebar aktif öğeyi doğru belirle
    // (önce data-tech-tab kullan, yoksa onclick içeriği ile fallback yap)
    document.querySelectorAll('#tech-fullscreen .q-nav-item').forEach(i => i.classList.remove('active'));

    const byData = document.querySelector(`#tech-fullscreen .q-nav-item[data-tech-tab="${tab}"]`);
    if (byData) {
        byData.classList.add('active');
    } else {
        document.querySelectorAll('#tech-fullscreen .q-nav-item').forEach(i => {
            const oc = (i.getAttribute('onclick') || '');
            if (oc.includes(`'${tab}'`) || oc.includes(`\"${tab}\"`)) i.classList.add('active');
        });
    }

    document.querySelectorAll('#tech-fullscreen .q-view-section').forEach(s => s.classList.remove('active'));

    let targetView = tab;
    if (tab === 'broadcast') {
        targetView = 'wizard';
        renderTechWizardInto('x-wizard');
    }

    const el = document.getElementById(`x-view-${targetView}`);
    if (el) el.classList.add('active');
}


// --------------    VARDİYA FULLSCREEN ---------------------
async function openShiftArea(tab) {
    const wrap = document.getElementById('shift-fullscreen');
    if (!wrap) return;
    wrap.style.display = 'flex';
    document.body.classList.add('fs-open');
    document.body.style.overflow = 'hidden';

    const av = document.getElementById('shift-side-avatar');
    const nm = document.getElementById('shift-side-name');
    const rl = document.getElementById('shift-side-role');
    if (av) av.innerText = (currentUser || 'U').trim().slice(0, 1).toUpperCase();
    if (nm) nm.innerText = currentUser || 'Kullanıcı';
    if (rl) rl.innerText = isAdminMode ? 'Yönetici' : 'Temsilci';
    // Yetki kontrolü (Admin butonlarını göster/gizle)
    const adminFilters = document.getElementById('shift-admin-filters');

    if (isAdminMode) {
        if (adminFilters) {
            adminFilters.style.display = 'flex';
            // Vardiya Yapıştır Butonu (Edit Mode aktifse)
        }
    } else {
        if (adminFilters) adminFilters.style.display = 'none';
    }


    await loadShiftData();
    switchShiftTab(tab || 'plan');
}

function closeFullShift() {
    const wrap = document.getElementById('shift-fullscreen');
    if (wrap) wrap.style.display = 'none';
    document.body.classList.remove('fs-open');
    document.body.style.overflow = '';
}

function switchShiftTab(tab) {
    document.querySelectorAll('#shift-fullscreen .q-nav-item').forEach(i => i.classList.remove('active'));
    const nav = document.querySelector(`#shift-fullscreen .q-nav-item[data-shift-tab="${tab}"]`);
    if (nav) nav.classList.add('active');

    document.querySelectorAll('#shift-fullscreen .q-view-section').forEach(s => s.classList.remove('active'));
    const view = document.getElementById(`shift-view-${tab}`);
    if (view) view.classList.add('active');
}

async function loadShiftData() {
    try {
        const data = await apiCall("getShiftData");
        renderShiftData(data.shifts || {});
    } catch (e) {
        console.error(e);
        Swal.fire('Hata', e.message || 'Vardiya verileri alınırken bir hata oluştu.', 'error');
    }
}

function renderShiftData(shifts) {
    const weekLabelEl = document.getElementById('shift-week-label');
    if (weekLabelEl) {
        weekLabelEl.textContent = formatWeekLabel(shifts.weekLabel || '');
    }

    const myPlanEl = document.getElementById('shift-plan-my');
    if (myPlanEl) {
        const myRow = shifts.myRow;
        const headers = shifts.headers || [];
        if (myRow && headers.length) {
            const cellsHtml = headers.map((h, idx) => {
                const v = (myRow.cells || [])[idx] || '';
                return `<div class="shift-day"><div class="shift-day-date">${formatShiftDate(h)}</div><div class="shift-day-slot">${escapeHtml(v)}</div></div>`;
            }).join('');
            myPlanEl.innerHTML = `
                <div class="shift-card-header">Benim Vardiyam</div>
                <div class="shift-card-body">${cellsHtml}</div>
            `;
        } else {
            myPlanEl.innerHTML = '<p style="color:#666;">Vardiya tablosunda adınız bulunamadı.</p>';
        }
    }

    const tableWrap = document.getElementById('shift-plan-table');
    if (tableWrap) {
        const headers = shifts.headers || [];
        const rows = shifts.rows || [];
        if (!headers.length || !rows.length) {
            tableWrap.innerHTML = '<p style="color:#666;">Vardiya tablosu henüz hazırlanmadı.</p>';
        } else {
            let html = '<table class="shift-table"><thead><tr><th>Temsilci</th>';
            headers.forEach(h => { html += `<th>${formatShiftDate(h)}</th>`; });
            html += '</tr></thead><tbody>';
            rows.forEach(r => {
                html += '<tr>';
                html += `<td>${escapeHtml(r.name)}</td>`;
                headers.forEach((h, idx) => {
                    const v = (r.cells || [])[idx] || '';
                    html += `<td>${escapeHtml(v)}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            tableWrap.innerHTML = html;
        }
    }

    const listEl = document.getElementById('shift-requests-list');
    if (listEl) {
        const reqs = shifts.myRequests || [];
        if (!reqs.length) {
            listEl.innerHTML = '<p style="color:#666;">Henüz oluşturulmuş vardiya talebin yok.</p>';
        } else {
            listEl.innerHTML = reqs.map(r => `
                <div class="shift-request-item">
                    <div class="shift-request-top">
                        <span class="shift-request-date">${escapeHtml(r.date || '')}</span>
                        <span class="shift-request-status">${escapeHtml(r.status || 'Açık')}</span>
                    </div>
                    <div class="shift-request-body">
                        <div><strong>Tür:</strong> ${escapeHtml(r.type || '')}</div>
                        <div><strong>Mevcut:</strong> ${escapeHtml(r.current || '')}</div>
                        <div><strong>Talep Edilen:</strong> ${escapeHtml(r.requested || '')}</div>
                        ${r.friend ? `<div><strong>Arkadaş:</strong> ${escapeHtml(r.friend || '')}</div>` : ''}
                        ${r.friendShift ? `<div><strong>Arkadaş Vardiyası:</strong> ${escapeHtml(r.friendShift || '')}</div>` : ''}
                        ${r.note ? `<div><strong>Not:</strong> ${escapeHtml(r.note || '')}</div>` : ''}
                    </div>
                    <div class="shift-request-footer">${escapeHtml(r.timestamp || '')}</div>
                </div>
            `).join('');
        }
    }
}

async function submitShiftRequest(evt) {
    if (evt) evt.preventDefault();

    const date = document.getElementById('shift-req-date').value;
    const type = document.getElementById('shift-req-type').value;
    const current = document.getElementById('shift-req-current').value;
    const requested = document.getElementById('shift-req-requested').value;
    const friend = document.getElementById('shift-req-friend').value;
    const friendShift = document.getElementById('shift-req-friend-shift').value;
    const note = document.getElementById('shift-req-note').value;

    if (!date || !requested) {
        Swal.fire('Uyarı', 'Tarih ve talep edilen vardiya alanları zorunludur.', 'warning');
        return;
    }

    try {
        const data = await apiCall("submitShiftRequest", {
            date: date,
            type: type,
            current: current,
            requested: requested,
            friend: friend,
            friendShift: friendShift,
            note: note,
            week: document.getElementById('shift-week-label') ? document.getElementById('shift-week-label').textContent : ''
        });
        Swal.fire({ icon: 'success', title: 'Kaydedildi', text: 'Vardiya talebin kaydedildi.', timer: 1500, showConfirmButton: false });
        const form = document.getElementById('shift-request-form');
        if (form) form.reset();
        await loadShiftData();
    } catch (e) {
        console.error(e);
        Swal.fire('Hata', e.message || 'Talep kaydedilemedi.', 'error');
    }
}

const TECH_DOC_CONTENT = { "broadcast": [{ "title": "Smart TV – Canlı Yayında Donma Problemi Yaşıyorum", "body": "Müşterinin sorun yaşadığı yayın ya da yayınlarda genel bir sorun var mı kontrol edilir? Genel bir sorun var ise teknik ekibin incelediği yönünde bilgi verilir.\nMüşterinin kullandığı cihaz TVmanager ‘da loglardan kontrol edilir. Arçelik/Beko/Grundig/Altus marka Android TV olmayan Smart TV’lerden ise genel sorun hakkında bilgi verilir.\nYukarıdaki durumlar dışında yaşanan bir sorun ise TV ve modemin elektrik bağlantısını kesilip tekrar verilmesi istenir. « Yaşadığınız sorunu kontrol ederken TV ve modeminizin elektrik bağlantısını kesip 10 sn sonra yeniden açabilir misiniz? Ardından yeniden yayını açıp kontrol edebilir misiniz? (Ayrıca öneri olarak modemi kapatıp tekrar açtıktan sonra, sadece izleme yaptığı cihaz modeme bağlı olursa daha iyi bir bağlantı olacağı bilgisi verilebilir)\nSorun devam eder ise Smart TV tarayıcısından https://www.hiztesti.com.tr/ bir hız testi yapması sonucu bizimle paylaşması istenir.\nHız testi sonucu 8 Mbps altında ise internet bağlantı hızının düşük olduğunu internet servis sağlayıcısı iletişime geçmesi istenir.\n8 Mbps üzerinde ise müşteriden sorunu gösteren kısa bir video talep edilir.\nVideo kaydı ve hız testinin sonuçları gösteren bilgiler alındıktan sonra müşteriye incelenmesi için teknik ekibimize iletildiği inceleme tamamlandığında eposta ile bilgi verileceği yönünde bilgi verilir.\nSorun aynı gün içinde benzer cihazlarda farklı müşterilerde yaşıyor ise tüm bilgilerle Erlab’a arıza kaydı açılır. Sorun birkaç müşteri ile sınırlı ise 17:00 – 01:00 vardiyasındaki ekip arkadaşında sistemsel bir sorun olmadığına dair eposta gönderilmesi için bilgileri paylaşılır." }, { "title": "Mobil Uygulama – Canlı Yayında Donma Sorunu Yaşıyorum", "body": "Müşterinin sorun yaşadığı yayın ya da yayınlarda genel bir sorun var mı kontrol edilir? Genel bir sorun var ise teknik ekibin incelediği yönünde bilgi verilir.(Müşteri İOS veya Android işletim sistemli hangi cihazdan izliyorsa, mümkünse aynı işletim sistemli mobil cihazdan kontrol edilebilir, gerekirse ekip arkadaşlarından kontrol etmeleri istenebilir)\nGenel bir sorun yok ise, www.hiztesti.com.tr link üzerinden hız testi yapması sonucu bizimle paylaşması istenir.\nHız testi sonucu 8 mbps altında ise internet bağlantı hızının düşük olduğu internet servisi sağlayıcısı ile iletişime geçmesi istenir. (Öneri olarak modemi kapatıp tekrar açtıktan sonra sadece izleme yaptığı cihaz modeme bağlı olursa daha iyi bir bağlantı olacağı bilgisi verilebilir)\n8 mbps üzerinde ise, uygulama verilerin temizlenmesi veya uygulamanın silip tekrar yüklenmesi istenilir, sorun devam etmesi durumunda sorunu gösteren video kaydı istenir.\n 4. Hız testi, cihaz marka model ve sürüm bilgileri alındıktan sonra, incelenmesi için teknik ekibe iletildiği, inceleme tamamlandığında e-posta  ile bilgi verileceği yönünde bilgi verilir.\n 5. Sorun aynı gün içerinde benzer cihazlarda farklı müşterilerde yaşıyor ise tüm bilgilerle Erlab’a arıza kaydı açılır. Sorun birkaç müşteri ile sınırlı  ise 17:00 – 01:00 vardiyasındaki ekip arkadaşında sistemsel bir sorun olmadığına dair eposta gönderilmesi için bilgileri paylaşılır." }, { "title": "Bilgisayar – Canlı Yayında Donma Sorunu Yaşıyorum", "body": "Müşterinin sorun yaşadığı yayın ya da yayınlarda genel bir sorun var mı kontrol edilir? Genel bir sorun var ise teknik ekibin incelediği yönünde bilgi verilir.\nGenel bir sorun değilse, öncelikle https://www.hiztesti.com.tr/ bir hız testi yapması sonucu bizimle paylaşması istenir.\nHız testi sonucu 8 mbps altında ise internet bağlantı hızının düşük olduğunu internet servis sağlayıcısı iletişime geçmesi istenir.\n8 mbps üzerinde ise müşteriden aşağıdaki adımları uygulaması istenir.\n3. Bilgisayarın işletim sitemi öğrenilip, görüşme üzerinden ‘’pingWindows7’’ veya ‘’pingwindows10’’ kısayollarından müşteri sunucuları kontrol edilir.\n(Windows 10 üzeri işletim sistemi cihazlara pingwindows10 kısayolu gönderilebilir.)\n4. Sunucu kontrol ekranında kontrol edilmesi gereken, ok ile gösterilen yerden, sunucu ile kayıp olup olmadığı ve kırmızı alan içerisinde sunucu ile web sitemize kaç saniyede işlem sağladığı kontrol edilir.\n5. 1 – 35 arası normal sayılabilir, bu saniye aralığında sorun yaşanıyorsa, web sitemize daha hızlı tepsi süresi veren ve genellikle sorunsuz bir şekilde izleme sağlanabilen 193.192.103.249, 185.11.14.27 veya 195.175.178.8 sunucuları kontrol edilmelidir.\n6. Uygun sunucuyu tespit ettikten sonra canlı destek ekranında ‘’Host’’ ‘’host2’’ kısa yolları kullanarak, kısa yoldaki adımlar ile müşterinin sadece bizim sitemize bağlandığı sunucusunu, en uygun sunucu ile değiştirip tarayıcı açıp kapattırdıktan sonra tekrar yayını kontrol etmesini iletebiliriz. (Ayrıca müşteri yayınları auto değil, manuel olarak 720 veya 1080p seçip kontrol edilmesi önerilir)\n7. Sorun aynı gün içerinde benzer işletim sistemi veya sunucuda farklı müşterilerde yaşıyor ise tüm bilgilerle Erlab’a arıza kaydı açılır. Sorun birkaç müşteri ile sınırlı ise 17:00 – 01:00 vardiyasındaki ekip arkadaşında sistemsel bir sorun olmadığına dair eposta gönderilmesi için bilgileri paylaşılır" }, { "title": "YAYIN SORUNLARI", "body": "35 sn arası normal sayılabilir, bu saniye aralığında sorun yaşanıyorsa, web sitemize daha hızlı tepsi süresi veren ve genellikle sorunsuz bir şekilde izleme sağlanabilen 193.192.103.249, 185.11.14.27 veya 195.175.178.8 sunucuları kontrol edilmelidir." }, { "title": "MacOS – Canlı Yayında Donma Sorunu Yaşıyorum", "body": "Müşterinin sorun yaşadığı yayın ya da yayınlarda genel bir sorun var mı kontrol edilir? Genel bir sorun var ise teknik ekibin incelediği yönünde bilgi verilir.\nGenel bir sorun değilse, öncelikle https://www.hiztesti.com.tr/ bir hız testi yapması sonucu bizimle paylaşması istenir.\nHız testi sonucu 8 mbps altında ise internet bağlantı hızının düşük olduğunu internet servis sağlayıcısı iletişime geçmesi istenir.\n8 mbps üzerinde ise müşteriden aşağıdaki adımları uygulaması istenir.\nMindbehind üzerinden ‘’pingmacOS’’ kısayolundan müşteri sunucuları kontrol edilir.\nSunucu kontrol ekranında kontrol edilmesi gereken, ‘’packet loss’’ kısmında kayıp olup olmadığı,  alan içerisinde sunucu ile web sitemize kaç saniyede işlem sağladığı kontrol edilir.\n1 – 35 arası normal sayılabilir, bu saniye aralığında sorun yaşanıyorsa, web sitemize daha hızlı tepsi süresi veren ve genellikle sorunsuz bir şekilde izleme sağlanabilen 193.192.103.249, 185.11.14.27 veya 195.175.178.8 sunucuları kontrol edilmelidir.\nUygun sunucuyu tespit ettikten sonra canlı destek ekranında ‘’macOShost’’ kısa yolunu kullanarak, kısa yoldaki adımlar ile müşterinin sadece bizim sitemize bağlandığı sunucuyu, en uygun sunucu ile değiştirip tarayıcı açıp kapattırdıktan sonra tekrar yayını kontrol etmesini iletebiliriz. (Ayrıca müşteri yayınları auto değil, manuel olarak 720 veya 1080p seçip kontrol edilmesi önerilir)\nSorun aynı gün içerinde benzer işletim sistemi veya sunucuda farklı müşterilerde yaşıyor ise tüm bilgilerle Erlab’a arıza kaydı açılır. Sorun birkaç müşteri ile sınırlı ise 17:00 – 01:00 vardiyasındaki ekip arkadaşında sistemsel bir sorun olmadığına dair eposta gönderilmesi için bilgileri paylaşılır." }, { "title": "‘’Yayında beklenmedik bir kesinti oluştu’’ Uyarısı", "body": "Bu uyarı genel bir yayın sorunu olduğunda ya da kullanıcı Türkiye sınırları dışında bir yerden erişim sağladığında karşımıza çıkmaktadır.\nKullanıcının sorun yaşadığı yayın kontrol edilir ve genel bir yayın sorunu olup olmadığı teyit edilir.\nTvmanager’da SubscriberLog ekranından ip adresi alınır ve yurtdışı bir konum olup olmadığı teyit edilir.\nKullanıcı yurtdışında ise erişim sağlayamayacağı bilgisi verilir, VPN kullanıyor ise kapatması istenir.\nTVmanager Devices kısmında oturumlar sonlandırılır ve kullanıcıdan tekrar giriş yaparak kontrol etmesi rica edilir.\nMobil veri veya farklı bir ağda bu hata mesajının alınıp alınmadığı teyit edilir.\nCihaz ve modem kapama ve açma işlemi uygulanır.\nSorun devam eder ise inceleme için cihaz ve diğer bilgilerle teknik ekibimize bilgi verileceği iletilir. Excel de kullanıcıdan alınan bilgiler not edilir." }], "access": [{ "title": "ERİŞİM SORUNLARI", "body": "‘’Lisans hakları sebebiyle Türkiye sınırları dışında hizmet verilememektedir.’’ Uyarısı\nAlınan hata müşterinin yurt dışında olması ve yurt içinde ise VPN ya da benzeri bir uygulamanın cihazında aktif olmasından kaynaklanmaktadır.\n\nMüşteriye yurt dışında olup olmadığı sorulur, yurt dışında ise ‘’lisans hakları sebebiyle yayınların yurt dışından izlenemediği’’ yönünde bilgi verilir.\nYurt içinde ise VPN ya da benzeri bir uygulamanın cihazında aktif olup ya da olmadığı sorulur. Aktif ise devre dışı bırakılıp tekrar denemesi önerilir.\nVPN ya da benzeri bir uygulama kullanmıyor ise müşterinin ip adresi öğrenilir ve https://tr.wizcase.com/tools/whats-my-ip/ ip adresi kontrol edilir.  Aynı zamanda adresin vpn üzerinden alınıp alınmadığının kontrolü için https://vpnapi.io adresine girilip kontrol edilir.\nIp adresi yurt dışı ya da ISP bilgisi bilinen bir servis sağlayıcısı değilse müşteriye bulunduğu lokasyonun otel, yurt vb. bir yer olup olmadığı ya da cihazının şirket cihazı olup olmadığı sorulur." }, { "title": "‘’IP Karantina’’ Uyarısı", "body": "İp Karantina sorunu genel bir sorun yok ise, eposta veya şifre bir çok defa hatalı girilmesinden dolayı alınır.\nKullanıcının ip adresi karantina da olup ya da olmadığı, TVmanager – CMS – Admission Gate menüsü üzerinden kontrol edilerek çıkarılabilir. İkinci bir seçenek olarak modem kapama ve açma işlemi yaptırılabilir." }], "app": [{ "title": "Teknik Sorun Analizi Nasıl Yapılır?", "body": "App Kaynaklı Nedenler\nCihaz Kaynaklı Nedenler\nApp hataları başlığında uygulamanın açılmaması ya da kendi kendine kapanması şeklinde teknik sorunlar ile karşılaşabiliriz. Bu tip sorunlar, kullanıcı deneyimini doğrudan etkileyerek uygulamaya erişilememesine neden olur.\nUygulamanın eski sürümü\nÖnbellek sorunları\nUyumsuz cihazlar\nDolu RAM/Arka planda çalışan fazla uygulama\nCihazın güncel olmaması (Eski sistemi sürümleri)\nKullanıcıya Sorulabilecek Sorular:\nUygulama açılıyor mu, yoksa açılmadan kapanıyor mu?\nUygulama sürümü, cihaz işletim sistemi sürümü nedir? (TVmanager kontrolü)\nCihazda yeterli depolama alanı var mı?" }], "activation": [{ "title": "‘’Promosyon Kodu Bulunamadı’’ Uyarısı", "body": "Görselde ki örnekte doğrusu ‘’YILLIKLOCA’’ olan kampanya kodu, küçük harf ile yazıldığında ‘’Promosyon Kodu Bulunamadı’’ hatası alınmıştır. Bu hata ile karşılaşıldığında kampanya kodunun yanlış, eksik, küçük harf ya da boşluk bırakılarak yazıldığını tespitle, kullanıcıyı bu doğrultuda doğru yazım için yönlendirmemiz gerekir." }, { "title": "‘’Kampanya Kodu Aktif Edilemedi’’ Uyarısı", "body": "Görseldeki örnekteki gibi eski bir promosyon kodu yazıldığında ‘’Kampanya Kodu Aktif Edilemedi’’ uyarısı alınır." }, { "title": "‘’Geçersiz Kampanya Kodu’’ Uyarısı", "body": "Görseldeki örnekteki gibi daha önce kullanılmış bir promosyon kodu yazıldığında ‘’Geçersiz Kampanya Kodu’’ hatası alınır.\nPromosyon kodunun hangi hesapta kullanıldığını aşağıdaki görseldeki gibi Campaign alanında arama yaparak görüntüleyebiliriz." }, { "title": "Playstore Uygulama Aktivasyon Sorunu", "body": "Bazı durumlarda, kullanıcılar Google Play Store üzerinden S Sport Plus uygulamasında abonelik satın aldıklarında veya yenileme gerçekleştiğinde, üyelikleri otomatik olarak aktifleşmeyebiliyor.  Bu durumda, kullanıcının uygulama üzerinden manuel olarak paket aktivasyonu yapması gerekmektedir.\n\nAktivasyon işleminin başarılı olabilmesi için:\n Google Play Store üzerinden satın alma işlemi yapılırken kullanılan Gmail hesabı, aktivasyon anında cihazda açık olmalıdır.\n Aktivasyon işlemi uygulama içerisinden yapılmalıdır.\nDestek ekibi tarafından Mindbehind üzerinden “paketgoogle” kısayolu kullanılarak yönlendirme sağlanabilir.  Kullanıcı başarılı bir şekilde paket aktivasyonu yaptıktan sonra, paket ataması sistemde gerçekleşir ve log kayıtlarında ilgili işlem aşağıdaki gibi görünür (ekli görsellerdeki gibi).  Bu işlem, paketin doğru şekilde tanımlanması için önemlidir." }, { "title": "App Store Uygulama Aktivasyon Sorunu", "body": "Müşteriler App Store üzerinden uygulamamızdan abonelik satın aldığı veya yenileme olduğu zaman bazen üyelik aktif olmuyor.\nÜyelikleri aktif olabilmeleri için, uygulama üzerinden paket aktivasyon yapmaları gerekiyor. Paket aktivasyon yaparken, satın alma yaparken hangi Apple kimliği hesabı açık ise, o hesap açıkken aktivasyon denemesi gerekiyor.\nMindbehind üzerinden ‘’paketapple’’ kısayolu kullanılır.\nMüşteri paket aktivasyonu yaptıktan sonra üyelik ataması ve loglarda nasıl gözüktüğü görsellerdeki gibidir.\nPaket aktivasyon butonu örnek görüntüsü yandaki gibidir." }, { "title": "AKTİVASYON SORUNLARI", "body": "İOS Uygulama Paket Aktivasyon ‘’Abonelik Başkasına Aittir’’ Sorunu\n\nİos uygulamamızda müşteri paket aktivasyon işlemi yaptığında ‘’Abonelik Başkasına Aittir’’ hatası geliyor ise, cihazda açık olan Apple kimliği ile satın alınmış, ancak aktivasyon yaptığı eposta adresi farklı bir eposta adresidir.\n\nFarklı eposta adresi ile paket aktivasyon yaptığında ‘’Subscriberlog’’ kısmında örnek ekran görüntüsünde kırmızı alana alınan ‘’packageValidation’’  kısmı çıkar, ok ile gösterilen ID kısmından doğru üyeliği ID araması ile bulabiliriz." }, { "title": "AKTİVASYON SORUNLARI", "body": "Android ‘’Paket Başka Bir Kullanıcıya Ait Olduğu İçin Paket Atama İşlemi Başarısız Oldu’’ Sorunu\n\nAndroid uygulamamızda müşteri paket aktivasyon işlemi yaptığında ‘’Paket Başka Bir Kullanıcıya Ait Olduğu İçin Paket Atama İşlemi Başarısız Oldu’’ hatası geliyor ise, cihazda açık olan Play Store gmail hesabı ile satın alınmış, ancak aktivasyon yaptığı eposta adresi farklı bir eposta adresidir.\n\nFarklı eposta adresi ile paket aktivasyon yaptığında ‘’Subscriberlog’’ kısmında örnek ekran görüntüsünde kırmızı alana alınan ‘’Validate Google Package’’  kısmı çıkar, ok ile gösterilen ID kısmından doğru üyeliği ID araması ile bulabiliriz." }, { "title": "AKTİVASYON SORUNLARI", "body": "Android Uygulama Paket Aktivasyon İşlem Tamamlanamadı veya Üyelik Bulunamama Sorunu\nAndroid uygulamamızda müşteri ödeme yapmış olmasına rağmen paket aktivasyonu yaptığında ‘’İşlem tamamlandı, İşlem Tamamlanamadı veya Abone bulunamadı’’ hatası geliyor ve üyelik aktif olmuyor ise, müşteriden GPA kodunu paylaşılması istenir.\nGPA kodu, Google tarafından ödeme yapıldığına dair müşteriye gönderilen ödeme faturası (makbuz) içerisinde yer almaktadır.\nBu GPA kodu ile üyeliği Tvmanager üzerinden aşağıdaki görseldeki gibi Reporting > General > Payments kısmında tarihi aralığı ayarlanıp ‘’Transaction Identifer’’ kısmından arama yapılıp, üyelik ID’sine ‘’Subscriber ID’’ üzerinden ulaşılabilir." }, { "title": "AKTİVASYON SORUNLARI", "body": "Türksat Abone Bulunamadı veya Abone Active Değil Sorunu\nBu hata, Hizmet ID veya Geçici Kod hatalı yazılmasından dolayı alınır.  Müşteriler genellikle bazı büyük küçük harfleri karıştırabiliyor veya sistemden dolayı bazen bu sorun alınabiliyor.\nÇözüm olarak harf hatası olmaması için Tvmanager>Reporting>General>Thirtdparty Provisions kısmından tarih aralığı belirleyip, Hizmet ID numarasını ‘’Extrenal ID’’ kısmından aratıp, kullanıcı Türksat bilgilerini bulup ‘’UniqueID’’ kısmından geçici kodu bulup, kullanıcıya paylaştığımızda, ID ve Geçici kodu kopyala yapıştırır şeklinde ilerlemesini iletebiliriz.\nAynı sorun devam eder ise, kullanıcıdan onay alıp, ID ve geçici kod ile kullanıcının üyeliğini kendimiz yapabiliriz. Müşterinin üyeliğini biz tarafından yapıldı ise, müşteriye şifresini nasıl güncelleyebileceği ile ilgili bilgi verilir." }] };

function renderTechSections() {
    // Kaynak: Sheet'ten gelen teknik kartlar + admin override (localStorage)
    const baseCards = (database || []).filter(c => String(c.category || '').toLowerCase() === 'teknik');
    let override = [];
    try { override = JSON.parse(localStorage.getItem('techCardsOverride') || '[]'); } catch (e) { override = []; }
    const techCards = (Array.isArray(override) && override.length) ? override : baseCards;

    // Heuristik sınıflandırma
    const buckets = { broadcast: [], access: [], app: [], activation: [], cards: [] };
    techCards.forEach(c => {
        const hay = `${c.title || ''} ${c.text || ''} ${c.script || ''}`.toLowerCase();
        if (hay.includes('yayın') || hay.includes('don') || hay.includes('buffer') || hay.includes('akış') || hay.includes('tv')) {
            buckets.broadcast.push(c);
        } else if (hay.includes('erişim') || hay.includes('vpn') || hay.includes('proxy') || hay.includes('login') || hay.includes('giriş') || hay.includes('yurtdışı')) {
            buckets.access.push(c);
        } else if (hay.includes('app') || hay.includes('uygulama') || hay.includes('hata') || hay.includes('crash') || hay.includes('versiyon')) {
            buckets.app.push(c);
        } else if (hay.includes('aktivasyon') || hay.includes('satın') || hay.includes('satınalma') || hay.includes('store') || hay.includes('ödeme') || hay.includes('google') || hay.includes('apple')) {
            buckets.activation.push(c);
        } else {
            buckets.broadcast.push(c);
        }
        buckets.cards.push(c);
    });

    window.__techBuckets = buckets;

    // Search input bağlama
    const bindSearch = (inputId, key, listId) => {
        const inp = document.getElementById(inputId);
        if (!inp) return;
        inp.oninput = () => renderTechList(key, inp.value || '', listId);
    };

    bindSearch('x-broadcast-search', 'broadcast', 'x-broadcast-list');
    bindSearch('x-access-search', 'access', 'x-access-list');
    bindSearch('x-app-search', 'app', 'x-app-list');
    bindSearch('x-activation-search', 'activation', 'x-activation-list');
    bindSearch('x-cards-search', 'cards', 'x-cards');

    // İlk çizim
    renderTechList('broadcast', '', 'x-broadcast-list');
    renderTechList('access', '', 'x-access-list');
    renderTechList('app', '', 'x-app-list');
    renderTechList('activation', '', 'x-activation-list');
    renderTechList('cards', '', 'x-cards');
}

let techEditMode = false;

function renderTechList(bucketKey, q, listId) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    const all = (window.__techBuckets && window.__techBuckets[bucketKey]) ? window.__techBuckets[bucketKey] : [];
    const query = String(q || '').trim().toLowerCase();

    const filtered = !query ? all : all.filter(c => {
        const hay = `${c.title || ''} ${c.text || ''} ${c.script || ''} ${c.link || ''}`.toLowerCase();
        return hay.includes(query);
    });

    const bar = (isAdminMode ? `
        <div style="display:flex;gap:10px;align-items:center;margin:10px 0 14px;">
          <button class="x-btn x-btn-admin" onclick="toggleTechEdit()"><i class="fas fa-pen"></i> ${techEditMode ? 'Düzenlemeyi Kapat' : 'Düzenlemeyi Aç'}</button>
          ${techEditMode ? `<button class="x-btn x-btn-admin" onclick="addTechCard('${bucketKey}')"><i class="fas fa-plus"></i> Kart Ekle</button>` : ``}
          <span style="color:#888;font-weight:800;font-size:.9rem">Bu düzenlemeler tarayıcıda saklanır (local).</span>
        </div>
    ` : '');

    if (!filtered.length) {
        listEl.innerHTML = bar + '<div class="home-mini-item">Kayıt bulunamadı.</div>';
        return;
    }

    listEl.innerHTML = bar + `
      <div class="x-card-grid">
        ${filtered.map((c, idx) => techCardHtml(c, idx)).join('')}
      </div>
    `;
}

function techCardKey(c, idx) {
    return (c && (c.id || c.code)) ? String(c.id || c.code) : `${(c.title || '').slice(0, 40)}__${idx}`;
}

function techCardHtml(c, idx) {
    const title = escapeHtml(c.title || '');
    const badge = escapeHtml(c.code || c.category || 'TEKNİK');
    const rawText = (c.text || '').toString();
    const text = escapeHtml(rawText);
    const link = (c.link || '').trim();
    const script = (c.script || '').trim();
    const key = techCardKey(c, idx);

    // Detay butonunu gösterme kriteri (uzun metin / script / link)
    const hasDetail = (rawText && rawText.length > 180) || (script && script.length > 120) || !!link;

    return `
      <div class="x-card" data-key="${escapeHtml(key)}">
        <div class="x-card-head">
          <div class="x-card-title">${title}</div>
          <div class="x-card-badge">${badge}</div>
        </div>
        <div class="x-card-body">
          ${text ? `<div class="x-card-text x-card-text-truncate">${text}</div>` : ``}
          ${hasDetail ? `<button class="x-readmore" onclick='openTechCardDetail(${JSON.stringify(key)})'>Devam oku</button>` : ``}
        </div>
        <div class="x-card-actions">
          ${script ? `<button class="x-btn x-btn-copy" onclick='copyText(${JSON.stringify(script)})'><i class="fas fa-copy"></i> Kopyala</button>` : ``}
          ${isAdminMode && techEditMode ? `
            <button class="x-btn x-btn-admin" onclick="editTechCard(${JSON.stringify(key)})"><i class="fas fa-pen"></i> Düzenle</button>
            <button class="x-btn x-btn-admin" onclick="deleteTechCard(${JSON.stringify(key)})"><i class="fas fa-trash"></i> Sil</button>
          ` : ``}
        </div>
      </div>
    `;
}

// Teknik kart detayını popup'ta aç (ana ekran kartları gibi)
function openTechCardDetail(key) {
    try {
        const all = __getTechCardsForUi();
        // key: "<id>" veya "idx:<n>" olabilir
        let found = null;
        if (String(key || '').startsWith('idx:')) {
            const n = parseInt(String(key).split(':')[1], 10);
            if (!Number.isNaN(n)) found = all[n];
        } else {
            found = all.find((c, idx) => techCardKey(c, idx) === key) || null;
        }
        if (!found) {
            Swal.fire({ icon: 'warning', title: 'Kayıt bulunamadı', timer: 1200, showConfirmButton: false });
            return;
        }

        // showCardDetail(obj) zaten script/link vs. destekliyor
        showCardDetail({
            title: found.title || 'Detay',
            text: found.text || '',
            script: found.script || '',
            alert: found.alert || '',
            link: found.link || ''
        });
    } catch (e) {
        Swal.fire('Hata', 'Detay açılamadı.', 'error');
    }
}

function toggleTechEdit() {
    techEditMode = !techEditMode;
    // fullscreen teknik kartlar sekmesini tazele
    try { filterTechCards(); } catch (e) { }
}

function getTechOverride() {
    try {
        const arr = JSON.parse(localStorage.getItem('techCardsOverride') || '[]');
        if (Array.isArray(arr)) return arr;
    } catch (e) { }
    return [];
}

function saveTechOverride(arr) {
    // localStorage limit / quota hatalarında uygulama çökmesin
    storage.set('techCardsOverride', (arr || []));
}

function addTechCard(bucketKey) {
    Swal.fire({
        title: "Teknik Kart Ekle",
        html: `
          <input id="tc-title" class="swal2-input" placeholder="Başlık">
          <input id="tc-badge" class="swal2-input" placeholder="Etiket (ör: TEKNİK)">
          <input id="tc-link" class="swal2-input" placeholder="Link (opsiyonel)">
          <textarea id="tc-text" class="swal2-textarea" placeholder="Açıklama"></textarea>
          <textarea id="tc-script" class="swal2-textarea" placeholder="Script (opsiyonel)"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Ekle",
        cancelButtonText: "Vazgeç",
        preConfirm: () => {
            const title = (document.getElementById('tc-title').value || '').trim();
            if (!title) return Swal.showValidationMessage("Başlık zorunlu");
            return {
                id: 'local_' + Date.now(),
                title,
                code: (document.getElementById('tc-badge').value || 'TEKNİK').trim(),
                link: (document.getElementById('tc-link').value || '').trim(),
                text: (document.getElementById('tc-text').value || '').trim(),
                script: (document.getElementById('tc-script').value || '').trim(),
                category: 'teknik'
            };
        }
    }).then(res => {
        if (!res.isConfirmed) return;
        const cur = getTechOverride();
        const base = (database || []).filter(c => String(c.category || '').toLowerCase() === 'teknik');
        const arr = (cur.length ? cur : base);
        arr.unshift(res.value);
        saveTechOverride(arr);
        try { filterTechCards(); } catch (e) { }
    });
}

function editTechCard(key) {
    const cur = getTechOverride();
    const base = (database || []).filter(c => String(c.category || '').toLowerCase() === 'teknik');
    const arr = (cur.length ? cur : base);
    const idx = arr.findIndex((c, i) => techCardKey(c, i) === key);
    if (idx < 0) return;

    const c = arr[idx] || {};
    Swal.fire({
        title: "Kartı Düzenle",
        html: `
          <input id="tc-title" class="swal2-input" placeholder="Başlık" value="${escapeHtml(c.title || '')}">
          <input id="tc-badge" class="swal2-input" placeholder="Etiket" value="${escapeHtml(c.code || c.category || 'TEKNİK')}">
          <input id="tc-link" class="swal2-input" placeholder="Link" value="${escapeHtml(c.link || '')}">
          <textarea id="tc-text" class="swal2-textarea" placeholder="Açıklama">${escapeHtml(c.text || '')}</textarea>
          <textarea id="tc-script" class="swal2-textarea" placeholder="Script">${escapeHtml(c.script || '')}</textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "Kaydet",
        cancelButtonText: "Vazgeç",
        preConfirm: () => {
            const title = (document.getElementById('tc-title').value || '').trim();
            if (!title) return Swal.showValidationMessage("Başlık zorunlu");
            return {
                ...c,
                title,
                code: (document.getElementById('tc-badge').value || 'TEKNİK').trim(),
                link: (document.getElementById('tc-link').value || '').trim(),
                text: (document.getElementById('tc-text').value || '').trim(),
                script: (document.getElementById('tc-script').value || '').trim(),
                category: 'teknik'
            };
        }
    }).then(res => {
        if (!res.isConfirmed) return;
        arr[idx] = res.value;
        saveTechOverride(arr);
        try { filterTechCards(); } catch (e) { }
    });
}

function deleteTechCard(key) {
    Swal.fire({
        title: "Silinsin mi?",
        text: "Bu kart local veriden silinecek.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sil",
        cancelButtonText: "Vazgeç"
    }).then(res => {
        if (!res.isConfirmed) return;
        const cur = getTechOverride();
        const base = (database || []).filter(c => String(c.category || '').toLowerCase() === 'teknik');
        const arr = (cur.length ? cur : base);
        const next = arr.filter((c, i) => techCardKey(c, i) !== key);
        saveTechOverride(next);
        try { filterTechCards(); } catch (e) { }
    });
}

function renderTechList(targetId, list, showCategory = false) {
    const el = document.getElementById(targetId);
    if (!el) return;
    if (!list || list.length === 0) {
        el.innerHTML = '<div style="padding:16px;opacity:.7">Bu başlık altında içerik yok.</div>';
        return;
    }
    el.innerHTML = list.map((c) => `
      <div class="news-item" style="cursor:pointer" onclick="showCardDetail(${JSON.stringify(c).replace(/</g, '\u003c')})">
        <span class="news-title">${escapeHtml(c.title || '')}</span>
        ${showCategory ? `<span class="news-tag" style="background:#eef2ff;color:#2b3a8a;border:1px solid #dde3ff">${escapeHtml(c.category || '')}</span>` : ''}
        <div class="news-desc" style="white-space:pre-line">${escapeHtml(c.text || '')}</div>
        ${c.script ? `<div class="script-box" style="margin-top:10px"><b>Script:</b><div style="margin-top:6px;white-space:pre-line">${escapeHtml(c.script || '')}</div><div style="text-align:right;margin-top:10px"><button class="btn btn-copy" onclick="event.stopPropagation(); copyText('${escapeForJsString(c.script || '')}')">Kopyala</button></div></div>` : ''}
      </div>
    `).join('');
}

function renderTechDocs() {
    const map = {
        broadcast: 'x-broadcast-docs',
        access: 'x-access-docs',
        app: 'x-app-docs',
        activation: 'x-activation-docs'
    };

    Object.keys(map).forEach(key => {
        const el = document.getElementById(map[key]);
        if (!el) return;

        try {
            const items = (TECH_DOC_CONTENT && TECH_DOC_CONTENT[key]) ? TECH_DOC_CONTENT[key] : [];
            if (!Array.isArray(items) || items.length === 0) {
                el.innerHTML = '<div style="padding:12px 2px;opacity:.7">Bu başlık altında teknik döküman bulunamadı.</div>';
                return;
            }

            el.innerHTML = items.map((it, idx) => `
                <div class="doc-card">
                  <button type="button" class="doc-head" onclick="toggleDocAccordion(this)">
                    <span class="doc-title">${escapeHtml(it.title || ('İçerik ' + (idx + 1)))}</span>
                    <i class="fas fa-chevron-down"></i>
                  </button>
                  <div class="doc-body" style="display:none; white-space:pre-line">${escapeHtml(it.body || '')}</div>
                </div>
            `).join('');
        } catch (err) {
            console.error('renderTechDocs error', err);
            el.innerHTML = '<div style="padding:12px 2px;opacity:.7">Dökümanlar yüklenemedi. (Konsolu kontrol edin)</div>';
        }
    });
}

function toggleDocAccordion(btn) {
    try {
        const card = btn.closest('.doc-card');
        if (!card) return;
        const body = card.querySelector('.doc-body');
        if (!body) return;
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        card.classList.toggle('open', !isOpen);
    } catch (e) { }
}


function renderTechWizardInto(targetId) {
    const box = document.getElementById(targetId);
    if (!box) return;

    // Ayrı state: fullscreen içindeki gömülü sihirbaz
    window.embeddedTwState = window.embeddedTwState || { currentStep: 'start', history: [] };

    // Veri yoksa yükle
    if (!techWizardData || Object.keys(techWizardData).length === 0) {
        box.innerHTML = '<div style="padding:16px;opacity:.7">Sihirbaz yükleniyor...</div>';
        loadTechWizardData().then(() => renderTechWizardInto(targetId));
        return;
    }

    embeddedTwRender(targetId);
}

function embeddedTwRender(targetId) {
    const box = document.getElementById(targetId);
    if (!box) return;

    const st = window.embeddedTwState || { currentStep: 'start', history: [] };
    const stepData = techWizardData[st.currentStep];

    if (!stepData) {
        box.innerHTML = `<div class="tech-alert">Hata: Adım bulunamadı (${escapeHtml(String(st.currentStep))}).</div>`;
        return;
    }

    const backVisible = st.history && st.history.length > 0;

    let html = `
      <div style="display:flex; gap:8px; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap">
        <div style="display:flex; gap:8px; align-items:center">
          ${backVisible ? `<button type="button" class="tech-btn tech-btn-option" onclick="embeddedTwBack('${targetId}')">⬅ Geri</button>` : ''}
          <button type="button" class="tech-btn tech-btn-option" onclick="embeddedTwReset('${targetId}')">↻ Sıfırla</button>
        </div>
        <div style="opacity:.7; font-size:.9rem">Adım: ${escapeHtml(stepData.title || '')}</div>
      </div>

      <div class="tech-step-title">${escapeHtml(stepData.title || '')}</div>
    `;

    if (stepData.text) {
        html += `<div style="font-size:1rem; margin:10px 0; white-space:pre-line">${escapeHtml(stepData.text)}</div>`;
    }
    if (stepData.script) {
        html += `<div class="tech-script-box"><span class="tech-script-label">Müşteriye iletilecek:</span>${escapeHtml(stepData.script)}</div>`;
    }
    if (stepData.alert) {
        html += `<div class="tech-alert">${escapeHtml(stepData.alert)}</div>`;
    }

    if (Array.isArray(stepData.buttons) && stepData.buttons.length) {
        html += `<div class="tech-buttons-area">`;
        stepData.buttons.forEach(btn => {
            const cls = btn.style === 'option' ? 'tech-btn-option' : 'tech-btn-primary';
            html += `<button type="button" class="tech-btn ${cls}" onclick="embeddedTwChangeStep('${targetId}','${escapeForJsString(btn.next || 'start')}')">${escapeHtml(btn.text || '')}</button>`;
        });
        html += `</div>`;
    }

    box.innerHTML = html;
}

function embeddedTwChangeStep(targetId, newStep) {
    window.embeddedTwState = window.embeddedTwState || { currentStep: 'start', history: [] };
    window.embeddedTwState.history.push(window.embeddedTwState.currentStep);
    window.embeddedTwState.currentStep = newStep;
    embeddedTwRender(targetId);
}
function embeddedTwBack(targetId) {
    window.embeddedTwState = window.embeddedTwState || { currentStep: 'start', history: [] };
    if (window.embeddedTwState.history.length) {
        window.embeddedTwState.currentStep = window.embeddedTwState.history.pop();
        embeddedTwRender(targetId);
    }
}
function embeddedTwReset(targetId) {
    window.embeddedTwState = { currentStep: 'start', history: [] };
    embeddedTwRender(targetId);
}

/* -------------------------
   TEKNİK KARTLAR (FULLSCREEN)
   - Eski kart görünümü (liste)
   - Düzenleme, E-Tablo (Data) üzerinden (updateContent/addCard)
--------------------------*/

function __getTechCardsForUi() {
    return (database || [])
        .map((c, i) => ({ ...c, __dbIndex: i }))
        .filter(c => String(c.category || '').toLowerCase() === 'teknik' && String(c.status || '').toLowerCase() !== 'pasif');
}

async function addTechCardSheet() {
    if (!isAdminMode) return;
    const { value: v } = await Swal.fire({
        title: 'Teknik Kart Ekle',
        html: `
        <input id="tc-title" class="swal2-input" placeholder="Başlık">
        <textarea id="tc-text" class="swal2-textarea" placeholder="Açıklama"></textarea>
        <textarea id="tc-script" class="swal2-textarea" placeholder="Script (opsiyonel)"></textarea>
        <input id="tc-link" class="swal2-input" placeholder="Link (opsiyonel)">
      `,
        showCancelButton: true,
        confirmButtonText: 'Ekle',
        cancelButtonText: 'Vazgeç',
        preConfirm: () => {
            const title = (document.getElementById('tc-title').value || '').trim();
            if (!title) return Swal.showValidationMessage('Başlık zorunlu');
            const today = new Date();
            const dateStr = today.getDate() + "." + (today.getMonth() + 1) + "." + today.getFullYear();
            return {
                cardType: 'card',
                category: 'Teknik',
                title,
                text: (document.getElementById('tc-text').value || '').trim(),
                script: (document.getElementById('tc-script').value || '').trim(),
                code: '',
                link: (document.getElementById('tc-link').value || '').trim(),
                status: 'Aktif',
                date: dateStr
            };
        }
    });
    if (!v) return;

    if (!v) return;

    Swal.fire({ title: 'Ekleniyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
    try {
        const d = await apiCall("addCard", { ...v });
        if (d.result === 'success') {
            Swal.fire({ icon: 'success', title: 'Eklendi', timer: 1200, showConfirmButton: false });
            await loadContentData();
            filterTechCards();
        } else {
            Swal.fire('Hata', d.message || 'Eklenemedi', 'error');
        }
    } catch (e) {
        Swal.fire('Hata', 'Sunucu hatası.', 'error');
    }
}

async function editTechCardSheet(dbIndex) {
    if (!isAdminMode) return;
    const it = (database || [])[dbIndex];
    if (!it) return;
    const { value: v } = await Swal.fire({
        title: 'Teknik Kartı Düzenle',
        html: `
        <input id="tc-title" class="swal2-input" placeholder="Başlık" value="${escapeHtml(it.title || '')}">
        <textarea id="tc-text" class="swal2-textarea" placeholder="Açıklama">${escapeHtml(it.text || '')}</textarea>
        <textarea id="tc-script" class="swal2-textarea" placeholder="Script">${escapeHtml(it.script || '')}</textarea>
        <input id="tc-link" class="swal2-input" placeholder="Link" value="${escapeHtml(it.link || '')}">
      `,
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        cancelButtonText: 'Vazgeç',
        preConfirm: () => {
            const title = (document.getElementById('tc-title').value || '').trim();
            if (!title) return Swal.showValidationMessage('Başlık zorunlu');
            return {
                title,
                text: (document.getElementById('tc-text').value || '').trim(),
                script: (document.getElementById('tc-script').value || '').trim(),
                link: (document.getElementById('tc-link').value || '').trim(),
            };
        }
    });
    if (!v) return;
    const originalTitle = it.title;
    // sendUpdate sırayla update eder
    if (v.text !== (it.text || '')) sendUpdate(originalTitle, 'Text', v.text, 'card');
    setTimeout(() => { if (v.script !== (it.script || '')) sendUpdate(originalTitle, 'Script', v.script, 'card'); }, 350);
    setTimeout(() => { if (v.link !== (it.link || '')) sendUpdate(originalTitle, 'Link', v.link, 'card'); }, 700);
    setTimeout(() => { if (v.title !== originalTitle) sendUpdate(originalTitle, 'Title', v.title, 'card'); }, 1100);
}

function deleteTechCardSheet(dbIndex) {
    if (!isAdminMode) return;
    const it = (database || [])[dbIndex];
    if (!it) return;
    Swal.fire({
        title: 'Silinsin mi?',
        text: 'Kart pasife alınacak.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sil',
        cancelButtonText: 'Vazgeç'
    }).then(res => {
        if (!res.isConfirmed) return;
        sendUpdate(it.title, 'Status', 'Pasif', 'card');
    });
}

function renderTechCardsTab(q = '') {
    const box = document.getElementById('x-cards');
    if (!box) return;

    const query = String(q || '').trim().toLowerCase();
    const all = __getTechCardsForUi();
    const filtered = !query ? all : all.filter(c => {
        const hay = `${c.title || ''} ${c.text || ''} ${c.script || ''} ${c.link || ''}`.toLowerCase();
        return hay.includes(query);
    });

    const bar = (isAdminMode && isEditingActive)
        ? `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
           <button class="x-btn x-btn-admin" onclick="addTechCardSheet()"><i class="fas fa-plus"></i> Kart Ekle</button>
         </div>`
        : ``;

    if (!filtered.length) {
        box.innerHTML = bar + '<div style="opacity:.7;padding:16px">Kayıt bulunamadı.</div>';
        return;
    }

    box.innerHTML = bar + `
      <div class="x-card-grid">
        ${filtered.map(c => {
        const hasDetail = ((c.text || '').length > 180) || ((c.script || '').length > 120) || !!(c.link || '');
        const detailObj = { title: c.title, text: c.text || '', script: c.script || '', link: c.link || '' };
        const edit = (isAdminMode && isEditingActive)
            ? `
              <button class="x-btn x-btn-admin" onclick="event.stopPropagation();editTechCardSheet(${c.__dbIndex})"><i class="fas fa-pen"></i> Düzenle</button>
              <button class="x-btn x-btn-admin" onclick="event.stopPropagation();deleteTechCardSheet(${c.__dbIndex})"><i class="fas fa-trash"></i> Sil</button>
            `
            : ``;
        return `
            <div class="x-card" style="cursor:pointer" onclick='showCardDetail(${JSON.stringify(detailObj).replace(/</g, '\\u003c')})'>
              <div class="x-card-head">
                <div class="x-card-title">${escapeHtml(c.title || '')}</div>
                <div class="x-card-badge">TEKNİK</div>
              </div>
              <div class="x-card-body">
                ${(c.text || '') ? `<div class="x-card-text x-card-text-truncate">${escapeHtml(c.text || '')}</div>` : `<div style="opacity:.7">İçerik yok</div>`}
                ${hasDetail ? `<button class="x-readmore" onclick='event.stopPropagation();showCardDetail(${JSON.stringify(detailObj).replace(/</g, '\\u003c')})'>Devam oku</button>` : ``}
              </div>
              <div class="x-card-actions" onclick="event.stopPropagation();">
                ${(c.script || '') ? `<button class="x-btn x-btn-copy" onclick='copyText(${JSON.stringify(c.script || '')})'><i class="fas fa-copy"></i> Kopyala</button>` : ``}
                ${edit}
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
}

function filterTechCards() {
    const inp = document.getElementById('x-cards-search');
    renderTechCardsTab(inp ? inp.value : '');
}


function applySportsRights() {
    if (!Array.isArray(sportsData) || sportsData.length === 0) return;
    const rights = (window.sportRightsFromSheet && window.sportRightsFromSheet.length) ? window.sportRightsFromSheet : SPORTS_RIGHTS_FALLBACK;
    sportsData.forEach(s => {
        const hay = `${s.title || ''} ${s.desc || ''} ${s.detail || ''}`.toLowerCase();
        const hit = rights.find(r => hay.includes(String(r.name || '').toLowerCase().replaceAll('*', '').trim().split(' ')[0]));
        if (hit) {
            const extra = `Yayın hakkı bitiş: ${hit.end || hit.duration}`;
            if (s.tip && !s.tip.includes('Yayın hakkı')) s.tip = `${s.tip} • ${extra}`;
            else if (!s.tip) s.tip = extra;
            if (s.detail && !s.detail.includes('Yayın hakkı')) s.detail = `${s.detail}\n\n${extra}`;
            else if (!s.detail) s.detail = extra;
        }
    });
}

// Var olan veri yüklemesi bittikten sonra hak bilgisi ekle
const _orig_afterDataLoaded = window.afterDataLoaded;
window.afterDataLoaded = function () {
    try { if (typeof _orig_afterDataLoaded === 'function') _orig_afterDataLoaded(); } catch (e) { }
    try { applySportsRights(); } catch (e) { }
};


// ======================
// TECH DOCS - SHEET BIND
// ======================
let __techDocsCache = null;
let __techDocsLoadedAt = 0;
let __techCatsCache = null;
let __techCatsLoadedAt = 0;

const TECH_TAB_LABELS = {
    broadcast: 'Yayın Sorunları',
    access: 'Erişim Sorunları',
    app: 'App Hataları',
    activation: 'Aktivasyon Sorunları',
    info: 'Sık Sorulan Sorular',
    payment: 'Ödeme Sorunları'
};

function __normalizeTechTab(tab) {
    // tab ids: broadcast, access, app, activation
    return tab;
}
function __normalizeTechCategory(cat) {
    const c = (cat || "").toString().trim().toLowerCase();
    if (c.startsWith("yay")) return "broadcast";
    if (c.startsWith("eri")) return "access";
    if (c.startsWith("app")) return "app";
    if (c.startsWith("akt")) return "activation";
    if (c.startsWith("bil")) return "info";
    if (c.startsWith("öde") || c.startsWith("ode") || c.includes("ödeme") || c.includes("odeme")) return "payment";
    return "";
}



async function __fetchTechDocs() {
    const data = await apiCall("getTechDocs");
    const rows = Array.isArray(data.data) ? data.data : [];
    return rows
        .filter(r => (r.Durum || "").toString().trim().toLowerCase() !== "pasif")
        .map(r => ({
            categoryKey: __normalizeTechCategory(r.Kategori),
            kategori: (r.Kategori || "").trim(),
            baslik: (r.Başlık || r.Baslik || r.Title || r["Başlık"] || "").toString().trim(),
            icerik: (r.İçerik || r.Icerik || r.Content || r["İçerik"] || "").toString(),
            adim: (r.Adım || r.Adim || r.Step || r["Adım"] || "").toString(),
            not: (r.Not || "").toString(),
            link: (r.Link || "").toString(),
            image: (r.Resim || r.Image || r.Görsel || r.Gorsel || "").toString(),
            id: r.id,
            durum: (r.Durum || "").toString()
        }))
        .filter(x => x.categoryKey && x.baslik);
}

async function __fetchTechDocCategories() {
    // K sütunundan okunan kategori listesi (boşsa A sütunundan türetilir)
    try {
        const d = await apiCall("getTechDocCategories");
        if (d && d.result === 'success' && Array.isArray(d.categories)) return d.categories;
        return [];
    } catch (e) {
        return [];
    }
}

async function getTechDocCategoryOptions(force = false) {
    const now = Date.now();
    if (!force && __techCatsCache && (now - __techCatsLoadedAt) < 300000) return __techCatsCache; // 5dk
    const cats = await __fetchTechDocCategories();
    __techCatsCache = cats;
    __techCatsLoadedAt = now;
    return cats;
}



function __renderTechList(tabKey, items) {
    const listEl = document.getElementById(
        tabKey === "broadcast" ? "x-broadcast-list" :
            tabKey === "access" ? "x-access-list" :
                tabKey === "app" ? "x-app-list" :
                    tabKey === "activation" ? "x-activation-list" :
                        tabKey === "info" ? "x-info-list" :
                            tabKey === "payment" ? "x-payment-list" : ""
    );
    if (!listEl) return;

    if (!items || items.length === 0) {
        listEl.innerHTML = `<div style="padding:16px;opacity:.75">Bu başlık altında henüz içerik yok. (Sheet: Teknik_Dokumanlar)</div>`;
        return;
    }

    // Admin bar (düzenleme global menüden açılır)
    const adminBar = (isAdminMode && isEditingActive)
        ? `<div style="display:flex;gap:10px;align-items:center;margin:0 0 12px;">
         <button class="x-btn x-btn-admin" onclick="addTechDoc('${tabKey}')"><i class=\"fas fa-plus\"></i> Yeni Konu Ekle</button>
       </div>`
        : ``;

    function render(filtered) {
        listEl.innerHTML = adminBar + filtered.map((it, idx) => {
            const body = [
                it.icerik ? `<div class="q-doc-body" style="white-space: pre-line">${it.icerik}</div>` : "",
                it.image ? `<div style="margin:10px 0;"><img src="${processImageUrl(it.image)}" loading="lazy" onerror="this.style.display='none'" style="max-width:100%; border-radius:8px; max-height:300px; object-fit:cover;"></div>` : "",
                it.adim ? `<div class="q-doc-meta" style="white-space: pre-line"><b>Adım:</b> ${escapeHtml(it.adim)}</div>` : "",
                it.not ? `<div class="q-doc-meta" style="white-space: pre-line"><b>Not:</b> ${escapeHtml(it.not)}</div>` : "",
                it.link ? `<div class="q-doc-meta"><b>Link:</b> <a href="${escapeHtml(it.link)}" target="_blank">${escapeHtml(it.link)}</a></div>` : ""
            ].join("");
            const adminBtns = (isAdminMode && isEditingActive)
                ? `<span style="float:right;display:inline-flex;gap:8px" onclick="event.stopPropagation();event.preventDefault();">
             <button class="x-btn x-btn-admin" style="padding:6px 10px" onclick="editTechDoc('${tabKey}','${escapeForJsString(it.baslik)}')"><i class=\"fas fa-pen\"></i></button>
             <button class="x-btn x-btn-admin" style="padding:6px 10px" onclick="deleteTechDoc('${tabKey}','${escapeForJsString(it.baslik)}')"><i class=\"fas fa-trash\"></i></button>
           </span>`
                : ``;
            return `
        <details class="q-accordion" style="margin-bottom:10px;background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,.08);padding:10px 12px">
          <summary style="cursor:pointer;font-weight:800">${escapeHtml(it.baslik)}${adminBtns}</summary>
          <div style="padding:10px 2px 2px 2px">${body}</div>
        </details>
      `;
        }).join("");
    }

    render(items);
}

async function loadTechDocsIfNeeded(force = false) {
    const now = Date.now();
    if (!force && __techDocsCache && (now - __techDocsLoadedAt) < 120000) return __techDocsCache; // 2dk cache
    try {
        const rows = await __fetchTechDocs();
        __techDocsCache = rows;
        __techDocsLoadedAt = now;
        return rows;
    } catch (e) {
        console.error("[TECH DOCS]", e);
        return [];
    }
}

// Teknik fullscreen üst arama kutuları (index.html) için
async function filterTechDocList(tabKey) {
    try {
        const input = document.getElementById(`x-${tabKey}-search`);
        const q = (input ? input.value : '').toLowerCase().trim();
        const all = await loadTechDocsIfNeeded(false);
        const scoped = all.filter(x => x.categoryKey === tabKey);
        const filtered = !q ? scoped : scoped.filter(x =>
            (x.baslik || '').toLowerCase().includes(q) ||
            (x.icerik || '').toLowerCase().includes(q) ||
            (x.adim || '').toLowerCase().includes(q) ||
            (x.not || '').toLowerCase().includes(q)
        );
        __renderTechList(tabKey, filtered);
    } catch (e) {
        console.error(e);
    }
}

// Teknik_Dokumanlar kategori listesi (Sheet K sütunu)
let __techCategoryOptions = null;
async function loadTechCategoryOptions() {
    if (__techCategoryOptions) return __techCategoryOptions;
    try {
        const d = await apiCall("getTechDocCategories");
        if (d && d.result === 'success' && Array.isArray(d.categories)) {
            __techCategoryOptions = d.categories.filter(Boolean);
            return __techCategoryOptions;
        }
    } catch (e) { console.error('[TECH CATS]', e); }
    __techCategoryOptions = [];
    return __techCategoryOptions;
}

function techTabLabel(tabKey) {
    const m = { broadcast: 'Yayın Sorunları', access: 'Erişim Sorunları', app: 'App Hataları', activation: 'Aktivasyon Sorunları', info: 'Sık Sorulan Sorular', payment: 'Ödeme Sorunları' };
    return m[tabKey] || 'Yayın Sorunları';
}

// ---------------------------
// TECH DOCS (Sheet) - Admin CRUD
// ---------------------------
async function addTechDoc(tabKey) {
    if (!isAdminMode) return;
    const cats = await getTechDocCategoryOptions(false);
    const defaultLabel = TECH_TAB_LABELS[tabKey] || '';
    const opts = (cats && cats.length ? cats : Object.values(TECH_TAB_LABELS))
        .map(c => String(c || '').trim()).filter(Boolean);
    const uniq = Array.from(new Set(opts.map(x => x.toLowerCase()))).map(k => opts.find(x => x.toLowerCase() === k));
    const optionsHtml = uniq.map(c => `<option value="${escapeHtml(c)}" ${c === defaultLabel ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    const { value: v } = await Swal.fire({
        title: 'Teknik Konu Ekle',
        html: `
      <select id="td-cat" class="swal2-select" style="width:100%;max-width:420px">
        ${optionsHtml}
      </select>
      <input id="td-title" class="swal2-input" placeholder="Başlık">
      <textarea id="td-content" class="swal2-textarea" placeholder="İçerik"></textarea>
      <input id="td-step" class="swal2-input" placeholder="Adım (opsiyonel)">
      <input id="td-note" class="swal2-input" placeholder="Not (opsiyonel)">
      <input id="td-link" class="swal2-input" placeholder="Link (opsiyonel)">
      <input id="td-image" class="swal2-input" placeholder="Görsel Linki (opsiyonel)">
    `,
        showCancelButton: true,
        confirmButtonText: 'Ekle',
        cancelButtonText: 'Vazgeç',
        preConfirm: () => {
            const cat = (document.getElementById('td-cat')?.value || defaultLabel || '').trim();
            if (!cat) return Swal.showValidationMessage('Kategori zorunlu');
            const title = (document.getElementById('td-title').value || '').trim();
            if (!title) return Swal.showValidationMessage('Başlık zorunlu');
            return {
                kategori: cat,
                baslik: title,
                icerik: (document.getElementById('td-content').value || '').trim(),
                adim: (document.getElementById('td-step').value || '').trim(),
                not: (document.getElementById('td-note').value || '').trim(),
                link: (document.getElementById('td-link').value || '').trim(),
                image: (document.getElementById('td-image').value || '').trim(),
                durum: 'Aktif'
            };
        }
    });
    if (!v) return;

    Swal.fire({ title: 'Ekleniyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
    try {
        const d = await apiCall("upsertTechDoc", { keyKategori: '', keyBaslik: '', ...v });
        if (d.result === 'success') {
            Swal.fire({ icon: 'success', title: 'Eklendi', timer: 1200, showConfirmButton: false });
            await loadTechDocsIfNeeded(true);
            filterTechDocList(tabKey);
        } else {
            Swal.fire('Hata', d.message || 'Eklenemedi', 'error');
        }
    } catch (e) {
        Swal.fire('Hata', 'Sunucu hatası.', 'error');
    }
}

async function editTechDoc(tabKey, baslik) {
    if (!isAdminMode) return;
    const all = await loadTechDocsIfNeeded(false);
    const it = all.find(x => x.categoryKey === tabKey && (x.baslik || '') === baslik);
    if (!it) return;
    const cats = await getTechDocCategoryOptions(false);
    const opts = (cats && cats.length ? cats : Object.values(TECH_TAB_LABELS))
        .map(c => String(c || '').trim()).filter(Boolean);
    const uniq = Array.from(new Set(opts.map(x => x.toLowerCase()))).map(k => opts.find(x => x.toLowerCase() === k));
    const optionsHtml = uniq.map(c => `<option value="${escapeHtml(c)}" ${(c === it.kategori) ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
    const { value: v } = await Swal.fire({
        title: 'Teknik Konuyu Düzenle',
        html: `
      <select id="td-cat" class="swal2-select" style="width:100%;max-width:420px">
        ${optionsHtml}
      </select>
      <input id="td-title" class="swal2-input" placeholder="Başlık" value="${escapeHtml(it.baslik || '')}">
      <textarea id="td-content" class="swal2-textarea" placeholder="İçerik">${escapeHtml(it.icerik || '')}</textarea>
      <input id="td-step" class="swal2-input" placeholder="Adım" value="${escapeHtml(it.adim || '')}">
      <input id="td-note" class="swal2-input" placeholder="Not" value="${escapeHtml(it.not || '')}">
      <input id="td-link" class="swal2-input" placeholder="Link" value="${escapeHtml(it.link || '')}">
      <input id="td-image" class="swal2-input" placeholder="Görsel Linki" value="${escapeHtml(it.image || '')}">
    `,
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        cancelButtonText: 'Vazgeç',
        preConfirm: () => {
            const cat = (document.getElementById('td-cat')?.value || it.kategori || '').trim();
            if (!cat) return Swal.showValidationMessage('Kategori zorunlu');
            const title = (document.getElementById('td-title').value || '').trim();
            if (!title) return Swal.showValidationMessage('Başlık zorunlu');
            return {
                kategori: cat,
                baslik: title,
                icerik: (document.getElementById('td-content').value || '').trim(),
                adim: (document.getElementById('td-step').value || '').trim(),
                not: (document.getElementById('td-note').value || '').trim(),
                link: (document.getElementById('td-link').value || '').trim(),
                image: (document.getElementById('td-image').value || '').trim(),
                durum: 'Aktif'
            };
        }
    });
    if (!v) return;

    Swal.fire({ title: 'Kaydediliyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
    try {
        const d = await apiCall('upsertTechDoc', { id: it.id, keyKategori: it.kategori, keyBaslik: it.baslik, ...v, username: currentUser, token: getToken() });
        if (d.result === 'success') {
            Swal.fire({ icon: 'success', title: 'Kaydedildi', timer: 1200, showConfirmButton: false });
            await loadTechDocsIfNeeded(true);
            filterTechDocList(tabKey);
        } else {
            Swal.fire('Hata', d.message || 'Kaydedilemedi', 'error');
        }
    } catch (e) {
        Swal.fire('Hata', 'Sunucu hatası.', 'error');
    }
}

function deleteTechDoc(tabKey, baslik) {
    if (!isAdminMode) return;
    Swal.fire({
        title: 'Silinsin mi?',
        text: 'Konu pasife alınacak.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sil',
        cancelButtonText: 'Vazgeç'
    }).then(async res => {
        if (!res.isConfirmed) return;
        try {
            const all = await loadTechDocsIfNeeded(false);
            const it = all.find(x => x.categoryKey === tabKey && (x.baslik || '') === baslik);
            const keyKategori = it ? it.kategori : tabKey;
            const d = await apiCall('deleteTechDoc', { id: it.id, username: currentUser, token: getToken() });
            if (d.result === 'success') {
                await loadTechDocsIfNeeded(true);
                filterTechDocList(tabKey);
                Swal.fire({ icon: 'success', title: 'Silindi', timer: 1000, showConfirmButton: false });
            } else {
                Swal.fire('Hata', d.message || 'Silinemedi', 'error');
            }
        } catch (e) {
            Swal.fire('Hata', 'Sunucu hatası.', 'error');
        }
    });
}

// override / extend existing switchTechTab
window.switchTechTab = async function (tab) {
    try {
        // existing visual tab switch
        document.querySelectorAll('#tech-fullscreen .q-nav-item').forEach(li => li.classList.remove('active'));
        const tabMap = { wizard: 'x-view-wizard', access: 'x-view-access', app: 'x-view-app', activation: 'x-view-activation', payment: 'x-view-payment', cards: 'x-view-cards', info: 'x-view-info' };
        const viewId = tabMap[tab] || tabMap['wizard'];
        // activate clicked item
        const byData = document.querySelector(`#tech-fullscreen .q-nav-item[data-tech-tab="${tab}"]`);
        if (byData) byData.classList.add('active');
        document.querySelectorAll('#tech-fullscreen .q-view-section').forEach(v => v.classList.remove('active'));
        const viewEl = document.getElementById(viewId);
        if (viewEl) viewEl.classList.add('active');

        if (['access', 'app', 'activation', 'payment', 'info'].includes(tab)) {
            const all = await loadTechDocsIfNeeded(false);
            const filtered = all.filter(x => x.categoryKey === tab);
            __renderTechList(tab, filtered);
        }

        if (tab === 'wizard') {
            // Teknik sihirbazı fullscreen içine göm
            try { renderTechWizardInto('x-wizard'); } catch (e) { console.error(e); }
        }

        if (tab === 'cards') {
            try { filterTechCards(); } catch (e) { console.error(e); }
        }
    } catch (e) {
        console.error(e);
    }
};

// expose for onclick
try { window.openMenuPermissions = openMenuPermissions; } catch (e) { }



// --- GÖRSEL YÜKLEME ARACI (Admin/LocAdmin) ---
function openImageUploader() {
    Swal.fire({
        title: 'Görsel Yükle',
        html: `
        <div style="font-size:0.9rem;color:#555;margin-bottom:15px">
           Seçtiğiniz görsel bulut sistemine yüklenecek ve size bir link verilecektir.
           Bu linki "Image" sütununa yapıştırarak kartlarda kullanabilirsiniz.
        </div>
        <input type="file" id="swal-img-input" accept="image/*" class="swal2-file" style="display:block;margin:0 auto;">
        `,
        showCancelButton: true,
        confirmButtonText: 'Yükle',
        cancelButtonText: 'İptal',
        preConfirm: () => {
            const fileInput = document.getElementById('swal-img-input');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                Swal.showValidationMessage('Lütfen bir görsel seçin.');
                return;
            }
            const file = fileInput.files[0];
            // Base64 okuma
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const b64 = reader.result.split(',')[1]; // data:image/png;base64, kısmını at
                    resolve({
                        base64: b64,
                        mimeType: file.type,
                        fileName: file.name
                    });
                };
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }
    }).then(result => {
        if (result.isConfirmed) {
            const fileData = result.value;
            Swal.fire({ title: 'Yükleniyor...', didOpen: () => { Swal.showLoading() } });

            apiCall("uploadImage", fileData).then(res => {
                if (res.result === "success") {
                    Swal.fire({
                        icon: 'success',
                        title: 'Yüklendi!',
                        html: `
                           <div>Görsel Linki:</div>
                           <input type="text" value="${res.url}" id="uploaded-img-url" class="swal2-input" readonly>
                           <button class="btn btn-copy" style="margin-top:10px" onclick="copyText(document.getElementById('uploaded-img-url').value)">Link'i Kopyala</button>
                         `,
                        confirmButtonText: 'Tamam'
                    });
                } else {
                    Swal.fire('Hata', res.message || 'Yüklenemedi.', 'error');
                }
            }).catch(e => {
                Swal.fire('Hata', 'Sunucu hatası: ' + e, 'error');
            });
        }
    });
}

// ============================================================
// --- AKTİF KULLANICI YÖNETİMİ (v14.1) ---
// ============================================================

async function openActiveUsersPanel() {
    try {
        Swal.fire({ title: 'Yükleniyor...', didOpen: () => { Swal.showLoading() } });

        const res = await apiCall("getActiveUsers", {});

        if (!res || res.result !== "success") {
            Swal.fire("Hata", "Aktif kullanıcılar yüklenemedi", "error");
            return;
        }

        const users = res.users || [];

        if (users.length === 0) {
            Swal.fire({
                title: "👥 Aktif Kullanıcılar",
                html: '<p style="color:#999;padding:20px">Şu an aktif kullanıcı yok.</p>',
                confirmButtonText: 'Tamam'
            });
            return;
        }

        const rowsHtml = users.map((u, idx) => {
            // Online/Offline Kontrolü (65 saniye tolerans)
            const lastSeenDate = u.last_seen ? new Date(u.last_seen) : null;
            const now = new Date();
            const diffSeconds = lastSeenDate ? (now - lastSeenDate) / 1000 : 999999;
            const isOnline = diffSeconds < 65;

            const lastSeenStr = lastSeenDate ? lastSeenDate.toLocaleString('tr-TR') : '-';

            return `
                <tr style="border-bottom:1px solid #eee; background-color:${isOnline ? 'transparent' : '#f9f9f9'}">
                    <td style="padding:12px;text-align:center; color:${isOnline ? 'inherit' : '#999'}">${idx + 1}</td>
                    <td style="padding:12px;font-weight:600; color:${isOnline ? 'inherit' : '#999'}">${escapeHtml(u.username)}</td>
                    <td style="padding:12px;text-align:center">
                        <span style="display:inline-block;padding:4px 8px;border-radius:4px;font-size:0.85rem;background:${u.role === 'admin' ? '#4caf50' :
                    u.role === 'locadmin' ? '#2196f3' :
                        u.role === 'qusers' ? '#ff9800' : '#9e9e9e'
                };color:#fff;opacity:${isOnline ? 1 : 0.6}">${escapeHtml(u.role)}</span>
                    </td>
                    <td style="padding:12px;font-size:0.9rem; color:${isOnline ? 'inherit' : '#999'}">${escapeHtml(u.group || '-')}</td>
                    <td style="padding:12px;font-size:0.85rem;color:#666">${escapeHtml(lastSeenStr)}</td>
                    <td style="padding:12px;text-align:center">
                        ${isOnline
                    ? `<span style="color:#2e7d32;font-weight:bold;font-size:0.85rem;padding:4px 8px;background:#e8f5e9;border-radius:12px"><i class="fas fa-circle" style="font-size:8px;vertical-align:middle"></i> Online</span>`
                    : `<span style="color:#757575;font-weight:bold;font-size:0.85rem;padding:4px 8px;background:#eeeeee;border-radius:12px"><i class="far fa-circle" style="font-size:8px;vertical-align:middle"></i> Offline</span>`
                }
                    </td>
                    <td style="padding:12px;text-align:center">
                       ${(u.username !== currentUser) ?
                    `<button 
                            onclick="kickUser('${escapeForJsString(u.username)}')" 
                            style="padding:6px 12px;background:#d32f2f;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.8rem; opacity:${isOnline ? 1 : 0.5}"
                            title="Kullanıcıyı sistemden at">
                            <i class="fas fa-power-off"></i> At
                        </button>` : '<span style="color:#ccc">-</span>'
                }
                    </td>
                </tr>
            `;
        }).join('');

        const tableHtml = `
            <div style="max-height:500px;overflow:auto;border:1px solid rgba(0,0,0,.08);border-radius:12px">
                <table style="width:100%;border-collapse:collapse">
                    <thead style="position:sticky;top:0;background:#f7f7f7;z-index:1">
                        <tr>
                            <th style="padding:12px;text-align:center">#</th>
                            <th style="padding:12px;text-align:left">Kullanıcı</th>
                            <th style="padding:12px;text-align:center">Rol</th>
                            <th style="padding:12px;text-align:left">Grup</th>
                            <th style="padding:12px;text-align:left">Son Sinyal</th>
                            <th style="padding:12px;text-align:center">Durum</th>
                            <th style="padding:12px;text-align:center">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:15px;padding:10px;background:#e3f2fd;border-radius:8px;font-size:0.9rem;color:#1976d2">
                <i class="fas fa-info-circle"></i> <strong>Online:</strong> Son 1 dk içinde aktif. <strong>Offline:</strong> Son 24 saat içinde giriş yapmış.
                <br><small>Not: "At" butonu kullanıcıyı bir sonraki sinyalde (max 30sn) sistemden düşürür.</small>
            </div>
        `;

        Swal.fire({
            title: "👥 Aktif Kullanıcılar",
            html: tableHtml,
            width: 1000,
            showConfirmButton: true,
            confirmButtonText: "Kapat"
        });

    } catch (e) {
        Swal.fire("Hata", "Bir hata oluştu: " + e.message, "error");
    }
}

async function kickUser(username, token) {
    // Token parametresi artık kullanılmayacak (Legacy uyumu için parametrede duruyor)
    const { isConfirmed } = await Swal.fire({
        title: 'Kullanıcıyı At?',
        text: `${username} kullanıcısı sistemden atılacak.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, At'
    });

    if (isConfirmed) {
        try {
            // force_logout flag'ini true yap (ve Token'ı temizle)
            const { error } = await sb.from('Users').update({ force_logout: true }).eq('Username', username);
            await sb.from('Tokens').delete().eq('Username', username); // Token siliyoruz ki anında düşsün

            if (error) throw error;

            saveLog("Kullanıcıyı Sistemden Atma", username);
            Swal.fire('Başarılı', 'Kullanıcıya çıkış komutu gönderildi (max 30sn).', 'success');
            // Listeyi yenile
            openActiveUsersPanel();
        } catch (e) {
            console.error(e);
            Swal.fire('Hata', 'Kullanıcı atılamadı: ' + e.message, 'error');
        }
    }
}

// ============================================================
// --- GELİŞMİŞ YETKİ YÖNETİMİ (RBAC) (v14.2) ---
// ============================================================

async function fetchUserListForAdmin() {
    try {
        const res = await apiCall("getUserList", {});
        if (res && res.result === "success") {
            adminUserList = res.users || [];
            console.log("[Pusula] Admin User List loaded:", adminUserList.length);
        }
    } catch (e) {
        console.error("[Pusula] fetchUserListForAdmin error:", e);
    }
}

// ------------------------------------------------------------
// --- KULLANICI YÖNETİMİ (YENİ) ---
// ------------------------------------------------------------
async function openUserManagementPanel() {
    try {
        Swal.fire({ title: 'Yükleniyor...', didOpen: () => { Swal.showLoading() } });
        const res = await apiCall("getUserList", {});
        if (!res || res.result !== "success") throw new Error("Kullanıcı listesi alınamadı.");

        const users = res.users || [];
        const rowsHtml = users.map((u, idx) => `
            <tr style="border-bottom:1px solid #eee">
                <td style="padding:10px;text-align:center">${idx + 1}</td>
                <td style="padding:10px;"><strong>${escapeHtml(u.username || u.name)}</strong></td>
                <td style="padding:10px;">${escapeHtml(u.role || '-')}</td>
                <td style="padding:10px;">${escapeHtml(u.group || '-')}</td>
                <td style="padding:10px;text-align:center">
                    <button class="x-btn-admin" onclick="editUserPopup('${u.id}')" style="background:var(--secondary);padding:5px 10px;font-size:0.75rem;"><i class="fas fa-edit"></i> Düzenle</button>
                    <button class="x-btn-admin" onclick="deleteUser('${u.id}', '${escapeForJsString(u.username || u.name)}')" style="background:var(--accent);padding:5px 10px;font-size:0.75rem;"><i class="fas fa-trash"></i> Sil</button>
                </td>
            </tr>
        `).join('');

        const tableHtml = `
            <div style="margin-bottom:15px;text-align:right">
                <button class="x-btn-admin" onclick="editUserPopup()" style="background:var(--success);"><i class="fas fa-plus"></i> Yeni Kullanıcı Ekle</button>
            </div>
            <div style="max-height:450px;overflow:auto;border:1px solid #eee;border-radius:10px">
                <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                    <thead style="background:#f9fafb;position:sticky;top:0;">
                        <tr>
                            <th style="padding:10px;">#</th>
                            <th style="padding:10px;text-align:left">Kullanıcı</th>
                            <th style="padding:10px;text-align:left">Rol</th>
                            <th style="padding:10px;text-align:left">Grup</th>
                            <th style="padding:10px;">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: "👥 Kullanıcı Yönetimi",
            html: tableHtml,
            width: 800,
            showConfirmButton: true,
            confirmButtonText: "Kapat"
        });

        // Global fonksiyon tanımları (Swal modal içinde onclick için)
        window.editUserPopup = async function (id) {
            let u = id ? users.find(x => String(x.id) === String(id)) : { username: '', role: 'agent', group: 'Genel' };
            const { value: formValues } = await Swal.fire({
                title: id ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı',
                html: `
                    <input id="u-name" class="swal2-input" placeholder="Kullanıcı Adı" value="${u.username || u.name || ''}">
                    <input id="u-pass" type="password" class="swal2-input" placeholder="${id ? 'Şifreyi Değiştirmek İçin Yazın (Boş bırakırsanız değişmez)' : 'Şifre'}">
                    <select id="u-role" class="swal2-input">
                        <option value="agent" ${u.role === 'agent' ? 'selected' : ''}>Temsilci (Agent)</option>
                        <option value="qusers" ${u.role === 'qusers' ? 'selected' : ''}>Kalite (QA)</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Yönetici (Admin)</option>
                        <option value="locadmin" ${u.role === 'locadmin' ? 'selected' : ''}>Tam Yetkili (LocAdmin)</option>
                    </select>
                    <input id="u-group" class="swal2-input" placeholder="Grup (Gerekiyorsa)" value="${u.group || ''}">
                `,
                showCancelButton: true,
                confirmButtonText: 'Kaydet',
                preConfirm: () => {
                    const name = document.getElementById('u-name').value.trim();
                    const pass = document.getElementById('u-pass').value.trim();
                    if (!name || (!id && !pass)) { Swal.showValidationMessage('Kullanıcı adı ve şifre zorunludur'); return false; }
                    return { id, username: name, password: pass, role: document.getElementById('u-role').value, group: document.getElementById('u-group').value };
                }
            });

            if (formValues) {
                Swal.fire({ title: 'Kaydediliyor...', didOpen: () => Swal.showLoading() });
                const res = await apiCall("saveUser", formValues);
                if (res.result === "success") {
                    Swal.fire("Başarılı", "Kullanıcı kaydedildi.", "success").then(() => openUserManagementPanel());
                } else {
                    Swal.fire("Hata", res.message || "Kaydedilemedi", "error");
                }
            }
        };

        window.deleteUser = async function (id, name) {
            const confirmed = await Swal.fire({
                title: 'Emin misiniz?',
                text: `${name} kullanıcısını silmek istediğinize emin misiniz?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Evet, Sil',
                confirmButtonColor: '#d32f2f'
            });
            if (confirmed.isConfirmed) {
                const res = await apiCall("deleteUser", { id });
                if (res.result === "success") {
                    Swal.fire("Silindi", "Kullanıcı silindi.", "success").then(() => openUserManagementPanel());
                } else {
                    Swal.fire("Hata", res.message || "Silinemedi", "error");
                }
            }
        };
    } catch (e) {
        Swal.fire("Hata", e.message, "error");
    }
}

async function openLogsPanel() {
    try {
        Swal.fire({ title: 'Günlükler yükleniyor...', didOpen: () => { Swal.showLoading() } });
        const res = await apiCall("getLogs", {});
        if (!res || res.result !== "success") throw new Error("Loglar alınamadı.");

        const logs = res.logs || [];
        const rowsHtml = logs.map((l, idx) => `
            <tr style="border-bottom:1px solid #eee; font-size:0.8rem;">
                <td style="padding:8px; color:#888;">${new Date(l.Date).toLocaleString('tr-TR')}</td>
                <td style="padding:8px;"><strong>${escapeHtml(l.Username)}</strong></td>
                <td style="padding:8px;"><span class="badge" style="background:#e3f2fd; color:#1976d2; padding:2px 6px; border-radius:4px;">${escapeHtml(l.Action)}</span></td>
                <td style="padding:8px; color:#555;">${escapeHtml(l.Details)}</td>
                <td style="padding:8px; color:#999; font-family:monospace;">${escapeHtml(l["İP ADRESİ"] || '-')}</td>
            </tr>
        `).join('');

        const tableHtml = `
            <div style="max-height:500px; overflow:auto; border:1px solid #eee; border-radius:10px;">
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <thead style="background:#f4f7f9; position:sticky; top:0;">
                        <tr>
                            <th style="padding:10px;">Tarih</th>
                            <th style="padding:10px;">Kullanıcı</th>
                            <th style="padding:10px;">Eylem</th>
                            <th style="padding:10px;">Detay</th>
                            <th style="padding:10px;">IP</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

        Swal.fire({
            title: "📜 Sistem Logları",
            html: tableHtml,
            width: 1000,
            showConfirmButton: true,
            confirmButtonText: "Kapat"
        });
    } catch (e) {
        Swal.fire('Hata', 'Loglar yüklenirken bir sorun oluştu.', 'error');
    }
}

async function openMenuPermissions() {
    try {
        Swal.fire({ title: 'Yetkiler Yükleniyor...', didOpen: () => { Swal.showLoading() } });

        const res = await apiCall("getRolePermissions", {});
        if (!res || res.result !== "success") {
            Swal.fire("Hata", "Yetki listesi alınamadı.", "error");
            return;
        }

        allRolePermissions = res.permissions || [];

        // ✅ Dinamik Roller: Backend'den (Users sayfasından) gelen grupları kullan
        const roles = res.groups || ["admin", "qusers", "users"];
        let activeTabIndex = 0;

        const renderRbacContent = (roleIndex) => {
            const role = roles[roleIndex];
            const rolePerms = allRolePermissions.filter(p => p.role === role);

            // ✅ Dinamik Sayfa Listesi (Arayüzdeki tüm data-menu-key öğelerini otomatik bulur)
            const pageLabels = {
                home: "Ana Sayfa", search: "Arama Çubuğu", news: "Duyurular", tech: "Teknik Sayfası",
                persuasion: "İkna Sayfası", campaign: "Kampanya Sayfası", info: "Bilgi Sayfası",
                broadcast: "Yayın Akışı", guide: "Spor Rehberi", return: "İade Asistanı",
                telesales: "TeleSatış", game: "Oyun Merkezi", quality: "Kalite Paneli", shift: "Vardiyam"
            };
            const discoveredPages = [];
            const processedKeys = new Set();
            document.querySelectorAll('[data-menu-key]').forEach(el => {
                const key = el.getAttribute('data-menu-key');
                if (!processedKeys.has(key)) {
                    discoveredPages.push({
                        key: key,
                        label: pageLabels[key] || (el.textContent.trim().replace(/\s+/g, ' ') || key),
                        perms: ["View"]
                    });
                    processedKeys.add(key);
                }
            });
            // Alfabetik sırala
            discoveredPages.sort((a, b) => a.label.localeCompare(b.label, 'tr'));

            const resources = [
                {
                    cat: "Genel Yetkiler", items: [
                        { key: "EditMode", label: "Düzenleme Modunu Açma", perms: ["Execute"] },
                        { key: "AddContent", label: "Yeni İçerik Ekleme", perms: ["Execute"] },
                        { key: "ImageUpload", label: "Görsel Yükleme", perms: ["Execute"] },
                        { key: "Reports", label: "Rapor Çekme (Dışa Aktar)", perms: ["Execute"] },
                        { key: "RbacAdmin", label: "Yetki Yönetimi", perms: ["Execute"] },
                        { key: "ActiveUsers", label: "Aktif Kullanıcılar", perms: ["Execute"] },
                        { key: "UserAdmin", label: "Kullanıcı Yönetimi", perms: ["Execute"] },
                        { key: "SystemLogs", label: "Sistem Logları", perms: ["Execute"] }
                    ]
                },
                {
                    cat: "Sayfa Erişimi", items: discoveredPages
                },
                {
                    cat: "Kalite Yönetimi", items: [
                        { key: "Evaluation", label: "Değerlendirme Yapma", perms: ["Execute"] },
                        { key: "Feedback", label: "Geri Bildirim Ekleme", perms: ["Execute"] },
                        { key: "Training", label: "Eğitim Atama", perms: ["Execute"] }
                    ]
                }
            ];

            let html = `
                <div class="rbac-container">
                    <div class="rbac-header">
                        <div style="font-weight:700;color:var(--primary)">
                            <i class="fas fa-user-shield"></i> 
                            <span style="text-transform:capitalize">${role}</span> Rolü Yetki Tanımları
                        </div>
                        <div class="rbac-info-box">
                            <i class="fas fa-info-circle"></i> LocAdmin her zaman tam yetkilidir.
                        </div>
                    </div>

                    <div class="rbac-role-selector">
                        ${roles.map((r, i) => `
                            <button class="rbac-role-btn ${i === roleIndex ? 'active' : ''}" onclick="window.switchRbacRole(${i})">
                                ${r.toUpperCase()}
                            </button>
                        `).join('')}
                    </div>

                    <div class="rbac-table-wrapper">
                        <table class="rbac-table">
                            <thead>
                                <tr>
                                    <th style="text-align:left">Kaynak / Yetki Alanı</th>
                                    <th style="text-align:center">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resources.map(cat => `
                                    <tr class="rbac-category-row"><td colspan="2">${cat.cat}</td></tr>
                                    ${cat.items.map(item => {
                const isEnabled = rolePerms.some(p => p.resource === item.key && p.value === true);
                // HTML içinde çift tırnak çakışmasını önlemek için rol ismini güvenli hale getir
                const safeRole = role.replace(/'/g, "\\'");
                return `
                                            <tr>
                                                <td class="rbac-resource-name">${item.label}</td>
                                                <td style="text-align:center">
                                                    <label class="rbac-switch">
                                                        <input type="checkbox" id="perm_${roleIndex}_${item.key}" ${isEnabled ? 'checked' : ''} 
                                                            onchange="window.toggleRbacPerm('${safeRole}', '${item.key}', this.checked)">
                                                        <span class="rbac-slider"></span>
                                                    </label>
                                                </td>
                                            </tr>
                                        `;
            }).join('')}
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            return html;
        };

        // Modal içinden çağrılacak global fonksiyonlar
        window.switchRbacRole = (idx) => {
            activeTabIndex = idx;
            Swal.update({ html: renderRbacContent(idx) });
        };

        window.toggleRbacPerm = (role, resource, val) => {
            const idx = allRolePermissions.findIndex(p => p.role === role && p.resource === resource);
            if (idx > -1) {
                allRolePermissions[idx].value = val;
            } else {
                allRolePermissions.push({ role, resource, permission: "All", value: val });
            }
        };

        Swal.fire({
            title: "🛡️ Gelişmiş Yetki Yönetimi",
            html: renderRbacContent(0),
            width: 800,
            showCancelButton: true,
            cancelButtonText: "Vazgeç",
            confirmButtonText: "Değişiklikleri Kaydet",
            confirmButtonColor: "var(--success)",
            preConfirm: async () => {
                const results = [];
                roles.forEach(r => {
                    const rPerms = allRolePermissions.filter(p => p.role === r).map(p => ({
                        resource: p.resource,
                        permission: p.permission || "All",
                        value: p.value
                    }));
                    results.push({ role: r, perms: rPerms });
                });

                try {
                    Swal.showLoading();
                    for (const resObj of results) {
                        await apiCall("setRolePermissions", resObj);
                    }
                    return true;
                } catch (e) {
                    Swal.showValidationMessage(`Kayıt hatası: ${e.message}`);
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire("Başarılı", "Tüm yetkiler güncellendi. Kullanıcıların etkilenmesi için sayfayı yenilemeleri gerekebilir.", "success");
            }
        });

    } catch (e) {
        Swal.fire("Hata", "Bir hata oluştu: " + e.message, "error");
    }
}

function hasPerm(resource, permission = "All") {
    const rawRole = (getMyRole() || "").trim().toLowerCase();
    const rawGroup = (localStorage.getItem("sSportGroup") || "").trim().toLowerCase();

    // Güçlü Normalizasyon (Türkçe karakter ve i̇ karmaşasını bitirir)
    function clean(str) {
        return String(str || "").toLowerCase()
            .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's')
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').trim();
    }

    const cRole = clean(rawRole);
    const cGroup = clean(rawGroup);

    // 1. KULLANICI TALEBİ: LocAdmin (Rol veya Grup) sınırsız yetkilidir.
    if (cRole === "locadmin" || cGroup === "locadmin") return true;

    // 2. ÖNCELİK: GRUP (TAKIM) YETKİSİ
    // Eğer bir grubu varsa (ob, chat, telesatış vb.), yetkiyi oradan al.
    if (cGroup && cGroup !== "" && cGroup !== "all") {
        const groupPerm = allRolePermissions.find(p =>
            clean(p.role) === cGroup &&
            (p.resource === resource || p.resource === "All") &&
            (p.permission === permission || p.permission === "All")
        );
        // Eğer grupta bir kayıt varsa (True veya False), direkt onu kullan.
        if (groupPerm) return groupPerm.value;
    }

    // 3. FALLBACK: ROL YETKİSİ
    // (Sadece grupta hiç tanım yoksa veya kullanıcı grupta değilse buraya düşer)
    const rolePerm = allRolePermissions.find(p =>
        clean(p.role) === cRole &&
        (p.resource === resource || p.resource === "All") &&
        (p.permission === permission || p.permission === "All")
    );

    return rolePerm ? rolePerm.value : false;
}

// Login sonrası yetkileri arka planda yükle
async function loadPermissionsOnStartup() {
    if (!currentUser) return;
    const res = await apiCall("getRolePermissions", {});
    if (res && res.result === "success") {
        allRolePermissions = res.permissions || [];
        applyPermissionsToUI();

        // ✅ Akıllı Yönlendirme: Eğer Ana Sayfa (Home) yetkisi kapalıysa, yetkisi olan ilk sayfaya yönlendir.
        if (!hasPerm("home", "View")) {
            // Kontrol edilecek öncelikli sayfalar
            const landingPages = [
                { key: "quality", action: openQualityArea },
                { key: "tech", action: () => openTechArea('wizard') },
                { key: "shift", action: () => filterCategory(null, "shift") },
                { key: "news", action: openNews },
                { key: "broadcast", action: openBroadcastFlow },
                { key: "telesales", action: () => filterCategory(null, "Telesatış") },
                { key: "persuasion", action: () => filterCategory(null, "İkna") },
                { key: "campaign", action: () => filterCategory(null, "Kampanya") },
                { key: "info", action: () => filterCategory(null, "Bilgi") }
            ];

            for (const page of landingPages) {
                if (hasPerm(page.key, "View")) {
                    page.action();
                    console.log(`[Auth] Ana sayfa yetkisi yok, ${page.key} sayfasına yönlendirildi.`);
                    break;
                }
            }
        }
    }
}

/**
 * Kaydedilen yetkilere göre arayüzdeki butonları gizle/göster
 */
function applyPermissionsToUI() {
    const role = getMyRole();
    // Sadece LocAdmin için yetki kısıtlaması yok (tam yetki)
    // Admin kullanıcılar RBAC panelinden verilen yetkilere tabidir
    const editBtn = document.getElementById('dropdownQuickEdit');
    if (editBtn) editBtn.style.display = hasPerm("EditMode") ? 'flex' : 'none';

    const addCardBtn = document.getElementById('dropdownAddCard');
    if (addCardBtn) addCardBtn.style.display = hasPerm("AddContent") ? 'flex' : 'none';

    const imageBtn = document.getElementById('dropdownImage');
    if (imageBtn) imageBtn.style.display = hasPerm("ImageUpload") ? 'flex' : 'none';

    const reportBtns = document.querySelectorAll('.admin-btn');
    reportBtns.forEach(btn => {
        btn.style.display = hasPerm("Reports") ? '' : 'none';
    });

    const permsBtn = document.getElementById('dropdownPerms');
    if (permsBtn) permsBtn.style.display = hasPerm("RbacAdmin") ? 'flex' : 'none';

    const activeUsersBtn = document.getElementById('dropdownActiveUsers');
    if (activeUsersBtn) activeUsersBtn.style.display = hasPerm("ActiveUsers") ? 'flex' : 'none';

    const userMgmtBtn = document.getElementById('dropdownUserMgmt');
    if (userMgmtBtn) userMgmtBtn.style.display = hasPerm("UserAdmin") ? 'flex' : 'none';

    const logsBtn = document.getElementById('dropdownLogs');
    if (logsBtn) logsBtn.style.display = hasPerm("SystemLogs") ? 'flex' : 'none';

    const menuMap = {
        "home": "home",
        "search": "search",
        "tech": "tech",
        "telesales": "telesales",
        "persuasion": "persuasion",
        "campaign": "campaign",
        "info": "info",
        "news": "news",
        "quality": "quality",
        "shift": "shift",
        "broadcast": "broadcast",
        "guide": "guide",
        "return": "return",
        "game": "game"
    };

    Object.keys(menuMap).forEach(key => {
        const elements = document.querySelectorAll(`[data-menu-key="${key}"]`);
        elements.forEach(el => {
            if (!hasPerm(menuMap[key], "View")) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });

        // Hızlı kısayollar (ana sayfa chips) - data-shortcut-key ile de eşleşebilirler
        const shortcuts = document.querySelectorAll(`[data-shortcut-key="${key}"]`);
        shortcuts.forEach(sc => {
            if (!hasPerm(menuMap[key], "View")) {
                sc.style.display = 'none';
            } else {
                sc.style.display = '';
            }
        });
    });

    // Ana sayfa düzenleme butonlarını da yetkiye göre tazele
    try {
        if (currentCategory === 'home') renderHomePanels();
    } catch (e) { }

    // Bildirimleri kontrol et
    checkQualityNotifications();
}

// --- KALİTE GERİ BİLDİRİM & NOT SİSTEMİ POPUPLARI ---

async function openAgentNotePopup(callId, color) {
    const { value: note } = await Swal.fire({
        title: '💬 Görüş / Not Ekle',
        html: `
        <div style="margin-top:5px; text-align:left;">
            <p style="font-size:0.9rem; color:#555; margin-bottom:10px;">
                Bu değerlendirme ile ilgili eklemek istediğiniz bir not, teşekkür veya görüş varsa aşağıya yazabilirsiniz.
            </p>
            <textarea id="swal-agent-note" class="swal2-textarea" style="margin-top:0;" placeholder="Notunuzu buraya yazın..."></textarea>
        </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Gönder',
        cancelButtonText: 'Vazgeç',
        confirmButtonColor: '#f57c00',
        preConfirm: () => {
            const noteVal = document.getElementById('swal-agent-note').value;
            if (!noteVal || !noteVal.trim()) {
                Swal.showValidationMessage('Lütfen bir not yazın veya Vazgeç butonuna basın.');
                return false;
            }
            return noteVal.trim();
        }
    });

    if (note) {
        Swal.fire({ title: 'Not Kaydediliyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
        try {
            const res = await apiCall("submitAgentNote", { callId: callId, username: currentUser, note: note, status: 'Bekliyor' });
            if (res.result === 'success') {
                Swal.fire('Başarılı', 'Görüşünüz yöneticiye iletildi.', 'success');
                fetchEvaluationsForAgent(currentUser); // Listeyi yenile
                checkQualityNotifications(); // Bildirimleri yenile
            } else {
                Swal.fire('Hata', 'İşlem sırasında bir kısıtlama oluştu. Lütfen bağlantınızı kontrol edin.', 'error');
            }
        } catch (e) {
            Swal.fire('Hata', 'Sistem hatası oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }
}

// --- WIZARD EDITOR (ADMIN ONLY) ---
async function openWizardEditor(table, stepId) {
    if (!isAdminMode) return;

    let currentData = (table === 'WizardSteps') ? wizardStepsData[stepId] : techWizardData[stepId];
    if (!currentData) { Swal.fire('Hata', 'Adım verisi bulunamadı.', 'error'); return; }

    let optionsStr = (table === 'WizardSteps')
        ? currentData.options.map(o => `${o.text} | ${o.next} | ${o.style || 'primary'}`).join(', ')
        : (currentData.buttons || []).map(b => `${b.text} | ${b.next} | ${b.style || 'primary'}`).join(', ');

    const { value: v } = await Swal.fire({
        title: `🔧 Düzenle: ${stepId}`,
        html: `
            <div style="text-align:left; font-size:0.85rem;">
                <label>Başlık</label><input id="w-title" class="swal2-input" value="${currentData.title || ''}">
                <label>Metin</label><textarea id="w-text" class="swal2-textarea" style="height:80px;">${currentData.text || ''}</textarea>
                <label>Script</label><textarea id="w-script" class="swal2-textarea" style="height:60px;">${currentData.script || ''}</textarea>
                <label>Seçenekler (Format: Metin | NextID | Style , ...)</label>
                <textarea id="w-options" class="swal2-textarea" style="height:80px;">${optionsStr}</textarea>
                ${table === 'WizardSteps' ? `<label>Sonuç (red, green, yellow)</label><input id="w-result" class="swal2-input" value="${currentData.result || ''}">` : ''}
                ${table === 'TechWizardSteps' ? `<label>Alert</label><input id="w-alert" class="swal2-input" value="${currentData.alert || ''}">` : ''}
            </div>
        `,
        width: 600, showCancelButton: true, confirmButtonText: 'Kaydet',
        preConfirm: () => ({
            title: document.getElementById('w-title').value,
            text: document.getElementById('w-text').value,
            script: document.getElementById('w-script').value,
            options: document.getElementById('w-options').value,
            result: document.getElementById('w-result') ? document.getElementById('w-result').value : null,
            alert: document.getElementById('w-alert') ? document.getElementById('w-alert').value : null
        })
    });

    if (v) {
        Swal.fire({ title: 'Kaydediliyor...', didOpen: () => Swal.showLoading() });
        try {
            const payload = {
                StepID: stepId,
                Title: v.title,
                Text: v.text,
                Script: v.script,
                Options: v.options
            };
            if (v.result !== null) payload.Result = v.result;
            if (v.alert !== null) payload.Alert = v.alert;

            const { error } = await sb.from(table).upsert(payload, { onConflict: 'StepID' });
            if (error) throw error;

            Swal.fire('Başarılı', 'Güncellendi. Yenileniyor...', 'success');
            if (table === 'WizardSteps') { await loadWizardData(); renderStep(stepId); }
            else { await loadTechWizardData(); twRenderStep(); }
        } catch (e) {
            Swal.fire('Hata', 'Kaydedilemedi: ' + e.message, 'error');
        }
    }
}

async function openAdminReplyPopup(callId, agentName, currentNote) {
    const { value: formValues } = await Swal.fire({
        title: 'Geri Bildirim Yanıtla',
        html: `
        <div style="text-align:left; background:#f5f5f5; padding:10px; border-radius:5px; margin-bottom:10px; font-size:0.9rem;">
            <strong>Temsilci Notu:</strong><br>${escapeHtml(currentNote)}
        </div>
        <textarea id="swal-manager-reply" class="swal2-textarea" placeholder="Yönetici cevabını yaz..."></textarea>
        <select id="swal-reply-status" class="swal2-input">
            <option value="Tamamlandı">✅ Yanıtla ve Süreci Tamamla</option>
            <option value="Bekliyor">⏳ İnceleme Devam Ediyor</option>
        </select>
        `,
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        cancelButtonText: 'İptal',
        preConfirm: () => {
            return {
                reply: document.getElementById('swal-manager-reply').value,
                status: document.getElementById('swal-reply-status').value
            };
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Kaydediliyor...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
        try {
            const res = await apiCall("resolveAgentFeedback", {
                callId: callId,
                agentName: agentName,
                reply: formValues.reply,
                status: formValues.status,
                username: currentUser
            });
            if (res.result === 'success') {
                Swal.fire('Başarılı', 'Yanıt kaydedildi.', 'success');
                // Admin modunda listeyi yenileme:
                // Global refresh varsa onu çağır, yoksa en azından agent listesini yenile
                if (typeof refreshQualityData === 'function') refreshQualityData();
                fetchEvaluationsForAgent(agentName, true); // Silent refresh
                checkQualityNotifications();
            } else {
                Swal.fire('Hata', 'Kaydedilemedi.', 'error');
            }
        } catch (e) {
            Swal.fire('Hata', 'Sunucu hatası.', 'error');
        }
    }
}

function checkQualityNotifications() {
    apiCall("getQualityNotifications", { username: currentUser, role: getMyRole() })
        .then(data => {
            if (data.result === 'success') {
                const notifs = data.notifications;
                let totalCount = 0;
                const qualityBtn = document.querySelector('[data-menu-key="quality"]');

                if (!qualityBtn) return;

                // Eğer varsa eski badge'i temizle
                const oldBadge = qualityBtn.querySelector('.notif-badge');
                if (oldBadge) oldBadge.remove();

                if (isAdminMode || isLocAdmin) {
                    totalCount = notifs.pendingFeedbackCount || 0;
                } else {
                    totalCount = notifs.unseenCount || 0;
                }

                if (totalCount > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'notif-badge';
                    badge.innerText = totalCount;
                    badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: red;
                    color: white;
                    border-radius: 50%;
                    padding: 2px 6px;
                    font-size: 0.7rem;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    animation: pulse 2s infinite;
                `;
                    qualityBtn.style.position = 'relative';
                    qualityBtn.appendChild(badge);
                }
            }
        }).catch(e => console.log('Notif check error', e));
}
