-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS booked_seats CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS showtimes CASCADE;
DROP TABLE IF EXISTS films CASCADE;
DROP TABLE IF EXISTS studios CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer'))
);

-- 2. Studios Table
CREATE TABLE studios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    rows_count INT NOT NULL DEFAULT 8 CHECK (rows_count > 0 AND rows_count <= 15),
    cols_count INT NOT NULL DEFAULT 10 CHECK (cols_count > 0 AND cols_count <= 20)
);

-- 3. Films Table
CREATE TABLE films (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    rating VARCHAR(10) NOT NULL DEFAULT 'SU',
    poster_url TEXT,
    release_date DATE
);

-- 4. Showtimes Table
CREATE TABLE showtimes (
    id SERIAL PRIMARY KEY,
    film_id INT NOT NULL REFERENCES films(id) ON DELETE CASCADE,
    studio_id INT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    show_time TIMESTAMP NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0)
);

-- 5. Bookings Table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    showtime_id INT NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    booking_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled'))
);

-- 6. Booked Seats Table
CREATE TABLE booked_seats (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    UNIQUE(booking_id, seat_number)
);

-- Seed Studios
INSERT INTO studios (name, rows_count, cols_count) VALUES
('Studio 1 Premier', 8, 10),
('Studio 2 IMAX', 10, 12),
('Studio 3 VIP Gold', 6, 8);

-- Seed Films
INSERT INTO films (title, description, genre, duration_minutes, rating, poster_url, release_date) VALUES
('The Batman', 'Ketika si pembunuh berantai Riddler menargetkan elit kota Gotham, Batman memulai penyelidikan korupsi yang mendalam.', 'Action, Crime, Drama', 176, 'R13+', 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=600', '2022-03-04'),
('Interstellar', 'Sekelompok penjelajah melakukan perjalanan melintasi lubang cacing di luar angkasa dalam upaya untuk memastikan kelangsungan hidup umat manusia.', 'Sci-Fi, Adventure, Drama', 169, 'SU', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600', '2014-11-07'),
('Spider-Man: No Way Home', 'Identitas Spider-Man terungkap, dan Peter Parker meminta bantuan Doctor Strange untuk membuat rahasia itu kembali, tetapi mantra itu gagal.', 'Action, Adventure, Fantasy', 148, 'SU', 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=600', '2021-12-17'),
('Avatar: The Way of Water', 'Jake Sully tinggal bersama keluarga barunya di planet Pandora. Ketika ancaman lama kembali, Jake harus bekerja sama dengan tentara Na''vi.', 'Sci-Fi, Action, Adventure', 192, 'SU', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600', '2022-12-16'),
('Dune: Part Two', 'Paul Atreides bersatu kembali dengan Chani dan kaum Fremen sambil membalas dendam terhadap para konspirator yang menghancurkan keluarganya.', 'Sci-Fi, Adventure', 166, 'R13+', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600', '2024-03-01');

-- Seed Showtimes (dynamic times relative to now)
INSERT INTO showtimes (film_id, studio_id, show_time, price) VALUES
(1, 1, CURRENT_DATE + TIME '13:00:00', 45000.00),
(1, 1, CURRENT_DATE + TIME '17:00:00', 45000.00),
(2, 2, CURRENT_DATE + TIME '14:30:00', 60000.00),
(2, 2, CURRENT_DATE + TIME '19:00:00', 60000.00),
(3, 1, CURRENT_DATE + TIME '10:00:00', 45000.00),
(3, 3, CURRENT_DATE + TIME '16:00:00', 75000.00),
(4, 2, CURRENT_DATE + TIME '11:00:00', 60000.00),
(4, 3, CURRENT_DATE + TIME '19:30:00', 75000.00),
(5, 3, CURRENT_DATE + TIME '13:00:00', 75000.00),
(5, 2, CURRENT_DATE + TIME '22:15:00', 60000.00);
