import { Component, input, model, signal, ChangeDetectionStrategy, computed, numberAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FileQueueItem {
  file: File;
  id: string;
}

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
  fileNameLength = input(20);
  title = input('File transaksi');
  label = input('Seret dan lepas file, atau');
  btnLabel = input('Pilih dari perangkat Anda');

  maxSizeMB = input(5);
  maxFiles = input<number | null>(null);

  files = model<File[]>([]);

  queue = signal<FileQueueItem[]>([]);

  isDragging = signal(false);
  errors = signal<string[]>([]);

  getFileNameWithoutExt(name: string): string {
    const lastDotIndex = name.lastIndexOf('.');
    if (lastDotIndex === -1) return name;
    return name.substring(0, lastDotIndex);
  }

  isDisabled = computed(() => {
    const totalCount = this.files().length + this.queue().length;

    if (!this.multiple()) {
      return totalCount >= 1;
    }

    const max = this.maxFiles();
    return max !== null && totalCount >= max;
  });

  onFileSelected(event: Event) {
    if (this.isDisabled()) return;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    if (this.isDisabled()) return;
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
    if (this.isDisabled()) return;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(newFiles: File[]) {
    this.errors.set([]);

    const currentTotal = this.files().length + this.queue().length;
    const limit = this.multiple() ? this.maxFiles() || 999 : 1;

    if (this.multiple() && currentTotal + newFiles.length > limit) {
      this.errors.set([`Maksimal hanya boleh mengupload ${limit} file.`]);
      return;
    }

    const newQueueItems: FileQueueItem[] = newFiles.map((f) => ({
      file: f,
      id: Math.random().toString(36).substring(7),
    }));

    this.queue.update((q) => [...q, ...newQueueItems]);

    newQueueItems.forEach((item) => {
      this.processFile(item);
    });
  }

  private processFile(item: FileQueueItem) {
    setTimeout(() => {
      const file = item.file;
      const errorMsgs: string[] = [];
      const currentFiles = this.files();

      const isDuplicate = currentFiles.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (isDuplicate) {
        errorMsgs.push(`File "${file.name}" gagal: Sudah ada di daftar.`);
      } else if (this.getFileNameWithoutExt(file.name).length > this.fileNameLength()) {
        errorMsgs.push(`File "${file.name}" gagal: Nama file melebihi ${this.fileNameLength()} karakter.`);
      } else if (!this.isValidExtension(file)) {
        errorMsgs.push(`File "${file.name}" gagal: Format tidak didukung.`);
      } else {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > this.maxSizeMB()) {
          errorMsgs.push(`File "${file.name}" gagal: Terlalu besar (Max ${this.maxSizeMB()}MB).`);
        }
      }

      this.queue.update((q) => q.filter((qItem) => qItem.id !== item.id));
      if (errorMsgs.length > 0) {
        this.errors.update((errs) => [...errs, ...errorMsgs]);
      } else {
        if (!this.multiple()) {
          this.files.set([file]);
        } else {
          this.files.update((curr) => [...curr, file]);
        }
      }
    }, 1000);
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
  }
}
