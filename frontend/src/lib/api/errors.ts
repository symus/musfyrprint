import type { ProblemDetail } from "./types";

/** An RFC 9457 problem response from the backend. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }

  fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.problem.errors ?? []).map((e) => [e.field, e.message]));
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  let problem: ProblemDetail = { status: res.status };
  try {
    problem = (await res.json()) as ProblemDetail;
  } catch {
    // non-JSON error body (e.g. proxy failure)
  }
  return new ApiError(res.status, problem);
}
