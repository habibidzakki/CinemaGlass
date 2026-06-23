/**
 * CineGlass - FrontEnd Application Script
 * Implements full-stack routing, authentication, seat selection, digital ticket render,
 * CRUD forms for admin (films, studios, showtimes), and custom confirmation overlays.
 */

// Global Application State
const STATE = {
    user: null,
    films: [],
    studios: [],
    showtimes: [],
    bookings: [],
    selectedShowtime: null,
    selectedSeats: [],
    currentView: 'view-login',
    activeGenreFilter: 'all',
    searchQuery: '',
};

// UI Elements Cache
const el = {
    // Layout
    header: document.getElementById('main-header'),
    navBar: document.getElementById('main-nav-bar'),
    navItems: document.getElementById('nav-items-container'),
    viewHolder: document.getElementById('view-holder'),
    userNameDisplay: document.getElementById('user-display-name'),
    userRoleDisplay: document.getElementById('user-display-role'),
    btnLogout: document.getElementById('btn-logout'),
    logo: document.getElementById('btn-logo'),
    
    // Forms
    formLogin: document.getElementById('form-login'),
    formRegister: document.getElementById('form-register'),
    formEditProfile: document.getElementById('form-edit-profile'),
    
    // Auth inputs
    loginUser: document.getElementById('login-username'),
    loginPass: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    regFullname: document.getElementById('reg-fullname'),
    regEmail: document.getElementById('reg-email'),
    regPhone: document.getElementById('reg-phone'),
    regUser: document.getElementById('reg-username'),
    regPass: document.getElementById('reg-password'),
    regError: document.getElementById('reg-error'),
    
    // Links
    linkToRegister: document.getElementById('link-to-register'),
    linkToLogin: document.getElementById('link-to-login'),
    
    // Customer Home
    filmSearch: document.getElementById('film-search'),
    movieGrid: document.getElementById('movie-grid'),
    genreFilters: document.querySelector('.genre-filters'),
    
    // Movie Detail
    detailPoster: document.getElementById('detail-poster-img'),
    detailRating: document.getElementById('detail-rating'),
    detailTitle: document.getElementById('detail-title'),
    detailGenre: document.getElementById('detail-genre'),
    detailDuration: document.getElementById('detail-duration'),
    detailRelease: document.getElementById('detail-release'),
    detailDesc: document.getElementById('detail-description'),
    showtimeList: document.getElementById('showtime-list'),
    btnBackToHome: document.getElementById('btn-back-to-home'),
    
    // Seat Selection
    seatStudioName: document.getElementById('seat-studio-name'),
    seatFilmTitle: document.getElementById('seat-film-title'),
    seatShowtimeTime: document.getElementById('seat-showtime-time'),
    seatsGrid: document.getElementById('seats-grid'),
    summaryFilmTitle: document.getElementById('summary-film-title'),
    summaryStudioName: document.getElementById('summary-studio-name'),
    summaryTime: document.getElementById('summary-time'),
    summaryTicketPrice: document.getElementById('summary-ticket-price'),
    summarySelectedSeats: document.getElementById('summary-selected-seats'),
    summaryTotalPrice: document.getElementById('summary-total-price'),
    btnConfirmBooking: document.getElementById('btn-confirm-booking'),
    btnBackToDetail: document.getElementById('btn-back-to-detail'),
    
    // Bookings History
    bookingHistoryList: document.getElementById('booking-history-list'),
    btnBackToBookings: document.getElementById('btn-back-to-bookings'),
    
    // Ticket Detail
    ticketPoster: document.getElementById('ticket-poster-img'),
    ticketTitle: document.getElementById('ticket-title-val'),
    ticketTime: document.getElementById('ticket-time-val'),
    ticketStudio: document.getElementById('ticket-studio-val'),
    ticketSeats: document.getElementById('ticket-seats-val'),
    ticketPrice: document.getElementById('ticket-price-val'),
    ticketStatus: document.getElementById('ticket-status-val'),
    ticketId: document.getElementById('ticket-id-val'),
    ticketCustomer: document.getElementById('ticket-customer-val'),
    
    // Profile inputs
    profileUser: document.getElementById('profile-username'),
    profileFullname: document.getElementById('profile-fullname'),
    profileEmail: document.getElementById('profile-email'),
    profilePhone: document.getElementById('profile-phone'),
    profilePass: document.getElementById('profile-password'),
    profileError: document.getElementById('profile-error'),
    profileSuccess: document.getElementById('profile-success'),

    // Admin Dashboard Stats
    statFilms: document.getElementById('stat-films'),
    statShowtimes: document.getElementById('stat-showtimes'),
    statCustomers: document.getElementById('stat-customers'),
    statTickets: document.getElementById('stat-tickets'),
    statRevenue: document.getElementById('stat-revenue'),
    
    // Modals
    modalFilm: document.getElementById('modal-film'),
    modalStudio: document.getElementById('modal-studio'),
    modalShowtime: document.getElementById('modal-showtime'),
    modalConfirm: document.getElementById('modal-confirm'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmOk: document.getElementById('btn-confirm-ok'),
    
    // Toast
    toastContainer: document.getElementById('toast-container'),
};

// ================= ROUTING & VIEW CONTROLLER =================

function showView(viewId) {
    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.add('hide');
        section.classList.remove('active');
    });
    
    // Show active view
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hide');
        target.classList.add('active');
        STATE.currentView = viewId;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Toggle Nav Bars visibility based on Auth state
    if (STATE.user) {
        el.header.classList.remove('hide');
        el.navBar.classList.remove('hide');
    } else {
        el.header.classList.add('hide');
        el.navBar.classList.add('hide');
    }
    
    // Trigger view-specific data loading
    onViewLoaded(viewId);
}

function onViewLoaded(viewId) {
    // Update active state in Bottom Nav Bar
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-target') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    switch(viewId) {
        case 'view-customer-home':
            loadFilms();
            break;
        case 'view-customer-bookings':
            loadCustomerBookings();
            break;
        case 'view-customer-profile':
            fillProfileForm();
            break;
        case 'view-admin-dashboard':
            loadAdminStats();
            break;
        case 'view-admin-films':
            loadAdminFilms();
            break;
        case 'view-admin-studios':
            loadAdminStudios();
            break;
        case 'view-admin-showtimes':
            loadAdminShowtimes();
            break;
        case 'view-admin-bookings':
            loadAdminBookings();
            break;
    }
}

function renderNavBar() {
    if (!STATE.user) return;
    
    let html = '';
    if (STATE.user.role === 'admin') {
        html = `
            <button class="nav-item active" data-target="view-admin-dashboard">
                <i class="fa-solid fa-chart-pie"></i><span>Dashboard</span>
            </button>
            <button class="nav-item" data-target="view-admin-films">
                <i class="fa-solid fa-film"></i><span>Film</span>
            </button>
            <button class="nav-item" data-target="view-admin-showtimes">
                <i class="fa-solid fa-clock"></i><span>Jadwal</span>
            </button>
            <button class="nav-item" data-target="view-admin-studios">
                <i class="fa-solid fa-expand"></i><span>Studio</span>
            </button>
            <button class="nav-item" data-target="view-admin-bookings">
                <i class="fa-solid fa-receipt"></i><span>Transaksi</span>
            </button>
        `;
    } else {
        html = `
            <button class="nav-item active" data-target="view-customer-home">
                <i class="fa-solid fa-clapperboard"></i><span>Bioskop</span>
            </button>
            <button class="nav-item" data-target="view-customer-bookings">
                <i class="fa-solid fa-ticket"></i><span>Tiket Saya</span>
            </button>
            <button class="nav-item" data-target="view-customer-profile">
                <i class="fa-solid fa-user-circle"></i><span>Profil</span>
            </button>
        `;
    }
    el.navItems.innerHTML = html;
    
    // Add Event Listeners to Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            showView(target);
        });
    });
}

// ================= AUTHENTICATION LOGIC =================

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const data = await response.json();
            STATE.user = data.user;
            el.userNameDisplay.textContent = STATE.user.full_name;
            el.userRoleDisplay.textContent = STATE.user.role;
            renderNavBar();
            if (STATE.user.role === 'admin') {
                showView('view-admin-dashboard');
            } else {
                showView('view-customer-home');
            }
        } else {
            STATE.user = null;
            showView('view-login');
        }
    } catch (err) {
        console.error('Auth check failure:', err);
        STATE.user = null;
        showView('view-login');
    }
}

// Login
el.formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.loginError.textContent = '';
    
    const username = el.loginUser.value.trim();
    const password = el.loginPass.value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            STATE.user = data.user;
            el.userNameDisplay.textContent = STATE.user.full_name;
            el.userRoleDisplay.textContent = STATE.user.role;
            el.formLogin.reset();
            showToast(data.message, 'success');
            renderNavBar();
            if (STATE.user.role === 'admin') {
                showView('view-admin-dashboard');
            } else {
                showView('view-customer-home');
            }
        } else {
            el.loginError.textContent = data.message;
        }
    } catch (err) {
        el.loginError.textContent = 'Gagal terhubung ke server.';
    }
});

// Register
el.formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.regError.textContent = '';
    
    const full_name = el.regFullname.value.trim();
    const email = el.regEmail.value.trim();
    const phone = el.regPhone.value.trim();
    const username = el.regUser.value.trim();
    const password = el.regPass.value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email, full_name, phone })
        });
        
        const data = await response.json();
        if (response.ok) {
            el.formRegister.reset();
            showToast('Registrasi berhasil! Silakan masuk.', 'success');
            showView('view-login');
        } else {
            el.regError.textContent = data.message;
        }
    } catch (err) {
        el.regError.textContent = 'Gagal terhubung ke server.';
    }
});

// Logout
el.btnLogout.addEventListener('click', async () => {
    const confirmLogout = await showConfirm('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari akun Anda?');
    if (!confirmLogout) return;

    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            STATE.user = null;
            showToast('Anda berhasil keluar.', 'success');
            showView('view-login');
        }
    } catch (err) {
        showToast('Gagal memproses logout.', 'error');
    }
});

// Navigation links inside auth views
el.linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showView('view-register');
});
el.linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showView('view-login');
});

// Profile Editing
function fillProfileForm() {
    if (!STATE.user) return;
    el.profileUser.value = STATE.user.username;
    el.profileFullname.value = STATE.user.full_name || '';
    el.profileEmail.value = STATE.user.email || '';
    el.profilePhone.value = STATE.user.phone || '';
    el.profilePass.value = '';
    el.profileError.textContent = '';
    el.profileSuccess.textContent = '';
}

el.formEditProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.profileError.textContent = '';
    el.profileSuccess.textContent = '';

    const full_name = el.profileFullname.value.trim();
    const email = el.profileEmail.value.trim();
    const phone = el.profilePhone.value.trim();
    const password = el.profilePass.value;

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, phone, password })
        });
        const data = await response.json();
        if (response.ok) {
            STATE.user = data.user;
            el.userNameDisplay.textContent = STATE.user.full_name;
            el.profileSuccess.textContent = 'Profil berhasil diperbarui!';
            showToast('Profil berhasil disimpan!', 'success');
            fillProfileForm();
        } else {
            el.profileError.textContent = data.message;
        }
    } catch (err) {
        el.profileError.textContent = 'Gagal memperbarui profil.';
    }
});


// ================= CUSTOMER: MOVIE DISPLAY & SEARCH =================

async function loadFilms() {
    try {
        const response = await fetch('/api/films');
        if (response.ok) {
            STATE.films = await response.json();
            renderMovies();
        }
    } catch (err) {
        console.error('Failed to load films:', err);
    }
}

// Rentering movie grid with search & tags
function renderMovies() {
    let filtered = STATE.films;
    
    // Text search
    if (STATE.searchQuery) {
        const q = STATE.searchQuery.toLowerCase();
        filtered = filtered.filter(f => 
            f.title.toLowerCase().includes(q) || 
            f.genre.toLowerCase().includes(q)
        );
    }

    // Genre Tag filter
    if (STATE.activeGenreFilter !== 'all') {
        const gen = STATE.activeGenreFilter.toLowerCase();
        filtered = filtered.filter(f => f.genre.toLowerCase().includes(gen));
    }

    if (filtered.length === 0) {
        el.movieGrid.innerHTML = `
            <div class="empty-state floating-glass w-100" style="grid-column: 1/-1; padding: 40px; text-align: center;">
                <i class="fa-solid fa-video-slash" style="font-size: 40px; color: var(--text-navy); margin-bottom:15px;"></i>
                <h3 style="color: var(--text-navy);">Film Tidak Ditemukan</h3>
                <p style="color: var(--text-navy); opacity: 0.8; font-size:13px; margin-top:5px;">Silakan coba kata kunci atau filter genre lainnya.</p>
            </div>
        `;
        return;
    }

    el.movieGrid.innerHTML = filtered.map(film => {
        // Generate pseudo star ratings
        const starsCount = (film.id % 2 === 0) ? 5 : 4;
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += i <= starsCount ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        }

        return `
            <article class="movie-card floating-glass" onclick="viewMovieDetails(${film.id})">
                <div class="card-poster">
                    <img src="${film.poster_url}" alt="${film.title}" onerror="this.src='https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=600'">
                    <span class="card-badge">${film.rating}</span>
                </div>
                <div class="card-body">
                    <h3>${film.title}</h3>
                    <p class="card-genre">${film.genre}</p>
                    <p class="card-duration"><i class="fa-regular fa-clock"></i> ${film.duration_minutes} Mins</p>
                    <div class="card-footer-info">
                        <div class="rating-stars">${starsHtml}</div>
                        <button class="btn-buy-card" title="Pesan Tiket"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// Genre filter click handler
el.genreFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tag')) {
        document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
        e.target.classList.add('active');
        STATE.activeGenreFilter = e.target.getAttribute('data-genre');
        renderMovies();
    }
});

// Search input handler
el.filmSearch.addEventListener('input', (e) => {
    STATE.searchQuery = e.target.value.trim();
    renderMovies();
});

// Quick Booking from Hero Banner
document.querySelector('.btn-quick-booking').addEventListener('click', (e) => {
    const id = e.currentTarget.getAttribute('data-film-id');
    viewMovieDetails(parseInt(id));
});


// ================= CUSTOMER: MOVIE DETAILS & SHOWTIME SELECT =================

async function viewMovieDetails(filmId) {
    const film = STATE.films.find(f => f.id === filmId);
    if (!film) return;

    el.detailPoster.src = film.poster_url;
    el.detailPoster.onerror = () => { el.detailPoster.src = 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=600'; };
    el.detailRating.textContent = film.rating;
    el.detailTitle.textContent = film.title;
    el.detailGenre.innerHTML = `<i class="fa-solid fa-film"></i> ${film.genre}`;
    el.detailDuration.innerHTML = `<i class="fa-regular fa-clock"></i> ${film.duration_minutes} Menit`;
    
    // Format Release Date
    const rDate = film.release_date ? new Date(film.release_date).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : '-';
    el.detailRelease.innerHTML = `<i class="fa-regular fa-calendar"></i> Rilis: ${rDate}`;
    el.detailDesc.textContent = film.description || 'Tidak ada deskripsi sinopsis untuk film ini.';

    // Load Showtimes for this film
    el.showtimeList.innerHTML = `<div class="w-100 text-center" style="grid-column: 1/-1; padding: 20px; color: var(--text-navy); font-weight:600;"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat jadwal tayang...</div>`;
    showView('view-movie-detail');

    try {
        const response = await fetch('/api/showtimes');
        if (response.ok) {
            const allShowtimes = await response.json();
            const filmShowtimes = allShowtimes.filter(s => s.film_id === filmId);
            
            if (filmShowtimes.length === 0) {
                el.showtimeList.innerHTML = `
                    <div class="empty-state floating-glass w-100" style="grid-column: 1/-1; padding: 30px; text-align: center;">
                        <i class="fa-regular fa-calendar-times" style="font-size: 30px; color: var(--text-navy); margin-bottom: 10px;"></i>
                        <h4 style="color: var(--text-navy);">Belum Ada Jadwal Tayang</h4>
                        <p style="color: var(--text-navy); opacity: 0.8; font-size:12px; margin-top:3px;">Saat ini film ini sedang tidak dijadwalkan tayang. Silakan pilih film lain.</p>
                    </div>
                `;
                return;
            }

            el.showtimeList.innerHTML = filmShowtimes.map(st => {
                const dateObj = new Date(st.show_time);
                const formatTime = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                const formatDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                
                return `
                    <div class="showtime-card floating-glass" onclick="selectShowtime(${st.id})">
                        <div class="st-studio">${st.studio_name}</div>
                        <div class="st-time"><i class="fa-regular fa-clock"></i> ${formatTime}</div>
                        <div class="st-date">${formatDate}</div>
                        <div class="st-price">Rp${parseFloat(st.price).toLocaleString('id-ID')}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        el.showtimeList.innerHTML = `<div class="w-100 text-center text-danger" style="grid-column: 1/-1;">Gagal memuat jadwal tayang.</div>`;
    }
}

el.btnBackToHome.addEventListener('click', () => showView('view-customer-home'));


// ================= CUSTOMER: SEAT SELECTION & BOOKING =================

async function selectShowtime(showtimeId) {
    STATE.selectedSeats = [];
    el.btnConfirmBooking.classList.add('disabled');
    el.btnConfirmBooking.disabled = true;

    try {
        const response = await fetch(`/api/showtimes/${showtimeId}/seats`);
        if (response.ok) {
            const data = await response.json();
            STATE.selectedShowtime = data;
            
            // Render seat selection layout details
            const film = STATE.films.find(f => f.title === el.detailTitle.textContent);
            el.seatStudioName.textContent = data.studio_name;
            el.seatFilmTitle.textContent = el.detailTitle.textContent;
            
            // Format showtime details
            const filmShow = await fetch('/api/showtimes').then(r => r.json());
            const curShow = filmShow.find(s => s.id === showtimeId);
            const dateObj = new Date(curShow.show_time);
            const formattedTime = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) + ' - ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
            
            el.seatShowtimeTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${formattedTime}`;
            
            // Update invoice layout
            el.summaryFilmTitle.textContent = el.detailTitle.textContent;
            el.summaryStudioName.textContent = data.studio_name;
            el.summaryTime.textContent = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
            el.summaryTicketPrice.textContent = `Rp${parseFloat(data.price).toLocaleString('id-ID')}`;
            
            updateBookingSummary();
            buildSeatsGrid(data.rows_count, data.cols_count, data.booked_seats);
            showView('view-seat-selection');
        }
    } catch (err) {
        showToast('Gagal memuat denah kursi bioskop.', 'error');
    }
}

// Generate Seat Grid row/cols
function buildSeatsGrid(rowsCount, colsCount, bookedSeats) {
    el.seatsGrid.innerHTML = '';
    
    // Style grid columns
    el.seatsGrid.style.gridTemplateColumns = `auto repeat(${colsCount}, 32px)`;
    
    // Add Row markers and seat nodes
    for (let r = 0; r < rowsCount; r++) {
        const rowChar = String.fromCharCode(65 + r); // A, B, C...
        
        // Append row label at the start
        const labelNode = document.createElement('div');
        labelNode.className = 'row-label';
        labelNode.textContent = rowChar;
        el.seatsGrid.appendChild(labelNode);
        
        for (let c = 1; c <= colsCount; c++) {
            const seatNumber = `${rowChar}${c}`;
            const seatNode = document.createElement('div');
            
            // Check status
            const isBooked = bookedSeats.includes(seatNumber);
            seatNode.className = `seat ${isBooked ? 'occupied' : 'available'}`;
            seatNode.textContent = seatNumber;
            seatNode.setAttribute('data-seat', seatNumber);
            
            if (!isBooked) {
                seatNode.addEventListener('click', () => toggleSeatSelection(seatNumber));
            }
            
            el.seatsGrid.appendChild(seatNode);
        }
    }
}

// Select/Deselect seat
function toggleSeatSelection(seatNumber) {
    const idx = STATE.selectedSeats.indexOf(seatNumber);
    const seatEl = el.seatsGrid.querySelector(`[data-seat="${seatNumber}"]`);
    
    if (idx > -1) {
        // Deselect
        STATE.selectedSeats.splice(idx, 1);
        if (seatEl) seatEl.classList.remove('selected');
    } else {
        // Select
        STATE.selectedSeats.push(seatNumber);
        if (seatEl) seatEl.classList.add('selected');
    }
    
    updateBookingSummary();
}

// Re-calculate pricing
function updateBookingSummary() {
    if (STATE.selectedSeats.length === 0) {
        el.summarySelectedSeats.innerHTML = '<span style="font-weight:600; opacity:0.6;">-</span>';
        el.summaryTotalPrice.textContent = 'Rp0';
        el.btnConfirmBooking.classList.add('disabled');
        el.btnConfirmBooking.disabled = true;
    } else {
        el.summarySelectedSeats.innerHTML = STATE.selectedSeats
            .sort()
            .map(s => `<span class="seat-badge">${s}</span>`)
            .join('');
            
        const total = STATE.selectedSeats.length * parseFloat(STATE.selectedShowtime.price);
        el.summaryTotalPrice.textContent = `Rp${total.toLocaleString('id-ID')}`;
        el.btnConfirmBooking.classList.remove('disabled');
        el.btnConfirmBooking.disabled = false;
    }
}

// Book Ticket Submit
el.btnConfirmBooking.addEventListener('click', async () => {
    if (STATE.selectedSeats.length === 0) return;
    
    const count = STATE.selectedSeats.length;
    const seatsList = STATE.selectedSeats.sort().join(', ');
    const priceStr = el.summaryTotalPrice.textContent;
    
    const proceed = await showConfirm(
        'Beli Tiket Bioskop',
        `Apakah Anda yakin ingin memesan ${count} tiket (${seatsList}) seharga ${priceStr}?`
    );
    
    if (!proceed) return;

    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                showtime_id: STATE.selectedShowtime.showtime_id,
                seats: STATE.selectedSeats
            })
        });

        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            showView('view-customer-bookings');
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal memproses pemesanan tiket.', 'error');
    }
});

el.btnBackToDetail.addEventListener('click', () => {
    const film = STATE.films.find(f => f.title === el.seatFilmTitle.textContent);
    if (film) viewMovieDetails(film.id);
});


// ================= CUSTOMER: BOOKING HISTORY & TICKETS =================

async function loadCustomerBookings() {
    el.bookingHistoryList.innerHTML = `<div class="text-center" style="padding: 20px; color: var(--text-navy); font-weight:600;"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat riwayat tiket...</div>`;
    
    try {
        const response = await fetch('/api/bookings');
        if (response.ok) {
            const bookings = await response.json();
            STATE.bookings = bookings;
            
            if (bookings.length === 0) {
                el.bookingHistoryList.innerHTML = `
                    <div class="empty-state floating-glass" style="padding: 50px; text-align: center;">
                        <i class="fa-solid fa-receipt" style="font-size: 45px; color: var(--text-navy); margin-bottom: 15px;"></i>
                        <h3 style="color: var(--text-navy);">Belum Ada Riwayat Pemesanan</h3>
                        <p style="color: var(--text-navy); opacity: 0.8; font-size:13px; margin-top:5px;">Anda belum melakukan pemesanan tiket film apa pun.</p>
                        <button class="btn-primary-ios margin-top-large" onclick="showView('view-customer-home')">Cari Film Favorit <span class="gloss-layer"></span></button>
                    </div>
                `;
                return;
            }

            el.bookingHistoryList.innerHTML = bookings.map(b => {
                const dateObj = new Date(b.show_time);
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                
                const totalCost = b.seats.length * parseFloat(b.price);
                const statusLabel = b.status === 'booked' ? 'Telah Dipesan' : 'Dibatalkan';
                
                let actionButtons = `<button class="btn-secondary-ios" onclick="renderTicketDetails(${b.id})"><i class="fa-solid fa-eye"></i> E-Ticket</button>`;
                if (b.status === 'booked') {
                    actionButtons += `<button class="btn-danger-ios" onclick="cancelBooking(${b.id})"><i class="fa-solid fa-trash-can"></i> Batalkan</button>`;
                }

                return `
                    <div class="history-item-card floating-glass">
                        <div class="hist-poster">
                            <img src="${b.film_poster}" alt="${b.film_title}" onerror="this.src='https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=200'">
                        </div>
                        <div class="hist-details">
                            <h3 class="hist-title">${b.film_title}</h3>
                            <p class="hist-meta"><i class="fa-solid fa-expand"></i> ${b.studio_name} &bull; <i class="fa-solid fa-calendar"></i> ${dateStr} pukul ${timeStr}</p>
                            <p class="hist-seats"><i class="fa-solid fa-chair"></i> Kursi: ${b.seats.sort().join(', ')} &bull; Total: Rp${totalCost.toLocaleString('id-ID')}</p>
                        </div>
                        <div class="hist-actions">
                            <span class="hist-status ${b.status}">${statusLabel}</span>
                            ${actionButtons}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        el.bookingHistoryList.innerHTML = `<div class="text-center text-danger">Gagal memuat riwayat transaksi.</div>`;
    }
}

// Cancel booking ticket
async function cancelBooking(bookingId) {
    const booking = STATE.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const seatsList = booking.seats.sort().join(', ');
    const proceed = await showConfirm(
        'Batalkan Tiket Bioskop',
        `Apakah Anda yakin ingin membatalkan pesanan tiket Anda untuk film "${booking.film_title}" (Kursi: ${seatsList})?`
    );
    
    if (!proceed) return;

    try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'PUT'
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message, 'success');
            loadCustomerBookings();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal membatalkan tiket bioskop.', 'error');
    }
}

// View E-ticket printable dashboard
function renderTicketDetails(bookingId) {
    const b = STATE.bookings.find(x => x.id === bookingId);
    if (!b) return;

    el.ticketPoster.src = b.film_poster;
    el.ticketPoster.onerror = () => { el.ticketPoster.src = 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=200'; };
    el.ticketTitle.textContent = b.film_title;
    
    const dateObj = new Date(b.show_time);
    const timeStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' - ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    el.ticketTime.textContent = timeStr;
    el.ticketStudio.textContent = b.studio_name;
    el.ticketSeats.textContent = b.seats.sort().join(', ');
    el.ticketPrice.textContent = `Rp${parseFloat(b.price).toLocaleString('id-ID')} / tiket`;
    
    el.ticketStatus.textContent = b.status === 'booked' ? 'BOARDING PASS' : 'CANCELLED';
    el.ticketStatus.className = `ticket-status-badge ${b.status}`;
    
    el.ticketId.textContent = `ORDER ID: CG-${b.id}827`;
    el.ticketCustomer.textContent = b.customer_name || STATE.user.full_name;

    showView('view-ticket-detail');
}

el.btnBackToBookings.addEventListener('click', () => {
    if (STATE.user && STATE.user.role === 'admin') {
        showView('view-admin-bookings');
    } else {
        showView('view-customer-bookings');
    }
});


// ================= ADMIN: DASHBOARD & STATS =================

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
            const stats = await response.json();
            el.statFilms.textContent = stats.films_count;
            el.statShowtimes.textContent = stats.showtimes_count;
            el.statCustomers.textContent = stats.customers_count;
            el.statTickets.textContent = stats.tickets_sold;
            el.statRevenue.textContent = `Rp${stats.revenue.toLocaleString('id-ID')}`;
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// Dashboard quick navigation links
document.querySelectorAll('.btn-tab-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        showView(`view-${target}`);
    });
});


// ================= ADMIN: FILMS CRUD =================

async function loadAdminFilms() {
    const tbody = el.viewHolder.querySelector('#table-films tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat film...</td></tr>`;

    try {
        const response = await fetch('/api/films');
        if (response.ok) {
            const films = await response.json();
            STATE.films = films;
            
            if (films.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">Belum ada film ditambahkan.</td></tr>`;
                return;
            }

            tbody.innerHTML = films.map(f => {
                const rDate = f.release_date ? new Date(f.release_date).toLocaleDateString('id-ID') : '-';
                return `
                    <tr>
                        <td>${f.id}</td>
                        <td><img class="table-poster-thumb" src="${f.poster_url}" alt="${f.title}" onerror="this.src='https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=200'"></td>
                        <td><strong>${f.title}</strong></td>
                        <td>${f.genre}</td>
                        <td>${f.duration_minutes} mnt</td>
                        <td><span class="rating-badge" style="padding: 2px 6px; font-size:11px;">${f.rating}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-table-edit" onclick="openFilmForm(${f.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button class="btn-table-delete" onclick="deleteFilm(${f.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat film.</td></tr>`;
    }
}

// Open film modal form (Add/Edit)
window.openFilmForm = function(filmId = null) {
    const modalTitle = document.getElementById('modal-film-title');
    const form = document.getElementById('form-film');
    form.reset();

    if (filmId) {
        modalTitle.textContent = 'Edit Film';
        const film = STATE.films.find(f => f.id === filmId);
        if (film) {
            document.getElementById('form-film-id').value = film.id;
            document.getElementById('form-film-name').value = film.title;
            document.getElementById('form-film-genre').value = film.genre;
            document.getElementById('form-film-duration').value = film.duration_minutes;
            document.getElementById('form-film-rating').value = film.rating;
            document.getElementById('form-film-poster').value = film.poster_url;
            
            // Parse release date (YYYY-MM-DD)
            if (film.release_date) {
                const d = new Date(film.release_date);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                document.getElementById('form-film-release').value = `${yyyy}-${mm}-${dd}`;
            } else {
                document.getElementById('form-film-release').value = '';
            }
            document.getElementById('form-film-desc').value = film.description || '';
        }
    } else {
        modalTitle.textContent = 'Tambah Film Baru';
        document.getElementById('form-film-id').value = '';
    }

    el.modalFilm.classList.remove('hide');
};

// Form Film Submit
document.getElementById('form-film').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-film-id').value;
    
    const payload = {
        title: document.getElementById('form-film-name').value.trim(),
        genre: document.getElementById('form-film-genre').value.trim(),
        duration_minutes: document.getElementById('form-film-duration').value,
        rating: document.getElementById('form-film-rating').value,
        poster_url: document.getElementById('form-film-poster').value.trim(),
        release_date: document.getElementById('form-film-release').value || null,
        description: document.getElementById('form-film-desc').value.trim(),
    };

    const url = id ? `/api/films/${id}` : '/api/films';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message, 'success');
            el.modalFilm.classList.add('hide');
            loadAdminFilms();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal memproses simpan film.', 'error');
    }
});

// Delete Film
window.deleteFilm = async function(filmId) {
    const film = STATE.films.find(f => f.id === filmId);
    if (!film) return;

    const proceed = await showConfirm(
        'Hapus Film Permanen',
        `Apakah Anda yakin ingin menghapus film "${film.title}"? Seluruh jadwal tayang terkait juga akan dihapus.`
    );
    if (!proceed) return;

    try {
        const response = await fetch(`/api/films/${filmId}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            loadAdminFilms();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal menghapus film.', 'error');
    }
};

el.viewHolder.querySelector('#btn-add-film').addEventListener('click', () => openFilmForm());


// ================= ADMIN: STUDIOS CRUD =================

async function loadAdminStudios() {
    const tbody = el.viewHolder.querySelector('#table-studios tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat studio...</td></tr>`;

    try {
        const response = await fetch('/api/studios');
        if (response.ok) {
            const studios = await response.json();
            STATE.studios = studios;
            
            if (studios.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada studio ditambahkan.</td></tr>`;
                return;
            }

            tbody.innerHTML = studios.map(s => {
                const cap = parseInt(s.rows_count) * parseInt(s.cols_count);
                return `
                    <tr>
                        <td>${s.id}</td>
                        <td><strong>${s.name}</strong></td>
                        <td>${s.rows_count} Baris</td>
                        <td>${s.cols_count} Kolom</td>
                        <td>${cap} Kursi</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-table-edit" onclick="openStudioForm(${s.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button class="btn-table-delete" onclick="deleteStudio(${s.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat studio.</td></tr>`;
    }
}

// Open studio modal (Add/Edit)
window.openStudioForm = function(studioId = null) {
    const modalTitle = document.getElementById('modal-studio-title');
    const form = document.getElementById('form-studio');
    form.reset();

    if (studioId) {
        modalTitle.textContent = 'Edit Studio';
        const studio = STATE.studios.find(s => s.id === studioId);
        if (studio) {
            document.getElementById('form-studio-id').value = studio.id;
            document.getElementById('form-studio-name').value = studio.name;
            document.getElementById('form-studio-rows').value = studio.rows_count;
            document.getElementById('form-studio-cols').value = studio.cols_count;
        }
    } else {
        modalTitle.textContent = 'Tambah Studio Baru';
        document.getElementById('form-studio-id').value = '';
    }

    el.modalStudio.classList.remove('hide');
};

// Form Studio Submit
document.getElementById('form-studio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-studio-id').value;
    
    const payload = {
        name: document.getElementById('form-studio-name').value.trim(),
        rows_count: document.getElementById('form-studio-rows').value,
        cols_count: document.getElementById('form-studio-cols').value,
    };

    const url = id ? `/api/studios/${id}` : '/api/studios';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message, 'success');
            el.modalStudio.classList.add('hide');
            loadAdminStudios();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal menyimpan studio.', 'error');
    }
});

// Delete Studio
window.deleteStudio = async function(studioId) {
    const studio = STATE.studios.find(s => s.id === studioId);
    if (!studio) return;

    const proceed = await showConfirm(
        'Hapus Studio Permanen',
        `Apakah Anda yakin ingin menghapus studio "${studio.name}"? Jadwal tayang di studio ini akan ikut dihapus.`
    );
    if (!proceed) return;

    try {
        const response = await fetch(`/api/studios/${studioId}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            loadAdminStudios();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal menghapus studio.', 'error');
    }
};

el.viewHolder.querySelector('#btn-add-studio').addEventListener('click', () => openStudioForm());


// ================= ADMIN: SHOWTIMES CRUD =================

async function loadAdminShowtimes() {
    const tbody = el.viewHolder.querySelector('#table-showtimes tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat jadwal...</td></tr>`;

    try {
        const response = await fetch('/api/showtimes');
        if (response.ok) {
            const showtimes = await response.json();
            STATE.showtimes = showtimes;
            
            if (showtimes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada jadwal tayang ditambahkan.</td></tr>`;
                return;
            }

            tbody.innerHTML = showtimes.map(st => {
                const dateObj = new Date(st.show_time);
                const formatTime = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                
                return `
                    <tr>
                        <td>${st.id}</td>
                        <td><strong>${st.film_title}</strong></td>
                        <td>${st.studio_name}</td>
                        <td>${formatTime}</td>
                        <td>Rp${parseFloat(st.price).toLocaleString('id-ID')}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-table-edit" onclick="openShowtimeForm(${st.id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button class="btn-table-delete" onclick="deleteShowtime(${st.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat jadwal.</td></tr>`;
    }
}

// Open showtime modal form
window.openShowtimeForm = async function(showtimeId = null) {
    const modalTitle = document.getElementById('modal-showtime-title');
    const form = document.getElementById('form-showtime');
    form.reset();

    // Populate drop down menus for Films and Studios
    const filmSelect = document.getElementById('form-showtime-film');
    const studioSelect = document.getElementById('form-showtime-studio');
    
    // Fetch fresh lists to ensure dropdowns are synced
    try {
        const filmsRes = await fetch('/api/films').then(r => r.json());
        const studiosRes = await fetch('/api/studios').then(r => r.json());
        
        filmSelect.innerHTML = filmsRes.map(f => `<option value="${f.id}">${f.title} (${f.rating})</option>`).join('');
        studioSelect.innerHTML = studiosRes.map(s => `<option value="${s.id}">${s.name} (${s.rows_count}x${s.cols_count})</option>`).join('');
        
        if (showtimeId) {
            modalTitle.textContent = 'Edit Jadwal Tayang';
            const st = STATE.showtimes.find(x => x.id === showtimeId);
            if (st) {
                document.getElementById('form-showtime-id').value = st.id;
                filmSelect.value = st.film_id;
                studioSelect.value = st.studio_id;
                document.getElementById('form-showtime-price').value = st.price;
                
                // Format datetime-local format: YYYY-MM-DDTHH:MM
                const d = new Date(st.show_time);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const hh = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                document.getElementById('form-showtime-time').value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
            }
        } else {
            modalTitle.textContent = 'Tambah Jadwal Tayang';
            document.getElementById('form-showtime-id').value = '';
            // set default time to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(14, 0, 0, 0);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const dd = String(tomorrow.getDate()).padStart(2, '0');
            const hh = String(tomorrow.getHours()).padStart(2, '0');
            const min = String(tomorrow.getMinutes()).padStart(2, '0');
            document.getElementById('form-showtime-time').value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
        }

        el.modalShowtime.classList.remove('hide');
    } catch (err) {
        showToast('Gagal memuat daftar film atau studio untuk pilihan dropdown.', 'error');
    }
};

// Form Showtime Submit
document.getElementById('form-showtime').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-showtime-id').value;
    
    const payload = {
        film_id: document.getElementById('form-showtime-film').value,
        studio_id: document.getElementById('form-showtime-studio').value,
        show_time: document.getElementById('form-showtime-time').value,
        price: document.getElementById('form-showtime-price').value,
    };

    const url = id ? `/api/showtimes/${id}` : '/api/showtimes';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message, 'success');
            el.modalShowtime.classList.add('hide');
            loadAdminShowtimes();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal memproses simpan jadwal.', 'error');
    }
});

// Delete Showtime
window.deleteShowtime = async function(showtimeId) {
    const st = STATE.showtimes.find(x => x.id === showtimeId);
    if (!st) return;

    const dateObj = new Date(st.show_time);
    const timeStr = dateObj.toLocaleDateString('id-ID') + ' pukul ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    
    const proceed = await showConfirm(
        'Hapus Jadwal Tayang',
        `Apakah Anda yakin ingin menghapus jadwal film "${st.film_title}" di "${st.studio_name}" pada ${timeStr}?`
    );
    if (!proceed) return;

    try {
        const response = await fetch(`/api/showtimes/${showtimeId}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            loadAdminShowtimes();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal menghapus jadwal.', 'error');
    }
};

el.viewHolder.querySelector('#btn-add-showtime').addEventListener('click', () => openShowtimeForm());


// ================= ADMIN: MANAGE BOOKINGS =================

async function loadAdminBookings() {
    const tbody = el.viewHolder.querySelector('#table-admin-bookings tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat transaksi...</td></tr>`;

    try {
        const response = await fetch('/api/bookings');
        if (response.ok) {
            const bookings = await response.json();
            STATE.bookings = bookings;
            
            if (bookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">Belum ada transaksi pembelian.</td></tr>`;
                return;
            }

            tbody.innerHTML = bookings.map(b => {
                const dateObj = new Date(b.booking_date);
                const orderDate = dateObj.toLocaleDateString('id-ID') + ' ' + dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                
                const statusLabel = b.status === 'booked' ? 'Booked' : 'Cancelled';
                const statusClass = b.status === 'booked' ? 'success' : 'danger';
                
                let cancelBtn = '';
                if (b.status === 'booked') {
                    cancelBtn = `<button class="btn-table-delete" onclick="adminCancelBooking(${b.id})" title="Batalkan Pesanan"><i class="fa-solid fa-ban"></i></button>`;
                }
                
                return `
                    <tr>
                        <td>#${b.id}</td>
                        <td><strong>${b.customer_name}</strong></td>
                        <td>
                            <div>${b.film_title}</div>
                            <small class="text-muted">${b.studio_name}</small>
                        </td>
                        <td>${orderDate}</td>
                        <td><span class="seat-badge" style="padding: 2px 6px;">${b.seats.sort().join(', ')}</span></td>
                        <td><span class="form-success" style="color: ${b.status === 'booked' ? '#34c759' : '#ff3b30'}">${statusLabel}</span></td>
                        <td>
                            <div class="table-actions">
                                <button class="btn-table-edit" onclick="renderTicketDetails(${b.id})" title="Lihat E-Ticket"><i class="fa-solid fa-eye"></i></button>
                                ${cancelBtn}
                                <button class="btn-table-delete" style="background: rgba(0,0,0,0.1); color: #333; border: 1px solid #ccc;" onclick="adminDeleteBooking(${b.id})" title="Hapus Permanen"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat transaksi.</td></tr>`;
    }
}

// Admin Cancel Booking
window.adminCancelBooking = async function(bookingId) {
    const proceed = await showConfirm(
        'Batalkan Transaksi Pelanggan',
        `Apakah Anda yakin ingin membatalkan transaksi tiket #${bookingId} ini?`
    );
    if (!proceed) return;

    try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'PUT' });
        const data = await response.json();
        if (response.ok) {
            showToast('Transaksi berhasil dibatalkan!', 'success');
            loadAdminBookings();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal membatalkan transaksi.', 'error');
    }
};

// Admin Delete Booking Permanently
window.adminDeleteBooking = async function(bookingId) {
    const proceed = await showConfirm(
        'Hapus Transaksi Permanen',
        `Apakah Anda yakin ingin menghapus transaksi #${bookingId} secara permanen dari database?`
    );
    if (!proceed) return;

    try {
        const response = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok) {
            showToast(data.message, 'success');
            loadAdminBookings();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Gagal menghapus transaksi.', 'error');
    }
};


// ================= CUSTOM DIALOGS & OVERLAYS =================

// Show Confirmation Overlay Modal
function showConfirm(title, message) {
    return new Promise((resolve) => {
        el.confirmTitle.textContent = title;
        el.confirmMessage.textContent = message;
        el.modalConfirm.classList.remove('hide');
        
        const handleCancel = () => {
            el.modalConfirm.classList.add('hide');
            el.btnConfirmOk.removeEventListener('click', handleOk);
            el.btnConfirmCancel.removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        const handleOk = () => {
            el.modalConfirm.classList.add('hide');
            el.btnConfirmOk.removeEventListener('click', handleOk);
            el.btnConfirmCancel.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        el.btnConfirmCancel.addEventListener('click', handleCancel);
        el.btnConfirmOk.addEventListener('click', handleOk);
    });
}

// Show Custom Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-xmark"></i>';
    }
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    el.toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'viewFadeIn 0.3s ease reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                el.toastContainer.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Toggle password visibility field hook
document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const input = btn.previousElementSibling;
        const icon = btn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    });
});

// Logo Home trigger
el.logo.addEventListener('click', () => {
    if (STATE.user) {
        if (STATE.user.role === 'admin') {
            showView('view-admin-dashboard');
        } else {
            showView('view-customer-home');
        }
    }
});

// Modal close button bindings
document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-wrapper').forEach(m => m.classList.add('hide'));
    });
});

// ================= STARTUP INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
