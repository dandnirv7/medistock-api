import { ParseUUIDPipe } from '@nestjs/common';

// Accept any UUID variant — the real existence check happens in the service
// and surfaces as a 404. Keeping the pipe strict on format only.
export const ParseIdPipe = new ParseUUIDPipe();
