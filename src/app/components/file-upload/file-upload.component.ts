import { Component, input, model, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  multiple = input(false);
  accept = input('*');
  title = input('File transaksi');
  label = input('Seret dan lepas file, atau');
  btnLabel = input('Pilih dari perangkat Anda');

  maxSizeMB = input(5);
  maxFiles = input<number | null>(null);

  files = model<File[]>([]);

  isDragging = signal(false);
  errors = signal<string[]>([]);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(newFiles: File[]) {
    this.errors.set([]);
    const validFiles: File[] = [];
    const errorMsgs: string[] = [];
    const currentFiles = this.files();

    const limit = this.multiple() ? this.maxFiles() || 999 : 1;

    newFiles.forEach((file) => {
      const isDuplicate = currentFiles.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );

      if (isDuplicate) {
        errorMsgs.push(`File "${file.name}" sudah ada di daftar.`);
        return;
      }

      if (!this.isValidExtension(file)) {
        errorMsgs.push(`File "${file.name}" formatnya tidak didukung.`);
        return;
      }

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > this.maxSizeMB()) {
        errorMsgs.push(`File "${file.name}" terlalu besar (Max ${this.maxSizeMB()}MB).`);
        return;
      }

      validFiles.push(file);
    });

    if (this.multiple() && currentFiles.length + validFiles.length > limit) {
      this.errors.set([`Maksimal hanya boleh mengupload ${limit} file.`]);
      return;
    }

    if (errorMsgs.length > 0) {
      this.errors.set(errorMsgs);
    }

    if (validFiles.length > 0) {
      if (!this.multiple()) {
        this.files.set([validFiles[0]]);
      } else {
        this.files.update((current) => [...current, ...validFiles]);
      }
    }
  }

  private isValidExtension(file: File): boolean {
    const acceptVal = this.accept();
    if (acceptVal === '*' || !acceptVal) return true;
    const allowed = acceptVal.split(',').map((ext) => ext.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    return allowed.some((ext) => fileName.endsWith(ext));
  }

  removeFile(index: number, event: Event) {
    event.stopPropagation();
    this.files.update((current) => current.filter((_, i) => i !== index));
    this.errors.set([]);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
