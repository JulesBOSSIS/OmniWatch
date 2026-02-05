import * as register from "./register";
import * as deleteCmd from "./delete";
import * as status from "./status";
import * as list from "./list";
import * as setup from "./setup";
import * as clear from "./clear";

export const commands = {
  register,
  delete: deleteCmd,
  status,
  list,
  setup,
  clear,
};
