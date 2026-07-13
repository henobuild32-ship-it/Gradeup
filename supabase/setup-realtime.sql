-- ============================================================
-- GradeUp — Activation de Supabase Realtime
-- Exécuter ce script dans l'SQL Editor de Supabase (ou via
-- `psql` / `supabase db` ) pour publier les tables utilisées
-- par le temps réel de l'application.
--
-- Tables concernées (côté client) :
--   Message        → messagerie instantanée (chat-page)
--   Participant    → présence en réunion (meeting-room)
--   CourseSchedule → emplois du temps live (admin-schedules, weekly)
--   Notification   → notifications temps réel (SSE + Realtime)
--   SchoolYear     → diffusion de la clôture (broadcast year-closed)
-- ============================================================

-- 1) Créer la publication si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE
      "Message", "Participant", "CourseSchedule", "Notification", "SchoolYear";
  END IF;
END $$;

-- 2) Ajouter les tables manquantes à la publication existante
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
ALTER PUBLICATION supabase_realtime ADD TABLE "Participant";
ALTER PUBLICATION supabase_realtime ADD TABLE "CourseSchedule";
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
ALTER PUBLICATION supabase_realtime ADD TABLE "SchoolYear";

-- 3) (Recommandé) Activer la réplication au niveau ligne pour ces tables
ALTER TABLE "Message" REPLICA IDENTITY FULL;
ALTER TABLE "Participant" REPLICA IDENTITY FULL;
ALTER TABLE "CourseSchedule" REPLICA IDENTITY FULL;
ALTER TABLE "Notification" REPLICA IDENTITY FULL;
ALTER TABLE "SchoolYear" REPLICA IDENTITY FULL;

-- Note : les événements de type `broadcast` (ex. year-closed) ne nécessitent
-- pas de table ; ils passent par le canal Supabase Realtime (client).
-- Côté client, `src/lib/realtime.ts` s'abonne via postgres_changes + broadcast.
