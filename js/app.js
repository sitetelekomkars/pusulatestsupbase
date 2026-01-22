/**
 * Pusula - Main Entry & Global State
 * This file coordinates the initialization of modules and holds shared global state.
 */

// --- CONFIGURATION ---
const BAKIM_MODU = false;
let SCRIPT_URL = localStorage.getItem("PUSULA_SCRIPT_URL") || "https://script.google.com/macros/s/AKfycbzS8pNRnQsRdH_nj0xZMyF2ZNJxprE3jR1AwvVXqiOfcOYvy0fQBqmQ-Iir7xQZjn2QBA/exec";

// --- GLOBAL STATE ---
let currentUser = "";
let globalUserIP = "";
let activeRole = "";
let isAdminMode = false;
let isLocAdmin = false;
let isEditingActive = false;
let currentCategory = "home";

// Data Stores
let database = [];
let newsData = [];
let sportsData = [];
let salesScripts = [];
let quizQuestions = [];
let quickDecisionQuestions = [];
let activeCards = [];
let adminUserList = [];
let allEvaluationsData = [];
let trainingData = [];
let feedbackLogsData = [];
let homeBlocks = {};

// Specialized State
let wizardStepsData = {};
let techWizardData = {};

// Chart Instances
let dashboardChart = null;
let dashTrendChart = null;
let dashChannelChart = null;
let dashScoreDistChart = null;
let dashGroupAvgChart = null;

// Constants
const VALID_CATEGORIES = ['Teknik', 'İkna', 'Kampanya', 'Bilgi'];
const MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// Barrier for data loading
let __dataLoadedResolve;
window.__dataLoadedPromise = new Promise(r => { __dataLoadedResolve = r; });

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Prevent right click as per original requirement
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.onkeydown = function (e) { if (e.keyCode == 123) return false; };

    // Initialize Auth
    updateGlobalAuthFlags();
    checkSession();

    // Fetch IP (Context support)
    fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => { globalUserIP = `${d.ip} [${d.city || '-'}, ${d.region || '-'}]`; })
        .catch(() => { });
});

// Helper to update flags globally
function updateGlobalAuthFlags() {
    activeRole = getMyRole();
    isLocAdmin = (activeRole === 'locadmin');
    isAdminMode = hasPermission('canEdit') || isLocAdmin;
}

// Global error handlers
window.addEventListener('error', function (e) {
    try { if (isAdminMode || isLocAdmin) console.log('[Global Error]', e && (e.error || e.message) ? (e.error || e.message) : e); } catch (_) { }
    try { if (typeof showGlobalError === 'function') showGlobalError('Beklenmeyen hata: ' + (e && e.message ? e.message : 'Bilinmeyen')); } catch (_) { }
});

window.addEventListener('unhandledrejection', function (e) {
    try { if (isAdminMode || isLocAdmin) console.log('[Unhandled Promise]', e && e.reason ? e.reason : e); } catch (_) { }
    try { if (typeof showGlobalError === 'function') showGlobalError('Beklenmeyen hata: ' + (e && e.reason && e.reason.message ? e.reason.message : 'Bilinmeyen')); } catch (_) { }
});