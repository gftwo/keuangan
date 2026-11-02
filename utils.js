import { App } from './core.js';

App.Utils = {
    formatNumber: (num) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num || 0),
    formatCurrency: (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0),
    parseCurrency: (str) => parseInt(str.toString().replace(/\D/g, '')) || 0,
    formatInput(el) { let val = el.value.replace(/\D/g, ''); el.value = val ? parseInt(val).toLocaleString('id-ID') : ''; },
    formatDateStr: (dStr) => { if(!dStr) return '-'; return new Date(dStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
};
