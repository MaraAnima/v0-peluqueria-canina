// ==================== DATA ====================
const CATEGORIES = [
  { id: 'pelo-corto', name: 'Pelo corto', image: 'images/pelo-corto.jpg' },
  { id: 'pelo-largo', name: 'Pelo largo', image: 'images/pelo-largo.jpg' }
];

const SERVICES = [
  // Pelo corto
  { id: 'bano-s', name: 'Bano (S)', description: 'Hasta 10 kg', duration: '1 h', price: 850, categoryId: 'pelo-corto', size: 'S' },
  { id: 'bano-m', name: 'Bano (M)', description: '10 kg a 20 kg', duration: '1 h', price: 950, categoryId: 'pelo-corto', size: 'M' },
  { id: 'bano-l', name: 'Bano (L)', description: '20 kg a 40 kg', duration: '1 h 30 min', price: 1000, categoryId: 'pelo-corto', size: 'L' },
  { id: 'bano-xl', name: 'Bano (XL)', description: '40 kg o mas', duration: '2 h', price: 1250, categoryId: 'pelo-corto', size: 'XL' },
  // Pelo largo
  { id: 'bano-s-largo', name: 'Bano (S)', description: 'Hasta 10 kg', duration: '1 h 30 min', price: 1000, categoryId: 'pelo-largo', size: 'S' },
  { id: 'bano-m-largo', name: 'Bano (M)', description: '10 kg a 20 kg', duration: '1 h 30 min', price: 1100, categoryId: 'pelo-largo', size: 'M' },
  { id: 'bano-l-largo', name: 'Bano (L)', description: '20 kg a 40 kg', duration: '2 h', price: 1200, categoryId: 'pelo-largo', size: 'L' },
  { id: 'bano-xl-largo', name: 'Bano (XL)', description: '40 kg o mas', duration: '2 h 30 min', price: 1450, categoryId: 'pelo-largo', size: 'XL' }
];

const EXTRAS = [
  { id: 'corte-unas', name: 'Corte de unas', description: 'Corte seguro y profesional', price: 150, duration: '15 min' },
  { id: 'limpieza-oidos', name: 'Limpieza de oidos', description: 'Limpieza suave y cuidadosa', price: 100, duration: '10 min' },
  { id: 'perfume', name: 'Perfume premium', description: 'Fragancia duradera', price: 80, duration: '5 min' },
  { id: 'desenredado', name: 'Desenredado especial', description: 'Para pelo muy enredado', price: 200, duration: '20 min' }
];

const STEPS = [
  { id: 1, name: 'Contacto' },
  { id: 2, name: 'Categoria' },
  { id: 3, name: 'Servicio' },
  { id: 4, name: 'Extras' },
  { id: 5, name: 'Hora' },
  { id: 6, name: 'Mascota' },
  { id: 7, name: 'Confirmar' }
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

// ==================== STATE ====================
let currentStep = 1;
let bookingData = {
  clientName: '',
  clientPhone: '',
  category: null,
  service: null,
  extras: [],
  date: null,
  time: null,
  petName: '',
  petNotes: ''
};

let currentMonth = new Date();

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
    service: null,
    extras: [],
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
  
  switch(currentStep) {
    case 1: renderContactStep(content); break;
    case 2: renderCategoryStep(content); break;
    case 3: renderServiceStep(content); break;
    case 4: renderExtrasStep(content); break;
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
  container.innerHTML = STEPS.map((step, i) => {
    let className = 'step-pill';
    if (step.id === currentStep) className += ' active';
    else if (step.id < currentStep) className += ' completed';
    
    return `
      <div class="${className}">
        <span class="step-number">${step.id}</span>
        <span class="step-name">${step.name}</span>
      </div>
    `;
  }).join('');
}

// ==================== STEP 1: CONTACT ====================
function renderContactStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Hola! Empecemos</h2>
    <p class="step-subtitle">Contanos como podemos contactarte</p>
    
    <div class="form-group">
      <label class="form-label">Tu nombre</label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <input type="text" class="form-input" id="client-name" placeholder="Ej: Maria Garcia" value="${bookingData.clientName}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Tu telefono</label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <input type="tel" class="form-input" id="client-phone" placeholder="Ej: 11 1234-5678" value="${bookingData.clientPhone}">
      </div>
    </div>
    
    <button class="continue-btn" onclick="saveContactAndNext()">Continuar</button>
  `;
}

function saveContactAndNext() {
  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  
  if (!name || !phone) {
    alert('Por favor completa todos los campos');
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
  bookingData.service = null; // Reset service when category changes
  setTimeout(nextStep, 200);
}

// ==================== STEP 3: SERVICE ====================
function renderServiceStep(container) {
  const services = SERVICES.filter(s => s.categoryId === bookingData.category?.id);
  
  container.innerHTML = `
    <h2 class="step-title">Tamano de tu mascota</h2>
    <p class="step-subtitle">Selecciona segun el peso</p>
    
    <div class="service-list">
      ${services.map(service => `
        <div class="service-card ${bookingData.service?.id === service.id ? 'selected' : ''}" onclick="selectService('${service.id}')">
          <div class="service-icon">
            <span style="font-size: 1.5rem; font-weight: bold; color: var(--primary-blue);">${service.size}</span>
          </div>
          <div class="service-info">
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <div class="service-meta">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                ${service.duration}
              </span>
            </div>
          </div>
          <div class="service-price">$${service.price}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function selectService(serviceId) {
  bookingData.service = SERVICES.find(s => s.id === serviceId);
  setTimeout(nextStep, 200);
}

// ==================== STEP 4: EXTRAS ====================
function renderExtrasStep(container) {
  const subtotal = calculateSubtotal();
  const duration = calculateDuration();
  
  container.innerHTML = `
    <h2 class="step-title">Servicios adicionales</h2>
    <p class="step-subtitle">Mejora la experiencia de tu mascota</p>
    
    <div class="extras-list">
      ${EXTRAS.map(extra => `
        <div class="extra-card ${bookingData.extras.find(e => e.id === extra.id) ? 'selected' : ''}" onclick="toggleExtra('${extra.id}')">
          <div class="extra-checkbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <div class="extra-info">
            <h3>${extra.name}</h3>
            <p>${extra.description} - ${extra.duration}</p>
          </div>
          <div class="extra-price">+$${extra.price}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="subtotal-bar">
      <div class="subtotal-info">
        <span class="duration">${duration}</span>
        <span class="price">$${subtotal}</span>
      </div>
      <button class="continue-btn" style="width: auto; margin: 0; padding: 12px 24px;" onclick="nextStep()">
        Continuar
      </button>
    </div>
  `;
}

function toggleExtra(extraId) {
  const extra = EXTRAS.find(e => e.id === extraId);
  const index = bookingData.extras.findIndex(e => e.id === extraId);
  
  if (index > -1) {
    bookingData.extras.splice(index, 1);
  } else {
    bookingData.extras.push(extra);
  }
  
  renderExtrasStep(document.getElementById('step-content'));
}

function calculateSubtotal() {
  let total = bookingData.service?.price || 0;
  bookingData.extras.forEach(e => total += e.price);
  return total;
}

function calculateDuration() {
  let minutes = 0;
  if (bookingData.service) {
    const match = bookingData.service.duration.match(/(\d+)\s*h/);
    if (match) minutes += parseInt(match[1]) * 60;
    const minMatch = bookingData.service.duration.match(/(\d+)\s*min/);
    if (minMatch) minutes += parseInt(minMatch[1]);
  }
  bookingData.extras.forEach(e => {
    const match = e.duration.match(/(\d+)/);
    if (match) minutes += parseInt(match[1]);
  });
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours} h ${mins > 0 ? mins + ' min' : ''}` : `${mins} min`;
}

// ==================== STEP 5: DATE & TIME ====================
function renderDateTimeStep(container) {
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
        ${TIME_SLOTS.map(time => `
          <button class="time-slot ${bookingData.time === time ? 'selected' : ''}" onclick="selectTime('${time}')">
            ${time}
          </button>
        `).join('')}
      </div>
    ` : ''}
    
    <button class="continue-btn" onclick="nextStep()" ${!bookingData.date || !bookingData.time ? 'disabled' : ''}>
      Continuar
    </button>
  `;
}

function changeMonth(delta) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
  renderDateTimeStep(document.getElementById('step-content'));
}

function selectDate(year, month, day) {
  bookingData.date = new Date(year, month, day);
  bookingData.time = null;
  renderDateTimeStep(document.getElementById('step-content'));
}

function selectTime(time) {
  bookingData.time = time;
  renderDateTimeStep(document.getElementById('step-content'));
}

// ==================== STEP 6: PET DETAILS ====================
function renderPetStep(container) {
  container.innerHTML = `
    <h2 class="step-title">Contanos sobre tu peludo</h2>
    <p class="step-subtitle">Queremos conocer mejor a tu mascota</p>
    
    <div class="form-group">
      <label class="form-label">Como se llama tu mascota?</label>
      <div class="input-icon-wrapper">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5v1l3 3.5c.7.8 1 1.9 1 3v3H6v-3c0-1.1.3-2.2 1-3l3-3.5v-1c-1.2-.7-2-2-2-3.5a4 4 0 0 1 4-4z"/>
        </svg>
        <input type="text" class="form-input" id="pet-name" placeholder="Ej: Firulais, Luna, Max" value="${bookingData.petName}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Hay algo que debamos saber?</label>
      <textarea class="form-textarea" id="pet-notes" placeholder="Contanos si tiene algun miedo, alergia, o algo especial que debamos tener en cuenta...">${bookingData.petNotes}</textarea>
    </div>
    
    <button class="continue-btn" onclick="savePetAndNext()">Continuar</button>
  `;
}

function savePetAndNext() {
  const name = document.getElementById('pet-name').value.trim();
  const notes = document.getElementById('pet-notes').value.trim();
  
  if (!name) {
    alert('Por favor ingresa el nombre de tu mascota');
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
        <span class="summary-value">${bookingData.service?.name} - ${bookingData.category?.name}</span>
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
        <span class="summary-label">Duracion</span>
        <span class="summary-value">${duration}</span>
      </div>
      ${bookingData.extras.length > 0 ? `
        <div class="summary-row">
          <span class="summary-label">Extras</span>
          <span class="summary-value">${bookingData.extras.map(e => e.name).join(', ')}</span>
        </div>
      ` : ''}
      
      <div class="summary-total">
        <span class="summary-label">Total</span>
        <span class="summary-value">$${subtotal}</span>
      </div>
    </div>
    
    <button class="continue-btn" onclick="confirmBooking()">Confirmar Reserva</button>
  `;
}

function confirmBooking() {
  // Here you would send data to backend
  console.log('Booking confirmed:', bookingData);
  showScreen('confirmation-screen');
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  showScreen('home-screen');
});
