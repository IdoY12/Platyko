/** What other workspaces use from the content pipeline: loading the bank and proving it is the verified one. */
export { computeBankHash } from "./bank/bankHash.js";
export { CURRICULUM } from "./bank/curriculum.js";
export type { CurriculumUnit } from "./bank/curriculum.js";
export { allItems, loadBank } from "./bank/loadBank.js";
export type { LoadedUnit } from "./bank/loadBank.js";
export { CONTENT_ROOT, tracesDirectory } from "./bank/paths.js";
export type { UnitTraces } from "./gateA/runGateA.js";
