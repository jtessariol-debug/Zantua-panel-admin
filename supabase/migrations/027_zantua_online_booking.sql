-- Reservas públicas mínimas para Zantua. No expone tablas privadas a anon.

alter table public.appointments
  add column if not exists booking_source text not null default 'manual',
  add column if not exists public_booking_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'appointments_booking_source_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_booking_source_check
      check (booking_source in ('manual', 'online'));
  end if;
end $$;

create unique index if not exists appointments_public_booking_id_uidx
  on public.appointments(public_booking_id)
  where public_booking_id is not null;

create or replace function public.get_zantua_booking_config(requested_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if lower(coalesce(requested_slug, '')) <> 'zantua' then
    return jsonb_build_object('enabled', false, 'not_found', true);
  end if;

  select jsonb_build_object(
    'enabled', true,
    'business_name', 'Zantua Aesthetic Wellness',
    'logo_url', '/Logo.jpg',
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', service.id, 'name', service.name, 'duration_minutes', coalesce(service.duration_minutes, 40), 'price', service.price) order by service.name)
      from public.services service where service.active = true
    ), '[]'::jsonb),
    'specialists', coalesce((
      select jsonb_agg(jsonb_build_object('id', specialist.id, 'full_name', specialist.full_name) order by specialist.full_name)
      from public.specialists specialist
      where specialist.active = true
        and upper(coalesce(specialist.full_name, '')) <> 'MARJAN PEÑA'
        and upper(coalesce(specialist.full_name, '')) not like '%HISTÓRICO GOLDIE%'
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_zantua_booking_slots(
  requested_slug text,
  requested_service_id uuid,
  requested_specialist_id uuid,
  requested_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare duration_value integer; start_value time; end_value time; open_value boolean; result jsonb;
begin
  if lower(coalesce(requested_slug, '')) <> 'zantua' or requested_date is null or requested_date < current_date then
    return '[]'::jsonb;
  end if;
  select greatest(coalesce(duration_minutes, 40), 10) into duration_value
  from public.services where id = requested_service_id and active = true;
  select coalesce(has_open_schedule, false), start_time, end_time into open_value, start_value, end_value
  from public.specialists where id = requested_specialist_id and active = true;
  if duration_value is null or open_value is null then return '[]'::jsonb; end if;
  start_value := coalesce(start_value, '07:00'::time);
  end_value := coalesce(end_value, '19:00'::time);
  if open_value then start_value := '07:00'::time; end_value := '19:00'::time; end if;
  with candidate as (
    select
      slot_timestamp::time as slot_start,
      (slot_timestamp + make_interval(mins => duration_value))::time as slot_end
    from generate_series(
      requested_date + start_value,
      requested_date + end_value - make_interval(mins => duration_value),
      interval '20 minutes'
    ) slot_timestamp
  ), available as (
    select candidate.* from candidate
    where not exists (
      select 1 from public.appointments appointment
      where appointment.appointment_date = requested_date
        and appointment.specialist_id = requested_specialist_id
        and appointment.status in ('pendiente','confirmada','completada')
        and appointment.start_time < candidate.slot_end
        and appointment.end_time > candidate.slot_start
    ) and exists (
      select 1 from public.cabins cabin
      where cabin.active = true
        and not exists (
          select 1 from public.appointments appointment
          where appointment.appointment_date = requested_date
            and appointment.cabin_id = cabin.id
            and appointment.status in ('pendiente','confirmada','completada')
            and appointment.start_time < candidate.slot_end
            and appointment.end_time > candidate.slot_start
        )
    )
  ) select coalesce(jsonb_agg(jsonb_build_object('start_time', to_char(slot_start, 'HH24:MI'), 'end_time', to_char(slot_end, 'HH24:MI')) order by slot_start), '[]'::jsonb) into result from available;
  return result;
end;
$$;

create or replace function public.create_zantua_public_booking(
  requested_slug text,
  requested_service_id uuid,
  requested_specialist_id uuid,
  requested_date date,
  requested_start time,
  patient_first_name text,
  patient_last_name text,
  patient_phone text,
  patient_email text default null,
  requested_booking_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare duration_value integer; end_value time; cabin_value uuid; client_value uuid; booking_value uuid; center_start time := '07:00'; center_end time := '19:00'; specialist_start time; specialist_end time; open_value boolean;
begin
  if lower(coalesce(requested_slug, '')) <> 'zantua' then raise exception 'Centro no disponible.' using errcode = 'P0001'; end if;
  if btrim(coalesce(patient_first_name, '')) = '' or btrim(coalesce(patient_last_name, '')) = '' or btrim(coalesce(patient_phone, '')) = '' then raise exception 'Completa nombre, apellido y teléfono.' using errcode = '22023'; end if;
  if requested_date is null or requested_date < current_date or requested_start is null then raise exception 'Fecha u hora no válida.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('zantua-public-booking:' || requested_date::text));
  select greatest(coalesce(duration_minutes, 40), 10) into duration_value from public.services where id = requested_service_id and active = true;
  select coalesce(has_open_schedule, false), start_time, end_time into open_value, specialist_start, specialist_end from public.specialists where id = requested_specialist_id and active = true;
  if duration_value is null or open_value is null then raise exception 'Servicio o especialista no disponible.' using errcode = 'P0001'; end if;
  end_value := (requested_start + make_interval(mins => duration_value))::time;
  specialist_start := coalesce(specialist_start, center_start); specialist_end := coalesce(specialist_end, center_end);
  if open_value then specialist_start := center_start; specialist_end := center_end; end if;
  if requested_start < center_start or end_value > center_end or requested_start < specialist_start or end_value > specialist_end then raise exception 'El horario no está disponible.' using errcode = 'P0001'; end if;
  select appointment.id into booking_value from public.appointments appointment where appointment.public_booking_id = requested_booking_id;
  if booking_value is not null then return jsonb_build_object('booking_id', booking_value, 'already_created', true); end if;
  if exists (select 1 from public.appointments appointment where appointment.appointment_date = requested_date and appointment.specialist_id = requested_specialist_id and appointment.status in ('pendiente','confirmada','completada') and appointment.start_time < end_value and appointment.end_time > requested_start) then raise exception 'La especialista ya no tiene disponibilidad en ese horario.' using errcode = 'P0001'; end if;
  select cabin.id into cabin_value from public.cabins cabin where cabin.active = true and not exists (select 1 from public.appointments appointment where appointment.appointment_date = requested_date and appointment.cabin_id = cabin.id and appointment.status in ('pendiente','confirmada','completada') and appointment.start_time < end_value and appointment.end_time > requested_start) order by cabin.name limit 1;
  if cabin_value is null then raise exception 'No hay cabinas disponibles para ese horario.' using errcode = 'P0001'; end if;
  select client.id into client_value from public.clients client where regexp_replace(coalesce(client.phone, ''), '\D', '', 'g') = regexp_replace(patient_phone, '\D', '', 'g') order by client.created_at limit 1;
  if client_value is null then insert into public.clients(full_name, phone, email, notes) values (btrim(patient_first_name) || ' ' || btrim(patient_last_name), btrim(patient_phone), nullif(btrim(patient_email), ''), 'Paciente creado desde reserva pública.') returning id into client_value; end if;
  insert into public.appointments(client_id, specialist_id, service_id, cabin_id, appointment_date, start_time, end_time, status, notes, booking_source, public_booking_id) values (client_value, requested_specialist_id, requested_service_id, cabin_value, requested_date, requested_start, end_value, 'pendiente', 'Reserva creada desde el enlace público de Zantua.', 'online', requested_booking_id) returning id into booking_value;
  return jsonb_build_object('booking_id', booking_value, 'appointment_date', requested_date, 'start_time', to_char(requested_start, 'HH24:MI'));
end;
$$;

revoke all on function public.get_zantua_booking_config(text) from public;
revoke all on function public.get_zantua_booking_slots(text, uuid, uuid, date) from public;
revoke all on function public.create_zantua_public_booking(text, uuid, uuid, date, time, text, text, text, text, uuid) from public;
grant execute on function public.get_zantua_booking_config(text) to anon, authenticated;
grant execute on function public.get_zantua_booking_slots(text, uuid, uuid, date) to anon, authenticated;
grant execute on function public.create_zantua_public_booking(text, uuid, uuid, date, time, text, text, text, text, uuid) to anon, authenticated;
