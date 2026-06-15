# UI Visibility & Contrast Audit - TODO

## Phase 1 (single file)
- [x] client/src/components/StatsCard.jsx
  - [x] Replace light backgrounds/text-gray-* with dark-compatible design tokens
  - [x] Preserve layout + component structure
  - [x] Build verification

## Phase 2 (single file)
- [ ] client/src/pages/Dashboard.jsx
  - [ ] Fix loading/error labels contrast
  - [ ] Remove remaining bg-white/bg-gray-*/text-gray-* classes
  - [ ] Fix chart container and tooltip readability
  - [ ] Build verification

## Phase 3 (single file, then subcomponents in same file)
- [ ] client/src/pages/Projects.jsx
  - [ ] Fix headings, labels, filters, dropdowns
  - [ ] Fix empty/error states
  - [ ] Fix ProjectModal and MembersModal readability
  - [ ] Build verification

## Phase 4 (single file)
- [ ] client/src/pages/Team.jsx
  - [ ] Fix role badge visibility
  - [ ] Fix labels/table readability/card readability
  - [ ] Build verification

