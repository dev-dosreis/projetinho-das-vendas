alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('candidate','enriched','awaiting_approval','approved','sent','snoozed','rejected'));

alter table public.leads drop constraint if exists leads_sent_channel_check;
alter table public.leads add constraint leads_sent_channel_check
  check (sent_channel is null or sent_channel in ('whatsapp','email'));

alter table public.leads drop constraint if exists leads_response_status_check;
alter table public.leads add constraint leads_response_status_check
  check (response_status is null or response_status in ('waiting','positive','negative','no_response'));

alter table public.leads drop constraint if exists leads_contact_discovery_source_check;
alter table public.leads add constraint leads_contact_discovery_source_check
  check (contact_discovery_source is null or contact_discovery_source in ('site','instagram','apollo','hunter','none'));

alter table public.leads drop constraint if exists leads_contact_discovery_status_check;
alter table public.leads add constraint leads_contact_discovery_status_check
  check (contact_discovery_status is null or contact_discovery_status in ('found','not_found','not_configured','error'));

create unique index if not exists leads_domain_root_unique_idx on public.leads(domain_root);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_total_score_idx on public.leads(total_score desc);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_sent_at_idx on public.leads(sent_at desc) where status = 'sent';
create index if not exists leads_prompt_version_idx on public.leads(prompt_version);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as '
begin
  new.updated_at = now();
  return new;
end;
';

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.update_updated_at();

alter table public.leads disable row level security;
