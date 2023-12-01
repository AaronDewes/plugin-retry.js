import type { Octokit as OctokitCore } from "@octokit/core";
import type { RequestError } from "@octokit/request-error";
import type { OctokitOptions } from "@octokit/core/dist-types/types.d";
import { errorRequest } from "./error-request";
import { wrapRequest } from "./wrap-request";
import type { RetryOptions, State } from "./types";
import type { WrapHook } from "before-after-hook";

import { VERSION } from "./version.js";
import type { EndpointDefaults, OctokitResponse } from "@octokit/types";

export { VERSION };

export function retry(octokit: OctokitCore, octokitOptions: OctokitOptions) {
  const state: State = Object.assign(
    {
      enabled: true,
      retryAfterBaseValue: 1000,
      doNotRetry: [400, 401, 403, 404, 422, 451],
      retries: 3,
    },
    octokitOptions.retry,
  );

  if (state.enabled) {
    // @ts-expect-error
    octokit.hook.error("request", errorRequest.bind(null, state, octokit));
    // The types for `before-after-hook` do not let us only pass through a Promise return value
    // the types expect that the function can return either a Promise of the response, or diectly return the response.
    // This is due to the fact that `@octokit/request` uses aysnc functions
    // Also, since we add the custom `retryCount` property to the request argument, the types are not compatible.
    // @ts-expect-error
    octokit.hook.wrap("request", wrapRequest.bind(null, state, octokit));
  }

  return {
    retry: {
      retryRequest: (
        error: RequestError,
        retries: number,
        retryAfter: number,
      ) => {
        error.request.request = Object.assign({}, error.request.request, {
          retries: retries,
          retryAfter: retryAfter,
        });

        return error;
      },
    },
  };
}
retry.VERSION = VERSION;

declare module "@octokit/core/dist-types/types.d" {
  interface OctokitOptions {
    retry?: RetryOptions;
  }
}
