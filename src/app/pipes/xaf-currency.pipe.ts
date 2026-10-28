import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'xaf',
  standalone: true,
})
export class XafPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) {
      return 'XAF 0';
    }
    const formatted = Math.round(value).toLocaleString('en-US');
    return `XAF ${formatted}`;
  }
}
