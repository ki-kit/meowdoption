import { z } from "zod";

// Import z from here, not from "zod". jitless stops zod from probing whether
// `new Function` is allowed (for a faster parser): our Content-Security-Policy
// forbids eval, so the probe is blocked and reported as a CSP violation.
// Validation works the same either way.
z.config({ jitless: true });

export { z };
