create or replace function public.il_save_review(doc_id uuid, expected_revision integer, new_fields jsonb)
returns public.il_documents language plpgsql security definer set search_path=public as $$
declare d public.il_documents; f jsonb; old_f jsonb; events jsonb:='[]'; event_type text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into d from public.il_documents where id=doc_id and user_id=auth.uid() for update;
 if d.id is null then raise exception 'Document not found'; end if;
 if d.revision<>expected_revision then raise exception 'This review changed in another tab. Reload before saving.'; end if;
 if coalesce(jsonb_typeof(new_fields),'')<>'array' or jsonb_array_length(new_fields)>200 then raise exception 'Invalid fields'; end if;
 if (select count(distinct value->>'key') from jsonb_array_elements(new_fields))<>jsonb_array_length(new_fields) then raise exception 'Duplicate field keys'; end if;
 for f in select value from jsonb_array_elements(new_fields) loop
  if coalesce(length(f->>'key'),0) not between 1 and 100 or coalesce(length(trim(f->>'label')),0) not between 1 and 100 or coalesce(jsonb_typeof(f->'value'),'')<>'string' or length(f->>'value')>2000 or coalesce(f->>'status','') not in ('pending','edited','approved') or coalesce((f->>'page')::integer,1) not between 1 and 100 then raise exception 'Invalid field'; end if;
  if coalesce(jsonb_typeof(f->'box'),'')<>'object' or coalesce((f->'box'->>'x')::numeric,-1) not between 0 and 1 or coalesce((f->'box'->>'y')::numeric,-1) not between 0 and 1 or coalesce((f->'box'->>'w')::numeric,-1)<=0 or coalesce((f->'box'->>'h')::numeric,-1)<=0 or (f->'box'->>'x')::numeric+(f->'box'->>'w')::numeric>1.001 or (f->'box'->>'y')::numeric+(f->'box'->>'h')::numeric>1.001 then raise exception 'Invalid bounding box'; end if;
  if f->>'status'='approved' and coalesce(length(trim(f->>'value')),0)=0 then raise exception 'Approved values cannot be empty'; end if;
  if coalesce(jsonb_typeof(f->'key'),'')<>'string' or coalesce(jsonb_typeof(f->'label'),'')<>'string' then raise exception 'Field names and keys must be text'; end if;
  select value into old_f from jsonb_array_elements(d.fields) where value->>'key'=f->>'key';
  event_type:=case when old_f is null then 'create' when old_f=f then null when f->>'status'='approved' and old_f->>'status'<>'approved' then 'approve' when old_f->'box'<>f->'box' then 'box-move' else 'edit' end;
  if event_type is not null then events:=events||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'fieldKey',f->>'key','fieldLabel',f->>'label','type',event_type,'oldValue',old_f->>'value','newValue',f->>'value','page',f->'page','timestamp',floor(extract(epoch from now())*1000),'actor','Workspace owner')); end if;
 end loop;
 for old_f in select value from jsonb_array_elements(d.fields) loop
  if not exists(select 1 from jsonb_array_elements(new_fields) where value->>'key'=old_f->>'key') then events:=events||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'fieldKey',old_f->>'key','fieldLabel',old_f->>'label','type','delete','oldValue',old_f->>'value','timestamp',floor(extract(epoch from now())*1000),'actor','Workspace owner')); end if;
 end loop;
 update public.il_documents set fields=new_fields,log=(select coalesce(jsonb_agg(value),'[]') from (select value from jsonb_array_elements(events||d.log) limit 5000) e),revision=revision+1,updated=now() where id=doc_id returning * into d;
 return d;
end $$;
