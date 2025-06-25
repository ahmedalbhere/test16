// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  remove, 
  update, 
  get,
  off // Add off to clean up listeners
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ4VhGD49H3RNifMf9VCRPnkALAxNpsOU",
  authDomain: "project-2980864980936907935.firebaseapp.com",
  databaseURL: "https://project-2980864980936907935-default-rtdb.firebaseio.com",
  projectId: "project-2980864980936907935",
  storageBucket: "project-2980864980936907935.appspot.com",
  messagingSenderId: "580110751353",
  appId: "1:580110751353:web:8f039f9b34e1709d4126a8",
  measurementId: "G-R3JNPHCFZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// State management
const state = {
  currentUser: null,
  currentUserType: null,
  barbers: {},
  queueListeners: {},
  barbersListener: null
};

// DOM elements
const elements = {
  screens: {
    roleSelection: document.getElementById('roleSelection'),
    clientLogin: document.getElementById('clientLogin'),
    barberLogin: document.getElementById('barberLogin'),
    clientDashboard: document.getElementById('clientDashboard'),
    barberDashboard: document.getElementById('barberDashboard')
  },
  client: {
    name: document.getElementById('clientName'),
    phone: document.getElementById('clientPhone'),
    error: document.getElementById('clientError'),
    avatar: document.getElementById('clientAvatar'),
    bookingContainer: document.getElementById('currentBookingContainer'),
    bookingBarber: document.getElementById('bookingBarber'),
    bookingPosition: document.getElementById('bookingPosition'),
    bookingTime: document.getElementById('bookingTime'),
    cancelBookingBtn: document.getElementById('cancelBookingBtn'),
    barbersList: document.getElementById('barbersList'),
    citySearch: document.getElementById('citySearch')
  },
  barber: {
    phone: document.getElementById('barberPhone'),
    password: document.getElementById('barberPassword'),
    name: document.getElementById('barberName'),
    newPhone: document.getElementById('newBarberPhone'),
    city: document.getElementById('barberCity'),
    location: document.getElementById('barberLocation'),
    newPassword: document.getElementById('newBarberPassword'),
    confirmPassword: document.getElementById('confirmBarberPassword'),
    error: document.getElementById('barberError'),
    avatar: document.getElementById('barberAvatar'),
    queue: document.getElementById('barberQueue'),
    statusToggle: document.getElementById('statusToggle'),
    statusText: document.getElementById('statusText'),
    formTitle: document.getElementById('barberFormTitle'),
    loginForm: document.getElementById('barberLoginForm'),
    signupForm: document.getElementById('barberSignupForm')
  }
};

// Utility functions
const utils = {
  generateId: () => 'id-' + Math.random().toString(36).substr(2, 9),
  
  showError: (element, message) => {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
  },
  
  validatePhone: (phone) => /^[0-9]{10,15}$/.test(phone),
  
  clearForm: (formElements) => {
    Object.values(formElements).forEach(element => {
      if (element && element.value) element.value = '';
    });
  },
  
  debounce: (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
};

// Screen management
function showScreen(screenId) {
  Object.values(elements.screens).forEach(screen => {
    screen.classList.add('hidden');
  });
  elements.screens[screenId].classList.remove('hidden');
}

// Barber form management
function showBarberSignup() {
  elements.barber.formTitle.textContent = 'إنشاء حساب حلاق جديد';
  elements.barber.loginForm.classList.add('hidden');
  elements.barber.signupForm.classList.remove('hidden');
}

function showBarberLogin() {
  elements.barber.formTitle.textContent = 'تسجيل الدخول للحلاقين';
  elements.barber.signupForm.classList.add('hidden');
  elements.barber.loginForm.classList.remove('hidden');
}

// Authentication functions
async function clientLogin() {
  const name = elements.client.name.value.trim();
  const phone = elements.client.phone.value.trim();
  
  if (!name) {
    utils.showError(elements.client.error, 'الرجاء إدخال الاسم');
    return;
  }
  
  if (!phone || !utils.validatePhone(phone)) {
    utils.showError(elements.client.error, 'الرجاء إدخال رقم هاتف صحيح');
    return;
  }
  
  state.currentUser = {
    id: utils.generateId(),
    name,
    phone,
    type: 'client'
  };
  state.currentUserType = 'client';
  
  elements.client.avatar.textContent = name.charAt(0);
  showClientDashboard();
  await loadBarbers();
  await checkExistingBooking();
}

async function barberSignup() {
  const { name, newPhone, city, location, newPassword, confirmPassword, error } = elements.barber;
  
  if (!name.value || !newPhone.value || !city.value || !location.value || !newPassword.value || !confirmPassword.value) {
    utils.showError(error, 'جميع الحقول مطلوبة');
    return;
  }
  
  if (!utils.validatePhone(newPhone.value)) {
    utils.showError(error, 'رقم الهاتف يجب أن يكون بين 10-15 رقمًا');
    return;
  }
  
  if (newPassword.value.length < 6) {
    utils.showError(error, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }
  
  if (newPassword.value !== confirmPassword.value) {
    utils.showError(error, 'كلمتا المرور غير متطابقتين');
    return;
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      `${newPhone.value}@barber.com`, 
      newPassword.value
    );
    
    await set(ref(database, 'barbers/' + userCredential.user.uid), {
      name: name.value,
      phone: newPhone.value,
      city: city.value,
      location: location.value,
      status: 'open',
      queue: {}
    });
    
    state.currentUser = {
      id: userCredential.user.uid,
      name: name.value,
      phone: newPhone.value,
      city: city.value,
      location: location.value,
      type: 'barber'
    };
    
    elements.barber.avatar.textContent = name.value.charAt(0);
    showBarberDashboard();
    loadBarberQueue();
    
  } catch (error) {
    let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'هذا الرقم مسجل بالفعل، يرجى تسجيل الدخول';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'رقم الهاتف غير صالح';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'كلمة المرور ضعيفة جداً';
    }
    
    utils.showError(elements.barber.error, errorMessage);
  }
}

async function barberLogin() {
  const { phone, password, error } = elements.barber;
  
  if (!phone.value || !password.value) {
    utils.showError(error, 'رقم الهاتف وكلمة المرور مطلوبان');
    return;
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      `${phone.value}@barber.com`,
      password.value
    );
    
    const barberRef = ref(database, 'barbers/' + userCredential.user.uid);
    const snapshot = await get(barberRef);
    
    if (snapshot.exists()) {
      const barberData = snapshot.val();
      
      state.currentUser = {
        id: userCredential.user.uid,
        name: barberData.name,
        phone: barberData.phone,
        city: barberData.city,
        location: barberData.location,
        type: 'barber'
      };
      
      elements.barber.avatar.textContent = barberData.name.charAt(0);
      showBarberDashboard();
      loadBarberQueue();
    } else {
      utils.showError(error, 'بيانات الحلاق غير موجودة');
      await signOut(auth);
    }
    
  } catch (error) {
    let errorMessage = 'بيانات الدخول غير صحيحة';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'لا يوجد حساب مرتبط بهذا الرقم';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'كلمة المرور غير صحيحة';
    }
    
    utils.showError(elements.barber.error, errorMessage);
  }
}

// Dashboard functions
function showClientDashboard() {
  showScreen('clientDashboard');
}

function showBarberDashboard() {
  showScreen('barberDashboard');
  
  // Setup shop status toggle
  onValue(ref(database, 'barbers/' + state.currentUser.id + '/status'), (snapshot) => {
    const status = snapshot.val() || 'open';
    elements.barber.statusToggle.checked = status === 'open';
    elements.barber.statusText.textContent = status === 'open' ? 'مفتوح' : 'مغلق';
  });
  
  elements.barber.statusToggle.addEventListener('change', function() {
    const newStatus = this.checked ? 'open' : 'closed';
    update(ref(database, 'barbers/' + state.currentUser.id), { status: newStatus });
  });
}

// Barber management
async function loadBarbers() {
  elements.client.barbersList.innerHTML = 'جارٍ التحميل...';
  
  // Clean up previous listener if exists
  if (state.barbersListener) {
    off(state.barbersListener);
  }
  
  state.barbersListener = onValue(ref(database, 'barbers'), (snapshot) => {
    state.barbers = snapshot.val() || {};
    renderBarbersList();
  });
}

function renderBarbersList() {
  elements.client.barbersList.innerHTML = '';
  
  Object.entries(state.barbers).forEach(([id, barber]) => {
    const barberCard = document.createElement('div');
    barberCard.className = 'barber-card';
    
    const statusClass = barber.status === 'open' ? 'status-open' : 'status-closed';
    const statusText = barber.status === 'open' ? 'مفتوح' : 'مغلق';
    const queueLength = barber.queue ? Object.keys(barber.queue).length : 0;
    const hasBooking = state.currentUser?.booking;
    
    barberCard.innerHTML = `
      <div class="barber-info">
        <div class="barber-header">
          <div class="barber-avatar">${barber.name.charAt(0)}</div>
          <div class="barber-name">${barber.name}</div>
        </div>
        <div class="barber-status ${statusClass}">${statusText}</div>
        <div class="barber-details">
          <div>المدينة: <span class="city-name">${barber.city || 'غير متوفر'}</span></div>
          <div>رقم الهاتف: ${barber.phone || 'غير متوفر'}</div>
          <div>الموقع: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barber.location)}" target="_blank" class="location-link">${barber.location || 'غير متوفر'}</a></div>
          <div>عدد المنتظرين: ${queueLength}</div>
          <div>وقت الانتظار التقريبي: ${queueLength * 15} دقيقة</div>
        </div>
      </div>
      <button class="book-btn" ${barber.status === 'closed' || hasBooking ? 'disabled' : ''}" 
              onclick="bookAppointment('${id}', '${barber.name.replace(/'/g, "\\'")}')">
        ${hasBooking ? 'لديك حجز بالفعل' : (barber.status === 'open' ? 'احجز الآن' : 'غير متاح')}
      </button>
    `;
    
    elements.client.barbersList.appendChild(barberCard);
  });
}

// Booking management
async function bookAppointment(barberId, barberName) {
  if (!state.currentUser) return;
  
  if (state.currentUser.booking) {
    alert('لديك حجز بالفعل، لا يمكنك الحجز أكثر من مرة في نفس الوقت');
    return;
  }
  
  try {
    const newBookingRef = push(ref(database, `barbers/${barberId}/queue`));
    await set(newBookingRef, {
      clientId: state.currentUser.id,
      clientName: state.currentUser.name,
      clientPhone: state.currentUser.phone,
      timestamp: Date.now()
    });
    
    state.currentUser.booking = {
      barberId,
      barberName,
      bookingId: newBookingRef.key,
      timestamp: new Date().toLocaleString()
    };
    
    showCurrentBooking();
    renderBarbersList();
    alert(`تم الحجز بنجاح مع الحلاق ${barberName}`);
  } catch (error) {
    alert('حدث خطأ أثناء الحجز: ' + error.message);
  }
}

function showCurrentBooking() {
  if (!state.currentUser?.booking) return;
  
  const { booking } = state.currentUser;
  elements.client.bookingBarber.textContent = booking.barberName;
  elements.client.bookingTime.textContent = booking.timestamp;
  
  // Clean up previous listener if exists
  if (state.queueListeners[booking.barberId]) {
    off(state.queueListeners[booking.barberId]);
  }
  
  state.queueListeners[booking.barberId] = onValue(
    ref(database, `barbers/${booking.barberId}/queue`), 
    (snapshot) => {
      const queue = snapshot.val() || {};
      let position = 0;
      
      Object.keys(queue).forEach((key, index) => {
        if (key === booking.bookingId) {
          position = index + 1;
        }
      });
      
      elements.client.bookingPosition.textContent = position;
    }
  );
  
  elements.client.cancelBookingBtn.onclick = () => {
    cancelBooking(booking.barberId, booking.bookingId);
  };
  
  elements.client.bookingContainer.classList.remove('hidden');
}

async function cancelBooking(barberId, bookingId) {
  if (!confirm('هل أنت متأكد من إلغاء الحجز؟')) return;
  
  try {
    await remove(ref(database, `barbers/${barberId}/queue/${bookingId}`));
    
    delete state.currentUser.booking;
    elements.client.bookingContainer.classList.add('hidden');
    renderBarbersList();
    alert('تم إلغاء الحجز بنجاح');
  } catch (error) {
    alert('حدث خطأ أثناء إلغاء الحجز: ' + error.message);
  }
}

// Queue management
async function loadBarberQueue() {
  if (!state.currentUser || state.currentUser.type !== 'barber') return;
  
  elements.barber.queue.innerHTML = '';
  
  const queueRef = ref(database, `barbers/${state.currentUser.id}/queue`);
  
  // Clean up previous listener if exists
  if (state.queueListeners[state.currentUser.id]) {
    off(state.queueListeners[state.currentUser.id]);
  }
  
  state.queueListeners[state.currentUser.id] = onValue(queueRef, (snapshot) => {
    const queue = snapshot.val() || {};
    elements.barber.queue.innerHTML = '';
    
    if (Object.keys(queue).length === 0) {
      elements.barber.queue.innerHTML = '<li>لا يوجد عملاء في قائمة الانتظار</li>';
      return;
    }
    
    Object.entries(queue).forEach(([bookingId, booking], index) => {
      const queueItem = document.createElement('li');
      queueItem.className = 'queue-item';
      
      queueItem.innerHTML = `
        <div class="queue-info">
          <div class="queue-position">الرقم ${index + 1}</div>
          <div class="queue-name">${booking.clientName}</div>
          <div class="queue-phone">${booking.clientPhone || 'غير متوفر'}</div>
          <div class="queue-time">${new Date(booking.timestamp).toLocaleString()}</div>
        </div>
        ${index === 0 ? `<button class="delete-btn" onclick="completeClient('${state.currentUser.id}', '${bookingId}')"><i class="fas fa-check"></i></button>` : ''}
      `;
      
      elements.barber.queue.appendChild(queueItem);
    });
  });
}

async function completeClient(barberId, bookingId) {
  try {
    await remove(ref(database, `barbers/${barberId}/queue/${bookingId}`));
    alert('تم إنهاء خدمة العميل بنجاح');
  } catch (error) {
    alert('حدث خطأ أثناء إنهاء الخدمة: ' + error.message);
  }
}

// Search functionality
function filterBarbers() {
  const searchTerm = elements.client.citySearch.value.trim().toLowerCase();
  const barberCards = document.querySelectorAll('.barber-card');
  
  barberCards.forEach(card => {
    const cityElement = card.querySelector('.city-name');
    if (cityElement) {
      const city = cityElement.textContent.toLowerCase();
      card.style.display = city.includes(searchTerm) ? 'flex' : 'none';
    }
  });
}

// Logout function
async function logout() {
  try {
    // Clean up all listeners
    Object.values(state.queueListeners).forEach(off);
    if (state.barbersListener) off(state.barbersListener);
    
    await signOut(auth);
    state.currentUser = null;
    state.currentUserType = null;
    state.queueListeners = {};
    state.barbersListener = null;
    
    // Clear forms
    utils.clearForm(elements.client);
    utils.clearForm(elements.barber);
    
    showScreen('roleSelection');
  } catch (error) {
    alert('حدث خطأ أثناء تسجيل الخروج: ' + error.message);
  }
}

// Initialize app
function init() {
  // Set up event listeners
  elements.client.citySearch.addEventListener('input', utils.debounce(filterBarbers, 300));
  
  // Make functions available globally
  window.showScreen = showScreen;
  window.clientLogin = clientLogin;
  window.barberLogin = barberLogin;
  window.barberSignup = barberSignup;
  window.showBarberSignup = showBarberSignup;
  window.showBarberLogin = showBarberLogin;
  window.bookAppointment = bookAppointment;
  window.completeClient = completeClient;
  window.filterBarbers = filterBarbers;
  window.logout = logout;
  
  // Auth state observer
  onAuthStateChanged(auth, (user) => {
    if (user && state.currentUserType === 'barber') {
      showBarberDashboard();
      loadBarberQueue();
    }
  });
  
  // Show initial screen
  showScreen('roleSelection');
}

// Start the app
init();
