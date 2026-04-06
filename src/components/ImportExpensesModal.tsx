import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, Download, FileWarning, CheckCircle2, FileText } from "lucide-react";
import { categories } from "@/components/ExpenseForm";
import { parsePdfBankStatement } from "@/utils/pdfExpenseParser";

interface ImportExpensesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

interface ParsedExpense {
  date: string;
  description: string;
  category: string;
  amount: number;
  payment_method: string;
}

const VALID_CATEGORIES = categories.map((c) => c.value);

const SAMPLE_CSV = `date,description,category,amount,payment_method
2026-03-01,Grocery shopping,Food,450,UPI
2026-03-05,Auto rickshaw,Transport,80,Cash
2026-03-10,Netflix subscription,Entertainment,199,Card`;

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : trimmed;
  }
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const iso = `${match[3]}-${match[2]}-${match[1]}`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : iso;
  }
  return null;
}

function normalizeCategory(raw: string): string {
  const trimmed = raw.trim();
  const found = VALID_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  return found || "Other";
}

function parseCsvFile(file: File): Promise<{ valid: ParsedExpense[]; skipped: number }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const valid: ParsedExpense[] = [];
        let skipped = 0;
        for (const row of results.data) {
          const date = parseDate(row.date || "");
          const amount = parseFloat((row.amount || "").trim());
          if (!date || isNaN(amount) || amount <= 0) { skipped++; continue; }
          valid.push({
            date,
            description: (row.description || "").trim() || "Untitled",
            category: normalizeCategory(row.category || ""),
            amount,
            payment_method: (row.payment_method || "Cash").trim(),
          });
        }
        resolve({ valid, skipped });
      },
      error: () => reject(new Error("Failed to parse CSV")),
    });
  });
}

const ImportExpensesModal = ({ open, onOpenChange, onImportSuccess }: ImportExpensesModalProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validRows, setValidRows] = useState<ParsedExpense[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState<"csv" | "pdf" | "">("");
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setValidRows([]);
    setSkippedCount(0);
    setFileName("");
    setFileType("");
    setImporting(false);
    setParsing(false);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (!isCsv && !isPdf) {
      toast({ title: "Please upload a .csv or .pdf file", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setFileType(isCsv ? "csv" : "pdf");
    setParsing(true);

    try {
      if (isCsv) {
        const { valid, skipped } = await parseCsvFile(file);
        setValidRows(valid);
        setSkippedCount(skipped);
      } else {
        const expenses = await parsePdfBankStatement(file);
        if (expenses.length === 0) {
          toast({
            title: "Could not parse this PDF",
            description: "Please try CSV format instead or check that it is a bank statement.",
            variant: "destructive",
          });
          reset();
          return;
        }
        setValidRows(expenses);
        setSkippedCount(0);
      }
    } catch {
      toast({
        title: isPdf
          ? "Could not parse this PDF. Please try CSV format instead or check that it is a bank statement."
          : "Failed to parse CSV",
        variant: "destructive",
      });
      reset();
    } finally {
      setParsing(false);
    }
  }, [toast, reset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const rows = validRows.map((r) => ({
        user_id: user.id,
        description: r.description,
        category: r.category,
        amount: r.amount,
        date: r.date,
        payment_method: r.payment_method,
        notes: "",
      }));

      const { error } = await supabase.from("expenses").insert(rows);
      if (error) throw error;

      toast({ title: `${validRows.length} expenses imported successfully ✓` });
      reset();
      onOpenChange(false);
      onImportSuccess();
    } catch {
      toast({ title: "Import failed. Please try again.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRows = validRows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Import Expenses</DialogTitle>
          <DialogDescription>Upload a CSV file or PDF bank statement to bulk-import expenses.</DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        {validRows.length === 0 && !parsing && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground/70">
              Supported formats: CSV, PDF (bank statements)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* Parsing indicator */}
        {parsing && (
          <div className="flex items-center justify-center gap-3 py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Parsing {fileType === "pdf" ? "PDF" : "CSV"}…</p>
          </div>
        )}

        {/* Template download */}
        {validRows.length === 0 && !parsing && (
          <Button variant="link" size="sm" className="gap-2 self-start text-muted-foreground" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download Sample CSV Template
          </Button>
        )}

        {/* Preview */}
        {validRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {fileType === "pdf" ? (
                <FileText className="h-4 w-4 text-primary" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              <p className="text-sm">
                <span className="font-semibold">{validRows.length}</span> valid expenses from{" "}
                <span className="font-medium">{fileName}</span>
                {fileType === "pdf" && (
                  <Badge variant="outline" className="ml-2 text-xs">PDF</Badge>
                )}
              </p>
            </div>

            {skippedCount > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2">
                <FileWarning className="h-4 w-4 text-yellow-500" />
                <p className="text-sm text-yellow-400">
                  {skippedCount} row{skippedCount > 1 ? "s" : ""} skipped due to missing or invalid data
                </p>
              </div>
            )}

            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{row.date}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{row.category}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{row.amount}</TableCell>
                      <TableCell className="text-muted-foreground">{row.payment_method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {validRows.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 5 of {validRows.length} rows
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {validRows.length > 0 && (
            <Button variant="outline" onClick={reset}>Choose Another File</Button>
          )}
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          {validRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {importing ? "Importing…" : `Import ${validRows.length} expenses`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportExpensesModal;
