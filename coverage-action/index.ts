import core from "@actions/core";
import github from "@actions/github";
import { action } from "./src/action";

action(github.context.payload).catch((error) => {
  // Action threw an error. Fail the action with the error message.
  core.debug(error.stack);
  core.setFailed(error.message);
});
