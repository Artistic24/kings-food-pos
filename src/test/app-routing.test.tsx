import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
});

// Check route resolution rather than a container: the root shell renders into document.body.
describe("App routing", () => {
  it("renders the index route", async () => {
    const router = renderAt("/");
    await waitFor(() => expect(router.state.matches.some((match) => match.routeId === "/")).toBe(true));
  });

  it("resolves the sales route", async () => {
    const router = renderAt("/sales");
    await waitFor(() => expect(router.state.matches.some((match) => match.routeId === "/sales")).toBe(true));
  });
});
