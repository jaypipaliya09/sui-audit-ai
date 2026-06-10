import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitAuditDto {
  @IsString()
  @IsNotEmpty({ message: 'Contract code is required' })
  @MinLength(10, { message: 'Contract code must be at least 10 characters' })
  @MaxLength(51_200, { message: 'Contract code must not exceed 50KB' })
  contractCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Contract name is required' })
  @MaxLength(100, { message: 'Contract name must not exceed 100 characters' })
  contractName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}
