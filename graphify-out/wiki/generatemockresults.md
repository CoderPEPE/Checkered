# generateMockResults()

## Nodes

- **generateMockResults()** — `/Users/nkt/dev/iman/checkered/checkered/backend/src/index.js`
- **pollTournaments()** — `/Users/nkt/dev/iman/checkered/checkered/backend/src/index.js`
- **submitResults()** — `/Users/nkt/dev/iman/checkered/checkered/backend/src/index.js`
- **index.js** — `/Users/nkt/dev/iman/checkered/checkered/backend/src/index.js`

## Relationships

- generateMockResults() --**contains**--> index.js [EXTRACTED]
- generateMockResults() --**calls**--> pollTournaments() [EXTRACTED]
- pollTournaments() --**contains**--> index.js [EXTRACTED]
- pollTournaments() --**calls**--> generateMockResults() [EXTRACTED]
- pollTournaments() --**calls**--> submitResults() [EXTRACTED]
- submitResults() --**contains**--> index.js [EXTRACTED]
- submitResults() --**calls**--> pollTournaments() [EXTRACTED]
- index.js --**contains**--> pollTournaments() [EXTRACTED]
- index.js --**contains**--> submitResults() [EXTRACTED]
- index.js --**contains**--> generateMockResults() [EXTRACTED]