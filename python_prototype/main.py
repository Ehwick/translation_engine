import sys

from PySide6.QtCore import QThread, Signal
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QFileDialog,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QProgressBar,
    QPushButton,
    QSpinBox,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

import config
import pdf_utils
from translator import LANGUAGES, Translator


class TranslationWorker(QThread):
    progress = Signal(int, int)  # current, total
    page_done = Signal(int, str)  # page_number, translated_text
    finished_ok = Signal()
    failed = Signal(str)

    def __init__(self, pdf_path, start_page, end_page, source_lang, target_lang, api_key):
        super().__init__()
        self.pdf_path = pdf_path
        self.start_page = start_page
        self.end_page = end_page
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.api_key = api_key

    def run(self):
        try:
            pages = pdf_utils.extract_pages_text(self.pdf_path, self.start_page, self.end_page)
            translator = Translator(self.api_key)
            total = len(pages)
            for i, (page_num, text) in enumerate(pages, start=1):
                translated = translator.translate_text(text, self.source_lang, self.target_lang)
                self.page_done.emit(page_num, translated)
                self.progress.emit(i, total)
            self.finished_ok.emit()
        except Exception as exc:
            self.failed.emit(str(exc))


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Book PDF Translator")
        self.setMinimumSize(700, 600)

        self.pdf_path = None
        self.page_count = 0
        self.worker = None

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        # API key row
        api_row = QHBoxLayout()
        api_row.addWidget(QLabel("DeepSeek API key:"))
        self.api_key_edit = QLineEdit()
        self.api_key_edit.setEchoMode(QLineEdit.Password)
        self.api_key_edit.setText(config.load_api_key())
        api_row.addWidget(self.api_key_edit)
        save_key_btn = QPushButton("Save key")
        save_key_btn.clicked.connect(self.on_save_key)
        api_row.addWidget(save_key_btn)
        layout.addLayout(api_row)

        # File selection row
        file_row = QHBoxLayout()
        self.file_label = QLabel("No PDF selected")
        file_row.addWidget(self.file_label, stretch=1)
        select_btn = QPushButton("Select PDF...")
        select_btn.clicked.connect(self.on_select_pdf)
        file_row.addWidget(select_btn)
        layout.addLayout(file_row)

        # Page range row
        page_row = QHBoxLayout()
        page_row.addWidget(QLabel("Start page:"))
        self.start_page_spin = QSpinBox()
        self.start_page_spin.setMinimum(1)
        page_row.addWidget(self.start_page_spin)
        page_row.addWidget(QLabel("End page (inclusive):"))
        self.end_page_spin = QSpinBox()
        self.end_page_spin.setMinimum(1)
        page_row.addWidget(self.end_page_spin)
        layout.addLayout(page_row)

        # Language row
        lang_row = QHBoxLayout()
        lang_row.addWidget(QLabel("From:"))
        self.source_lang_combo = QComboBox()
        self.source_lang_combo.addItems(LANGUAGES)
        lang_row.addWidget(self.source_lang_combo)
        lang_row.addWidget(QLabel("To:"))
        self.target_lang_combo = QComboBox()
        self.target_lang_combo.addItems([l for l in LANGUAGES if l != "Auto-detect"])
        self.target_lang_combo.setCurrentText("English")
        lang_row.addWidget(self.target_lang_combo)
        layout.addLayout(lang_row)

        # Translate button + progress
        self.translate_btn = QPushButton("Translate")
        self.translate_btn.clicked.connect(self.on_translate)
        self.translate_btn.setEnabled(False)
        layout.addWidget(self.translate_btn)

        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)

        # Output
        layout.addWidget(QLabel("Translated output:"))
        self.output_edit = QTextEdit()
        self.output_edit.setReadOnly(True)
        layout.addWidget(self.output_edit, stretch=1)

        save_output_btn = QPushButton("Save output...")
        save_output_btn.clicked.connect(self.on_save_output)
        layout.addWidget(save_output_btn)

        self.output_segments = {}  # page_num -> translated text

    def on_save_key(self):
        config.save_api_key(self.api_key_edit.text().strip())
        QMessageBox.information(self, "Saved", "API key saved locally.")

    def on_select_pdf(self):
        path, _ = QFileDialog.getOpenFileName(self, "Select PDF", "", "PDF Files (*.pdf)")
        if not path:
            return
        try:
            self.page_count = pdf_utils.get_page_count(path)
        except Exception as exc:
            QMessageBox.critical(self, "Error", f"Could not open PDF:\n{exc}")
            return

        self.pdf_path = path
        self.file_label.setText(f"{path}  ({self.page_count} pages)")
        self.start_page_spin.setMaximum(self.page_count)
        self.end_page_spin.setMaximum(self.page_count)
        self.start_page_spin.setValue(1)
        self.end_page_spin.setValue(self.page_count)
        self.translate_btn.setEnabled(True)

    def on_translate(self):
        api_key = self.api_key_edit.text().strip()
        if not api_key:
            QMessageBox.warning(self, "Missing API key", "Please enter your DeepSeek API key.")
            return
        if not self.pdf_path:
            QMessageBox.warning(self, "No PDF", "Please select a PDF first.")
            return

        start_page = self.start_page_spin.value()
        end_page = self.end_page_spin.value()
        if start_page > end_page:
            QMessageBox.warning(self, "Invalid range", "Start page must be <= end page.")
            return

        source_lang = self.source_lang_combo.currentText()
        target_lang = self.target_lang_combo.currentText()

        self.output_edit.clear()
        self.output_segments = {}
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.progress_bar.setMaximum(end_page - start_page + 1)
        self.translate_btn.setEnabled(False)

        self.worker = TranslationWorker(
            self.pdf_path, start_page, end_page, source_lang, target_lang, api_key
        )
        self.worker.progress.connect(self.on_progress)
        self.worker.page_done.connect(self.on_page_done)
        self.worker.finished_ok.connect(self.on_finished)
        self.worker.failed.connect(self.on_failed)
        self.worker.start()

    def on_progress(self, current, total):
        self.progress_bar.setValue(current)

    def on_page_done(self, page_num, translated_text):
        self.output_segments[page_num] = translated_text
        self.output_edit.append(f"## Page {page_num}\n\n{translated_text}\n")

    def on_finished(self):
        self.translate_btn.setEnabled(True)
        QMessageBox.information(self, "Done", "Translation complete.")

    def on_failed(self, message):
        self.translate_btn.setEnabled(True)
        QMessageBox.critical(self, "Translation failed", message)

    def on_save_output(self):
        if not self.output_segments:
            QMessageBox.warning(self, "Nothing to save", "No translated output yet.")
            return
        path, _ = QFileDialog.getSaveFileName(
            self, "Save translated output", "", "Markdown (*.md);;Text (*.txt)"
        )
        if not path:
            return
        with open(path, "w", encoding="utf-8") as f:
            for page_num in sorted(self.output_segments):
                f.write(f"## Page {page_num}\n\n{self.output_segments[page_num]}\n\n")
        QMessageBox.information(self, "Saved", f"Saved to {path}")


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
