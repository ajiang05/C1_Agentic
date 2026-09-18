/**
 * Minimal Vite stub — proves the shared API client can reach the backend.
 * Persons 2–3 own real feature UI under frontend/src/features/.
 */
import { useEffect, useState } from "react";
import { api } from "./lib/api";
import type { HealthResponse } from "@contracts/types";

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 640 }}>
      <h1>Adaptive AI Study Journey</h1>
      <p>
        Frontend UI is owned by Persons 2–3. This stub only verifies{" "}
        <code>frontend/src/lib/api.ts</code>.
      </p>
      {error && <p style={{ color: "crimson" }}>API error: {error}</p>}
      {health && (
        <pre>{JSON.stringify(health, null, 2)}</pre>
      )}
      <p>
        Build screens in <code>src/features/*</code> using contracts from{" "}
        <code>shared/contracts/types.ts</code>.
      </p>
    </main>
  );
}
