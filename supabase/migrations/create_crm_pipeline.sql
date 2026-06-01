-- CRM cross-pillar identity + automated nurture (LINE / Messenger / IG).
-- Builds on the lab `patients` table; unifies a customer across services + channels.

-- ── 1. crm_contacts: one person across pillars + messaging channels ─────
create table if not exists public.crm_contacts (
  id                 uuid primary key default gen_random_uuid(),
  patient_id         uuid references public.patients(id) on delete set null,
  name               text,
  phone              text,
  line_user_id       text,
  facebook_user_id   text,
  instagram_user_id  text,
  consent_pdpa       boolean default false,
  consent_at         timestamptz,
  primary_owner      uuid references public.admin_users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.crm_contacts enable row level security;
create policy "Service role full access on crm_contacts"
  on public.crm_contacts for all using (auth.role() = 'service_role');

create index if not exists crm_contacts_phone_idx on public.crm_contacts (phone);
create index if not exists crm_contacts_line_idx  on public.crm_contacts (line_user_id);
create index if not exists crm_contacts_fb_idx    on public.crm_contacts (facebook_user_id);
create index if not exists crm_contacts_ig_idx    on public.crm_contacts (instagram_user_id);
create index if not exists crm_contacts_patient_idx on public.crm_contacts (patient_id);

-- ── 2. Link leads -> contact, + Facebook push tracking (was missing) ────
alter table public.leads
  add column if not exists contact_id          uuid references public.crm_contacts(id) on delete set null,
  add column if not exists facebook_user_id    text,
  add column if not exists facebook_pushed_at  timestamptz,
  add column if not exists facebook_push_count int default 0;
create index if not exists leads_contact_idx on public.leads (contact_id);

-- ── 3. Nurture sequences (drip templates) ───────────────────────────────
create table if not exists public.nurture_sequences (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  service     text,                    -- pillar this sequence cross-sells (nullable)
  trigger     text not null check (trigger in ('welcome','cross_sell','lab_abnormal','manual')),
  steps       jsonb not null default '[]'::jsonb,  -- [{day_offset,channel_pref,prompt}]
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.nurture_sequences enable row level security;
create policy "Service role full access on nurture_sequences"
  on public.nurture_sequences for all using (auth.role() = 'service_role');

-- ── 4. Nurture enrollments (a contact progressing through a sequence) ───
create table if not exists public.nurture_enrollments (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.crm_contacts(id) on delete cascade,
  sequence_id  uuid not null references public.nurture_sequences(id) on delete cascade,
  current_step int not null default 0,
  status       text not null default 'active' check (status in ('active','paused','completed','stopped')),
  next_run_at  timestamptz,
  last_sent_at timestamptz,
  started_at   timestamptz not null default now()
);
alter table public.nurture_enrollments enable row level security;
create policy "Service role full access on nurture_enrollments"
  on public.nurture_enrollments for all using (auth.role() = 'service_role');

create index if not exists nurture_enroll_due_idx
  on public.nurture_enrollments (status, next_run_at);
create unique index if not exists nurture_enroll_unique_idx
  on public.nurture_enrollments (contact_id, sequence_id);

-- ── 5. Seed starter sequences (idempotent on trigger) ───────────────────
insert into public.nurture_sequences (name, trigger, service, steps)
select 'Welcome — ผู้ติดตามใหม่', 'welcome', null,
  '[{"day_offset":0,"channel_pref":"line","prompt":"ทักทายต้อนรับผู้ติดตามใหม่ แนะนำบริการตรวจสุขภาพฟรีของรู้ก่อนดี และชวนทำแบบประเมินสุขภาพ"},
    {"day_offset":3,"channel_pref":"line","prompt":"ให้ความรู้สุขภาพสั้นๆ ที่เป็นประโยชน์ และชวนปรึกษาแบบไม่กดดัน"},
    {"day_offset":7,"channel_pref":"line","prompt":"เสนอ voucher ตรวจฟรี/ปรึกษาแพทย์ฟรี และชวนทักเพื่อรับสิทธิ์"}]'::jsonb
where not exists (select 1 from public.nurture_sequences where trigger = 'welcome');

insert into public.nurture_sequences (name, trigger, service, steps)
select 'Lab follow-up — ค่าผิดปกติ', 'lab_abnormal', null,
  '[{"day_offset":1,"channel_pref":"line","prompt":"แจ้งว่าจากผลตรวจมีค่าที่ควรดูแลต่อเนื่อง ชวนปรึกษาและพิจารณาตรวจเพิ่มหรือใช้บริการที่เกี่ยวข้อง"},
    {"day_offset":14,"channel_pref":"line","prompt":"ติดตามอาการ ย้ำความสำคัญของการดูแลต่อเนื่อง และเสนอสิทธิ์ตรวจ/ปรึกษา"}]'::jsonb
where not exists (select 1 from public.nurture_sequences where trigger = 'lab_abnormal');
