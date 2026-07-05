import { Injectable } from "@nestjs/common";
import type { CreateTournamentInput } from "@ligas/contracts";
import {
  buildStagePlan,
  generateGroups,
  generateKnockout,
  generateRoundRobin,
  type FixtureRound,
  type GroupFixture,
  type KnockoutBracket,
  type StagePlan,
} from "@ligas/domain";

export interface StagePreview {
  plan: StagePlan;
  /** ROUND_ROBIN */
  rounds?: FixtureRound[];
  /** GROUPS */
  groups?: GroupFixture[];
  /** KNOCKOUT (con equipos solo si es la primera etapa) */
  bracket?: KnockoutBracket;
}

/**
 * Traduce el payload del wizard al plan de etapas + fixture usando el
 * motor de dominio. Puro: lo consume tanto el preview (sin persistir)
 * como publish (persistiendo).
 */
@Injectable()
export class FixtureService {
  build(input: Pick<CreateTournamentInput, "format" | "stages" | "teamIds">): StagePreview[] {
    const teamIds = input.teamIds;

    const plans: StagePlan[] =
      input.format === "CUSTOM"
        ? (input.stages ?? []).map((s, i) => ({
            name: s.name,
            type: s.type,
            order: i + 1,
            legs: s.legs,
            groupCount: s.groupCount,
            qualifiedPerGroup: s.qualifiedPerGroup,
            entrants:
              s.type === "KNOCKOUT"
                ? i === 0
                  ? teamIds.length
                  : (s.groupCount ?? 1) * (s.qualifiedPerGroup ?? 2)
                : undefined,
            hasThirdPlace: s.hasThirdPlace,
          }))
        : buildStagePlan(input.format, teamIds.length);

    return plans.map((plan, i) => {
      const isFirst = i === 0;
      switch (plan.type) {
        case "ROUND_ROBIN":
          return { plan, rounds: generateRoundRobin(teamIds, { legs: plan.legs }) };
        case "GROUPS":
          return {
            plan,
            groups: generateGroups(teamIds, {
              groupCount: plan.groupCount ?? 2,
              legs: plan.legs,
            }),
          };
        case "KNOCKOUT": {
          // Primera etapa: equipos reales. Etapas posteriores: estructura
          // con placeholders (se resuelven al cerrar la etapa anterior).
          const entrants = plan.entrants ?? teamIds.length;
          const participants = isFirst
            ? teamIds
            : Array.from({ length: entrants }, (_, k) => `__SLOT_${k + 1}__`);
          return {
            plan,
            bracket: generateKnockout(participants, { thirdPlace: plan.hasThirdPlace }),
          };
        }
      }
    });
  }
}
