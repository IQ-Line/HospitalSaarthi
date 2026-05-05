export class DuplicateRoleAssignmentError extends Error {
  constructor() {
    super("duplicate role assignment");
    this.name = "DuplicateRoleAssignmentError";
  }
}
