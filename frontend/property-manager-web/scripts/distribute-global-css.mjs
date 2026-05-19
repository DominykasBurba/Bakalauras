import postcss from 'postcss';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const globalPath = path.join(webRoot, 'src/styles/global.css');
const pagesDir = path.join(webRoot, 'src/pages');

const PAGE_TOKEN_SPECS = [
  ['WorkOrderManagementPage', [
    'work-order-page',
    'work-order-grid',
    'work-order-collapsible',
    'work-order-card--',
    'work-order-admin-',
    'work-order-technician-site',
    'work-order-site-history',
    'work-order-details',
    'work-order-open-',
    'work-order-subcard',
    'work-order-feedback',
    'work-order-resident-',
    'work-order-actions--resident',
    'work-order-approve',
    'work-order-decline',
    'work-order-tenant-',
    'work-order-bill-',
    'work-order-vendor',
    'technician-invoice',
    'assign-tech-',
  ]],
  ['PropertyManagementPage', [
    'property-management-page',
    'property-tab',
    'property-callout',
    'property-overview-',
    'property-header-',
    'property-all-buildings',
    'property-units',
  ]],
  ['ReportIssuePage', ['report-issue-page', 'report-issue-session', 'report-form']],
  ['CompleteProfilePage', ['complete-profile-page', 'complete-profile-form', 'profile-admin-comment']],
  ['AccountSettingsPage', ['account-settings-', 'account-password-form']],
  ['NotificationsPage', [
    'notification-list-full',
    'notification-item',
    'notification-item-main',
    'notification-item-actions',
    'notif-icon',
    'notif-content',
    'notif-message',
    'unread-dot',
  ]],
  ['ResidentDashboardPage', ['need-assistance', 'grid-two', 'upcoming-item']],
  ['ResidentMaintenanceRequestsPage', ['resident-all-requests-page', 'resident-all-requests-card']],
  [
    'MaintenanceRequestsPage',
    [
      'mr-page-intro',
      'mr-toolbar',
      'mr-filter-',
      'mr-table-wrap',
      'mr-table-loading',
      'mr-id-link',
      'mr-title-cell',
      'mr-date-cell',
      'th-sort-btn',
      'th-sort-icon',
    ],
  ],
  ['AdminDashboardPage', ['admin-activity-', 'admin-dashboard-', 'stats-grid-admin']],
  ['AdminOccupantsPage', ['admin-occupants-', 'occupant-detail-']],
  ['BuildingsPage', ['buildings-split', 'buildings-list']],
  ['TechnicianAssignedJobsPage', ['technician-jobs-', 'technician-assigned-jobs-', 'technician-view-all-jobs']],
  ['TechnicianOfferedServicesPage', [
    'technician-offered-services-page',
    'technician-offered-list',
    'technician-offered-item',
    'technician-offered-desc',
    'technician-offered-actions',
    'technician-offered-office-note',
    'technician-offered-mapped',
    'technician-offered-status-row',
  ]],
  ['ServiceProviderPage', [
    'technician-offered-services-teaser',
    'technician-assigned-tasks-',
    'technician-assigned-preview-note',
    'technician-awaiting-payment-section',
  ]],
  ['AdminTechniciansPage', ['admin-technicians-', 'admin-datatable-cell-list']],
  [
    'AdminTechnicianDetailPage',
    [
      'admin-technician-detail-page',
      'admin-technician-compliance',
      'admin-technician-fieldset',
      'admin-technician-check',
      'admin-technician-form',
      'admin-technician-offered-review',
      'admin-technician-catalog-checklist',
    ],
  ],
  ['AdminScheduledMaintenancePage', ['scheduled-maint-admin-', 'admin-scheduled-maint-page']],
  ['AdminSendNotificationsPage', ['admin-send-notifications-page']],
  ['AdminServiceCatalogPage', ['admin-service-catalog-']],
];

function buildTokenMap() {
  const pairs = [];
  for (const [page, tokens] of PAGE_TOKEN_SPECS) {
    for (const t of tokens) pairs.push([t, page]);
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  return pairs;
}

const TOKEN_MAP = buildTokenMap();

function matchPart(selectorPart) {
  for (const [token, page] of TOKEN_MAP) {
    if (selectorPart.includes(token)) return page;
  }
  return null;
}

function classifyRule(rule) {
  const parts = rule.selectors ?? [rule.selector];
  const targets = new Set();
  for (const part of parts) {
    targets.add(matchPart(part.trim()));
  }
  if (targets.size !== 1) return null;
  const only = [...targets][0];
  return only;
}

function classifyAtRule(at) {
  const innerRules = [];
  at.walkRules((r) => innerRules.push(r));
  if (innerRules.length === 0) return null;
  const targets = new Set(innerRules.map(classifyRule));
  if (targets.size !== 1) return null;
  const only = [...targets][0];
  return only;
}

function main() {
  const css = fs.readFileSync(globalPath, 'utf8');
  const ast = postcss.parse(css);

  const globalRoot = postcss.root();
  const pageRoots = Object.fromEntries(
    PAGE_TOKEN_SPECS.map(([p]) => [p, postcss.root()]),
  );

  for (const node of [...ast.nodes]) {
    if (node.type === 'comment') {
      continue;
    }
    if (node.type === 'atrule') {
      const n = node.name;
      if (n === 'keyframes' || n === 'font-face' || n === 'charset') {
        globalRoot.append(node.clone());
        continue;
      }
      if (n === 'media' || n === 'supports') {
        const page = classifyAtRule(node);
        if (page) pageRoots[page].append(node.clone());
        else globalRoot.append(node.clone());
        continue;
      }
      globalRoot.append(node.clone());
      continue;
    }
    if (node.type === 'rule') {
      const page = classifyRule(node);
      if (page) pageRoots[page].append(node.clone());
      else globalRoot.append(node.clone());
      continue;
    }
    globalRoot.append(node.clone());
  }

  fs.writeFileSync(globalPath, globalRoot.toString(), 'utf8');

  const written = [];
  for (const [page] of PAGE_TOKEN_SPECS) {
    const out = pageRoots[page].toString().trim();
    if (!out) continue;
    const file = path.join(pagesDir, `${page}.css`);
    fs.writeFileSync(file, `${out}\n`, 'utf8');
    written.push(page);
  }

  console.log('Updated global.css. Wrote page CSS for:', written.join(', ') || '(none)');
}

main();
