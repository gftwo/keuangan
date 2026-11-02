import { App } from './core.js';

App.Theme = {
    presetDefaultHue: { klasik: 244, midnight: 230, sunset: 22, forest: 142, mono: 230, aurora: 265, biru: 210, kuning: 38 },
    init() {
        const saved = App.State.settings.theme;
        if(saved === 'dark') this.toggle(true, false); else if(saved === 'light') this.toggle(false, false);
        else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; this.toggle(prefersDark, false); }
        this.changePreset(App.State.settings.themePreset || 'klasik', false);
        this.changeAccent(App.State.settings.accentHue || 244, false);
    },
    toggle(isDark, save = true) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if(document.getElementById('setTheme')) document.getElementById('setTheme').checked = isDark;
        if(save) { App.State.settings.theme = isDark ? 'dark' : 'light'; App.DB.save(); }
        if(App.State.charts.cat) App.UI.renderAnalytics(); 
    },
    changePreset(name, save = true) {
        document.documentElement.setAttribute('data-theme-preset', name);
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        const card = document.getElementById('preset-' + name); if(card) card.classList.add('active');
        const darkRow = document.getElementById('darkModeRow'); if(darkRow) darkRow.style.display = (name === 'klasik') ? 'block' : 'none';
        if(save) {
            App.State.settings.themePreset = name;
            this.changeAccent(this.presetDefaultHue[name] || 244, true);
            App.DB.save();
        }
        if(App.State.charts.cat) App.UI.renderAnalytics();
    },
    changeAccent(hue, save = true) {
        document.documentElement.style.setProperty('--hue-primary', hue);
        if(save) { App.State.settings.accentHue = hue; App.DB.save(); }
    }
};
