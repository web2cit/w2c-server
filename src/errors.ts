export const INVALID_PATH_ERROR_NAME = "Invalid path error";

export class NoApplicableTemplateError extends Error {
  constructor(path: string) {
    super(`No applicable translation template for target "${path}"`);
    this.name = "NoApplicableTemplateError";
  }
}
