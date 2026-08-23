# Web Engineering Toolkit v1.2

A framework-free website engineering and QA workspace built with vanilla HTML, CSS, JavaScript, and Node.js.

## Tools included

- **Lighthouse Reporter** — repeatable Performance, Accessibility, Best Practices and SEO audits with public/session modes, language-aware routing, mobile/desktop runs, grouped Lighthouse findings and HTML/CSV/XLSX reports.
- **Security & Compliance Scanner** — checks visible website security controls and maps technical evidence to ISO 27001, GDPR, SOC 2, HIPAA, PCI DSS and Local Regulations without claiming certification.
- **Asset & Page-Weight Analyzer** — measures transferred page weight and network requests across selected pages, including JavaScript, CSS, images, fonts, media, XHR/fetch, third-party resources and the largest assets.

## Shared Projects

v1.2 adds a **Projects** category to the sidebar.

A project profile can store:

- project name
- Testing URL
- Production URL
- active/default environment
- default language
- available EN / AR languages
- shared target pages

Selecting **Use project** applies that configuration across Lighthouse Reporter, Security & Compliance, and Asset & Page-Weight Analyzer so the same website information does not need to be entered repeatedly.

Project profiles are stored in:

```text
data/projects.json
```

The generated file is ignored by Git so local project data is not committed accidentally.

## Asset & Page-Weight Analyzer

The analyzer launches a detected Chrome/Chromium/Brave executable in **headless mode**. You do not need to manually launch the Lighthouse browser first.

For every selected page it uses a fresh browser context with cache disabled and records network transfer information using the Chrome DevTools Protocol.

It reports:

- total transferred page weight
- request count
- JavaScript transfer size
- CSS transfer size
- image transfer size
- font transfer size
- media transfer size
- XHR/fetch resources
- third-party transfer size and request share
- DOM element count
- failed HTTP/network resources
- largest individual resources
- cache-control information
- content encoding / compression information
- below-the-fold images without `loading="lazy"`

The analyzer also creates practical optimization findings for heavy pages, large JavaScript/image/font payloads, very large individual assets, high request counts, missing compression, weak static-asset caching and high third-party transfer share.

### Asset report output

Each run creates a complete folder inside `reports/` and appears in global Report History with an **Asset Page Weight** report badge.

Generated files include:

```text
summary.html
summary.json
summary.csv
summary.xlsx
assets.csv
metadata.json
```

The Excel workbook contains:

- Summary
- Page Results
- Largest Assets
- Findings

## Unified report history

Report History supports the current report types:

- Lighthouse
- Security Compliance
- Asset Page Weight

Existing single-report deletion and multi-select report-folder deletion remain available.

## Requirements

- Node.js 20+
- npm
- Chrome, Chromium or Brave

Project dependencies:

- Lighthouse 12.8.2
- Playwright Core 1.54.2
- ExcelJS 4.4.0

## Install and run

```bash
npm install
npm start
```

Open:

```text
http://127.0.0.1:4177
```

If port 4177 is already in use:

```bash
APP_PORT=4180 npm start
```

## Basic workflow

1. Open **Project workspace** and create the website project once.
2. Set the Testing/Production URL, default language and shared pages.
3. Click **Use project** if it is not already active.
4. Open any tool from the sidebar; the active project is reused automatically.
5. Run the selected analysis.
6. Open **Report history** to view or export generated reports.

## Security/compliance scope

The Security & Compliance Scanner evaluates technical website evidence only. It cannot verify internal policies, contracts, staff procedures, certifications, risk assessments or legal applicability, and therefore does not claim that a website or organization is compliant/certified.


## v1.3
Added responsive mobile navigation drawer with burger menu and overlay.
