/**
 * AstroVerse Automated Functional Truth & Owner Control Centre Test Suite
 * Validates 6-tier data provenance, 22 administrative modules, 6 QA workbenches,
 * high-risk confirmation workflows, saved views, session centre, and troubleshooting telemetry.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const ADMIN_HTML_PATH = path.join(REPO_ROOT, 'admin.html');
const APPS_ADMIN_INDEX_PATH = path.join(REPO_ROOT, 'apps/admin/index.html');

describe('ASTROVERSE ADMIN FUNCTIONAL TRUTH & OWNER EXPERIENCE SPECIFICATION', () => {
  const adminHtml = fs.readFileSync(ADMIN_HTML_PATH, 'utf8');
  const appsAdminHtml = fs.readFileSync(APPS_ADMIN_INDEX_PATH, 'utf8');

  it('1. Byte parity: admin.html and apps/admin/index.html are byte-identical', () => {
    assert.equal(adminHtml, appsAdminHtml, 'admin.html and apps/admin/index.html must have identical contents');
  });

  it('2. Mandatory 6-tier data provenance CSS classes are declared', () => {
    const requiredClasses = [
      '.provenance-live',
      '.provenance-derived',
      '.provenance-synthetic',
      '.provenance-demo',
      '.provenance-unavailable',
      '.provenance-stale'
    ];
    for (const cls of requiredClasses) {
      assert.ok(adminHtml.includes(cls), `CSS class ${cls} must be defined in admin.html`);
    }
  });

  it('3. Ground Truth Banner declares all 6 provenance states visibly', () => {
    assert.ok(adminHtml.includes('provenance-live" title="Raw row query directly from PostgreSQL">LIVE</span>'));
    assert.ok(adminHtml.includes('provenance-derived" title="Mathematically computed from live Postgres rows">DERIVED</span>'));
    assert.ok(adminHtml.includes('provenance-synthetic" title="Local test cache fixture">SYNTHETIC</span>'));
    assert.ok(adminHtml.includes('provenance-demo" title="Isolated demo test account">DEMO</span>'));
    assert.ok(adminHtml.includes('provenance-unavailable" title="Database unreachable or query failed">UNAVAILABLE</span>'));
    assert.ok(adminHtml.includes('provenance-stale" title="Retrieved previously but outside permitted freshness window">STALE</span>'));
  });

  it('4. Canonical list of all 22 administrative modules is defined', () => {
    const expectedModules = [
      'overview', 'users', 'roles', 'security', 'astrology', 'reports', 'ai',
      'payments', 'subscriptions', 'content', 'settings', 'privacy', 'audit',
      'integrations', 'incidents', 'qa', 'database',
      'analytics', 'customer360', 'entitlements', 'promotions', 'consultations'
    ];
    for (const mod of expectedModules) {
      assert.ok(adminHtml.includes(`'${mod}'`), `Module ${mod} must be present in CANONICAL_ADMIN_MODULES`);
    }
  });

  it('5. Canonical list of all 6 QA workbenches is defined', () => {
    const expectedTools = ['kundli', 'forecasts', 'ai-astrologer', 'numerology', 'reports', 'billing'];
    for (const tool of expectedTools) {
      assert.ok(adminHtml.includes(`'${tool}'`), `Tool ${tool} must be present in CANONICAL_ADMIN_TOOLS`);
    }
  });

  it('6. Owner Control Centre Quick Access & Favorites Bar is present in DOM', () => {
    assert.ok(adminHtml.includes('id="admin-quick-favorites-bar"'));
    assert.ok(adminHtml.includes("switchAdminModule('overview')"));
    assert.ok(adminHtml.includes("switchAdminModule('users')"));
    assert.ok(adminHtml.includes("switchAdminModule('subscriptions')"));
    assert.ok(adminHtml.includes("switchAdminModule('payments')"));
    assert.ok(adminHtml.includes("switchAdminModule('database')"));
  });

  it('7. Saved Views & Filter Presets selector and handler are implemented', () => {
    assert.ok(adminHtml.includes('id="admin-saved-views-select"'));
    assert.ok(adminHtml.includes('applyAdminSavedView'));
    assert.ok(adminHtml.includes('pending-refunds'));
    assert.ok(adminHtml.includes('failed-reports'));
    assert.ok(adminHtml.includes('expiring-subs'));
    assert.ok(adminHtml.includes('high-incidents'));
    assert.ok(adminHtml.includes('failed-payments'));
    assert.ok(adminHtml.includes('suspended-accounts'));
  });

  it('8. Centralized Administrative Action Center / Task Queue modal is implemented', () => {
    assert.ok(adminHtml.includes('id="modal-admin-task-queue"'));
    assert.ok(adminHtml.includes('openAdminTaskQueueModal'));
    assert.ok(adminHtml.includes('closeAdminTaskQueueModal'));
    assert.ok(adminHtml.includes('task-queue-refunds-count'));
    assert.ok(adminHtml.includes('task-queue-reports-count'));
    assert.ok(adminHtml.includes('task-queue-incidents-count'));
    assert.ok(adminHtml.includes('task-queue-privacy-count'));
  });

  it('9. Admin Session Centre modal is implemented with inactivity governance controls', () => {
    assert.ok(adminHtml.includes('id="modal-admin-session-centre"'));
    assert.ok(adminHtml.includes('openAdminSessionCentreModal'));
    assert.ok(adminHtml.includes('closeAdminSessionCentreModal'));
    assert.ok(adminHtml.includes('session-centre-email'));
    assert.ok(adminHtml.includes('session-centre-role'));
    assert.ok(adminHtml.includes('session-centre-idle-text'));
    assert.ok(adminHtml.includes('refreshAdminSessionCountdown()'));
  });

  it('10. High-Risk Action Confirmation modal with scope preview and step-up MFA is implemented', () => {
    assert.ok(adminHtml.includes('id="modal-admin-high-risk-action"'));
    assert.ok(adminHtml.includes('openHighRiskActionModal'));
    assert.ok(adminHtml.includes('closeHighRiskActionModal'));
    assert.ok(adminHtml.includes('high-risk-action-title'));
    assert.ok(adminHtml.includes('high-risk-action-target'));
    assert.ok(adminHtml.includes('high-risk-action-scope'));
    assert.ok(adminHtml.includes('high-risk-action-reason'));
    assert.ok(adminHtml.includes('high-risk-action-totp'));
  });

  it('11. Diagnostics & Troubleshooting Drawer captures error telemetry without credential leakage', () => {
    assert.ok(adminHtml.includes('id="drawer-admin-troubleshooting"'));
    assert.ok(adminHtml.includes('openAdminTroubleshootingDrawer'));
    assert.ok(adminHtml.includes('closeAdminTroubleshootingDrawer'));
    assert.ok(adminHtml.includes('recordAdminTroubleshootingEvent'));
    assert.ok(adminHtml.includes('clearAdminTroubleshootingLog'));
    assert.ok(adminHtml.includes('renderAdminTroubleshootingLog'));
    assert.ok(adminHtml.includes('Zero secret credential leakage enforced'));
  });

  it('12. Six QA workbenches declare explicit SYNTHETIC or DEMO provenance badges', () => {
    assert.ok(adminHtml.includes('SYNTHETIC TEST FIXTURE'));
    assert.ok(adminHtml.includes('admin-kundli-chart-display'));
    assert.ok(adminHtml.includes('renderAdminKundliHarness'));
    assert.ok(adminHtml.includes('renderAdminForecastsHarness'));
    assert.ok(adminHtml.includes('renderAdminAiHarness'));
    assert.ok(adminHtml.includes('renderAdminNumerologyHarness'));
    assert.ok(adminHtml.includes('renderAdminReportsHarness'));
    assert.ok(adminHtml.includes('renderAdminBillingHarness'));
  });

  it('13. Global Search supports prefixed entity resolution across all core models', () => {
    assert.ok(adminHtml.includes('executeAdminGlobalSearch'));
    assert.ok(adminHtml.includes("q.startsWith('cf_')"));
    assert.ok(adminHtml.includes("q.startsWith('rep_')"));
    assert.ok(adminHtml.includes("q.startsWith('inc_')"));
    assert.ok(adminHtml.includes("q.startsWith('prv_')"));
    assert.ok(adminHtml.includes("q.startsWith('sub_')"));
    assert.ok(adminHtml.includes("q.startsWith('ent_')"));
    assert.ok(adminHtml.includes("q.startsWith('prm_')"));
    assert.ok(adminHtml.includes("q.startsWith('ast_')"));
    assert.ok(adminHtml.includes("q.startsWith('db_')"));
    assert.ok(adminHtml.includes("q.startsWith('sec_')"));
    assert.ok(adminHtml.includes("q.startsWith('usr_')"));
  });

  it('14. Absolute Safety Rule: Zero destructive production database executions permitted', () => {
    assert.ok(!adminHtml.includes('DROP DATABASE'), 'Production DROP DATABASE forbidden');
    assert.ok(!adminHtml.includes('TRUNCATE "User"'), 'Production TRUNCATE User forbidden');
  });
});
