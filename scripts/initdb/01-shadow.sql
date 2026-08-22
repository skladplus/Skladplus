-- Отдельная база для prisma migrate diff. Prisma пересоздаёт shadow-базу
-- при каждом запуске, поэтому указывать сюда рабочую нельзя — она была бы снесена.
CREATE DATABASE skladplus_shadow;
