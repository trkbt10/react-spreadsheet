# react-spreadsheet

React-based spreadsheet component with formula support, visual elements, and dependency graph visualization.

## Demo

https://trkbt10.github.io/react-spreadsheet/

## Usage

```tsx
import { App, parseSpreadsheet, SpreadSheet } from "sheets";

const rawData = {
  name: "My Spreadsheet",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  sheets: [
    {
      id: "sheet1",
      name: "Sheet 1",
      cells: {
        "A1": { value: "Hello" },
        "B1": { value: "World" },
        "A2": { value: "=A1&\" \"&B1" }
      }
    }
  ]
};

const spreadsheet = parseSpreadsheet(rawData);

function MyApp() {
  return <SpreadSheet spreadsheet={spreadsheet} />;
}
```
