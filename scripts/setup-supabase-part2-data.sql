update public.leads
set name = coalesce(name, 'Lead sem nome')
where name is null;

update public.leads
set domain = coalesce(domain, domain_root, 'dominio-nao-informado.local')
where domain is null;

update public.leads
set domain_root = regexp_replace(
  regexp_replace(
    regexp_replace(lower(domain), '^https?://', ''),
    '^www\.',
    ''
  ),
  '/.*$',
  ''
)
where domain_root is null or domain_root = '';

alter table public.leads alter column name set not null;
alter table public.leads alter column domain set not null;
