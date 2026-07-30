export type SmitherArtifactFailureKind =
  | "crate_tree_read"
  | "crate_tar"
  | "crate_package"
  | "crate_cleanup";

export type SmitherArtifactFailure = {
  kind: SmitherArtifactFailureKind;
  error: unknown;
};

export type ObserveSmitherArtifactFailure = (
  failure: SmitherArtifactFailure,
) => void;

let artifactFailureObserver: ObserveSmitherArtifactFailure | undefined;

export function setSmitherArtifactFailureObserver(
  observer: ObserveSmitherArtifactFailure | undefined,
): void {
  artifactFailureObserver = observer;
}

export function observeSmitherArtifactFailure(
  failure: SmitherArtifactFailure,
): void {
  try {
    artifactFailureObserver?.(failure);
  } catch {
    // Telemetry is best-effort and must not change the artifact result.
  }
}
