import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { generateSlug } from '../../shared/utils/string.util';

@Injectable()
export class ProductImportService {
  constructor(private prisma: PrismaService) {}

  async importFromCsv(vendorId: string, csvData: string) {
    const lines = csvData.split("\n").filter(l => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have header and data rows');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => row[h] = values[idx] || '');

      try {
        if (!row.name || !row.price) {
          results.errors.push(`Row ${i}: name and price are required`);
          results.failed++;
          continue;
        }

        const slug = generateSlug(row.name);
        await this.prisma.product.create({
          data: {
            vendorId,
            name: row.name,
            slug: `${slug}-${Date.now()}-${i}`,
            price: parseFloat(row.price) || 0,
            sku: row.sku || undefined,
            shortDescription: row.description || undefined,
            status: 'DRAFT',
          },
        });
        results.success++;
      } catch (e) {
        results.errors.push(`Row ${i}: ${e.message}`);
        results.failed++;
      }
    }

    return results;
  }
}
