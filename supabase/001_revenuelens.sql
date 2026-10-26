begin;
create table if not exists public.rl_records (
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 entity text not null check(entity in ('leads','quotations','deals','orders','payments')),
 id uuid not null default gen_random_uuid(),
 data jsonb not null check(jsonb_typeof(data)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(owner_id,entity,id)
);
alter table public.rl_records enable row level security;
revoke all on public.rl_records from anon;
grant select,insert,update,delete on public.rl_records to authenticated;
create policy rl_owner on public.rl_records for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create table public.rl_audit (
 id bigint generated always as identity primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 entity text not null, record_id uuid not null, action text not null,
 happened_at timestamptz not null default now(), before_data jsonb, after_data jsonb
);
alter table public.rl_audit enable row level security;
revoke all on public.rl_audit from anon,authenticated;
grant select on public.rl_audit to authenticated;
create policy rl_audit_owner on public.rl_audit for select to authenticated using(owner_id=auth.uid());
create or replace function public.rl_validate_record() returns trigger language plpgsql set search_path=public as $$
declare required text[]; k text; refrow jsonb; total numeric; n numeric;
begin
 if TG_OP='DELETE' then
  if exists(select 1 from rl_records where owner_id=OLD.owner_id and id<>OLD.id and (data->>'leadId'=OLD.id::text or data->>'quotationId'=OLD.id::text or data->>'dealId'=OLD.id::text or data->>'orderId'=OLD.id::text)) then raise exception 'Delete dependent records first'; end if;
  return OLD;
 end if;
 if TG_OP='UPDATE' and (NEW.owner_id<>OLD.owner_id or NEW.id<>OLD.id or NEW.entity<>OLD.entity) then raise exception 'Record identity cannot change'; end if;
 required := case NEW.entity
 when 'leads' then array['name','email','company','source','status','serviceInterest','createdAt','score']
 when 'quotations' then array['leadId','service','category','amount','status','createdAt']
 when 'deals' then array['leadId','service','category','value','priority','status','progress','createdAt']
 when 'orders' then array['dealId','title','status','progress','amount','createdAt']
 else array['dealId','orderId','amount','method','date','status'] end;
 foreach k in array required loop if not(NEW.data ? k) or nullif(NEW.data->>k,'') is null then raise exception 'Required field: %',k; end if;end loop;
 for k in select jsonb_object_keys(NEW.data) loop
  if not(k=any(required||array['quotationId','closedAt','completedAt'])) then raise exception 'Unknown field: %',k;end if;
  if length(NEW.data->>k)>240 or NEW.data->>k ~ '[<>]' then raise exception 'Invalid field: %',k;end if;
  if k in ('amount','value','progress','score') then
   if jsonb_typeof(NEW.data->k)<>'number' then raise exception 'Expected number: %',k;end if;
   n:=(NEW.data->>k)::numeric;
   if n<0 or n>10000000000 or n<>round(n,2) then raise exception 'Invalid number: %',k;end if;
   if k in ('progress','score') and n>100 then raise exception 'Percentage exceeds 100';end if;
  end if;
  if k in ('createdAt','date','closedAt','completedAt') and NEW.data->>k is not null then perform (NEW.data->>k)::timestamptz;end if;
 end loop;
 if NEW.entity='leads' and (NEW.data->>'status' not in ('New','Qualified','Converted','Unqualified') or NEW.data->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Invalid lead status/email';end if;
 if NEW.entity='quotations' and NEW.data->>'status' not in ('Draft','Sent','Accepted','Rejected') then raise exception 'Invalid quotation status';end if;
 if NEW.entity='deals' and (NEW.data->>'status' not in ('Won','In Progress','Lost') or NEW.data->>'priority' not in ('High','Medium','Low')) then raise exception 'Invalid deal status/priority';end if;
 if NEW.entity='orders' and NEW.data->>'status' not in ('Pending','In Progress','Completed') then raise exception 'Invalid order status';end if;
 if NEW.entity='payments' and (NEW.data->>'status' not in ('Paid','Pending') or NEW.data->>'method' not in ('Bank Transfer','UPI','Card','Cash')) then raise exception 'Invalid payment status/method';end if;
 foreach k in array array['leadId','quotationId','dealId','orderId'] loop
  if nullif(NEW.data->>k,'') is not null then
   select data into refrow from rl_records where owner_id=NEW.owner_id and id::text=NEW.data->>k and entity=case k when 'leadId' then 'leads' when 'quotationId' then 'quotations' when 'dealId' then 'deals' else 'orders' end;
   if not found then raise exception 'Related record not found in workspace: %',k;end if;
   if k='quotationId' and refrow->>'leadId'<>NEW.data->>'leadId' then raise exception 'Quotation belongs to another lead';end if;
   if k='orderId' and refrow->>'dealId'<>NEW.data->>'dealId' then raise exception 'Order belongs to another deal';end if;
  end if;
 end loop;
 -- Serialize checks for all money linked to this deal, avoiding concurrent over-allocation.
 if NEW.entity in ('orders','payments') then
  select data into refrow from rl_records where owner_id=NEW.owner_id and entity='deals' and id::text=NEW.data->>'dealId' for update;
  if NEW.entity='orders' then
   select coalesce(sum((data->>'amount')::numeric),0) into total from rl_records where owner_id=NEW.owner_id and entity='orders' and id<>NEW.id and data->>'dealId'=NEW.data->>'dealId';
   if total+(NEW.data->>'amount')::numeric>(refrow->>'value')::numeric then raise exception 'Orders exceed deal value';end if;
  else
   select data into refrow from rl_records where owner_id=NEW.owner_id and entity='orders' and id::text=NEW.data->>'orderId' for update;
   select coalesce(sum((data->>'amount')::numeric),0) into total from rl_records where owner_id=NEW.owner_id and entity='payments' and id<>NEW.id and data->>'orderId'=NEW.data->>'orderId' and data->>'status'='Paid';
   if NEW.data->>'status'='Paid' and total+(NEW.data->>'amount')::numeric>(refrow->>'amount')::numeric then raise exception 'Payments exceed order amount';end if;
  end if;
 end if;
 if NEW.entity='deals' then
  select coalesce(sum((data->>'amount')::numeric),0) into total from rl_records where owner_id=NEW.owner_id and entity='orders' and data->>'dealId'=NEW.id::text;
  if total>(NEW.data->>'value')::numeric then raise exception 'Value below allocated orders';end if;
 end if;
 if NEW.entity='orders' then
  select coalesce(sum((data->>'amount')::numeric),0) into total from rl_records where owner_id=NEW.owner_id and entity='payments' and data->>'orderId'=NEW.id::text and data->>'status'='Paid';
  if total>(NEW.data->>'amount')::numeric then raise exception 'Amount below recorded payments';end if;
 end if;
 NEW.updated_at=now();return NEW;
end $$;
create trigger rl_record_check before insert or update or delete on public.rl_records for each row execute function public.rl_validate_record();
create or replace function public.rl_audit_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into rl_audit(owner_id,entity,record_id,action,before_data,after_data) values(coalesce(NEW.owner_id,OLD.owner_id),coalesce(NEW.entity,OLD.entity),coalesce(NEW.id,OLD.id),TG_OP,case when TG_OP<>'INSERT' then OLD.data end,case when TG_OP<>'DELETE' then NEW.data end);
 return coalesce(NEW,OLD);
end $$;
revoke all on function public.rl_audit_change() from public,anon,authenticated;
revoke all on function public.rl_validate_record() from public,anon,authenticated;
create trigger rl_record_audit after insert or update or delete on public.rl_records for each row execute function public.rl_audit_change();
commit;
