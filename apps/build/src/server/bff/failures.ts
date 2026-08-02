import "server-only";

import { createFailurePipeline } from "@aomi-labs/bff-observability";

export const buildFailures = createFailurePipeline("build-bff");
