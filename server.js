const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cinemasecretkey999';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database Pool Configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'cinema_db',
    port: parseInt(process.env.DB_PORT || '5432'),
});

// Test Connection and Run DDL if needed
async function initializeDatabase() {
    try {
        console.log('Checking database connection...');
        const client = await pool.connect();
        console.log('Connected to PostgreSQL successfully!');

        // Check if users table exists
        const res = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `);

        const tableExists = res.rows[0].exists;
        if (!tableExists) {
            console.log('Database tables not found. Running schema.sql...');
            const sqlPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(sqlPath)) {
                const schemaSql = fs.readFileSync(sqlPath, 'utf8');
                await client.query(schemaSql);
                console.log('Schema successfully initialized!');
            } else {
                console.warn('schema.sql not found! Please make sure it is in the project root.');
            }
        } else {
            console.log('Database tables verified.');
        }

        // Seed default users if users table is empty
        const userCountRes = await client.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(userCountRes.rows[0].count);
        if (userCount === 0) {
            console.log('Seeding default users (admin & customer)...');
            const adminPasswordHash = await bcrypt.hash('admin123', 10);
            const customerPasswordHash = await bcrypt.hash('customer123', 10);

            await client.query(`
                INSERT INTO users (username, password, email, full_name, phone, role) VALUES 
                ('admin', $1, 'admin@cinema.com', 'Administrator', '08123456789', 'admin'),
                ('customer', $2, 'customer@cinema.com', 'John Customer', '08987654321', 'customer');
            `, [adminPasswordHash, customerPasswordHash]);
            console.log('Default users seeded successfully! (admin:admin123, customer:customer123)');
        }

        client.release();
    } catch (err) {
        console.error('Error during database initialization:', err.message);
        console.warn('Make sure PostgreSQL is running, the database is created, and your credentials in .env are correct.');
    }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
    if (!token) {
        return res.status(401).json({ message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Sesi kedaluwarsa atau token tidak valid.' });
        }
        req.user = user;
        next();
    });
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ message: `Akses ditolak. Endpoint ini memerlukan hak akses ${role}.` });
        }
        next();
    };
};

// ================= AUTHENTICATION ENDPOINTS =================

// Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email, full_name, phone, role } = req.body;
    if (!username || !password || !email || !full_name) {
        return res.status(400).json({ message: 'Username, password, email, dan nama lengkap wajib diisi.' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'customer';

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password, email, full_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, full_name, role',
            [username, passwordHash, email, full_name, phone || '', assignedRole]
        );
        res.status(201).json({ message: 'Registrasi berhasil!', user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Username atau Email sudah terdaftar.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Username atau password salah.' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Username atau password salah.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.json({
            message: 'Login berhasil!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// Get Current User (Me)
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Edit Profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    const { full_name, email, phone, password } = req.body;
    if (!full_name || !email) {
        return res.status(400).json({ message: 'Nama lengkap dan email tidak boleh kosong.' });
    }

    try {
        let query = 'UPDATE users SET full_name = $1, email = $2, phone = $3';
        let params = [full_name, email, phone || ''];

        if (password && password.trim() !== '') {
            const passwordHash = await bcrypt.hash(password, 10);
            query += ', password = $4 WHERE id = $5 RETURNING id, username, email, full_name, phone, role';
            params.push(passwordHash, req.user.id);
        } else {
            query += ' WHERE id = $4 RETURNING id, username, email, full_name, phone, role';
            params.push(req.user.id);
        }

        const result = await pool.query(query, params);
        res.json({ message: 'Profil berhasil diperbarui!', user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout berhasil!' });
});


// ================= FILMS CRUD ENDPOINTS =================

// Read All Films
app.get('/api/films', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM films ORDER BY title ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal mengambil data film.' });
    }
});

// Create Film (Admin Only)
app.post('/api/films', authenticateToken, requireRole('admin'), async (req, res) => {
    const { title, description, genre, duration_minutes, rating, poster_url, release_date } = req.body;
    if (!title || !duration_minutes) {
        return res.status(400).json({ message: 'Judul film dan durasi wajib diisi.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO films (title, description, genre, duration_minutes, rating, poster_url, release_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                title,
                description || '',
                genre || '',
                parseInt(duration_minutes),
                rating || 'SU',
                poster_url || 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=600',
                release_date || null
            ]
        );
        res.status(201).json({ message: 'Film berhasil ditambahkan!', film: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal menambahkan film.' });
    }
});

// Update Film (Admin Only)
app.put('/api/films/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { title, description, genre, duration_minutes, rating, poster_url, release_date } = req.body;

    if (!title || !duration_minutes) {
        return res.status(400).json({ message: 'Judul film dan durasi wajib diisi.' });
    }

    try {
        const result = await pool.query(
            `UPDATE films SET title = $1, description = $2, genre = $3, duration_minutes = $4, rating = $5, poster_url = $6, release_date = $7
             WHERE id = $8 RETURNING *`,
            [title, description, genre, parseInt(duration_minutes), rating, poster_url, release_date || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Film tidak ditemukan.' });
        }
        res.json({ message: 'Film berhasil diperbarui!', film: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal memperbarui film.' });
    }
});

// Delete Film (Admin Only)
app.delete('/api/films/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM films WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Film tidak ditemukan.' });
        }
        res.json({ message: 'Film berhasil dihapus!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal menghapus film.' });
    }
});


// ================= STUDIOS CRUD ENDPOINTS =================

// Read All Studios
app.get('/api/studios', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM studios ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal mengambil data studio.' });
    }
});

// Create Studio (Admin Only)
app.post('/api/studios', authenticateToken, requireRole('admin'), async (req, res) => {
    const { name, rows_count, cols_count } = req.body;
    if (!name || !rows_count || !cols_count) {
        return res.status(400).json({ message: 'Nama studio, jumlah baris, dan jumlah kolom wajib diisi.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO studios (name, rows_count, cols_count) VALUES ($1, $2, $3) RETURNING *',
            [name, parseInt(rows_count), parseInt(cols_count)]
        );
        res.status(201).json({ message: 'Studio berhasil ditambahkan!', studio: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Nama studio sudah digunakan.' });
        }
        console.error(err);
        res.status(500).json({ message: 'Gagal menambahkan studio.' });
    }
});

// Update Studio (Admin Only)
app.put('/api/studios/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { name, rows_count, cols_count } = req.body;

    if (!name || !rows_count || !cols_count) {
        return res.status(400).json({ message: 'Nama studio, jumlah baris, dan jumlah kolom wajib diisi.' });
    }

    try {
        const result = await pool.query(
            'UPDATE studios SET name = $1, rows_count = $2, cols_count = $3 WHERE id = $4 RETURNING *',
            [name, parseInt(rows_count), parseInt(cols_count), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Studio tidak ditemukan.' });
        }
        res.json({ message: 'Studio berhasil diperbarui!', studio: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal memperbarui studio.' });
    }
});

// Delete Studio (Admin Only)
app.delete('/api/studios/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM studios WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Studio tidak ditemukan.' });
        }
        res.json({ message: 'Studio berhasil dihapus!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal menghapus studio.' });
    }
});


// ================= SHOWTIMES CRUD ENDPOINTS =================

// Read All Showtimes
app.get('/api/showtimes', async (req, res) => {
    try {
        const query = `
            SELECT s.*, f.title as film_title, f.poster_url as film_poster, f.duration_minutes as film_duration, 
                   std.name as studio_name, std.rows_count, std.cols_count
            FROM showtimes s
            JOIN films f ON s.film_id = f.id
            JOIN studios std ON s.studio_id = std.id
            ORDER BY s.show_time ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal mengambil data jadwal tayang.' });
    }
});

// Create Showtime (Admin Only)
app.post('/api/showtimes', authenticateToken, requireRole('admin'), async (req, res) => {
    const { film_id, studio_id, show_time, price } = req.body;
    if (!film_id || !studio_id || !show_time || !price) {
        return res.status(400).json({ message: 'Film, Studio, Waktu Tayang, dan Harga wajib diisi.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO showtimes (film_id, studio_id, show_time, price) VALUES ($1, $2, $3, $4) RETURNING *',
            [parseInt(film_id), parseInt(studio_id), show_time, parseFloat(price)]
        );
        res.status(201).json({ message: 'Jadwal tayang berhasil ditambahkan!', showtime: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal menambahkan jadwal tayang.' });
    }
});

// Update Showtime (Admin Only)
app.put('/api/showtimes/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { film_id, studio_id, show_time, price } = req.body;

    if (!film_id || !studio_id || !show_time || !price) {
        return res.status(400).json({ message: 'Film, Studio, Waktu Tayang, dan Harga wajib diisi.' });
    }

    try {
        const result = await pool.query(
            'UPDATE showtimes SET film_id = $1, studio_id = $2, show_time = $3, price = $4 WHERE id = $5 RETURNING *',
            [parseInt(film_id), parseInt(studio_id), show_time, parseFloat(price), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Jadwal tayang tidak ditemukan.' });
        }
        res.json({ message: 'Jadwal tayang berhasil diperbarui!', showtime: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal memperbarui jadwal tayang.' });
    }
});

// Delete Showtime (Admin Only)
app.delete('/api/showtimes/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM showtimes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Jadwal tayang tidak ditemukan.' });
        }
        res.json({ message: 'Jadwal tayang berhasil dihapus!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal menghapus jadwal tayang.' });
    }
});


// ================= SEATS ENDPOINT =================

// Get seats availability
app.get('/api/showtimes/:id/seats', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Get studio config
        const showtimeRes = await pool.query(`
            SELECT s.*, std.rows_count, std.cols_count, std.name as studio_name 
            FROM showtimes s
            JOIN studios std ON s.studio_id = std.id
            WHERE s.id = $1
        `, [id]);

        if (showtimeRes.rows.length === 0) {
            return res.status(404).json({ message: 'Jadwal tayang tidak ditemukan.' });
        }

        const showtime = showtimeRes.rows[0];

        // Get already booked seats for this showtime (excluding cancelled bookings)
        const bookedRes = await pool.query(`
            SELECT bs.seat_number 
            FROM booked_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE b.showtime_id = $1 AND b.status = 'booked'
        `, [id]);

        const bookedSeats = bookedRes.rows.map(row => row.seat_number);

        res.json({
            showtime_id: showtime.id,
            studio_name: showtime.studio_name,
            rows_count: showtime.rows_count,
            cols_count: showtime.cols_count,
            price: showtime.price,
            booked_seats: bookedSeats
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal mengambil denah kursi.' });
    }
});


// ================= BOOKINGS CRUD ENDPOINTS =================

// Read Bookings
app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT b.id, b.booking_date, b.status, b.user_id, u.full_name as customer_name,
                   s.show_time, s.price, f.title as film_title, f.poster_url as film_poster, std.name as studio_name,
                   ARRAY_AGG(bs.seat_number) as seats
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN showtimes s ON b.showtime_id = s.id
            JOIN films f ON s.film_id = f.id
            JOIN studios std ON s.studio_id = std.id
            JOIN booked_seats bs ON bs.booking_id = b.id
        `;

        const params = [];
        if (req.user.role !== 'admin') {
            query += ' WHERE b.user_id = $1 ';
            params.push(req.user.id);
        }

        query += ` GROUP BY b.id, b.booking_date, b.status, b.user_id, u.full_name, s.show_time, s.price, f.title, f.poster_url, std.name
                   ORDER BY b.booking_date DESC `;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal mengambil riwayat transaksi.' });
    }
});

// Create Booking (Customer Only)
app.post('/api/bookings', authenticateToken, async (req, res) => {
    const { showtime_id, seats } = req.body;
    if (!showtime_id || !seats || !Array.isArray(seats) || seats.length === 0) {
        return res.status(400).json({ message: 'Jadwal tayang dan setidaknya satu nomor kursi harus dipilih.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if any of the chosen seats are already booked
        const checkQuery = `
            SELECT bs.seat_number 
            FROM booked_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE b.showtime_id = $1 AND b.status = 'booked' AND bs.seat_number = ANY($2)
        `;
        const checkRes = await client.query(checkQuery, [showtime_id, seats]);
        if (checkRes.rows.length > 0) {
            const alreadyBooked = checkRes.rows.map(r => r.seat_number).join(', ');
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Kursi [${alreadyBooked}] sudah dipesan oleh orang lain. Silakan pilih kursi lain.` });
        }

        // Insert booking
        const bookingRes = await client.query(
            'INSERT INTO bookings (user_id, showtime_id, status) VALUES ($1, $2, \'booked\') RETURNING id',
            [req.user.id, showtime_id]
        );
        const bookingId = bookingRes.rows[0].id;

        // Insert seats
        for (const seat of seats) {
            await client.query(
                'INSERT INTO booked_seats (booking_id, seat_number) VALUES ($1, $2)',
                [bookingId, seat]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Pemesanan tiket berhasil!', bookingId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Gagal melakukan pemesanan tiket.' });
    } finally {
        client.release();
    }
});

// Update/Cancel Booking
app.put('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Verify booking ownership or admin status
        const bookingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ message: 'Pemesanan tidak ditemukan.' });
        }

        const booking = bookingRes.rows[0];
        if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Anda tidak memiliki hak untuk membatalkan pesanan ini.' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Pemesanan ini sudah dibatalkan sebelumnya.' });
        }

        const result = await pool.query(
            'UPDATE bookings SET status = \'cancelled\' WHERE id = $1 RETURNING *',
            [id]
        );

        res.json({ message: 'Pemesanan tiket berhasil dibatalkan!', booking: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal membatalkan pemesanan.' });
    }
});

// Delete Booking (Admin Only)
app.delete('/api/bookings/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pemesanan tidak ditemukan.' });
        }
        res.json({ message: 'Pemesanan berhasil dihapus secara permanen!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal menghapus pemesanan.' });
    }
});


// ================= ADMIN STATS ENDPOINT =================

// Get statistics
app.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const filmsCount = await pool.query('SELECT COUNT(*) FROM films');
        const activeShowtimes = await pool.query('SELECT COUNT(*) FROM showtimes');
        const totalCustomers = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'customer'");

        // Sum total revenue from completed (non-cancelled) bookings
        const revenueRes = await pool.query(`
            SELECT COALESCE(SUM(s.price), 0) as total
            FROM booked_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            JOIN showtimes s ON b.showtime_id = s.id
            WHERE b.status = 'booked'
        `);

        // Total tickets sold
        const ticketsSold = await pool.query(`
            SELECT COUNT(*) 
            FROM booked_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE b.status = 'booked'
        `);

        res.json({
            films_count: parseInt(filmsCount.rows[0].count),
            showtimes_count: parseInt(activeShowtimes.rows[0].count),
            customers_count: parseInt(totalCustomers.rows[0].count),
            tickets_sold: parseInt(ticketsSold.rows[0].count),
            revenue: parseFloat(revenueRes.rows[0].total)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Gagal mengambil data statistik.' });
    }
});


// ================= REDIRECT ENDPOINT =================

// HTTP 302 Redirect to Google/browser as instructed by lecturer
app.get('/api/redirect-google', (req, res) => {
    console.log('Redirecting user to Google...');
    res.redirect(302, 'https://www.google.com');
});


// Serve Single Page Application UI
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database then start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`SERVER RUNNING ON: http://localhost:${PORT}`);
        console.log(`REDIRECT GOOGLE AT: http://localhost:${PORT}/api/redirect-google`);
        console.log(`==================================================`);
    });
});