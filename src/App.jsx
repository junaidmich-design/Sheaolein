import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const MAX_PREVIEW_ROWS = 200;

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const findColumnIndex = (headers, headerNames) => {
  const headerMap = new Map(
    headers.map((header, index) => [normalizeHeader(header), index])
  );
  for (const name of headerNames) {
    const normalized = normalizeHeader(name);
    if (headerMap.has(normalized)) {
      return headerMap.get(normalized);
    }
  }
  return -1;
};

const parseWorkbook = (workbook) => {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
  });
  if (!rows.length) {
    throw new Error("The uploaded file does not contain any rows.");
  }
  return rows;
};

export default function App() {
  const [fileName, setFileName] = useState("No file selected");
  const [sheetRows, setSheetRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [skuInput, setSkuInput] = useState("");
  const [increment, setIncrement] = useState(1);
  const [status, setStatus] = useState({ message: "", tone: "info" });
  const [highlightIndex, setHighlightIndex] = useState(null);
  const tableWrapperRef = useRef(null);

  const { skuColumnIndex, stockColumnIndex } = useMemo(() => {
    if (!headers.length) {
      return { skuColumnIndex: -1, stockColumnIndex: -1 };
    }
    return {
      skuColumnIndex: findColumnIndex(headers, [
        "product code/sku",
        "sku",
        "product code",
      ]),
      stockColumnIndex: findColumnIndex(headers, [
        "current stock level",
        "stock level",
        "inventory",
      ]),
    };
  }, [headers]);

  const previewRows = useMemo(() => {
    if (!sheetRows.length) return [];
    return sheetRows.slice(1, MAX_PREVIEW_ROWS + 1);
  }, [sheetRows]);

  const rowCount = sheetRows.length > 1 ? sheetRows.length - 1 : 0;

  const scrollToHighlight = (rowIndex) => {
    if (!tableWrapperRef.current) return;
    const row = tableWrapperRef.current.querySelector(
      `tr[data-row-index='${rowIndex}']`
    );
    if (row) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setFileName("No file selected");
      return;
    }

    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const rows = parseWorkbook(workbook);
      setSheetRows(rows);
      setHeaders(rows[0]);
      setHighlightIndex(null);
      setStatus({
        message: "File loaded. Search for a SKU to update stock.",
        tone: "success",
      });
    } catch (error) {
      setSheetRows([]);
      setHeaders([]);
      setHighlightIndex(null);
      setStatus({ message: error.message, tone: "error" });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedSku = skuInput.trim();

    if (!trimmedSku) {
      setStatus({ message: "Enter a SKU to search.", tone: "error" });
      return;
    }

    if (!sheetRows.length) {
      setStatus({ message: "Upload a file first.", tone: "error" });
      return;
    }

    if (skuColumnIndex === -1 || stockColumnIndex === -1) {
      setStatus({
        message:
          "Could not find the Product Code/SKU or Current Stock Level columns. Check your headers.",
        tone: "error",
      });
      return;
    }

    const rowIndex = sheetRows.findIndex((row, index) => {
      if (index === 0) return false;
      return String(row[skuColumnIndex] || "").trim() === trimmedSku;
    });

    if (rowIndex === -1) {
      setHighlightIndex(null);
      setStatus({ message: `SKU ${trimmedSku} not found in the sheet.`, tone: "error" });
      return;
    }

    const currentValue = Number(sheetRows[rowIndex][stockColumnIndex] || 0);
    const incrementBy = Number.isFinite(Number(increment)) ? Number(increment) : 1;
    const nextValue = currentValue + incrementBy;

    const nextRows = sheetRows.map((row, index) => {
      if (index !== rowIndex) return row;
      const updated = [...row];
      updated[stockColumnIndex] = nextValue;
      return updated;
    });

    setSheetRows(nextRows);
    setHighlightIndex(rowIndex);
    setStatus({
      message: `Updated ${trimmedSku}: ${currentValue} → ${nextValue}.`,
      tone: "success",
    });
    setTimeout(() => scrollToHighlight(rowIndex), 50);
  };

  return (
    <main className="page">
      <header className="page__header">
        <h1>Inventory SKU Updater</h1>
        <p>
          Upload a BigCommerce inventory sheet, preview it, then search for a SKU to
          increment its Current Stock Level.
        </p>
      </header>

      <section className="panel" aria-label="Upload inventory file">
        <div className="panel__row">
          <label className="file-input" htmlFor="inventory-file">
            <span>Upload inventory file</span>
            <input
              type="file"
              id="inventory-file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
          </label>
          <span className="muted">{fileName}</span>
        </div>
        <p className="muted">
          Supported formats: .csv, .xlsx, .xls. Preview shows the first 200 rows.
        </p>
      </section>

      <section className="panel" aria-label="SKU search and update">
        <form className="panel__row" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="sku-input">Search SKU</label>
            <input
              id="sku-input"
              name="sku"
              type="text"
              placeholder="Enter Product Code/SKU"
              autoComplete="off"
              value={skuInput}
              onChange={(event) => setSkuInput(event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="increment-input">Increment by</label>
            <input
              id="increment-input"
              name="increment"
              type="number"
              min="1"
              value={increment}
              onChange={(event) => setIncrement(event.target.value)}
            />
          </div>
          <button type="submit" className="primary">
            Update Stock
          </button>
        </form>
        <p className="status" data-tone={status.tone} role="status" aria-live="polite">
          {status.message}
        </p>
      </section>

      <section className="panel" aria-label="Inventory preview">
        <div className="panel__header">
          <h2>File Preview</h2>
          <span className="muted">
            {headers.length
              ? `Loaded ${rowCount} rows. Showing ${Math.min(
                  rowCount,
                  MAX_PREVIEW_ROWS
                )} rows.`
              : "No data loaded"}
          </span>
        </div>
        <div className="table-wrapper" ref={tableWrapperRef}>
          <table aria-describedby="preview-meta">
            {headers.length ? (
              <>
                <thead>
                  <tr>
                    {headers.map((header, index) => (
                      <th key={`${header}-${index}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => {
                    const dataRowIndex = rowIndex + 1;
                    return (
                      <tr
                        key={`row-${dataRowIndex}`}
                        data-row-index={dataRowIndex}
                        className={
                          highlightIndex === dataRowIndex ? "highlight" : undefined
                        }
                      >
                        {headers.map((_, columnIndex) => (
                          <td key={`cell-${dataRowIndex}-${columnIndex}`}>
                            {row[columnIndex] ?? ""}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </>
            ) : null}
          </table>
        </div>
      </section>
    </main>
  );
}
