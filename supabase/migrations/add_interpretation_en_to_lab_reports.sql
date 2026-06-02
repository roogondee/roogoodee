-- Adds the English interpretation variant column to lab_reports.
--
-- The interpret route (src/app/api/admin/lab/interpret/route.ts) inserts a
-- separate `interpretation_en` (bilingual reports — see LabExtractionResult
-- in src/lib/lab/types.ts; rendered by LabReportPdf when lang='en'), but the
-- original create_lab_interpretation_system.sql only defined `interpretation`.
-- Without this column, every upload failed with:
--   Could not find the 'interpretation_en' column of 'lab_reports'
--   in the schema cache
alter table public.lab_reports
  add column if not exists interpretation_en jsonb;  -- LabInterpretation (en variant)
