// Contact form: front-end only. A valid submit stamps "Prototype · Not sent" and offers a mailto link.

const EMAIL = 'info@montasercompany.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const T = {
  name: { en: 'your name', ar: 'اسمك' },
  email: { en: 'a valid email', ar: 'بريدًا إلكترونيًا صحيحًا' },
  message: { en: 'a message', ar: 'رسالة' },
  add: { en: 'Please add', ar: 'يرجى إضافة' },
  joiner: { en: ', ', ar: '، ' },
};
const root = document.documentElement;
const lang = () => (root.lang === 'ar' ? 'ar' : 'en');

function mailto(data) {
  const body = [
    data.get('message'),
    '',
    `${data.get('name')}${data.get('company') ? `, ${data.get('company')}` : ''}`,
    data.get('email'),
    data.get('phone'),
  ].filter((l) => l !== null && l !== undefined).join('\n');
  return `mailto:${EMAIL}?subject=${encodeURIComponent(data.get('subject'))}&body=${encodeURIComponent(body.trim())}`;
}

function localiseOptions(form) {
  const ar = lang() === 'ar';
  form.querySelectorAll('option[data-ar]').forEach((o) => { o.textContent = ar ? o.dataset.ar : o.value; });
}

export function initForm() {
  const form = document.querySelector('[data-rfi]');
  if (!form) return;
  const err = form.querySelector('[data-rfi-err]');
  const done = form.querySelector('[data-rfi-done]');
  let problems = [];
  const showErrors = () => {
    const l = lang();
    err.textContent = problems.length ? `${T.add[l]} ${problems.map((k) => T[k][l]).join(T.joiner[l])}.` : '';
  };
  localiseOptions(form);
  window.addEventListener('montaser:langchange', () => { localiseOptions(form); showErrors(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const checks = {
      name: Boolean(String(data.get('name') || '').trim()),
      email: EMAIL_RE.test(String(data.get('email') || '').trim()),
      message: Boolean(String(data.get('message') || '').trim()),
    };
    Object.entries(checks).forEach(([k, ok]) => form.elements[k].setAttribute('aria-invalid', String(!ok)));
    problems = Object.keys(checks).filter((k) => !checks[k]);
    showErrors();
    if (problems.length) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    form.querySelector('[data-rfi-mailto]').href = mailto(data);
    done.hidden = false;
    done.focus();
  });
}
