const bmp = require("bmp-js");
const imgUrlBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGoAAABqCAYAAABUIcSXAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFuGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuZWRhMmIzZmFjLCAyMDIxLzExLzE3LTE3OjIzOjE5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjMuMSAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjItMDEtMDdUMTI6MjM6MDFaIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIyLTAxLTA3VDEyOjIzOjAxWiIgeG1wOk1vZGlmeURhdGU9IjIwMjItMDEtMDdUMTI6MjM6MDFaIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmY5MDlmNTRmLTAwOWUtNGYyNi1hYTIyLTgxMDA1YjE3NjE4YiIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmEwMTIwYzgzLTU4ZmQtMTY0Mi1iNGRkLTgzNzZjZGVlNTky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";

const buffer = Buffer.from(imgUrlBase64, "utf-8");
const rawData = bmp.encode({ data: buffer, width: 200, height: 200});
