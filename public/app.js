// ==================== DATA ====================
const CATEGORIES = [
  { id: 'pelo-corto', name: 'Pelo corto', image: 'images/pelo-corto.jpg' },
  { id: 'pelo-largo', name: 'Pelo largo', image: 'images/pelo-largo.jpg' }
];

// Tipos de servicio
const SERVICE_TYPES = [
  { id: 'bano', name: 'Baño', description: 'Baño completo con secado' },
  { id: 'bano-corte', name: 'Baño y corte', description: 'Baño completo + corte de pelo' }
];

// Tamaños con precios base (pelo corto)
const SIZES = [
  // Pelo corto - Baño
  { id: 'bano-s', size: 'S', description: 'Hasta 10 kg', duration: '1 h', price: 850, categoryId: 'pelo-corto', serviceTypeId: 'bano' },
  { id: 'bano-m', size: 'M', description: '10 kg a 20 kg', duration: '1 h', price: 950, categoryId: 'pelo-corto', serviceTypeId: 'bano' },
  { id: 'bano-l', size: 'L', description: '20 kg a 40 kg', duration: '1 h 30 min', price: 1000, categoryId: 'pelo-corto', serviceTypeId: 'bano' },
  { id: 'bano-xl', size: 'XL', description: '40 kg o más', duration: '2 h', price: 1250, categoryId: 'pelo-corto', serviceTypeId: 'bano' },
  // Pelo corto - Baño y corte
  { id: 'bano-corte-s', size: 'S', description: 'Hasta 10 kg', duration: '1 h 30 min', price: 1150, categoryId: 'pelo-corto', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-m', size: 'M', description: '10 kg a 20 kg', duration: '1 h 30 min', price: 1250, categoryId: 'pelo-corto', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-l', size: 'L', description: '20 kg a 40 kg', duration: '2 h', price: 1300, categoryId: 'pelo-corto', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-xl', size: 'XL', description: '40 kg o más', duration: '2 h 30 min', price: 1550, categoryId: 'pelo-corto', serviceTypeId: 'bano-corte' },
  // Pelo largo - Baño
  { id: 'bano-s-largo', size: 'S', description: 'Hasta 10 kg', duration: '1 h 30 min', price: 1000, categoryId: 'pelo-largo', serviceTypeId: 'bano' },
  { id: 'bano-m-largo', size: 'M', description: '10 kg a 20 kg', duration: '1 h 30 min', price: 1100, categoryId: 'pelo-largo', serviceTypeId: 'bano' },
  { id: 'bano-l-largo', size: 'L', description: '20 kg a 40 kg', duration: '2 h', price: 1200, categoryId: 'pelo-largo', serviceTypeId: 'bano' },
  { id: 'bano-xl-largo', size: 'XL', description: '40 kg o más', duration: '2 h 30 min', price: 1450, categoryId: 'pelo-largo', serviceTypeId: 'bano' },
  // Pelo largo - Baño y corte
  { id: 'bano-corte-s-largo', size: 'S', description: 'Hasta 10 kg', duration: '2 h', price: 1300, categoryId: 'pelo-largo', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-m-largo', size: 'M', description: '10 kg a 20 kg', duration: '2 h', price: 1400, categoryId: 'pelo-largo', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-l-largo', size: 'L', description: '20 kg a 40 kg', duration: '2 h 30 min', price: 1500, categoryId: 'pelo-largo', serviceTypeId: 'bano-corte' },
  { id: 'bano-corte-xl-largo', size: 'XL', description: '40 kg o más', duration: '3 h', price: 1750, categoryId: 'pelo-largo', serviceTypeId: 'bano-corte' }
];

const STEPS = [
  { id: 1, name: 'Contacto' },
  { id: 2, name: 'Categoría' },
  { id: 3, name: 'Servicio' },
  { id: 4, name: 'Tamaño' },
  { id: 5, name: 'Hora' },
  { id: 6, name: 'Mascota' },
  { id: 7, name: 'Confirmar' }
];

// Horarios disponibles (deben coincidir con AppScript)
// Cada cita dura 2 horas, asi que los slots son cada 2 horas
const TIME_SLOTS = ['12:00', '14:00', '16:00', '18:00'];
const SLOT_DURATION_HOURS = 2; // Duracion de cada cita en horas

// URL del AppScript - REEMPLAZAR CON TU URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzbSA4_suzAkYS7UfYlyRBoKUt26p3h8lPi-raQSZxSUHeImIGlkxvRFlCEYrLVqRohZg/exec';

// ==================== STATE ====================
let currentStep = 1;
let bookingData = {
  clientName: '',
  clientPhone: '',
  category: null,
  serviceType: null,
  size: null,
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
  const modalBox = modal.querySelector('.modal-box');

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
    clientName: '',
    clientPhone: '',
    category: null,
    serviceType: null,
    size: null,
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
    case 5: renderDateTimeStep(content); break;
    case 6: renderPetStep(content); break;
    case 7: renderSummaryStep(content); break;
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
    5: bookingData.date && bookingData.time ? `${formatDate(bookingData.date)} ${bookingData.time}` : null,
    6: bookingData.petName || null
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
    <p class="step-subtitle">Contanos como podemos contactarte</p>
    
    <div class="form-group">
      <label class="form-label">Tu nombre <span style="color: #ef4444;">*</span></label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <input type="text" class="form-input" id="client-name" placeholder="Ej: Maria Garcia (mas de 3 letras, sin numeros)" value="${bookingData.clientName}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Tu telefono <span style="color: #ef4444;">*</span></label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <input type="tel" class="form-input" id="client-phone" placeholder="Ej: 11 1234-5678 (minimo 6 digitos)" value="${bookingData.clientPhone}">
      </div>
    </div>
    
    <button class="continue-btn" onclick="saveContactAndNext()">Continuar</button>
  `;
}

function saveContactAndNext() {
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();

  // Validacion del nombre
  if (!name) {
    showModal('El nombre es obligatorio', 'error', 'Campo requerido');
    return;
  }
  if (name.length <= 3) {
    showModal('El nombre debe tener mas de 3 letras', 'error', 'Nombre invalido');
    return;
  }
  if (/\d/.test(name)) {
    showModal('El nombre no puede contener numeros', 'error', 'Nombre invalido');
    return;
  }

  // Validacion del telefono
  if (!phone) {
    showModal('El telefono es obligatorio', 'error', 'Campo requerido');
    return;
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 6) {
    showModal('El telefono debe tener al menos 6 digitos', 'error', 'Telefono invalido');
    return;
  }

  bookingData.clientName = name;
  bookingData.clientPhone = phone;
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
            <h3>${size.size === 'S' ? 'Pequeño' : size.size === 'M' ? 'Mediano' : size.size === 'L' ? 'Grande' : 'Extra Grande'}</h3>
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
  return bookingData.size?.price || 0;
}

function calculateDuration() {
  let minutes = 0;
  if (bookingData.size) {
    const match = bookingData.size.duration.match(/(\d+)\s*h/);
    if (match) minutes += parseInt(match[1]) * 60;
    const minMatch = bookingData.size.duration.match(/(\d+)\s*min/);
    if (minMatch) minutes += parseInt(minMatch[1]);
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours} h ${mins > 0 ? mins + ' min' : ''}` : `${mins} min`;
}

// ==================== STEP 5: DATE & TIME ====================
// Variable para indicar si estamos cargando horarios
let isLoadingSlots = false;

function renderDateTimeStep(container) {
  // Asegurarse de que estamos en el paso correcto
  if (currentStep !== 5) {

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
    const isSelected = bookingData.date &&
      bookingData.date.getDate() === day &&
      bookingData.date.getMonth() === month &&
      bookingData.date.getFullYear() === year;

    daysHtml += `
      <button class="calendar-day ${isSelected ? 'selected' : ''}" 
              ${isPast ? 'disabled' : ''} 
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
    
    ${bookingData.date ? `
      <h3 style="margin: 20px 0 12px; font-family: 'Fredoka', sans-serif; font-size: 1.1rem;">Horarios disponibles</h3>
      <div class="time-slots">
        ${isLoadingSlots
        ? '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">Cargando horarios...</p>'
        : (availableTimeSlots.length > 0
          ? availableTimeSlots.map(time => `
                  <button class="time-slot ${bookingData.time === time ? 'selected' : ''}" onclick="selectTime('${time}')">
                    ${time}
                  </button>
                `).join('')
          : '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No hay horarios disponibles para esta fecha</p>'
        )
      }
      </div>
    ` : ''}
    
    <button class="continue-btn" onclick="nextStep()" ${!bookingData.date || !bookingData.time ? 'disabled' : ''}>
      Continuar
    </button>
  `;
}

function changeMonth(delta) {
  if (currentStep !== 5) return;
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
  renderDateTimeStep(document.getElementById('step-content'));
}

// Variable para guardar horarios disponibles
let availableTimeSlots = [...TIME_SLOTS];

async function selectDate(year, month, day) {
  // Verificar que seguimos en el paso correcto
  if (currentStep !== 5) {

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
  if (currentStep !== 5) {

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
  if (currentStep !== 5) return;
  bookingData.time = time;
  renderDateTimeStep(document.getElementById('step-content'));
}

// ==================== STEP 6: PET DETAILS ====================
function renderPetStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Contanos sobre tu peludo</h2>
    <p class="step-subtitle">Queremos conocer mejor a tu mascota</p>
    
    <div class="form-group">
      <label class="form-label">Como se llama tu mascota? <span style="color: #ef4444;">*</span></label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5v1l3 3.5c.7.8 1 1.9 1 3v3H6v-3c0-1.1.3-2.2 1-3l3-3.5v-1c-1.2-.7-2-2-2-3.5a4 4 0 0 1 4-4z"/>
        </svg>
        <input type="text" class="form-input" id="pet-name" placeholder="Ej: Firulais, Luna, Max" value="${bookingData.petName}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Hay algo que debamos saber? <span style="color: var(--text-muted); font-weight: normal;">(opcional)</span></label>
      <textarea class="form-textarea" id="pet-notes" placeholder="Contanos si tiene algun miedo, alergia, o algo especial que debamos tener en cuenta...">${bookingData.petNotes}</textarea>
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
        <span class="summary-label">Telefono</span>
        <span class="summary-value">${bookingData.clientPhone}</span>
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
    <div style="width: 100%; height: 70vh; min-height: 400px;">
      <iframe 
        src="/terminos-condiciones.pdf#toolbar=0&navpanes=0&scrollbar=1" 
        style="width: 100%; height: 100%; border: none; border-radius: 8px;"
        title="Terminos y Condiciones"
      ></iframe>
      <p style="text-align: center; margin-top: 12px; color: #718096; font-size: 12px;">
        Si no puedes ver el documento, <a href="/terminos-condiciones.pdf" target="_blank" style="color: #3182ce; text-decoration: underline;">haz clic aqui para descargarlo</a>
      </p>
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
      currentStep = 5;
      await loadAvailableSlots();
      renderCurrentStep();
      return;
    }

    // PASO 2: Preparar datos para enviar
    btn.textContent = 'Enviando reserva...';
    const datosReserva = {
      nombre: bookingData.clientName,
      telefono: bookingData.clientPhone,
      fecha: fecha,
      hora: bookingData.time,
      servicio: bookingData.serviceType?.name || '',
      tamano: bookingData.size?.size || '',
      pelaje: bookingData.category?.name || '',
      nombreMascota: bookingData.petName,
      notasMascota: bookingData.petNotes,
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
        currentStep = 5;
        await loadAvailableSlots();
        renderCurrentStep();
      }
      return;
    }

    // Exito!
    showScreen('confirmation-screen');

  } catch (error) {
    console.error('Error al enviar reserva:', error);
    showModal('Hubo un error de conexion al procesar tu reserva. Por favor intenta de nuevo.', 'error', 'Error de conexion');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  showScreen('home-screen');
});
