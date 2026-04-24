-- VulHealth schema + seed
-- Passwords are MD5 (VULN A02 Cryptographic Failures)

CREATE TABLE users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role         TEXT NOT NULL,          -- patient | doctor | receptionist | admin
  fullName     TEXT,
  dob          TEXT,
  phone        TEXT,
  avatarUrl    TEXT,
  departmentId INTEGER,
  bio          TEXT,
  createdAt    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  headDoctorId INTEGER
);

CREATE TABLE appointments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patientId    INTEGER NOT NULL,
  doctorId     INTEGER NOT NULL,
  departmentId INTEGER,
  scheduledAt  TEXT NOT NULL,
  status       TEXT DEFAULT 'booked',     -- booked | checked_in | done | cancelled
  reason       TEXT,
  createdAt    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medical_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patientId      INTEGER NOT NULL,
  doctorId       INTEGER NOT NULL,
  appointmentId  INTEGER,
  diagnosis      TEXT,
  prescription   TEXT,
  notes          TEXT,
  attachmentPath TEXT,
  createdAt      TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  fromUserId INTEGER NOT NULL,
  toUserId   INTEGER NOT NULL,
  subject    TEXT,
  body       TEXT,                        -- HTML — stored XSS sink
  createdAt  TEXT DEFAULT CURRENT_TIMESTAMP,
  readAt     TEXT
);

CREATE TABLE password_resets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT NOT NULL,
  token     TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  usedAt    TEXT
);

-- ====== Seed: Departments ======
INSERT INTO departments (id, name, description) VALUES
  (1, 'Cardiology',        'Heart, vascular system, hypertension, arrhythmia.'),
  (2, 'Internal Medicine', 'General adult medicine, diabetes, chronic disease.'),
  (3, 'Dermatology',       'Skin, hair, nails, allergy dermatitis.'),
  (4, 'Pediatrics',        'Children health from newborn to 16.'),
  (5, 'Obstetrics',        'Pregnancy, childbirth, postpartum care.'),
  (6, 'Radiology',         'X-ray, CT, MRI, ultrasound imaging.');

-- ====== Seed: Users ======
-- Admin (1)
INSERT INTO users (id, username, email, passwordHash, role, fullName, phone, bio) VALUES
  (1, 'admin', 'admin@vulhealth.local', '0192023a7bbd73250516f069df18b500', 'admin',
   'System Administrator', '+1-555-0100', 'Hospital IT administrator.');

-- Doctors (ids 2-11). dr.smith uses weak pw 'smith2024', others use 'password', dr.weak uses '123456'
INSERT INTO users (id, username, email, passwordHash, role, fullName, phone, departmentId, bio) VALUES
  (2,  'dr.smith', 'smith@vulhealth.local',  '56bb95faff02a133b2df31a14115a48a', 'doctor',
       'Dr. John Smith', '+1-555-0201', 1,
       '<p>Board-certified cardiologist, 20 years experience. <a href="mailto:smith@vulhealth.local">Contact</a></p>'),
  (3,  'dr.jones', 'jones@vulhealth.local',  '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Emily Jones', '+1-555-0202', 2, 'Internist specialising in diabetes management.'),
  (4,  'dr.nguyen','nguyen@vulhealth.local', '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. An Nguyen', '+1-555-0203', 3, 'Dermatology & cosmetic procedures.'),
  (5,  'dr.tran',  'tran@vulhealth.local',   '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Binh Tran', '+1-555-0204', 4, 'Pediatrician, loves treating kids.'),
  (6,  'dr.le',    'le@vulhealth.local',     '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Chi Le', '+1-555-0205', 5, 'Obstetrician — high-risk pregnancy specialist.'),
  (7,  'dr.pham',  'pham@vulhealth.local',   '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Dung Pham', '+1-555-0206', 6, 'Diagnostic radiologist, CT & MRI.'),
  (8,  'dr.hoang', 'hoang@vulhealth.local',  '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Hai Hoang', '+1-555-0207', 1, 'Interventional cardiology.'),
  (9,  'dr.vu',    'vu@vulhealth.local',     '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Khoa Vu', '+1-555-0208', 2, 'Hypertension clinic.'),
  (10, 'dr.do',    'do@vulhealth.local',     '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Long Do', '+1-555-0209', 3, 'Pediatric dermatology.'),
  (11, 'dr.weak',  'weak@vulhealth.local',   'e10adc3949ba59abbe56e057f20f883e', 'doctor',
       'Dr. Weak Password', '+1-555-0210', 4, 'Newly hired — has not changed default password yet.');

UPDATE departments SET headDoctorId = 2  WHERE id = 1;
UPDATE departments SET headDoctorId = 3  WHERE id = 2;
UPDATE departments SET headDoctorId = 4  WHERE id = 3;
UPDATE departments SET headDoctorId = 5  WHERE id = 4;
UPDATE departments SET headDoctorId = 6  WHERE id = 5;
UPDATE departments SET headDoctorId = 7  WHERE id = 6;

-- Patients (ids 12-31)
INSERT INTO users (id, username, email, passwordHash, role, fullName, dob, phone) VALUES
  (12, 'alice',  'alice@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Alice Johnson',    '1992-05-11', '+1-555-1001'),
  (13, 'bob',    'bob@mail.com',     'e10adc3949ba59abbe56e057f20f883e', 'patient', 'Bob Martinez',     '1985-08-22', '+1-555-1002'),
  (14, 'carol',  'carol@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Carol Davies',     '1990-01-30', '+1-555-1003'),
  (15, 'david',  'david@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'David Wilson',     '1978-11-04', '+1-555-1004'),
  (16, 'eve',    'eve@mail.com',     '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Eve Brown',        '1995-07-19', '+1-555-1005'),
  (17, 'frank',  'frank@mail.com',   'e10adc3949ba59abbe56e057f20f883e', 'patient', 'Frank Miller',     '1988-03-12', '+1-555-1006'),
  (18, 'grace',  'grace@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Grace Taylor',     '2001-09-25', '+1-555-1007'),
  (19, 'henry',  'henry@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Henry Garcia',     '1975-06-08', '+1-555-1008'),
  (20, 'irene',  'irene@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Irene Lopez',      '1998-12-14', '+1-555-1009'),
  (21, 'jack',   'jack@mail.com',    '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Jack Anderson',    '1983-04-02', '+1-555-1010'),
  (22, 'kate',   'kate@mail.com',    '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Kate Hernandez',   '2000-10-17', '+1-555-1011'),
  (23, 'leo',    'leo@mail.com',     '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Leo Moore',        '1991-02-28', '+1-555-1012'),
  (24, 'mona',   'mona@mail.com',    '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Mona King',        '1987-08-09', '+1-555-1013'),
  (25, 'nathan', 'nathan@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Nathan Lee',       '1994-05-21', '+1-555-1014'),
  (26, 'olivia', 'olivia@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Olivia Walker',    '2002-11-03', '+1-555-1015'),
  (27, 'peter',  'peter@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Peter Hall',       '1979-07-07', '+1-555-1016'),
  (28, 'quinn',  'quinn@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Quinn Young',      '1996-01-13', '+1-555-1017'),
  (29, 'rachel', 'rachel@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Rachel Scott',     '1989-06-24', '+1-555-1018'),
  (30, 'sam',    'sam@mail.com',     '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Sam Green',        '1993-09-01', '+1-555-1019'),
  (31, 'tina',   'tina@mail.com',    '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Tina Baker',       '1986-12-29', '+1-555-1020');

-- Receptionist (id 32)
INSERT INTO users (id, username, email, passwordHash, role, fullName, phone) VALUES
  (32, 'reception', 'reception@vulhealth.local', '1da95b279fc0d21024cece2c68a4c200', 'receptionist',
       'Front Desk', '+1-555-0300');

-- ====== Seed: Appointments (30) ======
INSERT INTO appointments (id, patientId, doctorId, departmentId, scheduledAt, status, reason) VALUES
  (1,  12, 2,  1, '2026-05-02 09:00', 'booked',     'Chest pain during exercise'),
  (2,  13, 3,  2, '2026-05-02 10:00', 'done',       'Routine diabetes follow-up'),
  (3,  14, 4,  3, '2026-05-02 11:00', 'done',       'Persistent rash on forearm'),
  (4,  15, 5,  4, '2026-05-03 09:30', 'booked',     'Child fever 39C'),
  (5,  16, 6,  5, '2026-05-03 10:30', 'booked',     'Prenatal checkup week 24'),
  (6,  17, 7,  6, '2026-05-03 14:00', 'done',       'Shoulder X-ray'),
  (7,  18, 8,  1, '2026-05-04 09:00', 'booked',     'Palpitations and dizziness'),
  (8,  19, 9,  2, '2026-05-04 10:00', 'checked_in', 'Blood pressure reading high'),
  (9,  20, 10, 3, '2026-05-04 11:00', 'done',       'Acne flare-up'),
  (10, 21, 11, 4, '2026-05-05 09:00', 'booked',     'Annual pediatric exam'),
  (11, 22, 2,  1, '2026-05-05 10:30', 'done',       'ECG follow-up'),
  (12, 23, 3,  2, '2026-05-05 13:00', 'booked',     'Lab result review'),
  (13, 24, 4,  3, '2026-05-06 09:00', 'cancelled',  'Eczema on hands'),
  (14, 25, 5,  4, '2026-05-06 10:00', 'booked',     'Vaccination schedule'),
  (15, 26, 6,  5, '2026-05-06 14:30', 'done',       'Prenatal checkup week 30'),
  (16, 27, 7,  6, '2026-05-07 09:00', 'booked',     'MRI knee'),
  (17, 28, 8,  1, '2026-05-07 10:00', 'done',       'Stress test result'),
  (18, 29, 9,  2, '2026-05-07 11:00', 'booked',     'Chronic fatigue'),
  (19, 30, 10, 3, '2026-05-08 09:00', 'booked',     'Mole evaluation'),
  (20, 31, 11, 4, '2026-05-08 10:30', 'done',       'Growth assessment'),
  (21, 12, 3,  2, '2026-05-10 09:00', 'booked',     'General checkup'),
  (22, 13, 7,  6, '2026-05-10 10:00', 'booked',     'CT abdomen'),
  (23, 14, 2,  1, '2026-05-11 09:30', 'booked',     'Arrhythmia workup'),
  (24, 15, 9,  2, '2026-05-11 11:00', 'booked',     'Hypertension review'),
  (25, 16, 4,  3, '2026-05-12 10:00', 'booked',     'Skin biopsy follow-up'),
  (26, 17, 5,  4, '2026-05-12 11:30', 'booked',     'Child allergy'),
  (27, 18, 6,  5, '2026-05-13 09:00', 'booked',     'Ultrasound week 34'),
  (28, 19, 8,  1, '2026-05-13 10:30', 'booked',     'Cholesterol panel'),
  (29, 20, 10, 3, '2026-05-14 09:00', 'booked',     'Psoriasis consultation'),
  (30, 21, 2,  1, '2026-05-14 11:00', 'booked',     'Pacemaker check');

-- ====== Seed: Medical Records (30) — includes sensitive data for BOLA demos ======
INSERT INTO medical_records (id, patientId, doctorId, appointmentId, diagnosis, prescription, notes) VALUES
  (1,  12, 2,  1,  'Stable angina',                 'Aspirin 81mg daily; Nitroglycerin PRN',  'Patient reports chest pain during 20 min jog. ECG shows mild ST depression.'),
  (2,  13, 3,  2,  'Type 2 Diabetes, well-controlled','Metformin 500mg BID, continue',        'HbA1c 6.8. Diet compliant.'),
  (3,  14, 4,  3,  'Contact dermatitis',            'Hydrocortisone 1% cream BID x 7 days',   'Rash from new laundry detergent. Allergy panel not needed.'),
  (4,  15, 5,  4,  'Viral fever',                   'Paracetamol 10mg/kg q6h',                'Pediatric pt, father present. No red flags.'),
  (5,  16, 6,  5,  'Normal pregnancy week 24',      'Prenatal vitamins',                      'Fetal HR 145bpm. Glucose screening normal.'),
  (6,  17, 7,  6,  'Rotator cuff tear suspected',   'Refer orthopedics',                      'MRI shows partial-thickness tear supraspinatus.'),
  (7,  18, 8,  7,  'Supraventricular tachycardia',  'Metoprolol 25mg BID',                    'Holter recorded 3 episodes overnight. Anxiety screening positive.'),
  (8,  19, 9,  8,  'Essential hypertension',        'Lisinopril 10mg daily',                  'BP 168/96. Counselled on sodium intake. HIV+ patient — medication interaction checked.'),
  (9,  20, 10, 9,  'Acne vulgaris, moderate',       'Tretinoin 0.025% cream nightly',         'Tried OTC without success. Discussed pregnancy risk — patient not planning.'),
  (10, 21, 11, 10, 'Well child exam',               'Age-appropriate vaccines',               'Development on track. ADHD screening deferred — parents declined.'),
  (11, 22, 2,  11, 'Atrial fibrillation paroxysmal','Apixaban 5mg BID; Metoprolol 25mg',      'HAS-BLED score 2. CHA2DS2-VASc 3.'),
  (12, 23, 3,  12, 'Iron deficiency anemia',        'Ferrous sulfate 325mg daily',            'Hgb 10.2. Endoscopy recommended to rule out GI bleed.'),
  (13, 24, 4,  13, 'Chronic eczema',                'Tacrolimus 0.1% ointment',               'History of depression — on sertraline. Pt prefers non-steroid options.'),
  (14, 25, 5,  14, 'Healthy child vaccination',     'MMR, Varicella boosters',                'Mother HIV+ — child screened negative at birth, 6mo, 12mo.'),
  (15, 26, 6,  15, 'Gestational diabetes screening','Glucola test scheduled',                 'Pt overweight BMI 32. High-risk pregnancy.'),
  (16, 27, 7,  16, 'Meniscal tear right knee',      'Refer ortho for arthroscopy',            'MRI confirms grade II tear medial meniscus.'),
  (17, 28, 8,  17, 'Post-MI surveillance',          'Aspirin, Atorvastatin, Metoprolol',      'STEMI 6 months ago. Ejection fraction 45%.'),
  (18, 29, 9,  18, 'Hypothyroidism',                'Levothyroxine 75mcg daily',              'TSH 8.2. Family history of thyroid cancer.'),
  (19, 30, 10, 19, 'Suspected melanoma',            'Biopsy scheduled; refer oncology',       'Asymmetric mole 7mm, Breslow TBD. Pt smoker 15 pack-years.'),
  (20, 31, 11, 20, 'Growth delay mild',             'Nutrition referral',                     'Below 5th percentile for age. Social work consulted — concerns of food insecurity.'),
  (21, 12, 3,  21, 'General wellness',              'Continue current regimen',               'Routine labs ordered. Pt mentioned marital stress.'),
  (22, 13, 7,  22, 'Abdominal pain workup',         'CT reviewed',                            'Small kidney stone 4mm, expected to pass.'),
  (23, 14, 2,  23, 'Palpitations benign',           'No meds, reassurance',                   'Likely caffeine-induced. Advised reduction.'),
  (24, 15, 9,  24, 'HTN stable',                    'Continue Lisinopril',                    'BP 132/82 today. Good compliance.'),
  (25, 16, 4,  25, 'Biopsy benign',                 'No treatment',                           'Dysplastic nevus, no atypia. 6 month follow-up.'),
  (26, 17, 5,  26, 'Seasonal allergy',              'Cetirizine 10mg daily',                  'Child has pet dander allergy.'),
  (27, 18, 6,  27, 'Prenatal week 34 normal',       'Continue vitamins',                      'Fetal position cephalic. Cervix closed.'),
  (28, 19, 8,  28, 'Hyperlipidemia',                'Atorvastatin 20mg daily',                'LDL 168. Lifestyle counseling given.'),
  (29, 20, 10, 29, 'Psoriasis plaque',              'Calcipotriene ointment BID',             'Minor lesions on elbows. Mental health check stable.'),
  (30, 21, 2,  30, 'Pacemaker interrogation normal','No changes',                             'Battery 6 years remaining. No arrhythmias logged.');

-- ====== Seed: Messages (some with stored-XSS friendly HTML) ======
INSERT INTO messages (id, fromUserId, toUserId, subject, body) VALUES
  (1, 12, 2, 'Chest pain follow-up',  'Hi doctor, the pain came back yesterday during stairs. Should I come earlier?'),
  (2, 2, 12, 'Re: Chest pain',        'Yes — please book a slot this week. <strong>If pain lasts >15 min, go to ER.</strong>'),
  (3, 13, 3, 'Medication question',   'Can I take metformin with grapefruit juice?'),
  (4, 18, 8, 'Anxiety and heart',     'I had another episode last night. Scared.'),
  (5, 14, 4, 'Cream not working',     'The cream you gave made it worse actually.');
