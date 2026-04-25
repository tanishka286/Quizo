-- Quizo – initial schema (users → quizzes → questions → responses → results)

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null,
  created_at timestamptz not null default now(),
  constraint users_role_check check (role in ('teacher', 'student'))
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users (id),
  title text not null,
  duration_seconds integer not null,
  shuffle_questions boolean not null default false,
  created_at timestamptz not null default now(),
  constraint quizzes_duration_seconds_check check (duration_seconds > 0)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  choices jsonb not null,
  correct_option smallint not null,
  position integer not null,
  created_at timestamptz not null default now(),
  constraint questions_correct_option_check check (correct_option >= 0),
  constraint questions_position_check check ("position" >= 0)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id),
  quiz_id uuid not null references public.quizzes (id),
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_option smallint not null,
  created_at timestamptz not null default now(),
  constraint responses_selected_option_check check (selected_option >= 0),
  constraint responses_student_question_unique unique (student_id, question_id)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id),
  quiz_id uuid not null references public.quizzes (id),
  correct_count integer not null,
  total_questions integer not null,
  score_percent numeric(5, 2) not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint results_correct_count_check check (correct_count >= 0),
  constraint results_total_questions_check check (total_questions > 0),
  constraint results_score_percent_check check (score_percent between 0 and 100),
  constraint results_student_quiz_unique unique (student_id, quiz_id)
);
