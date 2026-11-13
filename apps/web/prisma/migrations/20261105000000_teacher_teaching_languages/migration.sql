-- Admin teaching permission is distinct from the subject of an actual class.
-- Existing class evidence is retained; teachers without class evidence are legacy English teachers.
ALTER TABLE "TeacherProfile" ADD COLUMN "teachingLanguages" "LearningLanguage"[] NOT NULL DEFAULT ARRAY['ENGLISH']::"LearningLanguage"[];
UPDATE "TeacherProfile" p SET "teachingLanguages" = evidence.languages
FROM (SELECT "teacherId", array_agg(DISTINCT "learningLanguage" ORDER BY "learningLanguage") AS languages
      FROM "TeacherLessonOffering" GROUP BY "teacherId") evidence
WHERE evidence."teacherId" = p.id;
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_teachingLanguages_check" CHECK (
  "teachingLanguages" = ARRAY['ENGLISH']::"LearningLanguage"[] OR
  "teachingLanguages" = ARRAY['JAPANESE']::"LearningLanguage"[] OR
  "teachingLanguages" = ARRAY['ENGLISH','JAPANESE']::"LearningLanguage"[] OR
  "teachingLanguages" = ARRAY['JAPANESE','ENGLISH']::"LearningLanguage"[]
);
