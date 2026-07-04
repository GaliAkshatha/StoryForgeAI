import { ValidationResult } from "./ValidationResult";

export class Validator {

  validateRequired(
    value: unknown,
    fieldName: string
  ): ValidationResult {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return {
        isValid: false,
        errors: [`${fieldName} is required.`]
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }
}