import * as core from "@actions/core";
import * as github from "@actions/github";
import { action } from "./src/action";

action(github.context.payload).catch((error: unknown) => {
  // Action threw an error. Fail the action with the error message.
  if (error instanceof Error) {
    core.debug(error.stack ?? error.message);
    core.setFailed(error.message);
  } else {
    core.setFailed(String(error));
  }
});
