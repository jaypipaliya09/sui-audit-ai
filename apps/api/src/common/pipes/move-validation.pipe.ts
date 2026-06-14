import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

const MAX_CONTRACT_SIZE_BYTES = 50 * 1024; // 50 KB

/**
 * MoveValidationPipe performs static validation on a raw
 * Move contract string before it reaches the service layer:
 *
 * a) Size: Buffer.byteLength(code, 'utf8') > 50 * 1024 → throw 400
 * b) Must contain 'module' or 'script' keyword → throw 400
 * c) Prompt injection patterns
 * d) Check for suspicious base64 blobs
 * e) Return sanitized value
 */
@Injectable()
export class MoveValidationPipe implements PipeTransform<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: unknown, _metadata: ArgumentMetadata): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Contract code must be a string');
    }

    let sanitized = value.replace(/\0/g, '');

    // a) Size check
    const sizeBytes = Buffer.byteLength(sanitized, 'utf8');
    if (sizeBytes > MAX_CONTRACT_SIZE_BYTES) {
      throw new BadRequestException(`Contract code exceeds the 50KB limit (received ${Math.round(sizeBytes / 1024)}KB)`);
    }

    // b) Must contain 'module' or 'script' keyword
    if (!/\bmodule\b/.test(sanitized) && !/\bscript\b/.test(sanitized)) {
      throw new BadRequestException("Contract code does not appear to be valid Move — missing 'module' or 'script' keyword");
    }

    // c) Prompt injection patterns (case insensitive)
    const promptInjectionPatterns = [
      /ignore.*previous.*instructions/i,
      /system.*prompt/i,
      /you are now/i,
      /forget.*instructions/i,
      /disregard.*above/i,
      /new persona/i,
    ];

    for (const pattern of promptInjectionPatterns) {
      if (pattern.test(sanitized)) {
        throw new BadRequestException('Invalid contract content detected');
      }
    }

    // d) Check for suspicious base64 blobs (length > 1000 chars with no spaces)
    // A simple regex: matches >1000 contiguous base64-like characters
    const base64Pattern = /(?:[A-Za-z0-9+/]{1000,})(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/;
    if (base64Pattern.test(sanitized)) {
      throw new BadRequestException('Invalid contract content detected: suspicious encoded blob');
    }

    // e) Return sanitized value (trimmed, normalized line endings)
    sanitized = sanitized.replace(/\r\n/g, '\n').trim();

    return sanitized;
  }
}
