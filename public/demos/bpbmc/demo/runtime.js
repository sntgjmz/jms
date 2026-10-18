import { createFixtures } from './fixtures.js';

// This adapter runs only against fictional records in the enclosing showcase.
// It never calls the PHP endpoints or stores the visitor's input.
const host = window.parent !== window && window.parent.BPBMCDemo ? window.parent.BPBMCDemo : null;
const data = host?.data || createFixtures();
const route = document.body.dataset.demoPage || location.pathname.split('/').pop().replace(/\.html$/, '');
const role = route.match(/^main-(admin|doctor|staff|patient)/)?.[1] || 'public';
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const money = (value) => `₱ ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const recordRows = new WeakMap();
let activeModal = null;
let lastFocus = null;

const patient = data.patients[0];
const doctor = data.doctors[0];
const account = role === 'patient' ? patient : role === 'doctor' ? doctor : data.accounts.find((item) => String(item.role || item.user_role).toLowerCase() === role) || data.accounts[0];
const field = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== '');
const fullName = (item) => field(item, 'patient_name', 'full_name', 'name', 'doctor_name') || [item?.first_name, item?.middle_name, item?.last_name].filter(Boolean).join(' ');
const today = data.today || new Date().toISOString().slice(0, 10);
function navigate(destination) {
  destination = destination.replace(/^#?\/?/, '').replace(/\.php.*$/, '').trim();
  if (host) host.navigate(destination);
  else location.href = `../index.html#/${destination}`;
}
function notify(message) {
  let toast = $('#bpbmc-local-toast');
  if (!toast) {
    toast = document.createElement('div'); toast.id = 'bpbmc-local-toast'; toast.setAttribute('role', 'status'); document.body.append(toast);
  }
  toast.textContent = message; toast.classList.add('visible');
  clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('visible'), 4800);
}
function log(action) {
  data.activity.unshift({ id: Date.now(), timestamp: `${today} ${new Date().toTimeString().slice(0, 5)}`, date_time: `${today} ${new Date().toTimeString().slice(0, 5)}`, action, user_id: account?.id || 'DEMO', username: account?.username || 'demo' });
}
function replaceMarkers(scope = document.body, context = account) {
  const replacements = {
    ...patient, ...(data.session[role] || {}), ...context,
    fullname: fullName(context), full_name: fullName(context), username: field(context, 'username', 'email') || 'demo.user',
    patient_name: fullName(patient), doctor: fullName(doctor), role: role[0].toUpperCase() + role.slice(1), user_role: role[0].toUpperCase() + role.slice(1),
    total_patient: data.patients.length, total_patients: data.patients.length, total_appointments: data.appointments.length,
    login_error: '', email_error: '', id_number_error: '', reset_message: '', reset_success: '', successmessage: '', message: '',
    email: context?.email || 'sample@bpbmc.example', current_date: today,
  };
  const replace = (value) => value.replace(/__DEMO_([a-zA-Z0-9_]+)__/g, (_, key) => {
    if (/password|token|image|pdf|file|error|successmessage|reset_message|reset_success/i.test(key)) return '';
    return replacements[key] ?? (/count|total|numberof/i.test(key) ? '0' : /name/i.test(key) ? fullName(context) : /date/i.test(key) ? today : 'Demo');
  });
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => { if (node.parentElement?.tagName !== 'SCRIPT' && node.textContent.includes('__DEMO_')) node.textContent = replace(node.textContent); });
  $$('*', scope).forEach((element) => [...element.attributes].forEach((attribute) => {
    if (attribute.value.includes('__DEMO_')) element.setAttribute(attribute.name, replace(attribute.value));
  }));
}

function kindForRoute() {
  if (/patient-account-archives|verify-patient|list-of-patients/.test(route)) return 'patients';
  if (/clinic-account-archives|list-of-accounts/.test(route)) return 'accounts';
  if (/service-archives|diagnostic-service/.test(route)) return 'services';
  if (/treatment-archives|medical-treatment/.test(route)) return 'treatments';
  if (/medical-record/.test(route)) return 'records';
  if (/medical-result/.test(route)) return 'results';
  if (/patient-monitoring|transaction.?log|payment-history/.test(route)) return 'bills';
  if (/activity-log/.test(route)) return 'activity';
  return 'appointments';
}
function rowsFor(kind, dashboard = false) {
  let rows = data[kind] || [];
  if (role === 'patient' && ['appointments', 'records', 'results', 'bills'].includes(kind)) rows = rows.filter((item) => String(item.patient_id) === String(patient.patient_id || patient.id));
  if (role === 'doctor' && ['appointments', 'records'].includes(kind)) rows = rows.filter((item) => String(item.doctor_id) === String(doctor.doctor_id || doctor.id) || !item.doctor_id);
  if (/archives/.test(route)) return rows.filter((item) => item.archived);
  rows = rows.filter((item) => !item.archived);
  if (/verify-patient/.test(route)) rows = rows.filter((item) => /pending|unverified/i.test(item.verification_status || item.status));
  if (/approval-of-appointment/.test(route)) rows = rows.filter((item) => /pending/i.test(item.status));
  if (/appointment-history/.test(route)) rows = rows.filter((item) => /completed|rejected|cancelled/i.test(item.status));
  if (dashboard) rows = rows.slice(0, 5);
  return rows;
}
function cellValue(heading, item, kind, index) {
  const key = normalize(heading);
  if (key === '') return '';
  if (/timestamp|created|dateandtime|datetime|paymenttimestamp|datetime/.test(key)) return field(item, 'payment_timestamp', 'timestamp', 'created_at', 'date_time') || `${item.date || today} ${item.time || '09:00'}`;
  if (key === 'aid' || key === 'appointmentid') return field(item, 'appointment_id', 'id');
  if (/doctor/.test(key)) return field(item, 'doctor', 'doctor_name') || fullName(doctor);
  if (/patientdetails|patientname/.test(key)) return item.patient_name || fullName(item);
  if (/patienttype/.test(key)) return item.patient_type || 'Regular';
  if (/paymentmethod/.test(key)) return item.payment_method || 'Cash';
  if (/paymentstatus/.test(key)) return item.payment_status || item.status || 'Pending';
  if (/status/.test(key)) return item.verification_status || item.status || 'Available';
  if (/totalamount|paidamount|price|subtotal|amount/.test(key)) return money(field(item, key === 'paidamount' ? 'paid_amount' : 'total_amount', 'service_price', 'treatment_price', 'price', 'amount'));
  if (/reference/.test(key)) return field(item, 'reference_number', 'reference_no', 'billing_id', 'id');
  if (/serviceid/.test(key)) return item.service_id || item.id;
  if (/treatmentid/.test(key)) return item.treatment_id || item.id;
  if (/userid/.test(key)) return item.user_id || item.id;
  if (/resulttype/.test(key)) return field(item, index === 2 ? 'remarks' : 'result_type', 'service_name', 'name') || 'Sample result';
  if (/files|file/.test(key)) return 'View sample';
  if (/category/.test(key)) return item.service_category || item.treatment_category || item.category;
  if (/username/.test(key)) return item.username;
  if (/role/.test(key)) return item.user_role || item.role;
  if (/purpose/.test(key)) return item.purpose || 'Sample consultation';
  if (/consultation/.test(key)) return item.consultation_type || 'Appointment';
  if (/branch/.test(key)) return item.clinic_branch || item.branch || 'Pasig';
  if (/time/.test(key)) return item.time || item.appointment_time || '09:00';
  if (/date/.test(key)) return item.date || item.appointment_date || item.date_time?.slice(0, 10) || today;
  if (/action|activity/.test(key)) return item.action || 'View details';
  if (/age/.test(key)) return item.age;
  if (/email/.test(key)) return item.email;
  if (/name/.test(key)) return field(item, 'service_name', 'treatment_name', 'full_name', 'name', 'patient_name') || fullName(item);
  if (/^id$/.test(key)) return field(item, 'patient_id', 'id');
  return field(item, heading.toLowerCase().replace(/ /g, '_')) || '—';
}
function attachRow(row, item, kind) {
  recordRows.set(row, { item, kind }); row.dataset.demoRecord = String(item.id || item.patient_id || item.appointment_id || 'sample');
  row.tabIndex = 0; row.setAttribute('role', 'button'); row.setAttribute('aria-label', `View ${fullName(item) || item.service_name || item.action || kind} details`);
}
const tableTemplates = [];
function prepareTables() {
  $$('.table-container').filter((container) => !container.closest('.modal') && !$('.table', container) && $('.table-head')).forEach((container) => {
    const table = document.createElement('div'); table.className = 'table'; container.append(table);
  });
  $$('.table').filter((element) => !element.closest('.modal') && !element.closest('#billing-table')).forEach((table) => {
    const prototype = $('.table-row:not(.table-head)', table)?.cloneNode(true);
    let headings = $$('.table-box .table-head .table-cell p').map((cell) => cell.textContent.trim());
    if (!headings.length) headings = $$('.table-head .table-cell p').map((cell) => cell.textContent.trim());
    if (!headings.length || !table.closest('.home-section')) return;
    tableTemplates.push({ table, prototype, headings, kind: kindForRoute() });
  });
}
function renderTables() {
  tableTemplates.forEach(({ table, prototype, headings, kind }) => {
    table.replaceChildren();
    const rows = rowsFor(kind);
    rows.forEach((item) => {
      const row = prototype?.cloneNode(true) || document.createElement('div'); row.className = 'table-row';
      if (!prototype) row.innerHTML = headings.map((_, index) => `<div class="table-cell ${['first-cell', 'second-cell', 'third-cell', 'fourth-cell', 'fifth-cell', 'six-cell', 'last-cell'][index] || ''}"><p></p></div>`).join('');
      const cells = $$('.table-cell', row);
      cells.forEach((cell, index) => {
        const existingButton = $('button', cell);
        cell.replaceChildren();
        if (!headings[index] && existingButton) {
          const button = document.createElement('button'); button.type = 'button'; button.className = existingButton.className; button.textContent = /archives/.test(route) ? 'Restore' : 'Archive'; button.dataset.demoAction = /archives/.test(route) ? 'restore' : 'archive'; cell.append(button);
        } else {
          const p = document.createElement('p'); p.textContent = cellValue(headings[index], item, kind, index); cell.append(p);
          if (/status/i.test(headings[index])) cell.classList.add(normalize(p.textContent));
        }
      });
      // The source data-* attributes describe the record shown by the original row.
      [...row.attributes].filter((attribute) => attribute.name.startsWith('data-')).forEach((attribute) => { row.removeAttribute(attribute.name); });
      Object.entries(item).filter(([, value]) => typeof value !== 'object').forEach(([key, value]) => row.setAttribute(`data-${key.replace(/_/g, '-')}`, String(value ?? '')));
      replaceMarkers(row, item); attachRow(row, item, kind); table.append(row);
    });
    if (!rows.length) { const empty = document.createElement('p'); empty.className = 'demo-empty'; empty.textContent = 'No sample records in this view.'; table.append(empty); }
  });
  applySearch();
}
function populateDashboard() {
  $$('article .num').forEach((number) => {
    const text = number.closest('article').textContent;
    number.textContent = /Patient/i.test(text) ? data.patients.filter((item) => !item.archived && /^verified$/i.test(item.verification_status)).length : /Appointment/i.test(text) ? rowsFor('appointments').length : /Doctor/i.test(text) ? data.doctors.length : data.staff.length;
  });
  $$('table').filter((table) => table.id !== 'billing-table' && !table.closest('.modal')).forEach((table) => {
    const headings = $$('th', table).map((cell) => cell.textContent.trim()); if (!headings.length) return;
    const name = `${table.id} ${table.className}`;
    const kind = /verifypa/.test(name) ? 'patients' : /actlog/.test(name) ? 'activity' : /billing|payment/.test(name) ? 'bills' : /my-records/.test(name) ? 'results' : 'appointments';
    $$('tr', table).filter((row) => !$('th', row)).forEach((row) => row.remove());
    let rows = rowsFor(kind, true);
    if (table.id === 'tb_appointment') rows = rowsFor('appointments').filter((item) => item.date === today && /^approved$/i.test(item.status)).slice(0, 5);
    if (/appointment-history/.test(name)) rows = rowsFor('appointments').filter((item) => /completed|cancelled|rejected/i.test(item.status)).slice(0, 5);
    if (/approval/.test(name)) rows = data.appointments.filter((item) => /pending/i.test(item.status)).slice(0, 4);
    if (/verifypa/.test(name)) rows = data.patients.filter((item) => /pending|unverified/i.test(item.verification_status || item.status)).slice(0, 4);
    rows.forEach((item) => {
      const row = document.createElement('tr'); row.className = `row_${name.split(' ')[0]}`;
      headings.forEach((heading, index) => { const cell = document.createElement('td'); cell.className = 'title'; cell.textContent = cellValue(heading, item, kind, index); row.append(cell); });
      attachRow(row, item, kind); table.append(row);
    });
  });
}
function applySearch() {
  const value = normalize($('#search-input')?.value);
  $$('[data-demo-record]').forEach((row) => { row.hidden = value ? !normalize(row.textContent).includes(value) : false; });
}
function optionList(select, rows, getLabel = fullName, getValue = (item) => item.id, placeholder = 'Select an option') {
  if (!select) return;
  select.replaceChildren();
  const first = document.createElement('option'); first.value = ''; first.textContent = placeholder; first.disabled = true; first.selected = true; select.append(first);
  rows.filter((item) => !item.archived).forEach((item) => { const option = document.createElement('option'); option.value = String(getValue(item) ?? getLabel(item)); option.textContent = getLabel(item); select.append(option); });
}
function populateOptions() {
  $$('datalist').forEach((list) => {
    list.replaceChildren(); data.patients.filter((item) => !item.archived).forEach((item) => { const option = document.createElement('option'); option.value = fullName(item); list.append(option); });
  });
  $$('select').forEach((select) => {
    const identity = `${select.id} ${select.name}`;
    if (/^list\b|^doctor\b|doctor_id|doctorname/.test(identity)) optionList(select, data.doctors, (item) => `${fullName(item)}${$('#calendar') ? ` — ${item.specialization || 'Family Medicine'}` : ''}`, (item) => item.doctor_id || item.id, 'Select Doctor');
    else if (select.id === 'category-p' || (select.id === 'category-t' && /billing/.test(route)) || select.id === 'patientlist') optionList(select, data.patients, fullName, (item) => item.patient_id || item.id, 'Choose Patient');
    else if (/treatmentSelect/.test(identity)) optionList(select, data.treatments, (item) => `${item.treatment_name || item.name} — ${money(item.price || item.treatment_price)}`, (item) => item.id, 'Choose Treatment');
    else if (/diagnosticsSelect|resulttypelist/.test(identity)) optionList(select, data.services, (item) => item.service_name || item.name, (item) => item.id, 'Choose Service');
    else if (/category-s|category-t/.test(identity)) {
      const source = /treatment/.test(route) ? data.treatments : data.services;
      const categories = [...new Set(source.map((item) => item.category || item.service_category || item.treatment_category))];
      optionList(select, categories.map((name) => ({ name, id: name })), (item) => item.name, (item) => item.id, 'Choose Category');
    }
  });
}

function closeModal() {
  if (!activeModal) return;
  activeModal.style.display = 'none'; activeModal.classList.remove('demo-open');
  if (activeModal.id === 'bpbmc-detail-modal') activeModal.remove();
  activeModal = null; lastFocus?.focus?.();
}
function openExisting(modal) {
  if (!modal) return;
  closeModal(); lastFocus = document.activeElement; activeModal = modal;
  modal.style.display = 'block'; modal.classList.add('demo-open'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  const title = $('h2,label', modal); modal.setAttribute('aria-label', title?.textContent || 'Sample form');
  if (!$('.close,.closee,.demo-dialog-close', modal)) { const close = document.createElement('button'); close.type = 'button'; close.className = 'demo-dialog-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Close dialog'); $('.modal-content,.modal-content-a', modal)?.prepend(close); }
  $('input:not([type=hidden]),select,button', modal)?.focus();
}
function details(item, kind) {
  closeModal(); lastFocus = document.activeElement;
  const modal = document.createElement('div'); modal.id = 'bpbmc-detail-modal'; modal.className = 'modal demo-detail-modal';
  const titles = { patients: 'Patient Details', accounts: 'Account Details', appointments: 'Appointment Details', records: 'Medical Record Details', results: 'Medical Result Details', bills: 'Billing Details', activity: 'Activity Details', services: 'Diagnostic Service Details', treatments: 'Medical Treatment Details' };
  const keys = {
    patients: ['patient_id', 'full_name', 'age', 'birthdate', 'sex', 'patient_type', 'email', 'contact_number', 'verification_status'],
    accounts: ['user_id', 'full_name', 'username', 'email', 'role', 'clinic_branch'],
    appointments: ['appointment_id', 'patient_name', 'patient_type', 'doctor', 'specialization', 'clinic_branch', 'date', 'time', 'status', 'concern'],
    records: ['patient_name', 'purpose', 'consultation_type', 'clinic_branch', 'date_time', 'doctor', 'weight', 'height', 'blood_pressure', 'body_temperature', 'notes', 'clinicnotes'],
    results: ['patient_name', 'result_type', 'clinic_branch', 'date_time', 'remarks', 'doctor'],
    bills: ['billing_id', 'patient_name', 'total_amount', 'paid_amount', 'payment_method', 'payment_status', 'created_at'],
    services: ['service_id', 'service_name', 'category', 'service_price'], treatments: ['treatment_id', 'treatment_name', 'category', 'treatment_price'], activity: ['timestamp', 'action', 'user_id'],
  };
  const values = keys[kind].map((key) => [key, item[key] ?? (key === 'full_name' ? fullName(item) : key === 'clinicnotes' ? item.ClinicNotes : key === 'category' ? item.service_category || item.treatment_category : undefined)]).filter(([, value]) => value !== undefined);
  modal.innerHTML = `<div class="modal-content"><button type="button" class="demo-dialog-close" aria-label="Close dialog">×</button><h2 class="modal-title">${titles[kind]}</h2><p class="demo-sample-note">Fictional record · portfolio demonstration</p><dl class="demo-details">${values.map(([key, value]) => `<div><dt>${esc(key.replace(/_/g, ' '))}</dt><dd>${esc(/amount|price/.test(key) ? money(value) : value)}</dd></div>`).join('')}</dl><div class="demo-actions"></div></div>`;
  document.body.append(modal); const actions = $('.demo-actions', modal);
  function action(text, callback, secondary = false) { const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.className = secondary ? 'demo-secondary' : ''; button.addEventListener('click', callback); actions.append(button); }
  function update(message) { log(message); closeModal(); renderTables(); populateDashboard(); notify(`${message} Sample data resets when you reload the showcase.`); }
  if (kind === 'appointments' && !/patient/.test(role) && /pending/i.test(item.status)) {
    action('Approve appointment', () => { item.status = 'Approved'; update('Appointment approved.'); });
    action('Reject request', () => { item.status = 'Rejected'; update('Appointment rejected.'); }, true);
  } else if (kind === 'appointments' && role !== 'patient' && /approved/i.test(item.status)) action('Mark completed', () => { item.status = 'Completed'; update('Appointment marked completed.'); });
  if (kind === 'patients' && /pending|unverified/i.test(item.verification_status || item.status)) action('Verify sample account', () => { item.verification_status = 'Verified'; item.status = 'Verified'; update('Sample patient verified.'); });
  if (kind === 'bills' && role !== 'patient' && !/paid/i.test(item.payment_status)) action('Simulate payment', () => { item.payment_status = 'Paid'; item.status = 'Paid'; item.paid_amount = item.total_amount; item.payment_method = 'Cash'; item.payment_timestamp = `${today} 10:30`; update('Sample payment recorded.'); });
  if (['services', 'treatments', 'patients', 'accounts'].includes(kind) && role !== 'patient') action(item.archived ? 'Restore sample' : 'Archive sample', () => { item.archived = !item.archived; update(item.archived ? 'Sample archived.' : 'Sample restored.'); }, true);
  if (kind === 'results' || kind === 'bills' || kind === 'records') action('Download sample', () => download(`${kind}-sample.txt`, `FICTIONAL PORTFOLIO SAMPLE — NOT A MEDICAL DOCUMENT\n\n${values.map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join('\n')}\n\nOriginal files and patient information are not included.`), true);
  action('Close', closeModal, true); openExisting(modal);
}
function download(filename, contents, mime = 'text/plain;charset=utf-8') {
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([contents], { type: mime })); link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}
function exportSamples() {
  const kind = kindForRoute(); const rows = rowsFor(kind); const keys = ['id', 'patient_name', 'name', 'date', 'time', 'status', 'action', 'total_amount'].filter((key) => rows.some((item) => item[key] !== undefined));
  const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  download(`bpbmc-${kind}-fictional.csv`, ['FICTIONAL PORTFOLIO DEMONSTRATION', keys.map(quote).join(','), ...rows.map((item) => keys.map((key) => quote(item[key])).join(','))].join('\r\n'), 'text/csv;charset=utf-8');
  notify('Downloaded fictional sample records.');
}

let selectedDate = '';
let calendarMonth = new Date(`${today}T12:00:00`);
function renderCalendar() {
  const calendar = $('#calendar'); if (!calendar) return;
  calendar.replaceChildren(); $('#monthYear').textContent = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  for (let index = 0; index < offset; index++) { const space = document.createElement('div'); space.className = 'day empty'; calendar.append(space); }
  for (let number = 1; number <= new Date(year, month + 1, 0).getDate(); number++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(number).padStart(2, '0')}`;
    const day = document.createElement('button'); day.type = 'button'; day.className = `day${iso < today ? ' past' : ''}${iso === selectedDate ? ' selected' : ''}`; day.textContent = String(number);
    day.disabled = iso < today; day.setAttribute('aria-label', new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'full' })); day.setAttribute('aria-pressed', String(iso === selectedDate));
    day.addEventListener('click', () => { selectedDate = iso; $('#selectedDateInput').value = iso; renderCalendar(); renderTimes(); }); calendar.append(day);
  }
}
function renderTimes() {
  const list = $('#timeSlotList'); if (!list) return; list.replaceChildren();
  const doctorId = $('#list')?.value;
  if (!selectedDate || !doctorId) { const note = document.createElement('p'); note.className = 'demo-calendar-note'; note.textContent = 'Choose a date and doctor to see sample times.'; list.append(note); return; }
  const selectedDoctor = data.doctors.find((item) => String(item.doctor_id || item.id) === doctorId) || doctor;
  const doctorInput = $('[name="doctor"]'); if (doctorInput) doctorInput.value = fullName(selectedDoctor);
  const specialization = $('[name="specialization"]'); if (specialization) specialization.value = selectedDoctor.specialization || 'Family Medicine';
  ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00'].forEach((time) => {
    const label = document.createElement('label'); label.className = 'time-slot-button'; label.textContent = time;
    const radio = document.createElement('input'); radio.type = 'radio'; radio.className = 'time-slot-radio'; radio.name = 'timeSlot'; radio.value = time;
    radio.disabled = data.appointments.some((item) => item.date === selectedDate && item.time === time && String(item.doctor_id) === doctorId && !/rejected|cancelled/i.test(item.status));
    if (radio.disabled) { label.classList.add('demo-unavailable'); label.title = 'Reserved in the fictional schedule'; }
    radio.addEventListener('change', () => { $$('.time-slot-button').forEach((item) => item.classList.remove('selected')); label.classList.add('selected'); $('#selectedTimeInput').value = time; });
    label.append(radio); list.append(label);
  });
}
function submitAppointment(form) {
  const values = new FormData(form);
  const chosenPatient = role === 'patient' ? patient : data.patients.find((item) => fullName(item) === values.get('patient_name') || fullName(item) === values.get('patientname'));
  const doctorId = values.get('list') || values.get('doctor_id');
  const chosenDoctor = data.doctors.find((item) => String(item.doctor_id || item.id) === doctorId);
  const date = values.get('selected_date') || values.get('appointmentdate');
  const time = values.get('selected_time') || values.get('time');
  const branch = values.get('clinic_branch') || values.get('clinicbranch');
  if (!chosenPatient || !chosenDoctor || !date || !time || !branch || branch === 'none') { notify('Choose a sample patient, doctor, date, time, and clinic branch.'); return; }
  const id = Math.max(0, ...data.appointments.map((item) => Number(item.id || item.appointment_id) || 0)) + 1;
  data.appointments.unshift({ id, appointment_id: id, patient_id: chosenPatient.patient_id || chosenPatient.id, patient_name: fullName(chosenPatient), patient_type: chosenPatient.patient_type, email: chosenPatient.email, doctor: fullName(chosenDoctor), doctor_id: chosenDoctor.doctor_id || chosenDoctor.id, specialization: chosenDoctor.specialization, clinic_branch: branch, date: String(date), time: String(time), status: role === 'patient' ? 'Pending' : 'Approved', concern: values.get('concern') || 'Fictional appointment demonstration' });
  log('Added fictional appointment'); notify('Sample appointment added. No message was sent and no real appointment was booked.');
  if (activeModal) { closeModal(); renderTables(); }
  else setTimeout(() => navigate(role === 'patient' ? 'main-patient' : `main-${role}-${role === 'doctor' ? 'appointment-list' : 'calendar-of-appointment'}`), 900);
}

let billItems = [];
function renderBillItems() {
  const table = $('#billing-table'); if (!table) return;
  const body = $('tbody', table); body.replaceChildren();
  billItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${esc(item.name)}</td><td>${item.kind === 'treatments' ? '✓' : ''}</td><td>${item.kind === 'services' ? '✓' : ''}</td><td>${money(item.price)}</td><td><input aria-label="Discount for ${esc(item.name)}" type="number" min="0" max="100" value="${item.discount}" class="demo-discount" data-item="${index}"></td><td>${money(item.price * (1 - item.discount / 100))}</td><td><button type="button" class="demo-remove-item" data-item="${index}" aria-label="Remove ${esc(item.name)}">×</button></td>`;
    body.append(row);
  });
  $('#total-amount').textContent = billItems.reduce((total, item) => total + item.price * (1 - item.discount / 100), 0).toFixed(2);
}
function addBillChooser() {
  closeModal(); const modal = document.createElement('div'); modal.id = 'bpbmc-detail-modal'; modal.className = 'modal demo-detail-modal';
  modal.innerHTML = '<div class="modal-content"><button type="button" class="demo-dialog-close" aria-label="Close dialog">×</button><h2>Select Treatment or Diagnostic Service</h2><p class="demo-sample-note">Fictional catalog and demonstration prices</p><div class="demo-catalog"></div></div>';
  document.body.append(modal);
  ['services', 'treatments'].forEach((kind) => data[kind].filter((item) => !item.archived).forEach((item) => {
    const name = item.service_name || item.treatment_name || item.name, price = Number(item.service_price || item.treatment_price || item.price);
    const button = document.createElement('button'); button.type = 'button'; button.textContent = `${name} — ${money(price)}`;
    button.addEventListener('click', () => { billItems.push({ name, price, kind, discount: 0 }); closeModal(); renderBillItems(); }); $('.demo-catalog', modal).append(button);
  })); openExisting(modal);
}
function submitBilling(form) {
  const chosen = data.patients.find((item) => String(item.patient_id || item.id) === ($('#category-p')?.value || $('#category-t')?.value));
  if (!chosen || !billItems.length) { notify('Choose a sample patient and add at least one service or treatment.'); return; }
  const total = billItems.reduce((sum, item) => sum + item.price * (1 - item.discount / 100), 0), id = Date.now();
  data.bills.unshift({ id, billing_id: id, patient_id: chosen.patient_id || chosen.id, patient_name: fullName(chosen), patient_email: chosen.email, total_amount: total, paid_amount: 0, payment_method: 'Cash', payment_status: 'Pending', created_at: `${today} 10:30`, items: billItems.map((item) => ({ ...item })) });
  billItems = []; renderBillItems(); log('Created fictional billing entry'); notify('Sample bill created. Open Patient Monitoring to simulate payment.');
}

function submitForm(form) {
  if (form.id === 'appointmentForm' || form.id === 'addAppointmentForm') return submitAppointment(form);
  if ($('#billing-table', form)) return submitBilling(form);
  const values = Object.fromEntries(new FormData(form));
  Object.keys(values).filter((key) => /password|token|id_image/i.test(key)).forEach((key) => delete values[key]);
  const text = normalize(`${form.textContent} ${form.dataset.demoAction || ''}`);
  if (role === 'public' && /login|signin/.test(text)) { navigate(route === 'patient' ? 'main-patient' : 'main-admin'); return; }
  if (role === 'public' && /register|create|signup/.test(text)) { navigate('main-patient'); notify('Opened the fictional patient account.'); return; }
  if (/uploadmedicalresult/.test(text) || form.closest('#uploadmodal')) {
    const chosen = data.patients.find((item) => String(item.id || item.patient_id) === values.patientlist) || patient;
    const selectedService = data.services.find((item) => String(item.id) === values.resulttypelist);
    data.results.unshift({ id: Date.now(), patient_id: chosen.patient_id || chosen.id, patient_name: fullName(chosen), result_type: selectedService?.service_name || 'Sample result', clinic_branch: 'Pasig', date_time: `${today} 10:30`, remarks: values.remarks || 'Fictional result demonstration. No file uploaded.' });
  } else if (/service|treatment/.test(text) && (values['price-s'] || values['price-t'])) {
    const kind = /treatment/.test(route) ? 'treatments' : 'services', prefix = kind === 'services' ? 'service' : 'treatment';
    const name = values.serviceCategory || values.treatmentCategory || values[`${prefix}Name`] || values['name-s'] || values['name-t'] || 'Demo catalog item';
    const category = values['category-s'] || values['category-t'] || 'Sample category', price = Number(values['price-s'] || values['price-t']);
    data[kind].push({ id: Date.now(), [`${prefix}_id`]: Date.now(), name, [`${prefix}_name`]: name, category, [`${prefix}_category`]: category, price, [`${prefix}_price`]: price });
  } else if (/category/.test(text) && (values.serviceCategory || values.treatmentCategory)) {
    notify('Sample category entered. Categories in this demonstration come from the sample catalog.'); closeModal(); return;
  } else if (values.first_name && values.last_name) {
    const name = [values.first_name, values.middle_name, values.last_name].filter(Boolean).join(' '), id = Date.now();
    data.patients.push({ ...values, id, patient_id: id, name, full_name: name, patient_name: name, age: values.birthdate ? new Date().getFullYear() - Number(values.birthdate.slice(0, 4)) : 25, verification_status: 'Verified', patient_type: values.patient_type || 'Regular' });
  } else if (/addaccount/.test(text) && (values['username-a'] || values.username)) {
    const id = Date.now(), name = [values['firstname-a'] || values['first_name-a'], values['lastname-a'] || values['last_name-a']].filter(Boolean).join(' ') || 'Demo Clinic Account';
    data.accounts.push({ id, user_id: id, full_name: name, name, username: values['username-a'] || values.username, role: values['role-a'] || 'Staff', email: values['email-a'] || 'new.account@bpbmc.example', clinic_branch: values['branch-a'] || 'Pasig' });
  } else if (values.purpose && values.patient_name) {
    const chosen = data.patients.find((item) => fullName(item) === values.patient_name) || patient;
    data.records.unshift({ ...values, id: Date.now(), patient_id: chosen.patient_id || chosen.id, patient_name: fullName(chosen), date_time: `${today} 10:30`, doctor_id: doctor.doctor_id || doctor.id });
  } else {
    notify(/password|forgot/.test(text) ? 'Password and email services are simulated. No account credentials were changed.' : 'Sample changes saved for this demonstration. No backend request was sent.'); closeModal(); return;
  }
  log('Updated fictional demo records'); closeModal(); renderTables(); populateDashboard(); populateOptions(); notify('Sample record saved. It resets when you reload the showcase.');
  form.reset();
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null; if (!target) return;
  const calendarNavigation = target.closest('#prevMonth,#nextMonth');
  if (calendarNavigation) { event.preventDefault(); calendarMonth.setMonth(calendarMonth.getMonth() + (calendarNavigation.id === 'nextMonth' ? 1 : -1)); renderCalendar(); return; }
  const sampleDocument = target.closest('[data-demo-action="sample-document"],[data-demo-action="simulation"]');
  if (sampleDocument) { event.preventDefault(); notify('This action is simulated. Original private documents and backend services are not included.'); return; }
  const link = target.closest('a[data-demo-route]');
  if (link) { event.preventDefault(); navigate(link.dataset.demoRoute); return; }
  const hrefLink = target.closest('a[href]');
  if (hrefLink?.getAttribute('href').startsWith('#') && !hrefLink.getAttribute('href').startsWith('#/')) {
    const section = document.getElementById(hrefLink.getAttribute('href').slice(1));
    if (section) { event.preventDefault(); section.scrollIntoView({ behavior: 'smooth' }); $('#nav-menu')?.classList.remove('show-menu'); return; }
  }
  if (hrefLink && /\.php|^#\//.test(hrefLink.getAttribute('href'))) { event.preventDefault(); navigate(hrefLink.dataset.demoRoute || hrefLink.getAttribute('href')); return; }
  if (target.closest('.navbar .bx-menu')) { $('.sidebar')?.classList.toggle('close'); return; }
  if (target.closest('#nav-btns-open')) { $('#nav-menu')?.classList.add('show-menu'); return; }
  if (target.closest('#nav-close')) { $('#nav-menu')?.classList.remove('show-menu'); return; }
  if (target.closest('[data-toggle="dropdown"]')) { const button = target.closest('[data-toggle="dropdown"]'); const menu = $('.dropdown-menu', button.parentElement); menu?.classList.toggle('show'); button.setAttribute('aria-expanded', String(menu?.classList.contains('show'))); return; }
  const dropdown = target.closest('.sidebar .dropdown'); if (dropdown) { dropdown.parentElement.classList.toggle('showMenu'); return; }
  const accordion = target.closest('button.accordion'); if (accordion) { accordion.classList.toggle('active'); accordion.setAttribute('aria-expanded', String(accordion.classList.contains('active'))); const panel = accordion.nextElementSibling; panel.style.display = panel.style.display === 'block' ? 'none' : 'block'; return; }
  if (target.closest('.demo-dialog-close,.modal .close,.modal .closee,.modal-a .close,#closeModal,#closePopup,#close-category,#closeTreatmentModal,#closeDiagnosticsModal')) { closeModal(); return; }
  if (activeModal && target === activeModal) { closeModal(); return; }
  const row = target.closest('[data-demo-record]');
  if (row) {
    event.preventDefault(); const record = recordRows.get(row); if (!record) return;
    if (target.closest('[data-demo-action="archive"],[data-demo-action="restore"]')) { record.item.archived = !record.item.archived; log('Archived or restored sample record'); renderTables(); notify('Sample catalog updated. Reload resets the demonstration.'); }
    else details(record.item, record.kind); return;
  }
  const button = target.closest('button,input[type="button"],input[type="submit"],a'); if (!button) return;
  const id = button.id;
  if (id === 'prevMonth' || id === 'nextMonth') { event.preventDefault(); calendarMonth.setMonth(calendarMonth.getMonth() + (id === 'nextMonth' ? 1 : -1)); renderCalendar(); return; }
  if (id === 'open-popup') {
    const modal = $('#addServiceModal,#addTreatmentModal,#addAccountModal,#uploadmodal,#addAppointmentModal');
    if (modal) { event.preventDefault(); openExisting(modal); } return;
  }
  if (id === 'open-category') { event.preventDefault(); openExisting($('#addCategory')); return; }
  if (id === 'add-item') { event.preventDefault(); addBillChooser(); return; }
  if (button.classList.contains('demo-remove-item')) { billItems.splice(Number(button.dataset.item), 1); renderBillItems(); return; }
  if (button.closest('#appointmentForm') && /submit/i.test(button.textContent || button.value)) { event.preventDefault(); submitAppointment(button.closest('form')); return; }
  if (/backup|restore|download|export|print/i.test(`${button.id} ${button.textContent} ${button.getAttribute('href') || ''}`) && !button.closest('.sidebar') && !button.closest('.demo-detail-modal')) { event.preventDefault(); exportSamples(); return; }
  if (button.matches('a[href]') && /PDF_|upload|patient_id|javascript:/.test(button.getAttribute('href'))) { event.preventDefault(); notify('Original private documents are excluded. Open a fictional record to download a sample.'); return; }
  if (button.type === 'button' && /save|update|submit/i.test(button.textContent) && button.closest('form')) { event.preventDefault(); submitForm(button.closest('form')); }
});
document.addEventListener('submit', (event) => { event.preventDefault(); submitForm(event.target); });
document.addEventListener('input', (event) => {
  if (event.target.id === 'search-input') applySearch();
  if (event.target.classList.contains('demo-discount')) { billItems[Number(event.target.dataset.item)].discount = Math.max(0, Math.min(100, Number(event.target.value))); const focusIndex = event.target.dataset.item; renderBillItems(); $(`.demo-discount[data-item="${focusIndex}"]`)?.focus(); }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'list' && $('#calendar')) { if ($('#selectedTimeInput')) $('#selectedTimeInput').value = ''; renderTimes(); }
  if (event.target.type === 'file') { $('#selected-file-name')?.replaceChildren(document.createTextNode('File selected locally — no upload is made')); }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-demo-record]')) { event.preventDefault(); const record = recordRows.get(event.target); if (record) details(record.item, record.kind); }
  if (event.key === 'Tab' && activeModal) {
    const focusable = $$('a[href],button,input:not([type="hidden"]),select,textarea,[tabindex="0"]', activeModal).filter((element) => !element.disabled && element.offsetParent !== null);
    if (!focusable.length) return; const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function clock() {
  const now = new Date(); const values = { day: now.toLocaleDateString('en-US', { weekday: 'long' }), daynum: now.getDate(), month: now.toLocaleDateString('en-US', { month: 'long' }), year: now.getFullYear() };
  Object.entries(values).forEach(([key, value]) => { if ($(`#${key}`)) $(`#${key}`).textContent = value; });
  if ($('.display-time')) $('.display-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
prepareTables();
replaceMarkers();
renderTables(); populateDashboard(); populateOptions(); renderCalendar(); renderTimes(); renderBillItems(); clock();
setInterval(clock, 30000);
$$('.successmessage,.errormessage').forEach((element) => { if (!element.textContent.trim() || /^(Demo\s*)+$/.test(element.textContent.trim())) element.hidden = true; });
$$('input[type="password"]').forEach((input) => { input.autocomplete = 'off'; input.placeholder = 'Demonstration only'; });
$$('input[type="hidden"][required],input[style*="display: none"][required]').forEach((input) => { input.required = false; });
$$('.error-message,.success-message').forEach((element) => { if (!element.textContent.trim()) element.hidden = true; });
if (role === 'public' && /^(clinic|patient)$/.test(route)) {
  const identityInput = $('input[name="user_id"],input[type="email"]');
  if (identityInput) identityInput.value = route === 'clinic' ? '301' : patient.email;
  const passwordInput = $('input[type="password"]'); if (passwordInput) passwordInput.value = 'demo-preview';
}
if (window.Swiper && $('.slide-content > .swiper-wrapper')) new window.Swiper('.slide-content', { slidesPerView: 3, spaceBetween: 25, loop: true, grabCursor: true, breakpoints: { 0: { slidesPerView: 1 }, 520: { slidesPerView: 2 }, 950: { slidesPerView: 3 } }, pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true }, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' } });
document.body.dataset.demoReady = 'true';
