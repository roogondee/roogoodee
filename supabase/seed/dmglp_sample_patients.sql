-- DEV ONLY — five sample patients for the DMGLP program (spec §6 phase 1).
-- Never run against production: these are fictional people with fake HNs.
insert into public.dmglp_patients (hn, first_name, last_name, sex, birth_date, phone) values
  ('DM-TEST-0001', 'สมชาย', 'ทดสอบ',   'M', '1978-03-12', '0800000001'),
  ('DM-TEST-0002', 'สมหญิง', 'ทดสอบ',  'F', '1985-07-01', '0800000002'),
  ('DM-TEST-0003', 'วิชัย',  'ตัวอย่าง', 'M', '1969-11-23', '0800000003'),
  ('DM-TEST-0004', 'มาลี',   'ตัวอย่าง', 'F', '1990-01-15', '0800000004'),
  ('DM-TEST-0005', 'ประยุทธ', 'จำลอง',  'M', '1975-05-30', '0800000005')
on conflict (hn) do nothing;
