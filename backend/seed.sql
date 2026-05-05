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

-- ====== EXTRA SEED: more doctors, patients, appointments, records, messages ======

-- Extra doctors (33-37)
INSERT INTO users (id, username, email, passwordHash, role, fullName, phone, departmentId, bio) VALUES
  (33, 'dr.kim',    'kim@vulhealth.local',    '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Sarah Kim',    '+1-555-0211', 1,
       'Cardiac electrophysiologist; arrhythmia ablation specialist. Stanford-trained, Mayo Clinic fellowship. Speaks English & Korean.'),
  (34, 'dr.patel',  'patel@vulhealth.local',  '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Raj Patel',    '+1-555-0212', 2,
       'Endocrinologist focused on insulin resistance, PCOS, and metabolic syndrome. Multiple NEJM publications.'),
  (35, 'dr.garcia', 'garcia@vulhealth.local', '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Maria Garcia', '+1-555-0213', 5,
       'Maternal-fetal medicine. High-risk pregnancy & NICU coordination. Twin pregnancy expert.'),
  (36, 'dr.brown',  'brown@vulhealth.local',  '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Michael Brown','+1-555-0214', 4,
       'Pediatric infectious disease, vaccine research, immunization advocate. Travel medicine clinic lead.'),
  (37, 'dr.wilson', 'wilson@vulhealth.local', '5f4dcc3b5aa765d61d8327deb882cf99', 'doctor',
       'Dr. Lisa Wilson',  '+1-555-0215', 6,
       'Interventional radiology — angiography, embolization, image-guided biopsy and tumor ablation.');

-- Update existing doctor bios with richer detail
UPDATE users SET bio = 'Internist specialising in diabetes management. Certified Diabetes Educator (CDE), runs the Thursday group education clinic.' WHERE id = 3;
UPDATE users SET bio = 'Dermatology & cosmetic procedures. Mohs surgery certified for skin cancer removal. 12 years experience.' WHERE id = 4;
UPDATE users SET bio = 'Pediatrician, loves treating kids. Special interest in childhood asthma, food allergies, ADHD coordination.' WHERE id = 5;
UPDATE users SET bio = 'Obstetrician — high-risk pregnancy specialist. Delivered 2,500+ babies, twin & VBAC expert.' WHERE id = 6;
UPDATE users SET bio = 'Diagnostic radiologist, CT & MRI. Subspecialty in neuroradiology, stroke imaging and brain tumor protocols.' WHERE id = 7;
UPDATE users SET bio = 'Interventional cardiology. Performs cardiac catheterization, stenting, and TAVR procedures. Heart failure clinic.' WHERE id = 8;
UPDATE users SET bio = 'Hypertension clinic. Resistant hypertension and renal artery disease focus. Salt restriction research.' WHERE id = 9;
UPDATE users SET bio = 'Pediatric dermatology. Eczema, birthmark evaluation, infantile hemangioma laser therapy.' WHERE id = 10;

-- Extra patients (38-50) — more variety in age & background
INSERT INTO users (id, username, email, passwordHash, role, fullName, dob, phone) VALUES
  (38, 'ursula',  'ursula@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Ursula Adams',   '1990-04-15', '+1-555-1021'),
  (39, 'victor',  'victor@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Victor Chen',    '1982-11-23', '+1-555-1022'),
  (40, 'wendy',   'wendy@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Wendy Foster',   '1997-07-08', '+1-555-1023'),
  (41, 'xavier',  'xavier@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Xavier Reyes',   '1976-02-19', '+1-555-1024'),
  (42, 'yara',    'yara@mail.com',    '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Yara Khalid',    '2003-08-30', '+1-555-1025'),
  (43, 'zane',    'zane@mail.com',    '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Zane Mitchell',  '1994-12-11', '+1-555-1026'),
  (44, 'amelia',  'amelia@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Amelia Cooper',  '1988-05-26', '+1-555-1027'),
  (45, 'brandon', 'brandon@mail.com', '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Brandon Hayes',  '1991-09-04', '+1-555-1028'),
  (46, 'chloe',   'chloe@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Chloe Bennett',  '2000-03-17', '+1-555-1029'),
  (47, 'dmitri',  'dmitri@mail.com',  '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Dmitri Volkov',  '1984-10-09', '+1-555-1030'),
  (48, 'elena',   'elena@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Elena Ivanova',  '1996-06-22', '+1-555-1031'),
  (49, 'felix',   'felix@mail.com',   '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Felix Wang',     '1973-01-05', '+1-555-1032'),
  (50, 'gina',    'gina@mail.com',    '5f4dcc3b5aa765d61d8327deb882cf99', 'patient', 'Gina Rossi',     '1999-11-28', '+1-555-1033');

-- Extra appointments (31-70)
INSERT INTO appointments (id, patientId, doctorId, departmentId, scheduledAt, status, reason) VALUES
  (31, 22, 33, 1, '2026-05-15 09:00', 'booked',     'Atrial flutter — ablation consult'),
  (32, 23, 34, 2, '2026-05-15 10:00', 'booked',     'Insulin pump initiation'),
  (33, 24, 35, 5, '2026-05-15 11:00', 'booked',     'Twin pregnancy first visit'),
  (34, 25, 36, 4, '2026-05-15 13:00', 'booked',     'Recurrent ear infection'),
  (35, 26, 37, 6, '2026-05-16 09:30', 'booked',     'Liver biopsy planning'),
  (36, 38, 2,  1, '2026-05-16 10:30', 'booked',     'Family history of MI — risk assessment'),
  (37, 39, 3,  2, '2026-05-16 11:30', 'done',       'Pre-employment physical'),
  (38, 40, 4,  3, '2026-05-17 09:00', 'booked',     'Mole asymmetric, possibly atypical'),
  (39, 41, 5,  4, '2026-05-17 10:00', 'cancelled',  'Child rescheduled — parent ill'),
  (40, 42, 6,  5, '2026-05-17 11:00', 'booked',     'First prenatal visit'),
  (41, 43, 7,  6, '2026-05-17 14:00', 'done',       'Chest CT screening (smoker)'),
  (42, 44, 8,  1, '2026-05-18 09:00', 'booked',     'Echocardiogram for murmur'),
  (43, 45, 9,  2, '2026-05-18 10:00', 'booked',     'GERD ongoing'),
  (44, 46, 10, 3, '2026-05-18 11:00', 'checked_in', 'Severe acne — Accutane discussion'),
  (45, 47, 11, 4, '2026-05-18 13:00', 'done',       'Toddler 18-month visit'),
  (46, 48, 33, 1, '2026-05-19 09:00', 'booked',     'Holter monitor result review'),
  (47, 49, 34, 2, '2026-05-19 10:00', 'booked',     'Thyroid nodule biopsy'),
  (48, 50, 35, 5, '2026-05-19 11:00', 'booked',     'Postpartum 6-week follow-up'),
  (49, 38, 36, 4, '2026-05-20 09:00', 'booked',     'Travel vaccinations for Vietnam trip'),
  (50, 39, 37, 6, '2026-05-20 10:00', 'booked',     'MRI shoulder rotator cuff'),
  (51, 12, 8,  1, '2026-05-21 09:30', 'booked',     'Stress echo'),
  (52, 13, 4,  3, '2026-05-21 10:30', 'booked',     'Skin tag removal'),
  (53, 14, 5,  4, '2026-05-21 11:30', 'booked',     'Niece visit — well child'),
  (54, 15, 6,  5, '2026-05-22 09:00', 'cancelled',  'Pt declined — partner ill'),
  (55, 16, 7,  6, '2026-05-22 10:00', 'booked',     'Ultrasound thyroid'),
  (56, 17, 33, 1, '2026-05-22 11:00', 'booked',     'PVC palpitations'),
  (57, 18, 34, 2, '2026-05-23 09:00', 'booked',     'Hashimoto follow-up'),
  (58, 19, 35, 5, '2026-05-23 10:00', 'done',       'Pap smear'),
  (59, 20, 36, 4, '2026-05-23 11:00', 'booked',     'Asthma action plan'),
  (60, 21, 37, 6, '2026-05-23 14:00', 'booked',     'Embolization consult — uterine fibroid'),
  (61, 40, 2,  1, '2026-05-24 09:00', 'booked',     'Annual cardiac checkup'),
  (62, 41, 3,  2, '2026-05-24 10:00', 'done',       'Vitamin D deficiency follow-up'),
  (63, 42, 4,  3, '2026-05-25 09:00', 'booked',     'Hair loss workup'),
  (64, 43, 5,  4, '2026-05-25 10:00', 'booked',     'School physical'),
  (65, 44, 6,  5, '2026-05-25 11:00', 'booked',     'Anatomy scan week 20'),
  (66, 45, 7,  6, '2026-05-26 09:00', 'booked',     'Lumbar MRI back pain'),
  (67, 46, 8,  1, '2026-05-26 10:00', 'booked',     'Heart palpitations young adult'),
  (68, 47, 9,  2, '2026-05-26 11:00', 'done',       'Annual physical'),
  (69, 48, 10, 3, '2026-05-27 09:00', 'booked',     'Eczema flare'),
  (70, 49, 11, 4, '2026-05-27 10:00', 'booked',     'Newborn jaundice review');

-- Extra medical records for the ''done'' / ''checked_in'' new appointments
INSERT INTO medical_records (id, patientId, doctorId, appointmentId, diagnosis, prescription, notes) VALUES
  (31, 39, 3,  37, 'Healthy adult, employment cleared',  'None',                                 'BMI 24, BP 118/76. Cleared for full duty.'),
  (32, 43, 7,  41, 'Lung nodule 4mm right upper lobe',   'Repeat CT in 6 months',                'Patient 15 pack-year smoker. Lung-RADS 2. Smoking cessation counseling provided.'),
  (33, 47, 11, 45, 'Toddler well visit',                 'Continue multivitamins',               'Vaccinations updated. Mild speech delay flagged — refer SLP.'),
  (34, 19, 35, 58, 'Pap smear ASCUS',                    'HPV co-test, repeat in 6 months',      'Patient denies risk factors. Smoking 1 ppd — counseled.'),
  (35, 41, 3,  62, 'Vitamin D 22 ng/mL — insufficient',  'Vitamin D3 2000 IU daily',             'Recheck in 3 months. Outdoor activity encouraged.'),
  (36, 47, 9,  68, 'Mild hyperlipidemia',                'Lifestyle changes; recheck 3 months',  'LDL 142, HDL 52. Family hx CAD father age 58.'),
  (37, 46, 10, 44, 'Severe nodulocystic acne',           'iPLEDGE enrolment for isotretinoin',    'Discussed teratogenicity, mood monitoring, lipid baseline. Patient using 2 contraception methods.');

-- ====== Extra Messages: longer multi-turn conversations (HTML-bodied for XSS sink demo) ======
INSERT INTO messages (id, fromUserId, toUserId, subject, body) VALUES
  (6,  3,  13, 'Re: Medication question',         'Generally fine, but avoid grapefruit when on new BP meds. Stick with water/coffee around metformin.'),
  (7,  13, 3,  'Re: Re: Medication question',     'Got it, thanks. One more — better with food or empty stomach?'),
  (8,  3,  13, 'Take with food',                  '<p>Take with the largest meal of the day to reduce GI side effects. Avoid alcohol.</p>'),
  (9,  8,  18, 'Re: Anxiety and heart',           '<p>Sorry to hear that. Please come in tomorrow — I''ve held a 2pm slot. We''ll do an event monitor.</p>'),
  (10, 18, 8,  'Confirmed',                       'Thank you doctor, I''ll be there at 2.'),
  (11, 4,  14, 'Re: Cream not working',           'Stop the cream immediately. Apply petroleum jelly only and book a visit. Could be steroid sensitivity.'),
  (12, 14, 4,  'Booked',                          'Booked for tomorrow 9am. Should I bring the tube of cream?'),
  (13, 4,  14, 'Bring it',                        'Yes please, I want to verify the formulation.'),
  (14, 16, 6,  'Movement check',                  'Doctor, baby has been less active today. Should I worry?'),
  (15, 6,  16, 'Kick counts',                     '<p>Lie on your left side after a meal and count kicks for 1 hour. <strong>Less than 10 kicks = come to L&D immediately.</strong></p>'),
  (16, 16, 6,  'Update',                          'Counted 14 kicks in 30 min, feeling better. Thank you!'),
  (17, 19, 9,  'BP reading',                      'Home BP 152/94 this morning. Took medication on time.'),
  (18, 9,  19, 'Adjust meds',                     'Add HCTZ 12.5mg in the morning. Recheck in 1 week. Avoid NSAIDs.'),
  (19, 20, 10, 'Acne update',                     'Skin getting drier with tretinoin. Is that normal?'),
  (20, 10, 20, 'Yes — moisturize',                'Yes, normal. Use a gentle moisturizer 30 min after applying tretinoin. SPF 30+ daily is mandatory.'),
  (21, 22, 2,  'AFib worried',                    'Felt fluttering for 2 hours last night. Should I take extra apixaban?'),
  (22, 2,  22, 'Do not double dose',              '<p><strong>Never double-dose apixaban.</strong> If symptoms persist >30 min or chest pain develops, ER immediately. Otherwise come tomorrow morning.</p>'),
  (23, 27, 7,  'MRI claustrophobia',              'I''m nervous about the closed MRI. Can we do open?'),
  (24, 7,  27, 'Open MRI option',                 'Yes — I''ll change the order to open MRI. Lower resolution but adequate for knee. Reception will reschedule.'),
  (25, 38, 2,  'Family history',                  'My father had a heart attack at 48. Should I be screened earlier than 40?'),
  (26, 2,  38, 'Yes — early screening',           '<p>Given premature CAD in first-degree relative, we recommend lipid panel + coronary calcium score now. Booking you in.</p>'),
  (27, 42, 6,  'First pregnancy',                 'I just got a positive test! What should I do first?'),
  (28, 6,  42, 'Welcome',                         '<p>Congratulations! Start prenatal vitamins (folic acid 400mcg minimum), avoid alcohol/raw fish, and book in 1-2 weeks for dating ultrasound.</p>'),
  (29, 44, 8,  'Murmur on exam',                  'Last visit you said I have a murmur. Is that dangerous?'),
  (30, 8,  44, 'Likely benign',                   'Most adult murmurs are benign flow murmurs. We''ll confirm with echo on the 18th.'),
  (31, 46, 10, 'Accutane scary',                  'I read about side effects. Honestly afraid to start.'),
  (32, 10, 46, 'Risks vs benefits',               '<p>Valid concern. We''ll do baseline labs, monthly checks, and you must use 2 forms of contraception. Most patients tolerate it well — let''s discuss in clinic.</p>'),
  (33, 33, 32, 'Schedule change',                 'Receptionist — please block my Friday afternoon for ablation prep next week.'),
  (34, 32, 33, 'Done',                            'Confirmed. Friday 1-5pm blocked, no new bookings.'),
  (35, 1,  32, 'New doctor onboarding',           'Dr. Kim, Patel, Garcia, Brown, Wilson are all set up. Please verify their access tomorrow.'),
  (36, 32, 1,  'Verified',                        'All 5 logged in successfully. Dr. Wilson''s schedule needs templates — will follow up.'),
  (37, 12, 2,  'Lab results question',            'I got the email about my labs. What does ''mild ST depression'' mean exactly?'),
  (38, 2,  12, 'ST depression explained',         '<p>It can indicate the heart not getting enough blood during stress. We''ll do a stress echo on the 21st.</p>'),
  (39, 50, 35, 'Postpartum bleeding',             'Still bleeding lightly at week 5. Normal?'),
  (40, 35, 50, 'Lochia normal',                   'Light bleeding/spotting up to 6 weeks is normal. Heavy soaking pads or large clots = call us immediately.'),
  (41, 17, 5,  'Child fever back',                'Fever 38.5 again today. He had paracetamol 6 hours ago.'),
  (42, 5,  17, 'Bring him in',                    '<p>Please bring him in this afternoon — we have a 3pm slot. Ear infection might have returned.</p>'),
  (43, 11, 1,  'Password change required',        'I keep forgetting to change my default password. How do I do it?'),
  (44, 1,  11, 'Change pw immediately',           '<p><strong>Critical:</strong> Profile → Security → Change Password. Default passwords are an audit finding. Please do this today.</p>'),
  (45, 28, 8,  'Post-MI side effect',             'Atorvastatin gives me muscle pain. Can we switch?'),
  (46, 8,  28, 'Switch to rosuvastatin',          '<p>Yes — switch to rosuvastatin 10mg. Check CK level if pain persists. Stop immediately if dark urine.</p>'),
  (47, 29, 9,  'Levothyroxine timing',            'Should I take it before breakfast or before bed?'),
  (48, 9,  29, 'Morning empty stomach',           'Take it 30-60 min before breakfast, on an empty stomach. No coffee or calcium for 1 hour after.'),
  (49, 32, 1,  'Daily reception summary',         'Today: 18 check-ins, 2 walk-ins, 1 ER referral. All EHR notes completed except Dr. Weak (5 pending).'),
  (50, 1,  11, 'Pending notes reminder',          'Dr. Weak — please complete your 5 pending EHR notes before end of week. Compliance required.'),
  (51, 38, 33, 'Holter request',                  'Hi Dr. Kim, can we set up a 48-hour Holter? My Apple Watch logs random spikes overnight.'),
  (52, 33, 38, 'Holter ordered',                  '<p>Ordered for next Tuesday — front desk will email instructions. Please bring the watch readings as a PDF.</p>'),
  (53, 23, 34, 'Pump anxiety',                    'I''m worried about the insulin pump — what if it malfunctions overnight?'),
  (54, 34, 23, 'Pump safety',                     '<p>Modern pumps suspend automatically if glucose drops. We''ll train you for 2 sessions before go-live. Backup pens always in your bag.</p>'),
  (55, 24, 35, 'Twin appetite',                   'I''m starving constantly! Is that normal at week 12 with twins?'),
  (56, 35, 24, 'Twin nutrition',                  '<p>Yes — caloric needs are ~600/day above baseline for twins. Focus on protein, iron, and folate. Small frequent meals help.</p>'),
  (57, 25, 36, 'Recurring ear infection',         'This is the third one this winter. Should we see ENT?'),
  (58, 36, 25, 'ENT referral',                    'Agreed. Three episodes in 6 months meets criteria for tube evaluation. Sending the referral today.'),
  (59, 26, 37, 'Liver biopsy nervous',            'How painful is the biopsy? Will I be awake?'),
  (60, 37, 26, 'Biopsy info',                     '<p>Done with local anesthetic + light sedation. You''ll be drowsy but responsive. Procedure takes 15 min, recovery 4 hours observation.</p>'),
  (61, 12, 32, 'Reschedule needed',               'Hi reception, can we move my May 21 stress echo? Work conflict.'),
  (62, 32, 12, 'Rescheduled',                     'Moved to May 28 9:30am. Confirmation email sent.'),
  (63, 45, 9,  'Reflux at night',                 'GERD wakes me up every night around 3am. PPI not helping.'),
  (64, 9,  45, 'Plan',                            '<p>Add bedtime ranitidine, raise head of bed 6 inches, no food 3 hours before sleep. If no improvement in 2 weeks, scoping.</p>'),
  (65, 13, 7,  'CT contrast allergy',             'I''m allergic to shellfish. Will the CT contrast be OK?'),
  (66, 7,  13, 'Contrast safe',                   'Shellfish allergy is unrelated to iodine contrast (old myth). We''ll still pre-medicate with steroids if you''re anxious.'),
  (67, 1,  3,  'Audit reminder',                  'Dr. Jones — your medical records have 2 unsigned notes. Please sign before Friday audit.'),
  (68, 3,  1,  'Will sign',                       'Both signed off this morning. Apologies for the delay — vacation last week.'),
  (69, 32, 38, 'Welcome packet',                  '<p>Welcome to VulHealth! Please complete intake forms via the patient portal before your visit. <a href="/portal">Click here</a></p>'),
  (70, 38, 32, 'Forms complete',                  'All 4 forms submitted. See you Saturday.');
