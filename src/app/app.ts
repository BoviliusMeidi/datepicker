import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';
import { CalendarSelection } from './components/calendar-view/calendar-view.component';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule, RouterOutlet, CalendarViewComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('datepickerrange');

  minLimitStr: string = '';
  maxLimitStr: string = '';
  mainRangeStr: string = '';

  filterMinDate: Date | null = null;
  filterMaxDate: Date | null = null;

  selectedRange: CalendarSelection | null = null;

  onMinChange(selection: CalendarSelection) {
    this.filterMinDate = selection.startDate;
    this.selectedRange = null;
  }

  onMaxChange(selection: CalendarSelection) {
    this.filterMaxDate = selection.startDate;
    this.selectedRange = null;
  }

  handleMainSelection(selection: CalendarSelection) {
    this.selectedRange = selection;
  }

  // Single Date Logic

  userDateInput: string = '';

  onCalendarChange(selection: CalendarSelection) {
    this.userDateInput = selection.formattedValue;
  }

  onMinLimitChange(selection: CalendarSelection) {
    this.minLimitStr = selection.formattedValue;
    this.validateMainRange();
    console.log(this.minLimitStr)
  }

  onMaxLimitChange(selection: CalendarSelection) {
    this.maxLimitStr = selection.formattedValue;
    this.validateMainRange();
  }

  onMainRangeChange(selection: CalendarSelection) {
    this.mainRangeStr = selection.formattedValue;
  }

  validateMainRange() {
    if (this.mainRangeStr) {
      this.mainRangeStr = '';
    }
  }
}
