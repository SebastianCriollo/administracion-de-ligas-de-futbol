import { describe, expect, it } from "vitest";
import { canTransition, InvalidTransitionError, transition } from "../src/state-machine";

describe("máquina de estados del partido", () => {
  it("flujo feliz: SCHEDULED → LIVE → HALF_TIME → LIVE → FINISHED", () => {
    let s = transition("SCHEDULED", "START");
    expect(s).toBe("LIVE");
    s = transition(s, "HALF_TIME");
    expect(s).toBe("HALF_TIME");
    s = transition(s, "RESUME");
    expect(s).toBe("LIVE");
    s = transition(s, "FINISH");
    expect(s).toBe("FINISHED");
  });

  it("flujo con prórroga y penales", () => {
    let s: ReturnType<typeof transition> = "LIVE";
    s = transition(s, "START_EXTRA_TIME");
    expect(s).toBe("EXTRA_TIME");
    s = transition(s, "START_PENALTIES");
    expect(s).toBe("PENALTIES");
    s = transition(s, "FINISH");
    expect(s).toBe("FINISHED");
  });

  it("un partido aplazado puede reiniciarse o cancelarse", () => {
    expect(transition("POSTPONED", "START")).toBe("LIVE");
    expect(transition("POSTPONED", "CANCEL")).toBe("CANCELLED");
    expect(transition("POSTPONED", "WALKOVER")).toBe("WALKOVER");
  });

  it("rechaza transiciones inválidas con error tipado", () => {
    expect(() => transition("FINISHED", "START")).toThrow(InvalidTransitionError);
    expect(() => transition("SCHEDULED", "FINISH")).toThrow(InvalidTransitionError);
    expect(() => transition("SCHEDULED", "RESUME")).toThrow(InvalidTransitionError);
    expect(canTransition("FINISHED", "START")).toBe(false);
  });
});
