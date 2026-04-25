alter table public.quizzes enable row level security;

drop policy if exists "Students can select all quizzes" on public.quizzes;

create policy "Students can select all quizzes"
on public.quizzes
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'student'
  )
);
