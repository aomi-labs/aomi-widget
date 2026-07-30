import { classifyFailure } from "./classify";
import type { BffService, FailurePipeline } from "./failure";
import { identifyFailure } from "./identify";
import { routeFailure } from "./route";

export function createFailurePipeline(service: BffService): FailurePipeline {
  return Object.freeze({
    handle(input) {
      return routeFailure(classifyFailure(identifyFailure(input)), service);
    },
  });
}
