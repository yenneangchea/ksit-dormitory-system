const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure database directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers to load and save files
function loadTable(tableName) {
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  if (!fs.existsSync(filePath)) {
    // If table doesn't exist, seed it or return empty array
    seedTable(tableName);
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error loading table ${tableName}:`, err);
    return [];
  }
}

function saveTable(tableName, data) {
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error saving table ${tableName}:`, err);
  }
}

// Seed the tables with initial test data matching test_data.sql
function seedTable(tableName) {
  const filePath = path.join(DATA_DIR, `${tableName}.json`);
  let initialData = [];

  if (tableName === 'users') {
    initialData = [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        telegram_id: 'admin001',
        role: 'admin',
        full_name_khmer: 'គ្រប់គ្រងប្រព័ន្ធ',
        full_name_latin: 'System Administrator',
        gender: 'male',
        phone: '012345678',
        email: 'admin@ksit.edu.kh',
        password_hash: 'test123',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        telegram_id: 'manager001',
        role: 'manager',
        full_name_khmer: 'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន',
        full_name_latin: 'Dormitory Manager',
        gender: 'male',
        phone: '012345679',
        email: 'manager@ksit.edu.kh',
        password_hash: 'test123',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        telegram_id: 'teacher001',
        role: 'teacher',
        full_name_khmer: 'លោកគ្រូសុខា',
        full_name_latin: 'Mr. Sokha',
        gender: 'male',
        phone: '012345680',
        email: 'sokha@ksit.edu.kh',
        password_hash: 'test123',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'c0000000-0000-0000-0000-000000000002',
        telegram_id: 'teacher002',
        role: 'teacher',
        full_name_khmer: 'លោកគ្រូស្រីដា',
        full_name_latin: 'Ms. Sreida',
        gender: 'female',
        phone: '012345681',
        email: 'sreida@ksit.edu.kh',
        password_hash: 'test123',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Male Students 1-10
    const maleNames = [
      { kh: 'ស៊ីន សុភា', en: 'Sin Sophal' },
      { kh: 'គឹម ជាតិ', en: 'Kim Cheat' },
      { kh: 'លី សុវណ្ណ', en: 'Ly Sovan' },
      { kh: 'ចាន់ ដារ៉ា', en: 'Chan Dara' },
      { kh: 'ប៉ែន វិចិត្រ', en: 'Pen Vichit' },
      { kh: 'ហេង សំរិទ្ធ', en: 'Heng Samrit' },
      { kh: 'ឈន ភក្ត្រា', en: 'Chhon Phaktra' },
      { kh: 'ពេជ្រ រដ្ឋា', en: 'Pich Ratha' },
      { kh: 'សុខ វណ្ណៈ', en: 'Sok Vanna' },
      { kh: 'ម៉េង គឹមលី', en: 'Meng Kimly' }
    ];

    maleNames.forEach((name, i) => {
      const pad = String(i + 1).padStart(3, '0');
      const idPad = String(i + 1);
      initialData.push({
        id: `d0000000-0000-0000-0000-0000000000${String(i + 1).padStart(2, '0')}`,
        telegram_id: `student${pad}`,
        role: 'student',
        full_name_khmer: name.kh,
        full_name_latin: name.en,
        gender: 'male',
        phone: `0121110${pad.substring(1)}`,
        email: `${name.en.split(' ')[1].toLowerCase()}@student.ksit.edu.kh`,
        password_hash: 'test123',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    // Female Students 11-20
    const femaleNames = [
      { kh: 'រស្មី សុខលីនា', en: 'Rosmey Soklyna' },
      { kh: 'គង់ ស្រីមុំ', en: 'Kong Sreymom' },
      { kh: 'ម៉ម សុផានី', en: 'Mom Sophany' },
      { kh: 'កែវ ចន្ទ្រា', en: 'Keo Chantra' },
      { kh: 'សុខ លីហួរ', en: 'Sok Lyhour' },
      { kh: 'ចំរើន គន្ធា', en: 'Chamroeun Konthea' },
      { kh: 'ថាច់ រតនា', en: 'Thach Ratana' },
      { kh: 'ស៊ុន វណ្ណី', en: 'Sun Vanny' },
      { kh: 'ហេង ចន្ទសុភា', en: 'Heng Chansophal' },
      { kh: 'លឹម ស្រីនាង', en: 'Lim Sreynang' }
    ];

    femaleNames.forEach((name, i) => {
      const idx = i + 11;
      const pad = String(idx).padStart(3, '0');
      initialData.push({
        id: `d0000000-0000-0000-0000-0000000000${idx}`,
        telegram_id: `student${pad}`,
        role: 'student',
        full_name_khmer: name.kh,
        full_name_latin: name.en,
        gender: 'female',
        phone: `0122220${String(i + 1).padStart(2, '0')}`,
        email: `${name.en.split(' ')[1].toLowerCase()}@student.ksit.edu.kh`,
        password_hash: 'test123',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  }

  else if (tableName === 'academic_profiles') {
    initialData = [
      // Male Academic Profiles
      {
        id: 'ap000000-0000-0000-0000-000000000001',
        user_id: 'd0000000-0000-0000-0000-000000000001',
        student_id_card: 'KSIT2023-CS-001',
        major: 'Computer Science',
        academic_year: 2,
        class_section: 'CS-Y2-A',
        date_of_birth: '2005-03-15',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 1, Kampong Speu',
        father_name: 'ស៊ីន ណារុណ',
        father_phone: '012333001',
        mother_name: 'ហុក សុខាន់',
        mother_phone: '012333002',
        guarantor_name: 'ស៊ីន ណារុណ',
        guarantor_relation: 'Father',
        guarantor_phone: '012333001',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000002',
        user_id: 'd0000000-0000-0000-0000-000000000002',
        student_id_card: 'KSIT2023-CS-002',
        major: 'Computer Science',
        academic_year: 2,
        class_section: 'CS-Y2-A',
        date_of_birth: '2005-05-20',
        place_of_birth: 'Phnom Penh',
        current_address: 'Village 2, Kampong Speu',
        father_name: 'គឹម ច័ន្ទ',
        father_phone: '012333003',
        mother_name: 'សុខ កញ្ញា',
        mother_phone: '012333004',
        guarantor_name: 'គឹម ច័ន្ទ',
        guarantor_relation: 'Father',
        guarantor_phone: '012333003',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000003',
        user_id: 'd0000000-0000-0000-0000-000000000003',
        student_id_card: 'KSIT2023-IT-001',
        major: 'Information Technology',
        academic_year: 2,
        class_section: 'IT-Y2-A',
        date_of_birth: '2005-07-10',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 3, Kampong Speu',
        father_name: 'លី ដាវីត',
        father_phone: '012333005',
        mother_name: 'ម៉ម សុវណ្ណា',
        mother_phone: '012333006',
        guarantor_name: 'លី ដាវីត',
        guarantor_relation: 'Father',
        guarantor_phone: '012333005',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000004',
        user_id: 'd0000000-0000-0000-0000-000000000004',
        student_id_card: 'KSIT2024-CS-010',
        major: 'Computer Science',
        academic_year: 1,
        class_section: 'CS-Y1-B',
        date_of_birth: '2006-02-12',
        place_of_birth: 'Kandal',
        current_address: 'Village 4, Kampong Speu',
        father_name: 'ចាន់ សុខា',
        father_phone: '012333007',
        mother_name: 'ពេជ្រ រស្មី',
        mother_phone: '012333008',
        guarantor_name: 'ចាន់ សុខា',
        guarantor_relation: 'Father',
        guarantor_phone: '012333007',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000005',
        user_id: 'd0000000-0000-0000-0000-000000000005',
        student_id_card: 'KSIT2024-IT-008',
        major: 'Information Technology',
        academic_year: 1,
        class_section: 'IT-Y1-A',
        date_of_birth: '2006-04-25',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 5, Kampong Speu',
        father_name: 'ប៉ែន រដ្ឋា',
        father_phone: '012333009',
        mother_name: 'សុខ ចន្ទលីនា',
        mother_phone: '012333010',
        guarantor_name: 'ប៉ែន រដ្ឋា',
        guarantor_relation: 'Father',
        guarantor_phone: '012333009',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000006',
        user_id: 'd0000000-0000-0000-0000-000000000006',
        student_id_card: 'KSIT2022-CS-015',
        major: 'Computer Science',
        academic_year: 3,
        class_section: 'CS-Y3-A',
        date_of_birth: '2004-08-30',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 6, Kampong Speu',
        father_name: 'ហេង ណារុណ',
        father_phone: '012333011',
        mother_name: 'គង់ សុភី',
        mother_phone: '012333012',
        guarantor_name: 'ហេង ណារុណ',
        guarantor_relation: 'Father',
        guarantor_phone: '012333011',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000007',
        user_id: 'd0000000-0000-0000-0000-000000000007',
        student_id_card: 'KSIT2022-IT-012',
        major: 'Information Technology',
        academic_year: 3,
        class_section: 'IT-Y3-A',
        date_of_birth: '2004-11-05',
        place_of_birth: 'Kampong Cham',
        current_address: 'Village 7, Kampong Speu',
        father_name: 'ឈន ពុទ្ធី',
        father_phone: '012333013',
        mother_name: 'ម៉ម រដ្ឋា',
        mother_phone: '012333014',
        guarantor_name: 'ឈន ពុទ្ធី',
        guarantor_relation: 'Father',
        guarantor_phone: '012333013',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000008',
        user_id: 'd0000000-0000-0000-0000-000000000008',
        student_id_card: 'KSIT2021-CS-020',
        major: 'Computer Science',
        academic_year: 4,
        class_section: 'CS-Y4-A',
        date_of_birth: '2003-01-18',
        place_of_birth: 'Phnom Penh',
        current_address: 'Village 8, Kampong Speu',
        father_name: 'ពេជ្រ សុខា',
        father_phone: '012333015',
        mother_name: 'កែវ ចាន់',
        mother_phone: '012333016',
        guarantor_name: 'ពេជ្រ សុខា',
        guarantor_relation: 'Father',
        guarantor_phone: '012333015',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000009',
        user_id: 'd0000000-0000-0000-0000-000000000009',
        student_id_card: 'KSIT2021-IT-018',
        major: 'Information Technology',
        academic_year: 4,
        class_section: 'IT-Y4-A',
        date_of_birth: '2003-09-22',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 9, Kampong Speu',
        father_name: 'សុខ វិទូ',
        father_phone: '012333017',
        mother_name: 'លី ស្រីពៅ',
        mother_phone: '012333018',
        guarantor_name: 'សុខ វិទូ',
        guarantor_relation: 'Father',
        guarantor_phone: '012333017',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000010',
        user_id: 'd0000000-0000-0000-0000-000000000010',
        student_id_card: 'KSIT2023-CS-005',
        major: 'Computer Science',
        academic_year: 2,
        class_section: 'CS-Y2-B',
        date_of_birth: '2005-06-14',
        place_of_birth: 'Takeo',
        current_address: 'Village 10, Kampong Speu',
        father_name: 'ម៉េង សុវណ្ណ',
        father_phone: '012333019',
        mother_name: 'ហុក រស្មី',
        mother_phone: '012333020',
        guarantor_name: 'ម៉េង សុវណ្ណ',
        guarantor_relation: 'Father',
        guarantor_phone: '012333019',
        created_at: new Date().toISOString()
      },
      // Female Academic Profiles
      {
        id: 'ap000000-0000-0000-0000-000000000011',
        user_id: 'd0000000-0000-0000-0000-000000000011',
        student_id_card: 'KSIT2023-CS-003',
        major: 'Computer Science',
        academic_year: 2,
        class_section: 'CS-Y2-A',
        date_of_birth: '2005-04-08',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 11, Kampong Speu',
        father_name: 'រស្មី វិចិត្រ',
        father_phone: '012444001',
        mother_name: 'គង់ ស្រីនាង',
        mother_phone: '012444002',
        guarantor_name: 'រស្មី វិចិត្រ',
        guarantor_relation: 'Father',
        guarantor_phone: '012444001',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000012',
        user_id: 'd0000000-0000-0000-0000-000000000012',
        student_id_card: 'KSIT2023-IT-003',
        major: 'Information Technology',
        academic_year: 2,
        class_section: 'IT-Y2-A',
        date_of_birth: '2005-09-12',
        place_of_birth: 'Phnom Penh',
        current_address: 'Village 12, Kampong Speu',
        father_name: 'គង់ សុផាន់',
        father_phone: '012444003',
        mother_name: 'ម៉ម រស្មី',
        mother_phone: '012444004',
        guarantor_name: 'គង់ សុផាន់',
        guarantor_relation: 'Father',
        guarantor_phone: '012444003',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000013',
        user_id: 'd0000000-0000-0000-0000-000000000013',
        student_id_card: 'KSIT2024-CS-012',
        major: 'Computer Science',
        academic_year: 1,
        class_section: 'CS-Y1-A',
        date_of_birth: '2006-01-20',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 13, Kampong Speu',
        father_name: 'ម៉ម ណារុណ',
        father_phone: '012444005',
        mother_name: 'ថាច់ សុភី',
        mother_phone: '012444006',
        guarantor_name: 'ម៉ម ណារុណ',
        guarantor_relation: 'Father',
        guarantor_phone: '012444005',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000014',
        user_id: 'd0000000-0000-0000-0000-000000000014',
        student_id_card: 'KSIT2024-IT-010',
        major: 'Information Technology',
        academic_year: 1,
        class_section: 'IT-Y1-B',
        date_of_birth: '2006-03-15',
        place_of_birth: 'Kandal',
        current_address: 'Village 14, Kampong Speu',
        father_name: 'កែវ វិចិត្រ',
        father_phone: '012444007',
        mother_name: 'សុខ ដារ៉ា',
        mother_phone: '012444008',
        guarantor_name: 'កែវ វិចិត្រ',
        guarantor_relation: 'Father',
        guarantor_phone: '012444007',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000015',
        user_id: 'd0000000-0000-0000-0000-000000000015',
        student_id_card: 'KSIT2022-CS-018',
        major: 'Computer Science',
        academic_year: 3,
        class_section: 'CS-Y3-B',
        date_of_birth: '2004-10-05',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 15, Kampong Speu',
        father_name: 'សុខ ពុទ្ធី',
        father_phone: '012444009',
        mother_name: 'ហេង សុខមាលី',
        mother_phone: '012444010',
        guarantor_name: 'សុខ ពុទ្ធី',
        guarantor_relation: 'Father',
        guarantor_phone: '012444009',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000016',
        user_id: 'd0000000-0000-0000-0000-000000000016',
        student_id_card: 'KSIT2022-IT-015',
        major: 'Information Technology',
        academic_year: 3,
        class_section: 'IT-Y3-B',
        date_of_birth: '2004-12-18',
        place_of_birth: 'Kampong Cham',
        current_address: 'Village 16, Kampong Speu',
        father_name: 'ចំរើន សុខា',
        father_phone: '012444011',
        mother_name: 'លី សុវណ្ណា',
        mother_phone: '012444012',
        guarantor_name: 'ចំរើន សុខា',
        guarantor_relation: 'Father',
        guarantor_phone: '012444011',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000017',
        user_id: 'd0000000-0000-0000-0000-000000000017',
        student_id_card: 'KSIT2021-CS-022',
        major: 'Computer Science',
        academic_year: 4,
        class_section: 'CS-Y4-B',
        date_of_birth: '2003-02-28',
        place_of_birth: 'Phnom Penh',
        current_address: 'Village 17, Kampong Speu',
        father_name: 'ថាច់ វ៉ាន់',
        father_phone: '012444013',
        mother_name: 'គង់ ចន្ទលីនា',
        mother_phone: '012444014',
        guarantor_name: 'ថាច់ វ៉ាន់',
        guarantor_relation: 'Father',
        guarantor_phone: '012444013',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000018',
        user_id: 'd0000000-0000-0000-0000-000000000018',
        student_id_card: 'KSIT2021-IT-020',
        major: 'Information Technology',
        academic_year: 4,
        class_section: 'IT-Y4-B',
        date_of_birth: '2003-07-10',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 18, Kampong Speu',
        father_name: 'ស៊ុន ណារុណ',
        father_phone: '012444015',
        mother_name: 'ម៉ម សុភី',
        mother_phone: '012444016',
        guarantor_name: 'ស៊ុន ណារុណ',
        guarantor_relation: 'Father',
        guarantor_phone: '012444015',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000019',
        user_id: 'd0000000-0000-0000-0000-000000000019',
        student_id_card: 'KSIT2023-IT-005',
        major: 'Information Technology',
        academic_year: 2,
        class_section: 'IT-Y2-B',
        date_of_birth: '2005-11-25',
        place_of_birth: 'Takeo',
        current_address: 'Village 19, Kampong Speu',
        father_name: 'ហេង សុវណ្ណ',
        father_phone: '012444017',
        mother_name: 'សុខ រតនា',
        mother_phone: '012444018',
        guarantor_name: 'ហេង សុវណ្ណ',
        guarantor_relation: 'Father',
        guarantor_phone: '012444017',
        created_at: new Date().toISOString()
      },
      {
        id: 'ap000000-0000-0000-0000-000000000020',
        user_id: 'd0000000-0000-0000-0000-000000000020',
        student_id_card: 'KSIT2024-CS-015',
        major: 'Computer Science',
        academic_year: 1,
        class_section: 'CS-Y1-C',
        date_of_birth: '2006-05-30',
        place_of_birth: 'Kampong Speu',
        current_address: 'Village 20, Kampong Speu',
        father_name: 'លឹម ចន្ទុល',
        father_phone: '012444019',
        mother_name: 'កែវ សុភា',
        mother_phone: '012444020',
        guarantor_name: 'លឹម ចន្ទុល',
        guarantor_relation: 'Father',
        guarantor_phone: '012444019',
        created_at: new Date().toISOString()
      }
    ];
  }

  else if (tableName === 'buildings') {
    initialData = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        code: 'BLDG-M1',
        name: 'Male Dormitory Building 1',
        gender_restriction: 'male',
        total_floors: 3,
        description: 'Main male dormitory building with 3 floors',
        created_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        code: 'BLDG-F1',
        name: 'Female Dormitory Building 1',
        gender_restriction: 'female',
        total_floors: 3,
        description: 'Main female dormitory building with 3 floors',
        created_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        code: 'BLDG-M2',
        name: 'Male Dormitory Building 2',
        gender_restriction: 'male',
        total_floors: 2,
        description: 'Secondary male dormitory building with 2 floors',
        created_at: new Date().toISOString()
      }
    ];
  }

  else if (tableName === 'rooms') {
    initialData = [];

    // Male Building 1 (10 rooms)
    const maleRoomSpecs = [
      { nr: 'M1-101', fl: 1, maj: 'Computer Science', yr: 2 },
      { nr: 'M1-102', fl: 1, maj: 'Computer Science', yr: 2 },
      { nr: 'M1-103', fl: 1, maj: 'Information Technology', yr: 2 },
      { nr: 'M1-104', fl: 1, maj: 'Computer Science', yr: 1 },
      { nr: 'M1-105', fl: 1, maj: 'Information Technology', yr: 1 },
      { nr: 'M1-201', fl: 2, maj: 'Computer Science', yr: 3 },
      { nr: 'M1-202', fl: 2, maj: 'Information Technology', yr: 3 },
      { nr: 'M1-203', fl: 2, maj: 'Computer Science', yr: 4 },
      { nr: 'M1-204', fl: 2, maj: 'Information Technology', yr: 4 },
      { nr: 'M1-205', fl: 2, maj: 'Computer Science', yr: 4 }
    ];

    maleRoomSpecs.forEach((spec) => {
      initialData.push({
        id: `20000000-0000-0000-0000-000000000${spec.nr.replace('-', '')}`,
        building_id: '10000000-0000-0000-0000-000000000001',
        room_number: spec.nr,
        floor_number: spec.fl,
        capacity: 4,
        occupied_count: 0,
        gender: 'male',
        assigned_major: spec.maj,
        assigned_year: spec.yr,
        magic_qr_code: `QR-${spec.nr}-2025`,
        status: 'available',
        created_at: new Date().toISOString()
      });
    });

    // Female Building 1 (10 rooms)
    const femaleRoomSpecs = [
      { nr: 'F1-101', fl: 1, maj: 'Computer Science', yr: 2 },
      { nr: 'F1-102', fl: 1, maj: 'Information Technology', yr: 2 },
      { nr: 'F1-103', fl: 1, maj: 'Computer Science', yr: 1 },
      { nr: 'F1-104', fl: 1, maj: 'Information Technology', yr: 1 },
      { nr: 'F1-105', fl: 1, maj: 'Computer Science', yr: 1 },
      { nr: 'F1-201', fl: 2, maj: 'Computer Science', yr: 3 },
      { nr: 'F1-202', fl: 2, maj: 'Information Technology', yr: 3 },
      { nr: 'F1-203', fl: 2, maj: 'Computer Science', yr: 4 },
      { nr: 'F1-204', fl: 2, maj: 'Information Technology', yr: 4 },
      { nr: 'F1-205', fl: 2, maj: 'Computer Science', yr: 4 }
    ];

    femaleRoomSpecs.forEach((spec) => {
      initialData.push({
        id: `30000000-0000-0000-0000-000000000${spec.nr.replace('-', '')}`,
        building_id: '10000000-0000-0000-0000-000000000002',
        room_number: spec.nr,
        floor_number: spec.fl,
        capacity: 4,
        occupied_count: 0,
        gender: 'female',
        assigned_major: spec.maj,
        assigned_year: spec.yr,
        magic_qr_code: `QR-${spec.nr}-2025`,
        status: 'available',
        created_at: new Date().toISOString()
      });
    });
  }

  else if (tableName === 'room_applications') {
    initialData = [];
    // Seed approved applications for all 20 students
    // Male students (1-10)
    for (let i = 1; i <= 10; i++) {
      initialData.push({
        id: `app00000-0000-0000-0000-0000000000${String(i).padStart(2, '0')}`,
        user_id: `d0000000-0000-0000-0000-00000000000${i}`,
        academic_year_applied: '2025-2026',
        status: 'approved',
        photo_4x6_attached: true,
        contract_signed: true,
        parent_guarantee_attached: true,
        family_book_attached: true,
        id_card_attached: true,
        applied_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'b0000000-0000-0000-0000-000000000001'
      });
    }
    // Female students (11-20)
    for (let i = 11; i <= 20; i++) {
      initialData.push({
        id: `app00000-0000-0000-0000-0000000000${i}`,
        user_id: `d0000000-0000-0000-0000-0000000000${i}`,
        academic_year_applied: '2025-2026',
        status: 'approved',
        photo_4x6_attached: true,
        contract_signed: true,
        parent_guarantee_attached: true,
        family_book_attached: true,
        id_card_attached: true,
        applied_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'b0000000-0000-0000-0000-000000000001'
      });
    }
  }

  // All other tables are empty by default
  fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf8');
}

// Relational join mapper
function applyJoins(row, selectString, tableName) {
  if (!row) return null;
  const joinedRow = { ...row };

  const hasUserJoin = selectString.includes('user:users') || selectString.includes('users!room_applications_user_id_fkey') || selectString.includes('users!room_assignments_student_id_fkey');
  const hasAcademicJoin = selectString.includes('academic_profile:academic_profiles') || selectString.includes('academic_profiles!academic_profiles_user_id_fkey');
  const hasReviewerJoin = selectString.includes('reviewer:users') || selectString.includes('users!room_applications_reviewed_by_fkey');
  const hasRoomJoin = selectString.includes('room:rooms') || selectString.includes('rooms!room_assignments_room_id_fkey');
  const hasBuildingJoin = selectString.includes('building:buildings');

  if (hasUserJoin) {
    const users = loadTable('users');
    const lookupId = row.user_id || row.student_id;
    const user = users.find(u => u.id === lookupId);
    joinedRow.user = user ? {
      id: user.id,
      telegram_id: user.telegram_id,
      role: user.role,
      full_name_khmer: user.full_name_khmer,
      full_name_latin: user.full_name_latin,
      gender: user.gender,
      phone: user.phone,
      email: user.email,
      avatar_url: user.avatar_url
    } : null;
    joinedRow.student = joinedRow.user;
  }

  if (hasAcademicJoin) {
    const acads = loadTable('academic_profiles');
    const lookupId = row.user_id || row.student_id || row.id;
    const profile = acads.find(a => a.user_id === lookupId || a.id === lookupId);
    joinedRow.academic_profile = profile || null;
  }

  if (hasReviewerJoin) {
    const users = loadTable('users');
    const reviewer = users.find(u => u.id === row.reviewed_by);
    joinedRow.reviewer = reviewer ? {
      id: reviewer.id,
      full_name_latin: reviewer.full_name_latin,
      role: reviewer.role
    } : null;
  }

  if (hasRoomJoin) {
    const rooms = loadTable('rooms');
    const room = rooms.find(r => r.id === row.room_id);
    if (room) {
      const roomCopy = { ...room };
      const buildings = loadTable('buildings');
      const building = buildings.find(b => b.id === room.building_id);
      roomCopy.building = building ? {
        id: building.id,
        code: building.code,
        name: building.name,
        gender_restriction: building.gender_restriction
      } : null;
      joinedRow.room = roomCopy;
    } else {
      joinedRow.room = null;
    }
  }

  if (hasBuildingJoin) {
    const buildings = loadTable('buildings');
    const building = buildings.find(b => b.id === row.building_id);
    joinedRow.building = building || null;
  }

  return joinedRow;
}

// Chained Query Builder Class
class MockSupabaseQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.filters = [];
    this.orderByField = null;
    this.orderAscending = true;
    this.limitCount = null;
    this.isSingle = false;
    this.selectString = '*';

    this.action = 'select'; // 'select', 'insert', 'update', 'delete'
    this.insertData = null;
    this.updateData = null;
  }

  select(selectString = '*') {
    this.selectString = selectString;
    this.action = 'select';
    return this;
  }

  eq(column, value) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  neq(column, value) {
    this.filters.push((item) => item[column] !== value);
    return this;
  }

  in(column, values) {
    this.filters.push((item) => values.includes(item[column]));
    return this;
  }

  or(orString) {
    this.filters.push((item) => {
      const conditions = orString.split(',');
      return conditions.some(cond => {
        const parts = cond.split('.');
        const col = parts[0];
        const op = parts[1];
        let val = parts[2];
        if (op === 'ilike' || op === 'like') {
          val = val.replace(/%/g, '').toLowerCase();
          return item[col] && String(item[col]).toLowerCase().includes(val);
        }
        return item[col] === val;
      });
    });
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderByField = column;
    this.orderAscending = ascending;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(rows) {
    this.action = 'insert';
    this.insertData = rows;
    return this;
  }

  update(updateData) {
    this.action = 'update';
    this.updateData = updateData;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  async execute() {
    let tableData = loadTable(this.tableName);

    if (this.action === 'insert') {
      const newRows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const prepended = newRows.map(row => {
        const defaults = {};
        if (this.tableName === 'room_assignments') {
          defaults.assigned_at = new Date().toISOString();
        }
        if (this.tableName === 'room_applications') {
          defaults.applied_at = new Date().toISOString();
        }
        return {
          id: row.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 17) + Math.random().toString(36).substring(2, 17)),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...defaults,
          ...row
        };
      });
      tableData.push(...prepended);
      saveTable(this.tableName, tableData);

      if (this.tableName === 'room_assignments') {
        updateRoomOccupanciesTrigger();
      }

      if (this.isSingle) {
        return { data: prepended[0], error: null };
      }
      return { data: prepended, error: null };
    }

    if (this.action === 'update') {
      let filteredItems = [...tableData];
      for (const filterFn of this.filters) {
        filteredItems = filteredItems.filter(filterFn);
      }
      const idsToUpdate = filteredItems.map(item => item.id);

      const updatedRows = [];
      const newTableData = tableData.map(item => {
        if (idsToUpdate.includes(item.id)) {
          const updatedItem = {
            ...item,
            ...this.updateData,
            updated_at: new Date().toISOString()
          };
          updatedRows.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      saveTable(this.tableName, newTableData);

      if (this.tableName === 'room_assignments') {
        updateRoomOccupanciesTrigger();
      }

      if (this.isSingle) {
        return { data: updatedRows[0] || null, error: null };
      }
      return { data: updatedRows, error: null };
    }

    if (this.action === 'delete') {
      let filteredItems = [...tableData];
      for (const filterFn of this.filters) {
        filteredItems = filteredItems.filter(filterFn);
      }
      const idsToDelete = filteredItems.map(item => item.id);
      const newTableData = tableData.filter(item => !idsToDelete.includes(item.id));
      saveTable(this.tableName, newTableData);

      if (this.tableName === 'room_assignments') {
        updateRoomOccupanciesTrigger();
      }

      return { data: filteredItems, error: null };
    }

    // Default SELECT action
    let result = [...tableData];

    // Apply filters
    for (const filterFn of this.filters) {
      result = result.filter(filterFn);
    }

    // Apply sorting
    if (this.orderByField) {
      result.sort((a, b) => {
        const valA = a[this.orderByField];
        const valB = b[this.orderByField];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return this.orderAscending ? -1 : 1;
        if (valA > valB) return this.orderAscending ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    // Apply joins
    if (this.selectString !== '*') {
      result = result.map(row => applyJoins(row, this.selectString, this.tableName));
    }

    if (this.isSingle) {
      if (result.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: result[0], error: null };
    }

    return { data: result, error: null };
  }

  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Trigger implementation to match standard Postgres trigger
function updateRoomOccupanciesTrigger() {
  const rooms = loadTable('rooms');
  const assignments = loadTable('room_assignments');

  const updatedRooms = rooms.map(room => {
    const activeCount = assignments.filter(a => a.room_id === room.id && a.is_active === true).length;
    return {
      ...room,
      occupied_count: activeCount,
      status: activeCount >= room.capacity ? 'full' : 'available'
    };
  });

  saveTable('rooms', updatedRooms);
}

// Mock Supabase Client implementation
const mockSupabase = {
  from(tableName) {
    return new MockSupabaseQueryBuilder(tableName);
  }
};

module.exports = mockSupabase;
