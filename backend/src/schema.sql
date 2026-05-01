-- ============================================================
--  Travel Planner System — MySQL Schema
--  Run once:  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS TravelPlanner
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE TravelPlanner;

-- ── users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  first_name            VARCHAR(100)    NOT NULL,
  last_name             VARCHAR(100)    NOT NULL,
  username              VARCHAR(50)     NOT NULL UNIQUE,
  email                 VARCHAR(255)    NOT NULL UNIQUE,
  password_hash         VARCHAR(255)    NOT NULL,
  notifications_enabled TINYINT(1)      NOT NULL DEFAULT 1,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ── password_reset_tokens ──────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NOT NULL,
  token      VARCHAR(128)  NOT NULL UNIQUE,
  expires_at DATETIME      NOT NULL,
  used_at    DATETIME      NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── destinations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS destinations (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255)   NOT NULL,
  country     VARCHAR(100)   NOT NULL,
  description TEXT           NULL,
  latitude    DECIMAL(10,7)  NULL,
  longitude   DECIMAL(10,7)  NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ── trips ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED   NOT NULL,
  name       VARCHAR(255)   NOT NULL,
  start_date DATE           NOT NULL,
  end_date   DATE           NOT NULL,
  budget     DECIMAL(12,2)  NULL,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_trip_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── trip_destinations (junction) ───────────────────────────
CREATE TABLE IF NOT EXISTS trip_destinations (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  trip_id        INT UNSIGNED NOT NULL,
  destination_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trip_dest (trip_id, destination_id),
  CONSTRAINT fk_td_trip FOREIGN KEY (trip_id)
    REFERENCES trips (id) ON DELETE CASCADE,
  CONSTRAINT fk_td_dest FOREIGN KEY (destination_id)
    REFERENCES destinations (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── itinerary ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS itinerary (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  trip_id       INT UNSIGNED NOT NULL,
  title         VARCHAR(255) NOT NULL,
  activity_date DATE         NOT NULL,
  activity_time TIME         NULL,
  description   TEXT         NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_itin_trip FOREIGN KEY (trip_id)
    REFERENCES trips (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── expenses ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          INT UNSIGNED              NOT NULL AUTO_INCREMENT,
  trip_id     INT UNSIGNED              NOT NULL,
  amount      DECIMAL(10,2)             NOT NULL,
  category    ENUM(
                'transport',
                'accommodation',
                'food',
                'activities',
                'other'
              )                         NOT NULL DEFAULT 'other',
  description VARCHAR(255)              NULL,
  created_at  DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_exp_trip FOREIGN KEY (trip_id)
    REFERENCES trips (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── favourites ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favourites (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  destination_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fav (user_id, destination_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_dest FOREIGN KEY (destination_id)
    REFERENCES destinations (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── reviews ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  destination_id INT UNSIGNED NOT NULL,
  rating         TINYINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_rev_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_dest FOREIGN KEY (destination_id)
    REFERENCES destinations (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── shared_trips ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_trips (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  trip_id     INT UNSIGNED NOT NULL,
  share_token VARCHAR(128) NOT NULL UNIQUE,
  expires_at  DATETIME     NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_st_trip FOREIGN KEY (trip_id)
    REFERENCES trips (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  trip_id      INT UNSIGNED NULL,
  itinerary_id INT UNSIGNED NULL,
  message      TEXT         NOT NULL,
  is_read      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_trip FOREIGN KEY (trip_id)
    REFERENCES trips (id) ON DELETE SET NULL,
  CONSTRAINT fk_notif_itin FOREIGN KEY (itinerary_id)
    REFERENCES itinerary (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── seed: sample destinations ──────────────────────────────
INSERT IGNORE INTO destinations (id, name, country, description, latitude, longitude) VALUES
(1,  'Tokyo',      'Japan',   'Capital of Japan, a city of contrasts between traditional and ultramodern.', 35.6762,  139.6503),
(2,  'Kyoto',      'Japan',   'Ancient capital famous for its classical Buddhist temples and geisha culture.', 35.0116, 135.7681),
(3,  'Osaka',      'Japan',   'Vibrant port city known for its modern architecture and street food.', 34.6937,  135.5023),
(4,  'Rome',       'Italy',   'The Eternal City, home to the Colosseum, Vatican, and world-class cuisine.', 41.9028,   12.4964),
(5,  'Florence',   'Italy',   'Birthplace of the Renaissance with unmatched art and architecture.', 43.7696,   11.2558),
(6,  'Venice',     'Italy',   'A unique city built on water, renowned for its canals and gondolas.', 45.4408,   12.3155),
(7,  'Lisbon',     'Portugal','Sun-drenched capital with historic trams, hilltop castles, and fado music.', 38.7223,  -9.1393),
(8,  'Porto',      'Portugal','Famous for port wine, colourful tiles, and the Douro riverside.', 41.1579,   -8.6291),
(9,  'Paris',      'France',  'City of Light — art, fashion, gastronomy, and the Eiffel Tower.', 48.8566,    2.3522),
(10, 'Barcelona',  'Spain',   'Gaudí architecture, beaches, and vibrant nightlife on the Mediterranean.', 41.3851,   2.1734),
(11, 'Sarajevo',   'Bosnia',  'Crossroads of cultures at the heart of the Balkans.', 43.8563,   18.4131),
(12, 'Dubrovnik',  'Croatia', 'Pearl of the Adriatic, famous for its old town walls and crystal-clear sea.', 42.6507,  18.0944);
