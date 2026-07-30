import "server-only";

import { createFailurePipeline } from "@aomi-labs/bff-observability";

export const portalFailures = createFailurePipeline("portal-bff");
