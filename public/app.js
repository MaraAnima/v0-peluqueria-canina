// ==================== DATA ====================
const CATEGORIES = [
  { id: 'pelo-corto', name: 'Pelo corto', image: 'images/pelo-corto.jpg' },
  { id: 'pelo-largo', name: 'Pelo largo', image: 'images/pelo-largo.jpg' }
];

// Tipos de servicio
const SERVICE_TYPES = [
  { id: 'bano', name: 'Baño', description: 'Baño completo con secado' },
  { id: 'bano-corte', name: 'Baño y corte', description: 'Baño completo + corte de pelo' },
  { id: 'bano-esquila', name: 'Baño y esquila', description: 'Baño completo + esquila' },
  { id: 'bano-deslanado', name: 'Baño y Deslanado', description: 'Baño completo + deslanado (2 h extra)' }
];

// Tamaños con precios base
// Nota: los precios de "Baño y Deslanado" ya incluyen el costo del deslanado (+$1200 sobre el baño).
const SIZES = [
  // Pelo corto - Baño
  { id: 'bano-rp', size: 'RP', description: 'Hasta 10 kg', duration: '1 h', price: 720, categoryId: 'pelo-corto', serviceTypeId: 'bano' },
  { id: 'bano-rm', size: 'RM', description: '10 kg a 20 kg', duration: '1 h', price: 910, categoryId: 'pelo-corto', serviceTypeId: 'bano' },
  { id: 'bano-rg', size: 'RG', description: '20 kg o más', duration: '1 h 15 min', price: 1280, categoryId: 'pelo-corto', serviceTypeId: 'bano' },
  // Pelo corto - Baño y corte
  { id: 'bano-corte-rp', size: 'RP', description: 'Hasta 10 kg', duration: '1 h 30 min', price: 875, categoryId: 'pelo-corto', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-rm', size: 'RM', description: '10 kg a 20 kg', duration: '1 h 30 min', price: 1050, categoryId: 'pelo-corto', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-rg', size: 'RG', description: '20 kg o más', duration: '2 h', price: 1515, categoryId: 'pelo-corto', serviceTypeId: 'bano-corte' },
  // Pelo corto - Baño y esquila
  { id: 'bano-esquila-rp', size: 'RP', description: 'Hasta 10 kg', duration: '1 h 30 min', price: 770, categoryId: 'pelo-corto', serviceTypeId: 'bano-esquila' },
  { id: 'bano-esquila-rm', size: 'RM', description: '10 kg a 20 kg', duration: '1 h 30 min', price: 925, categoryId: 'pelo-corto', serviceTypeId: 'bano-esquila' },
  { id: 'bano-esquila-rg', size: 'RG', description: '20 kg o más', duration: '2 h', price: 1335, categoryId: 'pelo-corto', serviceTypeId: 'bano-esquila' },
  // Pelo corto - Baño y Deslanado (precio = baño + $1200). corteRazaPrice lleva al precio "baño y corte + deslanado".
  { id: 'bano-deslanado-rp', size: 'RP', description: 'Hasta 10 kg', duration: '1 h', price: 1920, corteRazaPrice: 155, categoryId: 'pelo-corto', serviceTypeId: 'bano-deslanado' },
  { id: 'bano-deslanado-rm', size: 'RM', description: '10 kg a 20 kg', duration: '1 h', price: 2110, corteRazaPrice: 140, categoryId: 'pelo-corto', serviceTypeId: 'bano-deslanado' },
  { id: 'bano-deslanado-rg', size: 'RG', description: '20 kg o más', duration: '1 h 15 min', price: 2480, corteRazaPrice: 235, categoryId: 'pelo-corto', serviceTypeId: 'bano-deslanado' },
  // Pelo largo - Baño
  { id: 'bano-rp-largo', size: 'RP', description: 'Hasta 10 kg', duration: '1 h', price: 795, categoryId: 'pelo-largo', serviceTypeId: 'bano' },
  { id: 'bano-rm-largo', size: 'RM', description: '10 kg a 20 kg', duration: '1 h', price: 960, categoryId: 'pelo-largo', serviceTypeId: 'bano' },
  { id: 'bano-rg-largo', size: 'RG', description: '20 kg o más', duration: '1 h 15 min', price: 1320, categoryId: 'pelo-largo', serviceTypeId: 'bano' },
  // Pelo largo - Baño y corte
  { id: 'bano-corte-rp-largo', size: 'RP', description: 'Hasta 10 kg', duration: '1 h 30 min', price: 975, categoryId: 'pelo-largo', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-rm-largo', size: 'RM', description: '10 kg a 20 kg', duration: '1 h 30 min', price: 1210, categoryId: 'pelo-largo', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-rg-largo', size: 'RG', description: '20 kg o más', duration: '2 h', price: 1665, categoryId: 'pelo-largo', serviceTypeId: 'bano-corte' },
  // Pelo largo - Baño y esquila
  { id: 'bano-esquila-rp-largo', size: 'RP', description: 'Hasta 10 kg', duration: '1 h 30 min', price: 860, categoryId: 'pelo-largo', serviceTypeId: 'bano-esquila' },
  { id: 'bano-esquila-rm-largo', size: 'RM', description: '10 kg a 20 kg', duration: '1 h 30 min', price: 1065, categoryId: 'pelo-largo', serviceTypeId: 'bano-esquila' },
  { id: 'bano-esquila-rg-largo', size: 'RG', description: '20 kg o más', duration: '2 h', price: 1465, categoryId: 'pelo-largo', serviceTypeId: 'bano-esquila' },
  // Pelo largo - Baño y Deslanado (precio = baño + $1200)
  { id: 'bano-deslanado-rp-largo', size: 'RP', description: 'Hasta 10 kg', duration: '1 h', price: 1995, corteRazaPrice: 180, categoryId: 'pelo-largo', serviceTypeId: 'bano-deslanado' },
  { id: 'bano-deslanado-rm-largo', size: 'RM', description: '10 kg a 20 kg', duration: '1 h', price: 2160, corteRazaPrice: 250, categoryId: 'pelo-largo', serviceTypeId: 'bano-deslanado' },
  { id: 'bano-deslanado-rg-largo', size: 'RG', description: '20 kg o más', duration: '1 h 15 min', price: 2520, corteRazaPrice: 345, categoryId: 'pelo-largo', serviceTypeId: 'bano-deslanado' }
];

// Deslanado: ahora es un tipo de servicio ("Baño y Deslanado").
// Mantiene el bloqueo de 2 horas extra (reserva el turno siguiente).
const DESLANADO_PRICE = 1200; // Costo del deslanado (ya incluido en el precio del servicio)
const DESLANADO_HOURS = 2;    // Duracion extra en horas que ocupa el turno
const DESLANADO_EXTRA_HALF_HOUR_PRICE = 300; // Costo por cada media hora extra

// Indica si el servicio seleccionado es "Baño y Deslanado"
function isDeslanado() {
  return bookingData.serviceType?.id === 'bano-deslanado';
}
const FREE_EXTRAS = [
  {
    id: 'perfume',
    name: 'Perfume',
    description: 'Toque final para que vuelva con olorcito rico.',
    priceLabel: 'Gratis',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 3h4v4h-4z"/>
        <path d="M9 7h6l1 3v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9z"/>
        <path d="M16 11h3"/>
        <path d="M19 9v4"/>
        <path d="M11 14h2"/>
      </svg>
    `
  },
  {
    id: 'corta-unas',
    name: 'Corta uñas',
    description: 'Corte básico de uñas durante el servicio.',
    priceLabel: 'Gratis',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="6" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M8.2 8.2 19 19"/>
        <path d="M8.2 15.8 19 5"/>
      </svg>
    `
  },
  {
    id: 'limpieza-oidos',
    name: 'Limpieza de oídos',
    description: 'Higiene suave de oídos incluida en el turno.',
    priceLabel: 'Gratis',
    icon: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3a6 6 0 0 0-6 6"/>
        <path d="M18 9a6 6 0 0 0-6-6"/>
        <path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4c0 4-4 4-4 8"/>
        <path d="M10 20h4"/>
      </svg>
    `
  }
];
const STEPS = [
  { id: 1, name: 'Contacto' },
  { id: 2, name: 'Categoría' },
  { id: 3, name: 'Servicio' },
  { id: 4, name: 'Tamaño' },
  { id: 5, name: 'Extra' },
  { id: 6, name: 'Hora' },
  { id: 7, name: 'Mascota' },
  { id: 8, name: 'Confirmar' }
];

// Horarios disponibles (deben coincidir con AppScript)
// Cada cita dura 2 horas, asi que los slots son cada 2 horas
const TIME_SLOTS = ['11:00', '13:00', '15:00', '17:00'];
const SLOT_DURATION_HOURS = 2; // Duracion de cada cita en horas

// URL del AppScript - REEMPLAZAR CON TU URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdcfBD_W1NE-3aAb56U8zHMK4Z1-psNVCuO-wZ0JticYW8xeUPFh1cPeanqsCamj18dA/exec';

// ==================== STATE ====================
let currentStep = 1;
let bookingData = {
  extraIds: [],
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  category: null,
  serviceType: null,
  size: null,
  corteRaza: false,
  date: null,
  time: null,
  petName: '',
  petNotes: ''
};

let currentMonth = new Date();

// ==================== MODAL FUNCTIONS ====================
function showModal(message, type = 'info', title = 'Aviso') {
  const modal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalIcon = document.getElementById('modal-icon');

  modalTitle.textContent = title;
  modalContent.textContent = message;
  modalContent.classList.remove('terms-content');

  // Reset icon classes
  modalIcon.className = 'modal-icon';

  // Set icon based on type
  if (type === 'error') {
    modalIcon.classList.add('error');
    modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`;
  } else if (type === 'warning') {
    modalIcon.classList.add('warning');
    modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`;
  } else {
    modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function showTermsModal(content, isLargeModal = false) {
  const modal = document.getElementById('custom-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const modalIcon = document.getElementById('modal-icon');
  const modalBox = modal.querySelector('.modal-container');

  modalTitle.textContent = 'Terminos y Condiciones';
  modalContent.innerHTML = content;
  modalContent.classList.add('terms-content');

  // Aplicar estilo grande para PDF embebido
  if (isLargeModal) {
    modalBox.style.maxWidth = '900px';
    modalBox.style.width = '95%';
    modalBox.style.maxHeight = '90vh';
  } else {
    modalBox.style.maxWidth = '';
    modalBox.style.width = '';
    modalBox.style.maxHeight = '';
  }

  modalIcon.className = 'modal-icon info';
  modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('custom-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', function (e) {
  const modal = document.getElementById('custom-modal');
  if (e.target === modal) {
    closeModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ==================== NAVIGATION ====================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function startBooking() {
  showScreen('booking-screen');
  currentStep = 1;
  renderStep();
}

function goBack() {
  if (currentStep > 1) {
    currentStep--;
    renderStep();
  } else {
    showScreen('home-screen');
  }
}

function nextStep() {
  if (currentStep < STEPS.length) {
    currentStep++;
    renderStep();
  }
}

function resetBooking() {
  currentStep = 1;
  bookingData = {
    extraIds: [],
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    category: null,
    serviceType: null,
    size: null,
    corteRaza: false,
    date: null,
    time: null,
    petName: '',
    petNotes: ''
  };
  showScreen('home-screen');
}

// ==================== RENDERING ====================
function renderStep() {
  renderProgressSteps();
  const content = document.getElementById('step-content');
  content.innerHTML = '';

  switch (currentStep) {
    case 1: renderContactStep(content); break;
    case 2: renderCategoryStep(content); break;
    case 3: renderServiceTypeStep(content); break;
    case 4: renderSizeStep(content); break;
    case 5: renderExtraStep(content); break;
    case 6: renderDateTimeStep(content); break;
    case 7: renderPetStep(content); break;
    case 8: renderSummaryStep(content); break;
  }

  // Animate
  content.style.animation = 'none';
  setTimeout(() => content.style.animation = 'fadeIn 0.4s ease', 10);
}

function renderProgressSteps() {
  const container = document.getElementById('progress-steps');

  // Get completed step values
  const completedValues = {
    1: bookingData.clientName || null,
    2: bookingData.category?.name || null,
    3: bookingData.serviceType?.name || null,
    4: bookingData.size?.size || null,
    5: currentStep > 5 ? (getSelectedExtrasText() || 'Sin extras') : null,
    6: bookingData.date && bookingData.time ? `${formatDate(bookingData.date)} ${bookingData.time}` : null,
    7: bookingData.petName || null
  };

  container.innerHTML = STEPS.map((step, i) => {
    const isCompleted = step.id < currentStep;
    const isActive = step.id === currentStep;
    let className = 'step-item';
    if (isActive) className += ' active';
    else if (isCompleted) className += ' completed';

    const completedValue = completedValues[step.id];

    const stepHtml = `
      <div class="${className}">
        <div class="step-item-content">
          <div class="step-header">
            ${isCompleted ? `
              <svg class="step-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ` : ''}
            <span class="step-name">${step.name}</span>
          </div>
          ${completedValue ? `<span class="step-value">${completedValue}</span>` : ''}
        </div>
      </div>
    `;

    // Add separator except for last item
    if (i < STEPS.length - 1) {
      return stepHtml + `
        <div class="step-separator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 6l6 6-6 6"/>
          </svg>
        </div>
      `;
    }
    return stepHtml;
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

// ==================== STEP 1: CONTACT ====================
function renderContactStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Hola! Empecemos</h2>
    <p class="step-subtitle">Contanos cómo podemos contactarte</p>
    
    <div class="form-group">
      <label class="form-label">Tu nombre <span style="color: #ef4444;">*</span></label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <input type="text" class="form-input" id="client-name" placeholder="Ej: María García (más de 3 letras, sin números)" value="${bookingData.clientName}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Tu teléfono <span style="color: #ef4444;">*</span></label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <input type="tel" class="form-input" id="client-phone" placeholder="Ej: 094719944 (mínimo 6 dígitos)" value="${bookingData.clientPhone}">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Tu email <span style="color: #ef4444;">*</span></label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <input type="email" class="form-input" id="client-email" placeholder="Ej: maria@correo.com" value="${bookingData.clientEmail}">
      </div>
      <p class="form-hint">Te enviaremos la confirmación y el ID de reserva a este correo.</p>
    </div>
    
    <button class="continue-btn" onclick="saveContactAndNext()">Continuar</button>
  `;
}

function saveContactAndNext() {
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const email = document.getElementById('client-email').value.trim();

  // Validacion del nombre
  if (!name) {
    showModal('El nombre es obligatorio', 'error', 'Campo requerido');
    return;
  }
  if (name.length <= 3) {
    showModal('El nombre debe tener más de 3 letras', 'error', 'Nombre invalido');
    return;
  }
  if (/\d/.test(name)) {
    showModal('El nombre no puede contener números', 'error', 'Nombre invalido');
    return;
  }

  // Validacion del telefono
  if (!phone) {
    showModal('El teléfono es obligatorio', 'error', 'Campo requerido');
    return;
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 6) {
    showModal('El teléfono debe tener al menos 6 dígitos', 'error', 'Teléfono invalido');
    return;
  }

  // Validacion del email
  if (!email) {
    showModal('El email es obligatorio', 'error', 'Campo requerido');
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showModal('Ingresa un email válido (ej: maria@correo.com)', 'error', 'Email invalido');
    return;
  }

  bookingData.clientName = name;
  bookingData.clientPhone = phone;
  bookingData.clientEmail = email;
  nextStep();
}

// ==================== STEP 2: CATEGORY ====================
function renderCategoryStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Tipo de pelo</h2>
    <p class="step-subtitle">Selecciona el tipo de pelo de tu mascota</p>
    
    <div class="selection-grid">
      ${CATEGORIES.map(cat => `
        <div class="selection-card ${bookingData.category?.id === cat.id ? 'selected' : ''}" onclick="selectCategory('${cat.id}')">
          <img src="${cat.image}" alt="${cat.name}">
          <h3>${cat.name}</h3>
        </div>
      `).join('')}
    </div>
  `;
}

function selectCategory(categoryId) {
  bookingData.category = CATEGORIES.find(c => c.id === categoryId);
  bookingData.serviceType = null; // Reset service type when category changes
  bookingData.size = null; // Reset size when category changes
  setTimeout(nextStep, 200);
}

// ==================== STEP 3: SERVICE TYPE ====================
function renderServiceTypeStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Tipo de servicio</h2>
    <p class="step-subtitle">Elige el servicio que necesitas</p>
    
    <div class="service-type-list">
      ${SERVICE_TYPES.map(serviceType => `
        <div class="service-type-card ${bookingData.serviceType?.id === serviceType.id ? 'selected' : ''}" onclick="selectServiceType('${serviceType.id}')">
          <div class="service-type-icon">
            ${serviceType.id === 'bano' ? `
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12h16M4 12a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2M4 12V8a4 4 0 0 1 4-4h.5"/>
                <circle cx="12" cy="8" r="2"/>
                <path d="M14 8h4"/>
              </svg>
            ` : serviceType.id === 'bano-deslanado' ? `
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 18c3-6 5-9 8-9s5 3 8 9"/>
                <path d="M8 15c1-2 2-3 4-3s3 1 4 3"/>
                <path d="M7 5c1 2 2.5 3 5 3s4-1 5-3"/>
                <path d="M12 8v4"/>
              </svg>
            ` : `
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="6" cy="6" r="3"/>
                <path d="M8.12 8.12L12 12"/>
                <path d="M20 4L8.12 15.88"/>
                <path d="M14.47 14.48L20 20"/>
                <path d="M8.12 8.12L6 14l6-2-3.88 3.88"/>
              </svg>
            `}
          </div>
          <div class="service-type-info">
            <h3>${serviceType.name}</h3>
            <p>${serviceType.description}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function selectServiceType(serviceTypeId) {
  bookingData.serviceType = SERVICE_TYPES.find(s => s.id === serviceTypeId);
  bookingData.size = null; // Reset size when service type changes
  bookingData.corteRaza = false; // El corte de raza solo aplica a "Baño y Deslanado"
  bookingData.time = null; // La disponibilidad horaria cambia segun el servicio

  // Al elegir "Baño y Deslanado" explicamos como funciona el precio y la duracion
  if (serviceTypeId === 'bano-deslanado') {
    showModal(
      `El deslanado tiene un precio base de $${DESLANADO_PRICE} e incluye ${DESLANADO_HOURS} horas de servicio. Según el estado del pelaje puede demorar más: por cada media hora extra corresponderan $${DESLANADO_EXTRA_HALF_HOUR_PRICE} adicionales.`,
      'info',
      'Sobre el Baño y Deslanado'
    );
  }

  setTimeout(nextStep, 200);
}

// ==================== STEP 4: SIZE ====================
function renderSizeStep(container) {
  const sizes = SIZES.filter(s =>
    s.categoryId === bookingData.category?.id &&
    s.serviceTypeId === bookingData.serviceType?.id
  );

  container.innerHTML = `
    <h2 class="step-title">Tamaño de tu mascota</h2>
    <p class="step-subtitle">Selecciona según el peso</p>
    
    <div class="service-list">
      ${sizes.map(size => `
        <div class="service-card ${bookingData.size?.id === size.id ? 'selected' : ''}" onclick="selectSize('${size.id}')">
          <div class="service-icon">
            <span style="font-size: 1.5rem; font-weight: bold; color: var(--primary-blue);">${size.size}</span>
          </div>
          <div class="service-info">
            <h3>${size.size === 'RP' ? 'Raza Pequeña' : size.size === 'RM' ? 'Raza Mediana' : 'Raza Grande'}</h3>
            <p>${size.description}</p>
            <div class="service-meta">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                ${size.duration}
              </span>
            </div>
          </div>
          <div class="service-price">$${size.price}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function selectSize(sizeId) {
  bookingData.size = SIZES.find(s => s.id === sizeId);
  setTimeout(nextStep, 200);
}

function calculateSubtotal() {
  // El precio base de "Baño y Deslanado" ya incluye el deslanado (+$1200).
  let total = bookingData.size?.price || 0;
  // El corte de raza solo aplica a "Baño y Deslanado" y suma segun el tamaño.
  if (isDeslanado() && bookingData.corteRaza && bookingData.size?.corteRazaPrice) {
    total += bookingData.size.corteRazaPrice;
  }
  return total;
}

function calculateDuration() {
  let minutes = 0;
  if (bookingData.size) {
    const match = bookingData.size.duration.match(/(\d+)\s*h/);
    if (match) minutes += parseInt(match[1]) * 60;
    const minMatch = bookingData.size.duration.match(/(\d+)\s*min/);
    if (minMatch) minutes += parseInt(minMatch[1]);
  }

  if (isDeslanado()) minutes += DESLANADO_HOURS * 60;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours} h ${mins > 0 ? mins + ' min' : ''}` : `${mins} min`;
}

// ==================== STEP 5: EXTRA (DESLANADO) ====================
function getSelectedFreeExtras() {
  return FREE_EXTRAS.filter(extra => bookingData.extraIds.includes(extra.id));
}

function getSelectedExtrasText() {
  const extras = getSelectedFreeExtras().map(extra => extra.name);

  if (isDeslanado() && bookingData.corteRaza) {
    extras.push('Corte de raza');
  }

  return extras.join(', ');
}

function toggleFreeExtra(extraId) {
  if (bookingData.extraIds.includes(extraId)) {
    bookingData.extraIds = bookingData.extraIds.filter(id => id !== extraId);
  } else {
    bookingData.extraIds.push(extraId);
  }

  renderExtraStep(document.getElementById('step-content'));
}

function toggleCorteRaza() {
  bookingData.corteRaza = !bookingData.corteRaza;
  renderExtraStep(document.getElementById('step-content'));
}
function renderExtraStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Extras para el servicio</h2>
    <p class="step-subtitle">Podés sumar estos cuidados al turno de tu mascota.</p>

    <div class="extras-grid">
      ${FREE_EXTRAS.map(extra => {
    const selected = bookingData.extraIds.includes(extra.id);

    return `
          <button type="button" class="extra-card ${selected ? 'selected' : ''}" onclick="toggleFreeExtra('${extra.id}')">
            <span class="extra-icon">${extra.icon}</span>
<span class="extra-check">${selected ? '✓' : '+'}</span>
            <span class="extra-content">
              <strong>${extra.name}</strong>
              <small>${extra.description}</small>
            </span>
            <span class="extra-price free">${extra.priceLabel}</span>
          </button>
        `;
  }).join('')}

      ${isDeslanado() ? `
      <button type="button" class="extra-card premium ${bookingData.corteRaza ? 'selected' : ''}" onclick="toggleCorteRaza()">
        <span class="extra-icon">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="6" cy="6" r="3"/>
    <path d="M8.12 8.12L12 12"/>
    <path d="M20 4L8.12 15.88"/>
    <path d="M14.47 14.48L20 20"/>
    <path d="M8.12 8.12L6 14l6-2-3.88 3.88"/>
  </svg>
</span>
<span class="extra-check">${bookingData.corteRaza ? '✓' : '+'}</span>
        <span class="extra-content">
          <strong>Corte de raza</strong>
          <small>Corte de raza junto con el deslanado.</small>
        </span>
        <span class="extra-price">+$${bookingData.size?.corteRazaPrice || ''}</span>
      </button>
      ` : ''}
    </div>

    <p class="extra-note">Perfume, corta uñas y limpieza de oídos son gratuitos.${isDeslanado() ? ' El corte de raza tiene costo adicional según el tamaño de tu mascota.' : ''}</p>

    <button class="continue-btn" onclick="saveExtraAndNext()">Continuar</button>
  `;
}

function saveExtraAndNext() {
  bookingData.time = null;
  nextStep();
}

function saveExtraAndNext() {
  // Si cambia la eleccion, reseteamos la hora porque la disponibilidad cambia
  bookingData.time = null;
  nextStep();
}

// ==================== STEP 5: DATE & TIME ====================
// Variable para indicar si estamos cargando horarios
let isLoadingSlots = false;

function renderDateTimeStep(container) {
  // Asegurarse de que estamos en el paso correcto
  if (currentStep !== 6) {

    return;
  }
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysHtml = '';

  // Previous month days
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    daysHtml += `<button class="calendar-day other-month" disabled>${prevLastDay - i}</button>`;
  }

  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const isPast = date < today;
    const isSunday = date.getDay() === 0;
    const isDisabled = isPast || isSunday;
    const isSelected = bookingData.date &&
      bookingData.date.getDate() === day &&
      bookingData.date.getMonth() === month &&
      bookingData.date.getFullYear() === year;

    daysHtml += `
      <button class="calendar-day ${isSelected ? 'selected' : ''} ${isSunday ? 'sunday-disabled' : ''}" 
              ${isDisabled ? 'disabled' : ''} 
              onclick="selectDate(${year}, ${month}, ${day})">
        ${day}
      </button>
    `;
  }

  // Next month days
  const remaining = 42 - (startDay + lastDay.getDate());
  for (let i = 1; i <= remaining; i++) {
    daysHtml += `<button class="calendar-day other-month" disabled>${i}</button>`;
  }

  container.innerHTML = `
    <h2 class="step-title">Fecha y hora</h2>
    <p class="step-subtitle">Cuando te gustaria venir?</p>
    
    <div class="calendar-container">
      <div class="calendar-header">
        <button class="calendar-nav" onclick="changeMonth(-1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="calendar-month">${monthNames[month]} ${year}</span>
        <button class="calendar-nav" onclick="changeMonth(1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
      
      <div class="calendar-weekdays">
        ${dayNames.map(d => `<span>${d}</span>`).join('')}
      </div>
      
      <div class="calendar-days">
        ${daysHtml}
      </div>
    </div>
    
    ${bookingData.date ? (() => {
      const selectableSlots = getSelectableSlots();
      return `
      <h3 style="margin: 20px 0 12px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem;">Horarios disponibles</h3>
      ${isDeslanado() ? `
        <p style="margin: 0 0 12px; color: var(--text-muted); font-size: 0.85rem;">Con el servicio de Baño y Deslanado se reserva también el turno siguiente, por lo que el horario de las 17:00 no está disponible.</p>
      ` : ''}
      <div class="time-slots">
        ${isLoadingSlots
          ? '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">Cargando horarios...</p>'
          : (selectableSlots.length > 0
            ? selectableSlots.map(time => `
                  <button class="time-slot ${bookingData.time === time ? 'selected' : ''}" onclick="selectTime('${time}')">
                    ${time}
                  </button>
                `).join('')
            : '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No hay horarios disponibles para esta fecha</p>'
          )
        }
      </div>
    `;
    })() : ''}
    
    <button class="continue-btn" onclick="nextStep()" ${!bookingData.date || !bookingData.time ? 'disabled' : ''}>
      Continuar
    </button>
  `;
}

function changeMonth(delta) {
  if (currentStep !== 6) return;
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
  renderDateTimeStep(document.getElementById('step-content'));
}

// Devuelve los horarios que el cliente realmente puede elegir.
// Si pidio deslanado, el turno ocupa 2 horas extra (el turno siguiente),
// por lo que solo se permiten horarios cuyo turno siguiente tambien este libre,
// y nunca el ultimo turno (17:00).
function getSelectableSlots() {
  if (!isDeslanado()) return availableTimeSlots;

  return availableTimeSlots.filter(slot => {
    const idx = TIME_SLOTS.indexOf(slot);
    const nextSlot = TIME_SLOTS[idx + 1];
    // Debe existir un turno siguiente y estar disponible
    return nextSlot && availableTimeSlots.includes(nextSlot);
  });
}

// Devuelve el turno siguiente que se bloquea al sumar deslanado
function getBlockedSlot() {
  if (!isDeslanado() || !bookingData.time) return null;
  const idx = TIME_SLOTS.indexOf(bookingData.time);
  return TIME_SLOTS[idx + 1] || null;
}

// Variable para guardar horarios disponibles
let availableTimeSlots = [...TIME_SLOTS];

async function selectDate(year, month, day) {
  // Verificar que seguimos en el paso correcto
  if (currentStep !== 6) {

    return;
  }

  bookingData.date = new Date(year, month, day);
  bookingData.time = null;
  isLoadingSlots = true;

  // Re-renderizar para mostrar loading
  const container = document.getElementById('step-content');
  renderDateTimeStep(container);

  // Cargar horarios disponibles del AppScript
  await loadAvailableSlots();

  isLoadingSlots = false;

  // Verificar que seguimos en el paso correcto despues de la carga async
  if (currentStep !== 6) {

    return;
  }

  renderDateTimeStep(container);
}

async function loadAvailableSlots() {
  try {
    const fecha = bookingData.date.toISOString().split('T')[0];
    const url = `${SCRIPT_URL}?fecha=${encodeURIComponent(fecha)}`;

    console.log('[v0] Cargando horarios para fecha:', fecha);
    console.log('[v0] URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });

    console.log('[v0] Response status:', response.status);

    const data = await response.json();
    console.log('[v0] Data recibida:', data);

    if (data.success && data.horarios) {
      availableTimeSlots = data.horarios;
      console.log('[v0] Horarios disponibles:', availableTimeSlots);
    } else {
      console.log('[v0] No se encontraron horarios, usando todos');
      availableTimeSlots = [...TIME_SLOTS];
    }
  } catch (error) {
    console.error('[v0] Error al cargar horarios:', error);
    // En caso de error, mostrar todos los horarios
    availableTimeSlots = [...TIME_SLOTS];
  }
}

function selectTime(time) {
  if (currentStep !== 6) return;
  bookingData.time = time;
  renderDateTimeStep(document.getElementById('step-content'));
}

// ==================== STEP 6: PET DETAILS ====================
function renderPetStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Contanos sobre tu peludo</h2>
    <p class="step-subtitle">Queremos conocer mejor a tu mascota</p>
    
    <div class="form-group">
      <label class="form-label">¿Cómo se llama tu mascota? <span style="color: #ef4444;">*</span></label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5v1l3 3.5c.7.8 1 1.9 1 3v3H6v-3c0-1.1.3-2.2 1-3l3-3.5v-1c-1.2-.7-2-2-2-3.5a4 4 0 0 1 4-4z"/>
        </svg>
        <input type="text" class="form-input" id="pet-name" placeholder="Ej: Firulais, Luna, Max" value="${bookingData.petName}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">¿Hay algo qué debamos saber? <span style="color: var(--text-muted); font-weight: normal;">(opcional)</span></label>
      <textarea class="form-textarea" id="pet-notes" placeholder="Contanos si tiene algún miedo, alergia, o algo especial que debamos tener en cuenta...">${bookingData.petNotes}</textarea>
    </div>
    
    <button class="continue-btn" onclick="savePetAndNext()">Continuar</button>
  `;
}

function savePetAndNext() {
  const name = document.getElementById('pet-name').value.trim();
  const notes = document.getElementById('pet-notes').value.trim();

  if (!name) {
    showModal('El nombre de la mascota es obligatorio', 'error', 'Campo requerido');
    return;
  }

  bookingData.petName = name;
  bookingData.petNotes = notes;
  nextStep();
}

// ==================== STEP 7: SUMMARY ====================
function renderSummaryStep(container) {
  const subtotal = calculateSubtotal();
  const duration = calculateDuration();
  const dateStr = bookingData.date?.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  container.innerHTML = `
    <h2 class="step-title">Confirma tu reserva</h2>
    <p class="step-subtitle">Revisa que todo este correcto</p>
    
    <div class="summary-section">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Tus datos
      </h3>
      <div class="summary-row">
        <span class="summary-label">Nombre</span>
        <span class="summary-value">${bookingData.clientName}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Teléfono</span>
        <span class="summary-value">${bookingData.clientPhone}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Email</span>
        <span class="summary-value">${bookingData.clientEmail}</span>
      </div>
    </div>
    
    <div class="summary-section">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5v1l3 3.5c.7.8 1 1.9 1 3v3H6v-3c0-1.1.3-2.2 1-3l3-3.5v-1c-1.2-.7-2-2-2-3.5a4 4 0 0 1 4-4z"/>
        </svg>
        Tu mascota
      </h3>
      <div class="summary-row">
        <span class="summary-label">Nombre</span>
        <span class="summary-value">${bookingData.petName}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Tipo de pelo</span>
        <span class="summary-value">${bookingData.category?.name}</span>
      </div>
      ${bookingData.petNotes ? `
        <div class="summary-row">
          <span class="summary-label">Notas</span>
          <span class="summary-value">${bookingData.petNotes}</span>
        </div>
      ` : ''}
    </div>
    
    <div class="summary-section">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Reserva
      </h3>
      <div class="summary-row">
        <span class="summary-label">Servicio</span>
        <span class="summary-value">${bookingData.serviceType?.name}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Tamaño</span>
        <span class="summary-value">${bookingData.size?.size} (${bookingData.size?.description})</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Extras</span>
<span class="summary-value">${getSelectedExtrasText() || 'Sin extras'}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Fecha</span>
        <span class="summary-value">${dateStr}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Hora</span>
        <span class="summary-value">${bookingData.time}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Duración</span>
        <span class="summary-value">${duration}</span>
      </div>
      
      <div class="summary-total">
        <span class="summary-label">Precio estimado</span>
        <span class="summary-value">$${subtotal}</span>
      </div>
    </div>
    
    <div class="terms-checkbox-container">
      <label class="terms-checkbox-label">
        <input type="checkbox" id="terms-checkbox" class="terms-checkbox">
        <span class="terms-checkbox-custom"></span>
        <span class="terms-text">He leído y acepto los <a href="#" onclick="showTerms(event)">términos y condiciones</a></span>
      </label>
    </div>
    
    <button class="continue-btn" id="confirm-btn" onclick="confirmBooking()" disabled>Confirmar Reserva</button>
  `;

  // Agregar evento al checkbox
  document.getElementById('terms-checkbox').addEventListener('change', function () {
    document.getElementById('confirm-btn').disabled = !this.checked;
  });
}

function showTerms(event) {
  if (event) event.preventDefault();
  showTermsContent();
}

function showTermsContent(event) {
  if (event) event.preventDefault();
  const termsContent = `
    <div style="text-align: left; max-height: 60vh; overflow-y: auto; padding-right: 10px; font-size: 14px; line-height: 1.6;">
      <h3 style="margin-bottom: 16px; color: #1a365d; font-size: 18px; font-weight: 600;">TR Corte | Terminos y Condiciones</h3>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">1. Alcance del servicio</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">TR Corte brinda servicios de peluqueria canina que incluyen bano, secado, cepillado, limpieza de oidos, corte de unas, corte higienico y perfume. Los servicios de corte de raza y deslanado no se encuentran incluidos en el servicio base y seran presupuestados de forma independiente segun las caracteristicas y estado del pelaje de la mascota.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">2. Modalidad de atencion</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">La atencion se realiza exclusivamente con cita previa. El cliente debera respetar el horario asignado. En caso de retraso superior a 15 minutos, TR Corte podra reprogramar o cancelar el turno segun disponibilidad.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">3. Permanencia de la mascota</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">Una vez finalizado el servicio, el cliente debera retirar a la mascota dentro de los 10 minutos. Transcurrido dicho plazo, TR Corte podra aplicar un cargo adicional por concepto de permanencia, equivalente a media hora de cuidado.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">4. Condiciones de admision</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">TR Corte presta servicios unicamente a perros. El establecimiento se reserva el derecho de rechazar o interrumpir el servicio en caso de que la mascota presente condiciones de salud, comportamiento o cualquier otra circunstancia que pueda representar un riesgo para si misma, otros animales o el personal. No se realizan procedimientos con sedacion.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">5. Estado del pelaje</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">El estado del pelaje de la mascota influye directamente en el tipo de servicio a realizar. En situaciones donde existan nudos, enredos severos o falta de mantenimiento, el procedimiento y tipo de corte seran definidos segun criterio profesional, pudiendo requerir modificaciones respecto a lo inicialmente solicitado. En estos casos, se procurara acordar previamente con el cliente.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">6. Higiene y control de parasitos</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">En caso de detectar la presencia de pulgas durante el servicio, se procedera a realizar un tratamiento adecuado. El costo del antiparasitario utilizado sera incorporado al precio final del servicio.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">7. Responsabilidad del cliente</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">El cliente debera proporcionar informacion veraz y relevante sobre la mascota, incluyendo comportamiento, antecedentes y cualquier condicion que pueda influir en la prestacion del servicio.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">8. Precios</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">Los precios de los servicios podran variar en funcion del tamano, estado del pelaje y comportamiento de la mascota. Cualquier ajuste sera informado al cliente en el momento correspondiente.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">9. Uso de imagen</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">El cliente autoriza a TR Corte a tomar y utilizar fotografias o videos de la mascota con fines promocionales, incluyendo su difusion en redes sociales y medios digitales.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">10. Modificaciones</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">TR Corte se reserva el derecho de modificar los presentes Terminos y Condiciones en cualquier momento, sin necesidad de notificacion previa.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">11. Aceptacion</h4>
      <p style="margin-bottom: 12px; color: #4a5568;">La contratacion de los servicios implica la aceptacion plena de estos Terminos y Condiciones.</p>
      
      <h4 style="margin: 16px 0 8px; color: #2d3748; font-weight: 600;">12. Contacto</h4>
      <p style="margin-bottom: 8px; color: #4a5568;">Cel: 094 066 066</p>
      <p style="margin-bottom: 8px; color: #4a5568;">Tel: 2201 4040</p>
      <p style="color: #4a5568;">Email: info@turacion.com</p>
    </div>
  `;
  showTermsModal(termsContent, true);
}

async function confirmBooking() {
  const btn = document.querySelector('.continue-btn');
  const originalText = btn.textContent;
  btn.textContent = 'Verificando disponibilidad...';
  btn.disabled = true;

  try {
    // Formatear fecha para AppScript (YYYY-MM-DD)
    const fecha = bookingData.date.toISOString().split('T')[0];

    // PASO 1: Verificar que el horario sigue disponible antes de enviar
    btn.textContent = 'Verificando horario...';
    const checkUrl = `${SCRIPT_URL}?fecha=${encodeURIComponent(fecha)}`;
    const checkResponse = await fetch(checkUrl);
    const checkData = await checkResponse.json();

    if (checkData.horarios && !checkData.horarios.includes(bookingData.time)) {
      // El horario ya no esta disponible
      showModal('Lo sentimos, el horario ' + bookingData.time + ' ya fue reservado por otra persona. Por favor elige otro horario.', 'warning', 'Horario no disponible');
      btn.textContent = originalText;
      btn.disabled = false;
      // Volver al paso de fecha/hora para elegir otro
      currentStep = 6;
      await loadAvailableSlots();
      renderStep();
      return;
    }

    // PASO 2: Preparar datos para enviar
    btn.textContent = 'Enviando reserva...';
    const horaBloqueada = getBlockedSlot();
    const datosReserva = {
      nombre: bookingData.clientName,
      telefono: bookingData.clientPhone,
      email: bookingData.clientEmail,
      fecha: fecha,
      hora: bookingData.time,
      servicio: bookingData.serviceType?.name || '',
      tamano: bookingData.size?.size || '',
      pelaje: bookingData.category?.name || '',
      nombreMascota: bookingData.petName,
      notasMascota: bookingData.petNotes,
      extras: getSelectedExtrasText(),
      deslanado: isDeslanado(),
      corteRaza: isDeslanado() && bookingData.corteRaza,
      // Turno siguiente que se debe cancelar/bloquear con "Baño y Deslanado"
      horaBloqueada: horaBloqueada,
      duracion: calculateDuration(),
      precio: calculateSubtotal()
    };

    // PASO 3: Enviar al AppScript
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Usar text/plain para evitar preflight CORS
      },
      body: JSON.stringify(datosReserva)
    });

    const result = await response.json();

    if (result.error) {
      // El servidor retorno un error (ej: horario ya tomado)
      showModal(result.error, 'error', 'Error en la reserva');
      btn.textContent = originalText;
      btn.disabled = false;

      // Si es error de horario, volver a seleccion de fecha/hora
      if (result.error.includes('horario')) {
        currentStep = 6;
        await loadAvailableSlots();
        renderStep();
      }
      return;
    }

    // Exito! El ID de reserva se envia por email, no se muestra en pantalla.
    showScreen('confirmation-screen');

  } catch (error) {
    console.error('Error al enviar reserva:', error);
    showModal('Hubo un error de conexion al procesar tu reserva. Por favor intenta de nuevo.', 'error', 'Error de conexion');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ==================== PRICING SIZE CARDS ====================
function initPricingCards() {
  const sizeCards = document.querySelectorAll('.size-card');
  const pricingPanels = document.querySelectorAll('.pricing-panel');

  sizeCards.forEach(card => {
    card.addEventListener('click', () => {
      const size = card.dataset.size;

      // Update active card
      sizeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      // Show corresponding panel
      pricingPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.dataset.panel === size) {
          panel.classList.add('active');
        }
      });
    });
  });
}

// ==================== CANCELAR CITA ====================
function openCancelScreen() {
  showScreen('cancel-screen');
  const input = document.getElementById('cancel-id');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
}

function closeCancelScreen() {
  showScreen('home-screen');
}

async function submitCancel() {
  const input = document.getElementById('cancel-id');
  const id = input ? input.value.trim() : '';

  if (!id) {
    showModal('Ingresa el ID de reserva que te enviamos por email', 'error', 'Campo requerido');
    return;
  }

  const btn = document.getElementById('cancel-submit-btn');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.textContent = 'Cancelando...';
    btn.disabled = true;
  }

  try {
    // GET evita el preflight CORS (igual que la verificacion de horarios)
    const url = `${SCRIPT_URL}?action=cancelar&id=${encodeURIComponent(id)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      showModal(data.error, 'error', 'No se pudo cancelar');
      return;
    }

    showModal(
      data.mensaje || 'Tu cita fue cancelada correctamente. Te enviamos la confirmación por email.',
      'info',
      'Cita cancelada'
    );
    if (input) input.value = '';
    showScreen('home-screen');

  } catch (error) {
    console.error('Error al cancelar la cita:', error);
    showModal('Hubo un error de conexión al cancelar tu cita. Por favor intenta de nuevo.', 'error', 'Error de conexion');
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  showScreen('home-screen');
  initPricingCards();
});
