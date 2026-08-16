-- Idempotently provision the documented KSIT demo accounts.
-- Each password is hashed in PostgreSQL with bcrypt (cost factor 10) via pgcrypto.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH demo_accounts(email, role, full_name_khmer, full_name_latin, gender, phone, plain_password) AS (
  VALUES
    ('admin@ksit.edu.kh', 'admin', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ KSIT', 'KSIT System Administrator', 'male', '010000001', 'Admin@123'),
    ('manager@ksit.edu.kh', 'manager', 'អ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន', 'KSIT Dormitory Manager', 'male', '010000002', 'Manager@123'),
    ('teacher@ksit.edu.kh', 'teacher', 'គ្រូបន្ទុកអន្តេវាសិកដ្ឋាន', 'KSIT Dormitory Teacher', 'female', '010000003', 'Teacher@123'),
    ('student@ksit.edu.kh', 'student', 'និស្សិតសាកល្បង KSIT', 'KSIT Demo Student', 'female', '010000004', 'Student@123')
),
updated AS (
  UPDATE public.users AS u
  SET
    role = demo.role::public.user_role,
    password_hash = crypt(demo.plain_password, gen_salt('bf', 10)),
    updated_at = CURRENT_TIMESTAMP
  FROM demo_accounts AS demo
  WHERE lower(u.email) = demo.email
  RETURNING lower(u.email) AS email
)
INSERT INTO public.users (
  role,
  full_name_khmer,
  full_name_latin,
  gender,
  phone,
  email,
  password_hash
)
SELECT
  demo.role::public.user_role,
  demo.full_name_khmer,
  demo.full_name_latin,
  demo.gender::public.gender_type,
  demo.phone,
  demo.email,
  crypt(demo.plain_password, gen_salt('bf', 10))
FROM demo_accounts AS demo
WHERE NOT EXISTS (
  SELECT 1
  FROM public.users AS u
  WHERE lower(u.email) = demo.email
);
