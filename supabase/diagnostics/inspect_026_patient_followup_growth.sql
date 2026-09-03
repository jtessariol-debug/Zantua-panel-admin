-- Solo lectura. Ejecutar antes de volver a aplicar 026 si hubo un intento fallido.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('patient_followups', 'patient_evolution_photos')
order by table_name;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'patient-evolution';

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('patient_followups', 'patient_evolution_photos'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'patient_evolution_storage_%')
order by schemaname, tablename, policyname;

select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'can_manage_patient_followup',
    'get_client_reactivation',
    'get_patient_growth_opportunities'
  )
order by p.proname;

select event_object_schema as schema_name, event_object_table as table_name,
       trigger_name
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('patient_followups', 'patient_evolution_photos')
order by table_name, trigger_name;
