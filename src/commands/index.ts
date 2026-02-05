import * as register from "./register";
import * as deleteCmd from "./delete";
import * as status from "./status";
import * as list from "./list";
import * as setup from "./setup";
import * as clear from "./clear";
import * as edit from "./edit";
import * as ping from "./ping";

export const commands = {
  register,
  delete: deleteCmd,
  status,
  list,
  setup,
  clear,
  edit,
  ping,
};
