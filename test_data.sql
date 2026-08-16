-- ==============================================================================
-- KSIT DORMITORY SYSTEM - TEST DATA
-- Insert sample users, buildings, rooms, and academic profiles for testing
-- ==============================================================================

-- ==============================================================================
-- 1. INSERT TEST USERS (Password: 'test123' for all users)
-- Note: These are temporary plaintext passwords. Will be hashed with bcrypt later.
-- ==============================================================================

-- Admin User
INSERT INTO users (id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, password_hash, avatar_url)
VALUES
('a0000000-0000-0000-0000-000000000001', 'admin001', 'admin', 'គ្រប់គ្រងប្រព័ន្ធ', 'System Administrator', 'male', '012345678', 'admin@ksit.edu.kh', 'test123', NULL);

-- Manager User
INSERT INTO users (id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, password_hash, avatar_url)
VALUES
('b0000000-0000-0000-0000-000000000001', 'manager001', 'manager', 'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន', 'Dormitory Manager', 'male', '012345679', 'manager@ksit.edu.kh', 'test123', NULL);

-- Teacher Users
INSERT INTO users (id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, password_hash, avatar_url)
VALUES
('c0000000-0000-0000-0000-000000000001', 'teacher001', 'teacher', 'លោកគ្រូសុខា', 'Mr. Sokha', 'male', '012345680', 'sokha@ksit.edu.kh', 'test123', NULL),
('c0000000-0000-0000-0000-000000000002', 'teacher002', 'teacher', 'លោកគ្រូស្រីដា', 'Ms. Sreida', 'female', '012345681', 'sreida@ksit.edu.kh', 'test123', NULL);

-- Student Users (10 male students, 10 female students)
-- Male Students
INSERT INTO users (id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, password_hash, avatar_url)
VALUES
('d0000000-0000-0000-0000-000000000001', 'student001', 'student', 'ស៊ីន សុភា', 'Sin Sophal', 'male', '012111001', 'sophal@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000002', 'student002', 'student', 'គឹម ជាតិ', 'Kim Cheat', 'male', '012111002', 'cheat@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000003', 'student003', 'student', 'លី សុវណ្ណ', 'Ly Sovan', 'male', '012111003', 'sovan@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000004', 'student004', 'student', 'ចាន់ ដារ៉ា', 'Chan Dara', 'male', '012111004', 'dara@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000005', 'student005', 'student', 'ប៉ែន វិចិត្រ', 'Pen Vichit', 'male', '012111005', 'vichit@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000006', 'student006', 'student', 'ហេង សំរិទ្ធ', 'Heng Samrit', 'male', '012111006', 'samrit@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000007', 'student007', 'student', 'ឈន ភក្ត្រា', 'Chhon Phaktra', 'male', '012111007', 'phaktra@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000008', 'student008', 'student', 'ពេជ្រ រដ្ឋា', 'Pich Ratha', 'male', '012111008', 'ratha@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000009', 'student009', 'student', 'សុខ វណ្ណៈ', 'Sok Vanna', 'male', '012111009', 'vanna@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000010', 'student010', 'student', 'ម៉េង គឹមលី', 'Meng Kimly', 'male', '012111010', 'kimly@student.ksit.edu.kh', 'test123', NULL);

-- Female Students
INSERT INTO users (id, telegram_id, role, full_name_khmer, full_name_latin, gender, phone, email, password_hash, avatar_url)
VALUES
('d0000000-0000-0000-0000-000000000011', 'student011', 'student', 'រស្មី សុខលីនា', 'Rosmey Soklyna', 'female', '012222001', 'soklyna@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000012', 'student012', 'student', 'គង់ ស្រីមុំ', 'Kong Sreymom', 'female', '012222002', 'sreymom@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000013', 'student013', 'student', 'ម៉ម សុផានី', 'Mom Sophany', 'female', '012222003', 'sophany@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000014', 'student014', 'student', 'កែវ ចន្ទ្រា', 'Keo Chantra', 'female', '012222004', 'chantra@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000015', 'student015', 'student', 'សុខ លីហួរ', 'Sok Lyhour', 'female', '012222005', 'lyhour@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000016', 'student016', 'student', 'ចំរើន គន្ធា', 'Chamroeun Konthea', 'female', '012222006', 'konthea@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000017', 'student017', 'student', 'ថាច់ រតនា', 'Thach Ratana', 'female', '012222007', 'ratana@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000018', 'student018', 'student', 'ស៊ុន វណ្ណី', 'Sun Vanny', 'female', '012222008', 'vanny@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000019', 'student019', 'student', 'ហេង ចន្ទសុភា', 'Heng Chansophal', 'female', '012222009', 'chansophal@student.ksit.edu.kh', 'test123', NULL),
('d0000000-0000-0000-0000-000000000020', 'student020', 'student', 'លឹម ស្រីនាង', 'Lim Sreynang', 'female', '012222010', 'sreynang@student.ksit.edu.kh', 'test123', NULL);

-- ==============================================================================
-- 2. INSERT ACADEMIC PROFILES FOR STUDENTS
-- ==============================================================================

-- Male Students Academic Profiles (Computer Science and IT)
INSERT INTO academic_profiles (user_id, student_id_card, major, academic_year, class_section, date_of_birth, place_of_birth, current_address,
    father_name, father_phone, mother_name, mother_phone, guarantor_name, guarantor_relation, guarantor_phone)
VALUES
('d0000000-0000-0000-0000-000000000001', 'KSIT2023-CS-001', 'Computer Science', 2, 'CS-Y2-A', '2005-03-15', 'Kampong Speu', 'Village 1, Kampong Speu',
    'ស៊ីន ណារុណ', '012333001', 'ហុក សុខាន់', '012333002', 'ស៊ីន ណារុណ', 'Father', '012333001'),
('d0000000-0000-0000-0000-000000000002', 'KSIT2023-CS-002', 'Computer Science', 2, 'CS-Y2-A', '2005-05-20', 'Phnom Penh', 'Village 2, Kampong Speu',
    'គឹម ច័ន្ទ', '012333003', 'សុខ កញ្ញា', '012333004', 'គឹម ច័ន្ទ', 'Father', '012333003'),
('d0000000-0000-0000-0000-000000000003', 'KSIT2023-IT-001', 'Information Technology', 2, 'IT-Y2-A', '2005-07-10', 'Kampong Speu', 'Village 3, Kampong Speu',
    'លី ដាវីត', '012333005', 'ម៉ម សុវណ្ណា', '012333006', 'លី ដាវីត', 'Father', '012333005'),
('d0000000-0000-0000-0000-000000000004', 'KSIT2024-CS-010', 'Computer Science', 1, 'CS-Y1-B', '2006-02-12', 'Kandal', 'Village 4, Kampong Speu',
    'ចាន់ សុខា', '012333007', 'ពេជ្រ រស្មី', '012333008', 'ចាន់ សុខា', 'Father', '012333007'),
('d0000000-0000-0000-0000-000000000005', 'KSIT2024-IT-008', 'Information Technology', 1, 'IT-Y1-A', '2006-04-25', 'Kampong Speu', 'Village 5, Kampong Speu',
    'ប៉ែន រដ្ឋា', '012333009', 'សុខ ចន្ទលីនា', '012333010', 'ប៉ែន រដ្ឋា', 'Father', '012333009');

INSERT INTO academic_profiles (user_id, student_id_card, major, academic_year, class_section, date_of_birth, place_of_birth, current_address,
    father_name, father_phone, mother_name, mother_phone, guarantor_name, guarantor_relation, guarantor_phone)
VALUES
('d0000000-0000-0000-0000-000000000006', 'KSIT2022-CS-015', 'Computer Science', 3, 'CS-Y3-A', '2004-08-30', 'Kampong Speu', 'Village 6, Kampong Speu',
    'ហេង ណារុណ', '012333011', 'គង់ សុភី', '012333012', 'ហេង ណារុណ', 'Father', '012333011'),
('d0000000-0000-0000-0000-000000000007', 'KSIT2022-IT-012', 'Information Technology', 3, 'IT-Y3-A', '2004-11-05', 'Kampong Cham', 'Village 7, Kampong Speu',
    'ឈន ពុទ្ធី', '012333013', 'ម៉ម រដ្ឋា', '012333014', 'ឈន ពុទ្ធី', 'Father', '012333013'),
('d0000000-0000-0000-0000-000000000008', 'KSIT2021-CS-020', 'Computer Science', 4, 'CS-Y4-A', '2003-01-18', 'Phnom Penh', 'Village 8, Kampong Speu',
    'ពេជ្រ សុខា', '012333015', 'កែវ ចាន់', '012333016', 'ពេជ្រ សុខា', 'Father', '012333015'),
('d0000000-0000-0000-0000-000000000009', 'KSIT2021-IT-018', 'Information Technology', 4, 'IT-Y4-A', '2003-09-22', 'Kampong Speu', 'Village 9, Kampong Speu',
    'សុខ វិទូ', '012333017', 'លី ស្រីពៅ', '012333018', 'សុខ វិទូ', 'Father', '012333017'),
('d0000000-0000-0000-0000-000000000010', 'KSIT2023-CS-005', 'Computer Science', 2, 'CS-Y2-B', '2005-06-14', 'Takeo', 'Village 10, Kampong Speu',
    'ម៉េង សុវណ្ណ', '012333019', 'ហុក រស្មី', '012333020', 'ម៉េង សុវណ្ណ', 'Father', '012333019');

-- Female Students Academic Profiles (Computer Science and IT)
INSERT INTO academic_profiles (user_id, student_id_card, major, academic_year, class_section, date_of_birth, place_of_birth, current_address,
    father_name, father_phone, mother_name, mother_phone, guarantor_name, guarantor_relation, guarantor_phone)
VALUES
('d0000000-0000-0000-0000-000000000011', 'KSIT2023-CS-003', 'Computer Science', 2, 'CS-Y2-A', '2005-04-08', 'Kampong Speu', 'Village 11, Kampong Speu',
    'រស្មី វិចិត្រ', '012444001', 'គង់ ស្រីនាង', '012444002', 'រស្មី វិចិត្រ', 'Father', '012444001'),
('d0000000-0000-0000-0000-000000000012', 'KSIT2023-IT-003', 'Information Technology', 2, 'IT-Y2-A', '2005-09-12', 'Phnom Penh', 'Village 12, Kampong Speu',
    'គង់ សុផាន់', '012444003', 'ម៉ម រស្មី', '012444004', 'គង់ សុផាន់', 'Father', '012444003'),
('d0000000-0000-0000-0000-000000000013', 'KSIT2024-CS-012', 'Computer Science', 1, 'CS-Y1-A', '2006-01-20', 'Kampong Speu', 'Village 13, Kampong Speu',
    'ម៉ម ណារុណ', '012444005', 'ថាច់ សុភី', '012444006', 'ម៉ម ណារុណ', 'Father', '012444005'),
('d0000000-0000-0000-0000-000000000014', 'KSIT2024-IT-010', 'Information Technology', 1, 'IT-Y1-B', '2006-03-15', 'Kandal', 'Village 14, Kampong Speu',
    'កែវ វិចិត្រ', '012444007', 'សុខ ដារ៉ា', '012444008', 'កែវ វិចិត្រ', 'Father', '012444007'),
('d0000000-0000-0000-0000-000000000015', 'KSIT2022-CS-018', 'Computer Science', 3, 'CS-Y3-B', '2004-10-05', 'Kampong Speu', 'Village 15, Kampong Speu',
    'សុខ ពុទ្ធី', '012444009', 'ហេង សុខមាលី', '012444010', 'សុខ ពុទ្ធី', 'Father', '012444009');

INSERT INTO academic_profiles (user_id, student_id_card, major, academic_year, class_section, date_of_birth, place_of_birth, current_address,
    father_name, father_phone, mother_name, mother_phone, guarantor_name, guarantor_relation, guarantor_phone)
VALUES
('d0000000-0000-0000-0000-000000000016', 'KSIT2022-IT-015', 'Information Technology', 3, 'IT-Y3-B', '2004-12-18', 'Kampong Cham', 'Village 16, Kampong Speu',
    'ចំរើន សុខា', '012444011', 'លី សុវណ្ណា', '012444012', 'ចំរើន សុខា', 'Father', '012444011'),
('d0000000-0000-0000-0000-000000000017', 'KSIT2021-CS-022', 'Computer Science', 4, 'CS-Y4-B', '2003-02-28', 'Phnom Penh', 'Village 17, Kampong Speu',
    'ថាច់ វ៉ាន់', '012444013', 'គង់ ចន្ទលីនា', '012444014', 'ថាច់ វ៉ាន់', 'Father', '012444013'),
('d0000000-0000-0000-0000-000000000018', 'KSIT2021-IT-020', 'Information Technology', 4, 'IT-Y4-B', '2003-07-10', 'Kampong Speu', 'Village 18, Kampong Speu',
    'ស៊ុន ណារុណ', '012444015', 'ម៉ម សុភី', '012444016', 'ស៊ុន ណារុណ', 'Father', '012444015'),
('d0000000-0000-0000-0000-000000000019', 'KSIT2023-IT-005', 'Information Technology', 2, 'IT-Y2-B', '2005-11-25', 'Takeo', 'Village 19, Kampong Speu',
    'ហេង សុវណ្ណ', '012444017', 'សុខ រតនា', '012444018', 'ហេង សុវណ្ណ', 'Father', '012444017'),
('d0000000-0000-0000-0000-000000000020', 'KSIT2024-CS-015', 'Computer Science', 1, 'CS-Y1-C', '2006-05-30', 'Kampong Speu', 'Village 20, Kampong Speu',
    'លឹម ចន្ទុល', '012444019', 'កែវ សុភា', '012444020', 'លឹម ចន្ទុល', 'Father', '012444019');

-- ==============================================================================
-- 3. INSERT BUILDINGS
-- ==============================================================================

INSERT INTO buildings (id, code, name, gender_restriction, total_floors, description)
VALUES
('10000000-0000-0000-0000-000000000001', 'BLDG-M1', 'Male Dormitory Building 1', 'male', 3, 'Main male dormitory building with 3 floors'),
('10000000-0000-0000-0000-000000000002', 'BLDG-F1', 'Female Dormitory Building 1', 'female', 3, 'Main female dormitory building with 3 floors'),
('10000000-0000-0000-0000-000000000003', 'BLDG-M2', 'Male Dormitory Building 2', 'male', 2, 'Secondary male dormitory building with 2 floors');

-- ==============================================================================
-- 4. INSERT ROOMS
-- ==============================================================================

-- Male Building 1 - Floor 1 (Rooms 101-105, Year 2 Computer Science)
INSERT INTO rooms (id, building_id, room_number, floor_number, capacity, gender, assigned_major, assigned_year, magic_qr_code, status)
VALUES
('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', 'M1-101', 1, 4, 'male', 'Computer Science', 2, 'QR-M1-101-2025', 'available'),
('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000001', 'M1-102', 1, 4, 'male', 'Computer Science', 2, 'QR-M1-102-2025', 'available'),
('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000001', 'M1-103', 1, 4, 'male', 'Information Technology', 2, 'QR-M1-103-2025', 'available'),
('20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000001', 'M1-104', 1, 4, 'male', 'Computer Science', 1, 'QR-M1-104-2025', 'available'),
('20000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000001', 'M1-105', 1, 4, 'male', 'Information Technology', 1, 'QR-M1-105-2025', 'available');

-- Male Building 1 - Floor 2 (Rooms 201-205, Year 3 & 4)
INSERT INTO rooms (id, building_id, room_number, floor_number, capacity, gender, assigned_major, assigned_year, magic_qr_code, status)
VALUES
('20000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000001', 'M1-201', 2, 4, 'male', 'Computer Science', 3, 'QR-M1-201-2025', 'available'),
('20000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000001', 'M1-202', 2, 4, 'male', 'Information Technology', 3, 'QR-M1-202-2025', 'available'),
('20000000-0000-0000-0000-000000000203', '10000000-0000-0000-0000-000000000001', 'M1-203', 2, 4, 'male', 'Computer Science', 4, 'QR-M1-203-2025', 'available'),
('20000000-0000-0000-0000-000000000204', '10000000-0000-0000-0000-000000000001', 'M1-204', 2, 4, 'male', 'Information Technology', 4, 'QR-M1-204-2025', 'available'),
('20000000-0000-0000-0000-000000000205', '10000000-0000-0000-0000-000000000001', 'M1-205', 2, 4, 'male', 'Computer Science', 4, 'QR-M1-205-2025', 'available');

-- Female Building 1 - Floor 1 (Rooms 101-105, Year 1 & 2)
INSERT INTO rooms (id, building_id, room_number, floor_number, capacity, gender, assigned_major, assigned_year, magic_qr_code, status)
VALUES
('30000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000002', 'F1-101', 1, 4, 'female', 'Computer Science', 2, 'QR-F1-101-2025', 'available'),
('30000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000002', 'F1-102', 1, 4, 'female', 'Information Technology', 2, 'QR-F1-102-2025', 'available'),
('30000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000002', 'F1-103', 1, 4, 'female', 'Computer Science', 1, 'QR-F1-103-2025', 'available'),
('30000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000002', 'F1-104', 1, 4, 'female', 'Information Technology', 1, 'QR-F1-104-2025', 'available'),
('30000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000002', 'F1-105', 1, 4, 'female', 'Computer Science', 1, 'QR-F1-105-2025', 'available');

-- Female Building 1 - Floor 2 (Rooms 201-205, Year 3 & 4)
INSERT INTO rooms (id, building_id, room_number, floor_number, capacity, gender, assigned_major, assigned_year, magic_qr_code, status)
VALUES
('30000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', 'F1-201', 2, 4, 'female', 'Computer Science', 3, 'QR-F1-201-2025', 'available'),
('30000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000002', 'F1-202', 2, 4, 'female', 'Information Technology', 3, 'QR-F1-202-2025', 'available'),
('30000000-0000-0000-0000-000000000203', '10000000-0000-0000-0000-000000000002', 'F1-203', 2, 4, 'female', 'Computer Science', 4, 'QR-F1-203-2025', 'available'),
('30000000-0000-0000-0000-000000000204', '10000000-0000-0000-0000-000000000002', 'F1-204', 2, 4, 'female', 'Information Technology', 4, 'QR-F1-204-2025', 'available'),
('30000000-0000-0000-0000-000000000205', '10000000-0000-0000-0000-000000000002', 'F1-205', 2, 4, 'female', 'Computer Science', 4, 'QR-F1-205-2025', 'available');

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Test data inserted successfully!';
    RAISE NOTICE 'Users created: 24 (1 admin, 1 manager, 2 teachers, 20 students)';
    RAISE NOTICE 'Academic profiles: 20 students';
    RAISE NOTICE 'Buildings: 3';
    RAISE NOTICE 'Rooms: 20';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Test Login Credentials (password: test123):';
    RAISE NOTICE '  Admin: admin@ksit.edu.kh';
    RAISE NOTICE '  Manager: manager@ksit.edu.kh';
    RAISE NOTICE '  Teacher: sokha@ksit.edu.kh';
    RAISE NOTICE '  Student: sophal@student.ksit.edu.kh';
END $$;
