// Adds DOM matchers like toBeInTheDocument() to Vitest's expect.
import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Lazy routes load their code on first visit; in this (slow, containerised)
// test environment the first import can take over the 1 s default. This only
// changes how long findBy*/waitFor wait before failing, not passing tests.
configure({ asyncUtilTimeout: 5000 });
