// ============================================================================
// ss-dialogs.js — premium modal dialogs + toast notifications (both screens)
// Loaded FIRST in the studio and portal script lists. Zero dependencies.
//
//   SSD.alert(title, message, icon)               pretty notice (non-blocking)
//   SSD.ok(msg) / SSD.error(msg)                  shortcuts for alert
//   await SSD.confirm(title, message, {danger})   -> true/false
//   await SSD.prompt(title, {initial, placeholder, type, validate}) -> string | null
//   SSD.toast(message, {type, ms})                glass toast, auto-dismiss
//
// window.alert is globally replaced by a pretty, fire-and-forget dialog.
// ============================================================================
(function () {
    'use strict';
    if (window.SSD) return;

    var CSS =
        ':root{--ssd-gold:#f0c05a;--ssd-danger:#ff5d73;--ssd-ok:#2dd4bf}' +
        '.ssd-overlay{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,7,15,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:"Plus Jakarta Sans","Cairo",system-ui,sans-serif;animation:ssdFade .18s ease both}' +
        '@keyframes ssdFade{from{opacity:0}to{opacity:1}}@keyframes ssdRise{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}' +
        '.ssd-card{width:min(460px,94vw);max-height:86vh;overflow-y:auto;background:#0d1424f2;border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:26px 26px 22px;box-shadow:0 30px 90px rgba(2,6,18,.6);animation:ssdRise .22s ease both;color:#eef2ff;position:relative}' +
        '.ssd-card.danger{border-color:rgba(255,93,115,.45);box-shadow:0 30px 90px rgba(60,8,18,.55)}' +
        '.ssd-glow{position:absolute;top:-60px;right:-60px;width:150px;height:150px;border-radius:50%;filter:blur(48px);opacity:.16;pointer-events:none}' +
        '.ssd-ico{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:25px;margin-bottom:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12)}' +
        '.ssd-ico.gold{background:linear-gradient(160deg,#f6d488,#dd9b3b);border-color:transparent;box-shadow:0 10px 24px rgba(240,192,90,.3)}' +
        '.ssd-ico.danger{background:rgba(255,93,115,.14);border-color:rgba(255,93,115,.45)}' +
        '.ssd-ico.ok{background:rgba(45,212,191,.13);border-color:rgba(45,212,191,.4)}' +
        '.ssd-title{margin:0 0 6px;font-size:18px;font-weight:800;letter-spacing:-.2px}' +
        '.ssd-msg{margin:0;font-size:13.5px;line-height:1.65;color:#aab6cf;font-weight:600;white-space:pre-line}' +
        '.ssd-msg code{background:rgba(255,255,255,.08);border-radius:6px;padding:1px 6px;font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#f6d488}' +
        '.ssd-input{width:100%;box-sizing:border-box;margin:14px 0 4px;padding:12px 15px;border:1.5px solid rgba(255,255,255,.14);border-radius:13px;font:inherit;font-size:15px;font-weight:700;color:#eef2ff;background:rgba(255,255,255,.05);outline:none;transition:border-color .15s,box-shadow .15s}' +
        '.ssd-input::placeholder{color:rgba(151,163,189,.65);font-weight:600}' +
        '.ssd-input:focus{border-color:rgba(240,192,90,.65);box-shadow:0 0 0 4px rgba(240,192,90,.12)}' +
        '.ssd-err{min-height:16px;margin:6px 0 2px;font-size:12px;font-weight:700;color:#ff5d73}' +
        '.ssd-row{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}' +
        '.ssd-btn{appearance:none;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#eef2ff;font:inherit;font-weight:800;font-size:14px;border-radius:13px;padding:11px 20px;cursor:pointer;transition:transform .15s,background .15s}' +
        '.ssd-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.1)}' +
        '.ssd-btn.primary{background:linear-gradient(120deg,#f6d488,#dd9b3b);color:#241a05;border-color:transparent;box-shadow:0 10px 26px rgba(240,192,90,.28)}' +
        '.ssd-btn.danger{background:linear-gradient(120deg,#ff7488,#e33a55);color:#40040c;border-color:transparent;box-shadow:0 10px 26px rgba(227,58,85,.3)}' +
        '.ssd-hint{margin:12px 0 0;font-size:11.5px;color:#7e8bab;font-weight:700}' +
        '.ssd-toastbox{position:fixed;top:18px;right:18px;z-index:99995;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:min(420px,90vw)}' +
        '.ssd-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border-radius:16px;background:#0d1424f2;border:1px solid rgba(255,255,255,.1);box-shadow:0 18px 46px rgba(2,6,18,.5);color:#eef2ff;font-family:"Plus Jakarta Sans","Cairo",system-ui,sans-serif;font-size:13.5px;font-weight:700;line-height:1.5;animation:ssdIn .25s ease both}' +
        '@keyframes ssdIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}' +
        '@keyframes ssdOut{to{opacity:0;transform:translateX(24px)}}' +
        '.ssd-toast.out{animation:ssdOut .25s ease both}' +
        '.ssd-tico{flex-shrink:0;width:26px;height:26px;border-radius:9px;display:grid;place-items:center;font-size:14px}' +
        '.ssd-toast.ok .ssd-tico{background:rgba(45,212,191,.15);border:1px solid rgba(45,212,191,.4)}' +
        '.ssd-toast.error .ssd-tico{background:rgba(255,93,115,.15);border:1px solid rgba(255,93,115,.45)}' +
        '.ssd-toast.info .ssd-tico{background:rgba(240,192,90,.15);border:1px solid rgba(240,192,90,.4)}';

    function ensureShell() {
        if (document.getElementById('ssd-style')) return;
        var st = document.createElement('style'); st.id = 'ssd-style'; st.textContent = CSS;
        document.head.appendChild(st);
        if (!document.getElementById('ssd-toasts')) {
            var tb = document.createElement('div'); tb.id = 'ssd-toasts'; tb.className = 'ssd-toastbox';
            document.body.appendChild(tb);
        }
    }
    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // busy queue so overlapping dialogs resolve in order
    var chain = Promise.resolve();
    function enqueue(job) {
        var run = chain.then(job, job);
        chain = run.then(function () {}, function () {});
        return run;
    }

    var OVERLAY = null;

    function openDialog(opts) {
        ensureShell();
        return new Promise(function (resolve) {
            build(resolve, opts);
        });
    }

    function build(resolve, opts) {
        var title = opts.title || 'Notice';
        var icon = opts.icon || 'ℹ️';
        var iconTone = opts.tone || (opts.danger ? 'danger' : 'info');
        var buttons = opts.buttons || [{ id: 'ok', label: 'OK', kind: 'primary' }];

        var ov = document.createElement('div');
        ov.className = 'ssd-overlay';
        var inputHtml = opts.prompt
            ? '<input class="ssd-input" id="ssd-input" type="' + (opts.prompt.type === 'password' ? 'password' : 'text') +
              '" placeholder="' + esc(opts.prompt.placeholder || '') + '" value="' + esc(opts.prompt.initial || '') + '" autocomplete="off">' +
              '<div class="ssd-err" id="ssd-err"></div>'
            : '<div class="ssd-err" id="ssd-err"></div>';
        var btns = buttons.map(function (b) {
            return '<button type="button" class="ssd-btn ' + (b.kind || '') + '" data-id="' + esc(b.id) + '">' + esc(b.label) + '</button>';
        }).join('');
        ov.innerHTML =
            '<div class="ssd-card' + (opts.danger ? ' danger' : '') + '" role="dialog" aria-modal="true">' +
            '<span class="ssd-glow" style="background:' + (opts.danger ? '#ff5d73' : '#f0c05a') + '"></span>' +
            '<div class="ssd-ico ' + (opts.tone === 'gold' ? 'gold' : (opts.tone === 'ok' ? 'ok' : (opts.danger ? 'danger' : ''))) + '">' + icon + '</div>' +
            '<h3 class="ssd-title">' + esc(title) + '</h3>' +
            '<div class="ssd-msg">' + esc(opts.protected ? (opts.message || '') : String(opts.message || '')).replace(/\n/g, '<br>') + '</div>' +
            inputHtml +
            '<div class="ssd-row">' + btns + '</div>' +
            (opts.hint ? '<p class="ssd-hint">' + esc(opts.hint) + '</p>' : '') +
            '</div>';

        var card = ov.querySelector('.ssd-card');
        var errEl = ov.querySelector('#ssd-err');
        var input = ov.querySelector('#ssd-input');
        var rec = { el: ov, resolve: resolve, cancelId: (buttons[0] && buttons[0].id) || null, opts: opts };

        ov.addEventListener('mousedown', function (e) { if (e.target === ov) finish(rec.cancelId === undefined ? null : rec.cancelId); });

        function finish(val) {
            if (OVERLAY !== rec) return;
            // normalize: cancel-equivalent clicks resolve false (confirm) / null (prompt)
            val = (val === 'cancel' || val == null) ? (opts.prompt ? null : false) : ((val === 'ok') ? (!opts.prompt ? true : 'ok') : val);
            window.removeEventListener('keydown', rec.key, true);
            OVERLAY = null;
            resolve(val);
            ov.style.animation = 'ssdFade .15s ease reverse both';
            setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 160);
        }

        ov.querySelectorAll('.ssd-btn').forEach(function (b) {
            b.addEventListener('click', function () {
                var id = b.getAttribute('data-id');
                if (opts.prompt) {
                    if (id === 'cancel') { finish(null); return; }
                    var v = String(input.value || '').replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
                    if (opts.prompt.validate) {
                        var msg = opts.prompt.validate(v);
                        if (msg) { errEl.textContent = msg; try { input.focus(); } catch (e2) {} return; }
                    }
                    if (!v.trim() && opts.prompt.requireNonEmpty !== false) { errEl.textContent = 'Please type something first.'; try { input.focus(); } catch (e3) {} return; }
                    finish(v.trim());
                } else if (id === 'ok') finish(true);
                else if (id === 'cancel') finish(false);
                else finish(id);
            });
        });
        rec.key = function (e) {
            if (e.key === 'Escape') { e.preventDefault(); finish(rec.cancelId || null); }
            else if (e.key === 'Enter' && opts.prompt && input && document.activeElement === input) { e.preventDefault(); b_ok(); }
        };
        function b_ok() {
            var b = ov.querySelector('.ssd-btn.primary');
            try { if (b) b.click(); } catch (e) {}
        }
        if (opts.prompt) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); b_ok(); }
            });
        }
        // window-level capture: runs before any document handler that stops propagation
        window.addEventListener('keydown', rec.key, true);
        document.body.appendChild(ov);
        OVERLAY = rec;
        if (input) { try { input.focus(); input.select(); } catch (e) {} }
        else {
            var prim = ov.querySelector('.ssd-btn.primary, .ssd-btn.danger') || ov.querySelector('.ssd-btn');
            try { prim.focus(); } catch (e) {}
        }
    }

    // ---------- public API ----------
    var SSD = {
        open: openDialog,
        alert: function (titleOrMsg, message, icon) {
            var title = 'Information', msg = titleOrMsg, ic = '💬';
            if (typeof message !== 'undefined') { title = titleOrMsg; msg = message; ic = icon || 'ℹ️'; }
            else if (/⚠|error|failed|not |cannot/i.test(String(msg)) || /⚠/.test(String(msg))) ic = '⚠️';
            enqueue(function () { return openDialog({ title: title, message: String(msg), icon: ic, buttons: [{ id: 'ok', label: 'OK', kind: 'primary' }], hint: 'Press Enter or Esc' }); });
        },
        ok: function (msg) { SSD.alert('Done!', msg, '✅'); },
        error: function (msg) { SSD.alert('Something went wrong', msg, '⚠️'); },
        confirm: function (title, message, flags) {
            flags = flags || {};
            return enqueue(function () {
                return openDialog({
                    title: title,
                    message: message,
                    icon: flags.danger ? '🗑️' : '❓',
                    danger: !!flags.danger,
                    buttons: [
                        { id: 'cancel', label: flags.cancelLabel || 'Cancel' },
                        { id: 'ok', label: flags.okLabel || 'Yes, continue', kind: flags.danger ? 'danger' : 'primary' }
                    ],
                    hint: 'Enter = Yes · Esc = Cancel'
                });
            });
        },
        prompt: function (title, flags) {
            flags = flags || {};
            return enqueue(function () {
                return openDialog({
                    title: title,
                    message: flags.message || '',
                    icon: flags.icon || '✍️',
                    prompt: { initial: flags.initial || '', placeholder: flags.placeholder || '', type: flags.type || 'text', validate: flags.validate, requireNonEmpty: flags.requireNonEmpty },
                    buttons: [
                        { id: 'cancel', label: 'Cancel' },
                        { id: 'ok', label: flags.okLabel || 'Save', kind: 'primary' }
                    ],
                    hint: flags.hint
                });
            });
        },
        toast: function (msg, flags) {
            flags = flags || {};
            ensureShell();
            var box = document.getElementById('ssd-toasts'); if (!box) return;
            var t = document.createElement('div');
            var type = flags.type === 'error' ? 'error' : (flags.type === 'success' ? 'ok' : 'info');
            var ico = flags.type === 'error' ? '⚠️' : (flags.type === 'success' ? '✅' : (flags.icon || 'ℹ️'));
            t.className = 'ssd-toast ' + type;
            t.innerHTML = '<span class="ssd-tico">' + ico + '</span>' + esc(String(msg)).replace(/\n/g, '<br>');
            t.addEventListener('click', function () { kill(); });
            box.appendChild(t);
            while (box.children.length > 4) { if (box.firstChild) box.removeChild(box.firstChild); }
            var ms = flags.ms || 3200;
            setTimeout(kill, ms);
            function kill() {
                t.classList.add('out');
                setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
            }
        }
    };
    window.SSD = SSD;

    // ---------- legacy API compatibility ----------
    // Every existing alert(...) call site instantly becomes a pretty dialog.
    window.alert = function (msg) {
        try { SSD.alert(String(msg)); } catch (e) { /* never block */ }
    };
})();
