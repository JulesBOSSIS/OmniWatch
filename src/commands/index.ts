import * as ping from "./ping";
import * as register from "./register";
import * as deleteCmd from "./delete";
import * as status from "./status";
import * as list from "./list";

export const commands = {
  ping,
  register,
  delete: deleteCmd,
  status,
  list,
};
