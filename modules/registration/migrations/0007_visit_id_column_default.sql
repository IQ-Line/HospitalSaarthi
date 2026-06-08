-- Legacy 0004/0006 migration added visit.id without DEFAULT; Drizzle insert relies on gen_random_uuid().

ALTER TABLE registration.visit
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
