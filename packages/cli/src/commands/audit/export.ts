import { Command, Args, Flags } from '@oclif/core';
import { writeFile } from 'node:fs/promises';
import { loadAuditLog } from '@gitlaw/core';

export default class AuditExport extends Command {
  static override description = 'Export audit log';

  static override args = {
    document: Args.string({ description: 'Document to export audit for', required: true }),
  };

  static override flags = {
    format: Flags.string({ description: 'Output format', options: ['json', 'csv'], default: 'json' }),
    output: Flags.string({ description: 'Output file', char: 'o' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AuditExport);
    const log = await loadAuditLog(process.cwd());
    const entries = log.forDocument(args.document);

    let output: string;
    if (flags.format === 'csv') {
      const escapeCsvField = (field: string): string => {
        let safe = field;
        if (/^[=+\-@]/.test(safe)) {
          safe = "'" + safe;
        }
        safe = safe.replace(/"/g, '""');
        return `"${safe}"`;
      };
      const header = 'id,timestamp,actor,event,document,commit';
      const rows = entries.map(e =>
        [e.id, e.timestamp, e.actor, e.event, e.document, e.commit].map(f => escapeCsvField(String(f))).join(','),
      );
      output = [header, ...rows].join('\n');
    } else {
      output = JSON.stringify(entries, null, 2);
    }

    if (flags.output) {
      await writeFile(flags.output, output);
      this.log(`Exported to ${flags.output}`);
    } else {
      this.log(output);
    }
  }
}
