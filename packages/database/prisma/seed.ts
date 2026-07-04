/**
 * Seed de desarrollo — organización demo con una liga, un torneo de 8 equipos,
 * jugadores, árbitros, escenarios y el fixture de la primera jornada.
 *
 * Ejecutar: pnpm --filter @ligas/database seed  (requiere DATABASE_URL)
 */
import { PrismaClient, PlayerPosition, TournamentFormat, StageType } from "@prisma/client";

const prisma = new PrismaClient();

const TEAMS = [
  { name: "Leones FC", shortName: "LEO", city: "Cuenca" },
  { name: "Águilas United", shortName: "AGU", city: "Cuenca" },
  { name: "Tigres del Sur", shortName: "TIG", city: "Azogues" },
  { name: "Pumas SC", shortName: "PUM", city: "Cuenca" },
  { name: "Halcones", shortName: "HAL", city: "Gualaceo" },
  { name: "Osos Negros", shortName: "OSO", city: "Paute" },
  { name: "Cóndores", shortName: "CON", city: "Cuenca" },
  { name: "Dragones", shortName: "DRA", city: "Biblián" },
] as const;

const POSITIONS: PlayerPosition[] = [
  "GOALKEEPER",
  "DEFENDER",
  "DEFENDER",
  "DEFENDER",
  "DEFENDER",
  "MIDFIELDER",
  "MIDFIELDER",
  "MIDFIELDER",
  "FORWARD",
  "FORWARD",
  "FORWARD",
];

const FIRST_NAMES = ["Juan", "Carlos", "Luis", "Andrés", "Diego", "Mateo", "Sebastián", "Pablo", "Kevin", "Bryan", "José"];
const LAST_NAMES = ["García", "Ríos", "Peña", "Torres", "Vega", "Molina", "Castro", "Suárez", "Ortiz", "Campos", "León"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("🌱 Seeding…");

  const org = await prisma.organization.upsert({
    where: { slug: "liga-demo" },
    update: {},
    create: {
      name: "Liga Deportiva Demo",
      slug: "liga-demo",
      country: "Ecuador",
      city: "Cuenca",
      primaryColor: "#15803d",
    },
  });

  const venue = await prisma.venue.create({
    data: {
      organizationId: org.id,
      name: "Estadio Municipal Norte",
      city: "Cuenca",
      capacity: 5000,
      surface: "Césped sintético",
      latitude: -2.8974,
      longitude: -79.0045,
    },
  });

  const league = await prisma.league.create({
    data: {
      organizationId: org.id,
      name: "Liga Barrial Primera",
      slug: "liga-barrial-primera",
      description: "Primera división de la liga barrial demo.",
    },
  });

  const season = await prisma.season.create({
    data: {
      leagueId: league.id,
      name: "Temporada 2026",
      year: 2026,
      isCurrent: true,
      startDate: new Date("2026-02-01"),
    },
  });

  const tournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      seasonId: season.id,
      name: "Apertura 2026",
      slug: "apertura-2026",
      format: TournamentFormat.LEAGUE,
      status: "PUBLISHED",
      startDate: new Date("2026-02-07"),
    },
  });

  const stage = await prisma.stage.create({
    data: {
      tournamentId: tournament.id,
      name: "Todos contra todos",
      type: StageType.ROUND_ROBIN,
      order: 1,
      legs: 1,
    },
  });

  // Equipos con plantilla de 11 jugadores cada uno
  const teams = [];
  for (const t of TEAMS) {
    const team = await prisma.team.create({
      data: {
        organizationId: org.id,
        name: t.name,
        shortName: t.shortName,
        slug: slugify(t.name),
        city: t.city,
        homeVenueId: venue.id,
        kits: [{ type: "home", shirt: "#15803d", shorts: "#ffffff", socks: "#15803d" }],
      },
    });
    teams.push(team);

    await prisma.tournamentTeam.create({
      data: { tournamentId: tournament.id, teamId: team.id },
    });

    for (let i = 0; i < POSITIONS.length; i++) {
      const player = await prisma.player.create({
        data: {
          organizationId: org.id,
          firstName: FIRST_NAMES[i % FIRST_NAMES.length]!,
          lastName: LAST_NAMES[(i + teams.length) % LAST_NAMES.length]!,
          position: POSITIONS[i]!,
          nationality: "Ecuador",
          birthDate: new Date(1995 + (i % 10), i % 12, 1 + (i % 27)),
          heightCm: 168 + (i % 20),
          weightKg: 62 + (i % 18),
        },
      });
      await prisma.teamPlayer.create({
        data: {
          teamId: team.id,
          playerId: player.id,
          seasonId: season.id,
          shirtNumber: i + 1,
          isCaptain: i === 5,
        },
      });
    }
  }

  // Árbitros
  for (let i = 0; i < 4; i++) {
    await prisma.referee.create({
      data: {
        organizationId: org.id,
        firstName: FIRST_NAMES[(i + 3) % FIRST_NAMES.length]!,
        lastName: LAST_NAMES[(i + 7) % LAST_NAMES.length]!,
        category: i === 0 ? "NATIONAL" : "LOCAL",
        experienceYears: 2 + i * 3,
      },
    });
  }

  // Primera jornada (4 partidos): 1-2, 3-4, 5-6, 7-8
  const round = await prisma.round.create({
    data: { stageId: stage.id, number: 1, name: "Jornada 1", date: new Date("2026-02-07") },
  });
  for (let i = 0; i < teams.length; i += 2) {
    await prisma.match.create({
      data: {
        organizationId: org.id,
        tournamentId: tournament.id,
        stageId: stage.id,
        roundId: round.id,
        homeTeamId: teams[i]!.id,
        awayTeamId: teams[i + 1]!.id,
        venueId: venue.id,
        scheduledAt: new Date(`2026-02-07T${14 + i}:00:00-05:00`),
      },
    });
  }

  console.log(`✅ Seed listo: org=${org.slug}, torneo=${tournament.slug}, equipos=${teams.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
