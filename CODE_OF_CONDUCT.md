# Code of Conduct — Health Report Analyzer

This Code of Conduct sets clear guidelines for respectful collaboration, data privacy, and ethical practices in the Health Report Analyzer project, ensuring a safe, inclusive, and professional environment for all contributors.

## Purpose

This repository exists to build trustworthy, reliable tools for analyzing health reports. Because this project deals with sensitive domain knowledge, we expect contributors to maintain high standards of professionalism, privacy, and scientific integrity. This Code of Conduct defines expectations for behaviour, contribution practices, data handling rules, and enforcement procedures.

## Scope

This Code of Conduct applies to all interactions that take place in the repository, issue tracker, pull requests, discussions, mailing lists, chatrooms, and any events (virtual or in-person) organized by the project or its maintainers.

## Our Standards

We expect everyone participating in this project to:

* Be respectful and considerate. Treat others with kindness and assume good faith.
* Communicate constructively. Provide clear, actionable feedback and avoid ad-hominem attacks.
* Prioritize safety and privacy. Never expose patient-identifiable data (PHI) in issues, commits, examples, or documentation.
* Be inclusive. Welcome people of all backgrounds, experience levels, identities, and viewpoints that follow these rules.
* Aim for scientific rigor. Document assumptions, cite sources when using published models or datasets, and validate claims.

## Working Guidelines (contributor workflow & etiquette)

Follow these practical rules to keep the project healthy and productive:

### 1. Issues

* Search for existing issues before creating a new one. Link related issues or PRs.
* Use clear titles and describe the problem or proposed feature with steps to reproduce, expected vs actual behaviour, and environment details (OS, Python/Node version, package versions) if relevant.
* Do **not** paste real patient data or screenshots containing PHI. If a data example is needed, use synthetic or anonymized data and explicitly state that it is synthetic.

### 2. Pull Requests

* Open a PR against the `main` branch (or the branch specified in CONTRIBUTING.md). Keep PRs focused and small when possible.
* Include a descriptive title and summary. Reference related issues with `Fixes #xxx` when applicable.
* Ensure the test suite passes locally and in CI. Add tests for new behaviour or bug fixes.
* Follow the repository code style and linters. Add type hints and docstrings where appropriate.
* Allow time for maintainers and reviewers to respond. Address review comments promptly and respectfully.

### 3. Commit Messages

* Use present-tense, imperative style (e.g., `Add input validation for PDF parser`).
* Keep messages concise and include issue/PR references when relevant.
* Avoid committing files that contain PHI, credentials, or large binary blobs. Use `.gitignore` appropriately.

### 4. Coding & Documentation

* Write readable, well-tested code. Prefer clarity over cleverness.
* Document public APIs, configuration options, and assumptions, especially for algorithms that affect health-related outputs.
* Include reproducible examples in docs and notebooks using synthetic or openly-licensed data.

### 5. Reviews & Collaboration

* Be constructive in code reviews. Praise good work and explain requested changes.
* If you disagree on technical choices, prefer design discussions in issues or design documents. Escalate to maintainers only if consensus cannot be reached.

### 6. Security & Vulnerabilities

* If you discover a security vulnerability or data leak (including accidental PHI exposure), follow our Security Disclosure process (see below). Avoid public disclosure until a mitigation/patch is available.

## Data & Privacy Requirements

Because this project interfaces with health information, follow these rules strictly:

* **Never** upload or commit identifiable patient data, raw clinical notes, image files containing identifiers, or screenshots from real systems.
* Use anonymized or synthetic datasets for examples, tests, and demos. Include a short description of how the data was anonymized.
* When processing user-provided files in demos or CI, strip metadata and identifiers before storing or sharing.
* If the repository includes scripts that process sensitive data, clearly mark them and require explicit configuration steps to run (do not run on CI by default).
* Comply with applicable laws and institutional policies (e.g., HIPAA, GDPR) if you are using or sharing real patient data. This repository does not grant legal compliance by itself.

## Accessibility

Strive to make documentation, demos, and visualizations accessible:

* Use semantic HTML for web UIs and provide alt text for images.
* Ensure charts and reports are interpretable without relying solely on color.

## Unacceptable Behaviour

The following are examples of unacceptable behaviour and may result in removal from the project:

* Harassment, personal attacks, or discriminatory language.
* Sharing or requesting private health data, credentials, or other confidential information.
* Attempts to coerce or pressure maintainers for privileged access.
* Repeatedly ignoring reviewer or maintainer guidance without constructive discussion.

## Reporting & Enforcement

If you witness or experience unacceptable behaviour or a data/privacy incident, you can report it via one of these channels:

* Open a private issue titled `SECURITY` or `CONFIDENTIAL` and add the label `triage/security`. (Maintainers will restrict visibility.)
* Email the project security contact: ``.

When reporting:

* Provide a concise summary, relevant timestamps, supporting evidence (logs, diffs), and suggested next steps.
* Do **not** include PHI in your report. If PHI is necessary to understand the incident, deliver it through an approved secure channel and follow institutional rules.

Enforcement steps may include:

* Private warning and request to comply.
* Temporary or permanent removal of repository access.
* Public note on the incident (if necessary) while protecting affected parties.

## Security Disclosure Process

1. If you find a bug that could expose sensitive information or compromise safety, contact the security email yash44365@gmail.com .
2. Provide reproducible steps, affected versions, and a suggested fix if you can safely provide it.
3. Maintainers will acknowledge receipt within a reasonable timeframe and coordinate remediation.

## Licensing & Attribution

* Contributions are subject to the repository's LICENSE file. By contributing you agree to license your contributions under the repository license.
* When using external datasets, models, or code, include proper attribution and check their licenses for redistribution.

## Governance & Maintainers

* The repository maintainers manage releases, merge policies, and the project roadmap. If you want greater responsibility, open an issue describing your interest and relevant contributions.

## Revision History

This Code of Conduct may be updated over time. Significant changes will be announced in the repository and the `CODE_OF_CONDUCT.md` will include the last updated date.

---

### Quick Reporting Template (copy when reporting)

```
Title: [Short description]
Date/Time: [YYYY-MM-DD HH:MM UTC+5:30]
Reporter: [your GitHub ID / email]
Description: [What happened? Steps to reproduce?]
Evidence: [logs, links to PR/issue/commit hashes — avoid PHI]
Suggested action: [what you think should happen]
```