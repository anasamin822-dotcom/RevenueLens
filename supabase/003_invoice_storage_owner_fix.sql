create or replace function public.il_upload_quota() returns trigger language plpgsql security definer set search_path=public,storage as $$
declare used numeric; account_used numeric; account_count integer;
begin
 if new.bucket_id<>'invoicelens' then return new; end if;
 if nullif(new.owner_id,'') is null or (storage.foldername(new.name))[1]<>new.owner_id or (auth.uid() is not null and auth.uid()::text<>new.owner_id) then raise exception 'Invalid upload owner'; end if;
 perform pg_advisory_xact_lock(hashtext('invoicelens-storage-quota'));
 select count(*),coalesce(sum((metadata->>'size')::numeric),0) into account_count,account_used from storage.objects where bucket_id='invoicelens' and (storage.foldername(name))[1]=new.owner_id;
 select coalesce(sum((metadata->>'size')::numeric),0) into used from storage.objects where bucket_id='invoicelens';
 if account_count>=50 or account_used+coalesce((new.metadata->>'size')::numeric,10485760)>104857600 or used+coalesce((new.metadata->>'size')::numeric,10485760)>419430400 then raise exception 'Invoice storage limit reached. Delete an old document first.'; end if;
 return new;
end $$;
