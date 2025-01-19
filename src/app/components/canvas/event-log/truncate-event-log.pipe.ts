import {Pipe, PipeTransform} from "@angular/core";

@Pipe({
    standalone: true,
    name: 'truncateEventLog'
})
export class TruncateEventLogPipe implements PipeTransform {
    transform(eventLog: string[]): string {
        const result = eventLog.join(' ').trim()

        return result.length > 21 ? result.substring(0, 20).trim() + '...' : result
    }
}
