create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('ADMIN', 'TEACHER')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id text primary key default gen_random_uuid()::text,
  user_id text not null unique references public.users(id) on delete cascade,
  employee_id text not null unique,
  department text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  grade_level text not null,
  academic_year text not null default '2026-2027',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, academic_year)
);

create table if not exists public.sections (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  class_id text not null references public.classes(id) on delete cascade,
  room_number text,
  capacity integer not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name)
);

create table if not exists public.subjects (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  name text not null,
  class_id text not null references public.classes(id) on delete cascade,
  teacher_id text not null references public.teachers(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id text primary key default gen_random_uuid()::text,
  student_code text not null unique,
  name text not null,
  roll_number text not null,
  class_id text not null references public.classes(id) on delete restrict,
  section_id text not null references public.sections(id) on delete restrict,
  photo_url text,
  guardian_name text,
  guardian_contact text,
  guardian_consent boolean not null default false,
  consent_date timestamptz,
  retention_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, section_id, roll_number)
);

create table if not exists public.attendance_sessions (
  id text primary key default gen_random_uuid()::text,
  client_session_id text not null unique,
  class_id text not null references public.classes(id) on delete restrict,
  section_id text not null references public.sections(id) on delete restrict,
  subject_id text not null references public.subjects(id) on delete restrict,
  teacher_id text not null references public.teachers(id) on delete restrict,
  date timestamptz not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_students integer not null default 0,
  present_count integer not null default 0,
  absent_count integer not null default 0,
  late_count integer not null default 0,
  sync_status text not null default 'SYNCED' check (sync_status in ('SYNCED', 'PENDING', 'SYNCING', 'FAILED')),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id text primary key default gen_random_uuid()::text,
  client_mutation_id text not null unique,
  student_id text not null references public.students(id) on delete cascade,
  class_id text not null references public.classes(id) on delete restrict,
  section_id text not null references public.sections(id) on delete restrict,
  teacher_id text not null references public.teachers(id) on delete restrict,
  subject_id text not null references public.subjects(id) on delete restrict,
  session_id text references public.attendance_sessions(id) on delete set null,
  date timestamptz not null,
  status text not null check (status in ('PRESENT', 'ABSENT', 'LATE', 'UNVERIFIED')),
  identification_method text not null default 'MANUAL' check (identification_method in ('MANUAL', 'AI_ASSISTED')),
  verification_status text not null default 'VERIFIED' check (verification_status in ('VERIFIED', 'PENDING_REVIEW', 'MANUAL_OVERRIDE')),
  ai_confidence double precision,
  sync_status text not null default 'SYNCED' check (sync_status in ('SYNCED', 'PENDING', 'SYNCING', 'FAILED')),
  synced_at timestamptz,
  device_timestamp timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, date)
);

create table if not exists public.captured_photos (
  id text primary key default gen_random_uuid()::text,
  session_id text not null references public.attendance_sessions(id) on delete cascade,
  image_url text not null,
  mime_type text not null default 'image/jpeg',
  faces_detected integer not null default 0,
  processed_at timestamptz,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_logs (
  id text primary key default gen_random_uuid()::text,
  client_mutation_id text not null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  status text not null check (status in ('SYNCED', 'PENDING', 'SYNCING', 'FAILED')),
  attempts integer not null default 1,
  error_message text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists teachers_employee_id_idx on public.teachers(employee_id);
create index if not exists classes_grade_level_idx on public.classes(grade_level);
create index if not exists sections_class_id_idx on public.sections(class_id);
create index if not exists subjects_class_id_idx on public.subjects(class_id);
create index if not exists subjects_teacher_id_idx on public.subjects(teacher_id);
create index if not exists students_class_section_idx on public.students(class_id, section_id);
create index if not exists students_name_idx on public.students(name);
create index if not exists attendance_date_idx on public.attendance(date);
create index if not exists attendance_student_id_idx on public.attendance(student_id);
create index if not exists attendance_class_section_idx on public.attendance(class_id, section_id);
create index if not exists attendance_sync_status_idx on public.attendance(sync_status);
create index if not exists sessions_date_idx on public.attendance_sessions(date);
create index if not exists sessions_class_section_date_idx on public.attendance_sessions(class_id, section_id, date);
create index if not exists captured_photos_session_id_idx on public.captured_photos(session_id);
create index if not exists captured_photos_retention_idx on public.captured_photos(retention_expires_at);
create index if not exists sync_logs_mutation_id_idx on public.sync_logs(client_mutation_id);
create index if not exists sync_logs_status_idx on public.sync_logs(status);
create index if not exists sync_logs_created_at_idx on public.sync_logs(created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['users','teachers','classes','sections','subjects','students','attendance_sessions','attendance'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name);
  end loop;
end;
$$;

create or replace function public.sync_attendance(p_session jsonb, p_records jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row_id text;
  record_payload jsonb;
  v_now timestamptz := now();
  synced_count integer := 0;
begin
  insert into attendance_sessions (
    client_session_id, class_id, section_id, subject_id, teacher_id, date,
    completed_at, total_students, present_count, absent_count, late_count,
    sync_status, synced_at
  ) values (
    p_session->>'clientSessionId', p_session->>'classId', p_session->>'sectionId',
    p_session->>'subjectId', p_session->>'teacherId', (p_session->>'date')::timestamptz,
    v_now, coalesce((p_session->>'totalStudents')::integer, 0),
    coalesce((p_session->>'presentCount')::integer, 0),
    coalesce((p_session->>'absentCount')::integer, 0),
    coalesce((p_session->>'lateCount')::integer, 0), 'SYNCED', v_now
  )
  on conflict (client_session_id) do update set
    completed_at = excluded.completed_at,
    total_students = excluded.total_students,
    present_count = excluded.present_count,
    absent_count = excluded.absent_count,
    late_count = excluded.late_count,
    sync_status = 'SYNCED',
    synced_at = v_now
  returning id into session_row_id;

  if nullif(p_session->>'photoDataUrl', '') is not null then
    insert into captured_photos (session_id, image_url, faces_detected, processed_at, retention_expires_at)
    values (
      session_row_id,
      p_session->>'photoDataUrl',
      coalesce((p_session->>'facesDetected')::integer, 0),
      v_now,
      v_now + interval '30 days'
    );
  end if;

  for record_payload in select value from jsonb_array_elements(p_records) as records(value) loop
    insert into attendance (
      client_mutation_id, student_id, class_id, section_id, teacher_id, subject_id,
      session_id, date, status, identification_method, verification_status,
      ai_confidence, sync_status, synced_at, device_timestamp, notes
    ) values (
      record_payload->>'clientMutationId', record_payload->>'studentId',
      record_payload->>'classId', record_payload->>'sectionId',
      record_payload->>'teacherId', record_payload->>'subjectId', session_row_id,
      (record_payload->>'date')::timestamptz, record_payload->>'status',
      coalesce(record_payload->>'identificationMethod', 'MANUAL'),
      coalesce(record_payload->>'verificationStatus', 'VERIFIED'),
      nullif(record_payload->>'aiConfidence', '')::double precision, 'SYNCED', v_now,
      coalesce(nullif(record_payload->>'deviceTimestamp', '')::timestamptz, v_now),
      record_payload->>'notes'
    )
    on conflict (client_mutation_id) do update set
      status = excluded.status,
      identification_method = excluded.identification_method,
      verification_status = excluded.verification_status,
      ai_confidence = excluded.ai_confidence,
      sync_status = 'SYNCED',
      synced_at = v_now,
      notes = excluded.notes;

    insert into sync_logs (client_mutation_id, entity_type, entity_id, action, status, synced_at)
    values (record_payload->>'clientMutationId', 'Attendance', record_payload->>'studentId', 'UPSERT', 'SYNCED', v_now);
    synced_count := synced_count + 1;
  end loop;

  return jsonb_build_object('sessionId', session_row_id, 'syncedRecords', synced_count);
end;
$$;

alter table public.users enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.sections enable row level security;
alter table public.subjects enable row level security;
alter table public.students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.captured_photos enable row level security;
alter table public.sync_logs enable row level security;

revoke all on function public.sync_attendance(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_attendance(jsonb, jsonb) to service_role;
