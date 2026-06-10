import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

const MAX_CONTRACT_SIZE_BYTES = 51_200; // 50 KB

/**
 * MoveValidationPipe performs lightweight static validation on a raw
 * Move contract string before it reaches the service layer:
 *
 * 1. Must be a string
 * 2. Must contain the `module` keyword (basic Move syntax check)
 * 3. Must not exceed 50 KB
 * 4. Strips null bytes (security hygiene)
 *
 * Apply per-route with @UsePipes(MoveValidationPipe) or directly in
 * a @Body() parameter: @Body('contractCode', MoveValidationPipe)
 */
@Injectable()
export class MoveValidationPipe implements PipeTransform<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: unknown, _metadata: ArgumentMetadata): string {
    // 1. Type check
    if (typeof value !== 'string') {
      throw new BadRequestException(
        'Contract code must be a string',
      );
    }

    // 2. Strip null bytes (security)
    const sanitized = value.replace(/\0/g, '');

    // 3. Size check (bytes, not chars — for multi-byte safety use Buffer)
    const sizeBytes = Buffer.byteLength(sanitized, 'utf8');
    if (sizeBytes > MAX_CONTRACT_SIZE_BYTES) {
      throw new BadRequestException(
        `Contract code exceeds the 50KB limit (received ${Math.round(sizeBytes / 1024)}KB)`,
      );
    }

    // 4. Basic Move syntax check — must contain the `module` keyword
    // Matches "module" as a standalone word (not inside another identifier)
    if (!/\bmodule\b/.test(sanitized)) {
      throw new BadRequestException(
        "Contract code does not appear to be valid Move — missing the 'module' keyword",
      );
    }

    return sanitized;
  }
}
