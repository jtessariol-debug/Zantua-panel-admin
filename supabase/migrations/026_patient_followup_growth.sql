-- Seguimiento de pacientes, evolución privada y métricas comerciales.
-- Esta migración no modifica datos clínicos, citas ni fotografías existentes.

create table if not exists public.patient_followups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  laser_session_id uuid references public.laser_sessions(id) on delete set null,
  specialist_id uuid references public.specialists(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (btrim(title) <> ''),
  scheduled_for date not null,
  completed_at timestamptz,
  status text not null default 'pendiente' check (status in ('pendiente', 'realizado', 'cancelado')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists patient_followups_client_date_idx
  on public.patient_followups(client_id, scheduled_for desc, created_at desc);
create index if not exists patient_followups_pending_date_idx
  on public.patient_followups(status, scheduled_for)
  where status = 'pendiente';
create index if not exists patient_followups_specialist_date_idx
  on public.patient_followups(specialist_id, scheduled_for)
  where specialist_id is not null;

create table if not exists public.patient_evolution_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  laser_session_id uuid references public.laser_sessions(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  captured_at date not null default current_date,
  body_area text,
  stage text not null check (stage in ('antes', 'durante', 'despues')),
  storage_path text not null unique check (btrim(storage_path) <> ''),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists patient_evolution_photos_client_date_idx
  on public.patient_evolution_photos(client_id, captured_at desc, created_at desc);
create index if not exists patient_evolution_photos_session_idx
  on public.patient_evolution_photos(laser_session_id)
  where laser_session_id is not null;

alter table public.patient_followups enable row level security;
alter table public.patient_evolution_photos enable row level security;

create or replace function public.can_manage_patient_followup(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.active = true
        and profile.role = 'recepcion'
    )
    or (
      exists (
        select 1
        from public.profiles profile
        where profile.id = auth.uid()
          and profile.active = true
          and profile.role = 'especialista'
          and profile.specialist_id is not null
          and (
            exists (
              select 1 from public.appointments appointment
              where appointment.client_id = target_client_id
                and appointment.specialist_id = profile.specialist_id
            )
            or exists (
              select 1 from public.laser_sessions session
              where session.client_id = target_client_id
                and session.specialist_id = profile.specialist_id
            )
          )
      )
    );
$$;

revoke all on function public.can_manage_patient_followup(uuid) from public;
grant execute on function public.can_manage_patient_followup(uuid) to authenticated;

drop policy if exists patient_followups_read on public.patient_followups;
create policy patient_followups_read on public.patient_followups
for select to authenticated using (public.can_manage_patient_followup(client_id));
drop policy if exists patient_followups_insert on public.patient_followups;
create policy patient_followups_insert on public.patient_followups
for insert to authenticated with check (public.can_manage_patient_followup(client_id));
drop policy if exists patient_followups_update on public.patient_followups;
create policy patient_followups_update on public.patient_followups
for update to authenticated
using (public.can_manage_patient_followup(client_id))
with check (public.can_manage_patient_followup(client_id));
drop policy if exists patient_followups_delete_admin on public.patient_followups;
create policy patient_followups_delete_admin on public.patient_followups
for delete to authenticated using (public.is_admin());

drop policy if exists patient_evolution_photos_read on public.patient_evolution_photos;
create policy patient_evolution_photos_read on public.patient_evolution_photos
for select to authenticated using (public.can_manage_patient_followup(client_id));
drop policy if exists patient_evolution_photos_insert on public.patient_evolution_photos;
create policy patient_evolution_photos_insert on public.patient_evolution_photos
for insert to authenticated with check (public.can_manage_patient_followup(client_id));
drop policy if exists patient_evolution_photos_update on public.patient_evolution_photos;
create policy patient_evolution_photos_update on public.patient_evolution_photos
for update to authenticated
using (public.can_manage_patient_followup(client_id))
with check (public.can_manage_patient_followup(client_id));
drop policy if exists patient_evolution_photos_delete_admin on public.patient_evolution_photos;
create policy patient_evolution_photos_delete_admin on public.patient_evolution_photos
for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-evolution', 'patient-evolution', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists patient_evolution_storage_read on storage.objects;
create policy patient_evolution_storage_read on storage.objects
for select to authenticated
using (
  bucket_id = 'patient-evolution'
  and array_length(storage.foldername(name), 1) > 0
  and public.can_manage_patient_followup((storage.foldername(name))[1]::uuid)
);
drop policy if exists patient_evolution_storage_insert on storage.objects;
create policy patient_evolution_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'patient-evolution'
  and array_length(storage.foldername(name), 1) > 0
  and public.can_manage_patient_followup((storage.foldername(name))[1]::uuid)
);
drop policy if exists patient_evolution_storage_update on storage.objects;
create policy patient_evolution_storage_update on storage.objects
for update to authenticated
using (bucket_id = 'patient-evolution' and public.is_admin())
with check (bucket_id = 'patient-evolution' and public.is_admin());
drop policy if exists patient_evolution_storage_delete on storage.objects;
create policy patient_evolution_storage_delete on storage.objects
for delete to authenticated
using (bucket_id = 'patient-evolution' and public.is_admin());

drop trigger if exists set_patient_followups_updated_at on public.patient_followups;
create trigger set_patient_followups_updated_at
before update on public.patient_followups
for each row execute function public.set_updated_at();
drop trigger if exists set_patient_evolution_photos_updated_at on public.patient_evolution_photos;
create trigger set_patient_evolution_photos_updated_at
before update on public.patient_evolution_photos
for each row execute function public.set_updated_at();

-- Completa los campos de la vista de reactivación sin descargar pacientes en React.
create or replace function public.get_client_reactivation(
  minimum_days integer default 30,
  maximum_days integer default null,
  custom_from date default null,
  custom_to date default null,
  page_limit integer default 100,
  page_offset integer default 0
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare role_name text; specialist_value uuid; result jsonb;
begin
  select profile.role, profile.specialist_id
  into role_name, specialist_value
  from public.profiles profile
  where profile.id = auth.uid() and profile.active = true;
  if role_name not in ('admin', 'recepcion', 'especialista') then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  with visits as (
    select client.id as client_id, client.full_name, client.phone, client.email,
      max(appointment.appointment_date) filter (where appointment.status = 'completada') as last_visit,
      count(*) filter (where appointment.status = 'completada') as visit_count
    from public.clients client join public.appointments appointment on appointment.client_id = client.id
      and (role_name <> 'especialista' or appointment.specialist_id = specialist_value)
    where client.active group by client.id, client.full_name, client.phone, client.email
  ), detailed as (
    select visits.*, current_date - visits.last_visit as inactive_days,
      last_appointment.service_name as last_service, last_appointment.specialist_name as last_specialist,
      next_appointment.next_visit, next_appointment.next_start
    from visits
    left join lateral (
      select service.name as service_name, specialist.full_name as specialist_name
      from public.appointments appointment
      left join public.services service on service.id = appointment.service_id
      left join public.specialists specialist on specialist.id = appointment.specialist_id
      where appointment.client_id = visits.client_id and appointment.status = 'completada'
        and (role_name <> 'especialista' or appointment.specialist_id = specialist_value)
      order by appointment.appointment_date desc, appointment.start_time desc limit 1
    ) last_appointment on true
    left join lateral (
      select appointment.appointment_date as next_visit, appointment.start_time as next_start
      from public.appointments appointment
      where appointment.client_id = visits.client_id and appointment.appointment_date >= current_date
        and appointment.status in ('pendiente', 'confirmada')
        and (role_name <> 'especialista' or appointment.specialist_id = specialist_value)
      order by appointment.appointment_date, appointment.start_time limit 1
    ) next_appointment on true
    where visits.last_visit is not null
  ), filtered as (
    select * from detailed where inactive_days >= greatest(0, minimum_days)
      and (maximum_days is null or inactive_days <= maximum_days)
      and (custom_from is null or last_visit >= custom_from)
      and (custom_to is null or last_visit <= custom_to)
  )
  select jsonb_build_object(
    'summary', jsonb_build_object('days_30_59',(select count(*) from detailed where inactive_days between 30 and 59),'days_60_89',(select count(*) from detailed where inactive_days between 60 and 89),'days_90_plus',(select count(*) from detailed where inactive_days >= 90)),
    'total',(select count(*) from filtered),
    'rows',coalesce((select jsonb_agg(to_jsonb(row_data) order by row_data.inactive_days desc,row_data.full_name) from (select * from filtered order by inactive_days desc,full_name limit least(greatest(page_limit,1),250) offset greatest(page_offset,0)) row_data),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.get_client_reactivation(integer,integer,date,date,integer,integer) from public;
grant execute on function public.get_client_reactivation(integer,integer,date,date,integer,integer) to authenticated;

create or replace function public.get_patient_growth_opportunities()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare role_name text; specialist_value uuid; result jsonb;
begin
  select profile.role, profile.specialist_id
  into role_name, specialist_value
  from public.profiles profile
  where profile.id = auth.uid() and profile.active = true;
  if role_name not in ('admin','recepcion','especialista') then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  with scoped_appointments as (
    select * from public.appointments where role_name <> 'especialista' or specialist_id = specialist_value
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'inactive_90_plus',(select count(*) from (select client_id from scoped_appointments where status='completada' group by client_id having max(appointment_date) <= current_date - 90) inactive),
    'completed_without_next',(select count(distinct appointment.client_id) from scoped_appointments appointment where appointment.status='completada' and appointment.appointment_date <= current_date and not exists (select 1 from scoped_appointments future where future.client_id=appointment.client_id and future.appointment_date>current_date and future.status in ('pendiente','confirmada'))),
    'packages_ending',(select count(*) from public.client_service_packages package where package.status='activo' and package.remaining_sessions between 1 and 2
      and (role_name <> 'especialista' or exists (select 1 from public.laser_sessions session where session.client_package_id = package.id and session.specialist_id = specialist_value))),
    'followups_due',(select count(*) from public.patient_followups followup where followup.status='pendiente' and followup.scheduled_for <= current_date and (role_name <> 'especialista' or followup.specialist_id = specialist_value))
  )) into result;
  return result;
end $$;
revoke all on function public.get_patient_growth_opportunities() from public;
grant execute on function public.get_patient_growth_opportunities() to authenticated;

-- La aplicación consume get_patient_growth_opportunities de forma independiente para no alterar
-- el contrato financiero existente de get_commercial_dashboard.
