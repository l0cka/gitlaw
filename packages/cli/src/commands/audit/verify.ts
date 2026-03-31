import { Command } from '@oclif/core';
import { loadAuditLog } from '@gitlaw/core';

export default class AuditVerify extends Command {
  static override description = 'Verify audit log integrity';

  async run(): Promise<void> {
    const log = await loadAuditLog(process.cwd());

    if (log.entries.length === 0) {
      this.log('No audit entries to verify.');
      return;
    }

    if (log.verify()) {
      this.log(`Audit log verified: ${log.entries.length} entries, chain intact.`);
    } else {
      this.error('AUDIT LOG INTEGRITY FAILURE: chain is broken or tampered.');
    }
  }
}
