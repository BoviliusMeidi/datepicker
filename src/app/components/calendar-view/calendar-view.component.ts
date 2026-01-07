import {
  Component,
  computed,
  signal,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CalendarDate {
  day: number;
  month: number;
  year: number;
}

export interface DayGridItem {
  value: number;
  isCurrentMonth: boolean;
  isDisabled: boolean;
  dateObj: CalendarDate;
}

export interface CalendarSelection {
  startDate: Date | null;
  endDate: Date | null;
  formattedValue: string;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.css'],
})
export class CalendarViewComponent implements OnChanges {
  @Input() mode: 'single' | 'range' = 'range';
  @Input() modelValue: string | null = null;

  @Input() minDate: Date | string | null = null;
  @Input() maxDate: Date | string | null = null;

  @Input() placeholder: string = 'Pilih Tanggal';
  @Output() dateChange = new EventEmitter<CalendarSelection>();

  isOpen = signal(false);
  viewMode = signal<'days' | 'months' | 'years'>('days');

  currentMonth = signal(new Date().getMonth());
  currentYear = signal(new Date().getFullYear());

  startDate = signal<CalendarDate | null>(null);
  endDate = signal<CalendarDate | null>(null);

  minDateLimit = signal<CalendarDate | null>(null);
  maxDateLimit = signal<CalendarDate | null>(null);

  readonly monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  readonly dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  constructor(private eRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.isOpen()) return;
    if (this.eRef.nativeElement.contains(event.target)) {
      return;
    } else {
      this.isOpen.set(false);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['minDate']) {
      this.minDateLimit.set(this.convertToCalendarDate(this.minDate));
    }
    if (changes['maxDate']) {
      this.maxDateLimit.set(this.convertToCalendarDate(this.maxDate));
    }

    if (changes['modelValue'] && this.modelValue) {
      this.parseInputString(this.modelValue);
    }
  }

  displayText = computed(() => {
    const start = this.startDate();
    const end = this.endDate();

    if (!start) return null;

    const startStr = this.formatDate(start);

    if (this.mode === 'single') {
      return startStr;
    } else {
      if (end) {
        return `${startStr} - ${this.formatDate(end)}`;
      }
      return startStr;
    }
  });

  days = computed<DayGridItem[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const min = this.minDateLimit();
    const max = this.maxDateLimit();

    const daysArray: DayGridItem[] = [];

    const firstDayIndex = new Date(year, month, 1).getDay();
    const offset = (firstDayIndex + 6) % 7;
    const prevMonthTotal = new Date(year, month, 0).getDate();
    const currentMonthTotal = new Date(year, month + 1, 0).getDate();

    const createItem = (val: number, isCurrent: boolean, mOffset: number): DayGridItem => {
      const dateObj = {
        day: val,
        month: new Date(year, month + mOffset, 1).getMonth(),
        year: new Date(year, month + mOffset, 1).getFullYear(),
      };
      let disabled = false;

      if (min && this.compare(dateObj, min) < 0) disabled = true;
      if (max && this.compare(dateObj, max) > 0) disabled = true;

      return {
        value: val,
        isCurrentMonth: isCurrent,
        isDisabled: disabled,
        dateObj: dateObj,
      };
    };

    for (let i = offset - 1; i >= 0; i--) {
      daysArray.push(createItem(prevMonthTotal - i, false, -1));
    }

    for (let i = 1; i <= currentMonthTotal; i++) {
      daysArray.push(createItem(i, true, 0));
    }

    const remaining = (7 - (daysArray.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      daysArray.push(createItem(i, false, 1));
    }

    return daysArray;
  });

  yearsList = computed(() => {
    const startYear = Math.floor(this.currentYear() / 16) * 16;
    return Array.from({ length: 16 }, (_, i) => startYear + i);
  });

  toggleCalendar() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) this.viewMode.set('days');
  }

  navigate(step: number) {
    const mode = this.viewMode();
    if (mode === 'days') {
      let newMonth = this.currentMonth() + step;
      let newYear = this.currentYear();
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      this.currentMonth.set(newMonth);
      this.currentYear.set(newYear);
    } else if (mode === 'months') {
      this.currentYear.update((y) => y + step);
    } else if (mode === 'years') {
      this.currentYear.update((y) => y + step * 12);
    }
  }

  setViewMode(mode: 'days' | 'months' | 'years') {
    this.viewMode.set(mode);
  }

  selectMonth(index: number) {
    this.currentMonth.set(index);
    this.viewMode.set('days');
  }

  selectYear(year: number) {
    this.currentYear.set(year);
    this.viewMode.set('months');
  }

  selectDate(dayItem: DayGridItem) {
    if (!dayItem.isCurrentMonth || dayItem.isDisabled) return;

    const selected = dayItem.dateObj;

    if (this.mode === 'single') {
      this.startDate.set(selected);
      this.endDate.set(null);
      this.emitSelection();
      this.isOpen.set(false);
    } else {
      const start = this.startDate();
      if (!start || (start && this.endDate()) || this.compare(selected, start) < 0) {
        this.startDate.set(selected);
        this.endDate.set(null);
      } else {
        this.endDate.set(selected);
        this.emitSelection();
        this.isOpen.set(false);
      }
    }
  }

  private emitSelection() {
    const s = this.startDate();
    const e = this.endDate();

    let formatted = '';
    if (s) formatted = this.formatDate(s);
    if (s && e) formatted += ` - ${this.formatDate(e)}`;

    this.dateChange.emit({
      startDate: s ? new Date(s.year, s.month, s.day) : null,
      endDate: e ? new Date(e.year, e.month, e.day) : null,
      formattedValue: formatted,
    });
  }

  private formatDate(d: CalendarDate): string {
    const day = d.day.toString().padStart(2, '0');
    const month = (d.month + 1).toString().padStart(2, '0');
    return `${day}/${month}/${d.year}`;
  }

  private parseInputString(val: string) {
    if (!val) return;

    if (val.includes(' - ')) {
      const parts = val.split(' - ');
      const startObj = this.parseDateString(parts[0]);
      const endObj = this.parseDateString(parts[1]);
      if (startObj) {
        this.startDate.set(startObj);
        this.currentMonth.set(startObj.month);
        this.currentYear.set(startObj.year);
      }
      if (endObj) this.endDate.set(endObj);
    } else {
      const startObj = this.parseDateString(val);
      if (startObj) {
        this.startDate.set(startObj);
        this.endDate.set(null);
        this.currentMonth.set(startObj.month);
        this.currentYear.set(startObj.year);
      }
    }
  }

  private parseDateString(dateStr: string): CalendarDate | null {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return { day, month, year };
  }

  isActive(dayItem: DayGridItem): boolean {
    if (!dayItem.isCurrentMonth) return false;
    const current = dayItem.dateObj;
    const s = this.startDate();
    const e = this.endDate();
    return (!!s && this.compare(s, current) === 0) || (!!e && this.compare(e, current) === 0);
  }

  isInRange(dayItem: DayGridItem): boolean {
    if (!dayItem.isCurrentMonth || this.mode === 'single') return false;
    const s = this.startDate();
    const e = this.endDate();
    if (!s || !e) return false;
    const current = dayItem.dateObj;
    return this.compare(current, s) > 0 && this.compare(current, e) < 0;
  }

  private compare(a: CalendarDate, b: CalendarDate): number {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }

  private convertToCalendarDate(d: Date | string | null): CalendarDate | null {
    if (!d) return null;

    if (typeof d === 'string') {
      return this.parseDateString(d);
    }

    if (isNaN(d.getTime())) return null;
    return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
  }
}
