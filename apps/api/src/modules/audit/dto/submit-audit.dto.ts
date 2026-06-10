import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// ─── Custom Constraint: Move module keyword check ─────────────────────────────

@ValidatorConstraint({ name: 'containsModuleKeyword', async: false })
class ContainsMoveModuleConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return /\bmodule\b/.test(value);
  }

  defaultMessage(): string {
    return "Contract code does not appear to be valid Move — missing the 'module' keyword";
  }
}

function ContainsMoveModule(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: ContainsMoveModuleConstraint,
    });
  };
}

// ─── DTO ──────────────────────────────────────────────────────────────────────

export class SubmitAuditDto {
  /** Raw Sui Move source code (max 50 KB) */
  @IsString()
  @IsNotEmpty({ message: 'Contract code is required' })
  @MinLength(10, { message: 'Contract code must be at least 10 characters' })
  @MaxLength(51_200, { message: 'Contract code must not exceed 50KB (51,200 characters)' })
  @ContainsMoveModule()
  contractCode: string;

  /** Human-readable contract name shown in the report */
  @IsString()
  @IsNotEmpty({ message: 'Contract name is required' })
  @MaxLength(100, { message: 'Contract name must not exceed 100 characters' })
  contractName: string;

  /** Optional short description (not used in audit, stored for context) */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
