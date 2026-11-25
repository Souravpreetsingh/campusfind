"use client";

import { useEffect } from 'react';

type ActionButton = HTMLButtonElement & {
  dataset: DOMStringMap & {
    action?: string;
    target?: string;
    tab?: string;
    group?: string;
    value?: string;
    copySource?: string;
    phone?: string;
    notice?: string;
  };
};

function findTargets(root: ParentNode, selector: string | undefined) {
  if (!selector) return [];
  try {
    return Array.from(root.querySelectorAll<HTMLElement>(selector));
  } catch {
    return [];
  }
}

function showNotice(message: string) {
  if (!message || typeof document === 'undefined') return;

  let notice = document.querySelector<HTMLElement>('[data-canonical-action-notice]');
  if (!notice) {
    notice = document.createElement('div');
    notice.setAttribute('data-canonical-action-notice', '');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    Object.assign(notice.style, {
      position: 'fixed',
      left: '50%',
      bottom: '1rem',
      zIndex: '100',
      maxWidth: 'min(30rem, calc(100vw - 2rem))',
      transform: 'translateX(-50%)',
      borderRadius: '0.75rem',
      background: '#1c1c19',
      color: '#ffffff',
      padding: '0.75rem 1rem',
      fontSize: '0.875rem',
      lineHeight: '1.35',
      boxShadow: '0 12px 36px rgba(28, 28, 25, 0.28)',
    });
    document.body.appendChild(notice);
  }

  notice.textContent = message;
}

function runAction(button: ActionButton) {
  const action = button.dataset.action;

  if (action === 'navigate') {
    if (button.dataset.target) window.location.assign(button.dataset.target);
    return;
  }

  if (action === 'call') {
    if (button.dataset.phone) window.location.href = `tel:${button.dataset.phone}`;
    return;
  }

  if (action === 'submit') {
    const form = button.closest('form');
    if (form?.requestSubmit) form.requestSubmit();
    else showNotice('This action is available in the full CampusFind form.');
    return;
  }

  if (action === 'copy') {
    const source = findTargets(document, button.dataset.copySource)[0];
    const text = source?.textContent?.trim() || button.textContent?.trim() || '';
    if (!text) {
      showNotice('There is nothing to copy yet.');
      return;
    }
    void navigator.clipboard?.writeText(text).then(
      () => showNotice('Copied to clipboard.'),
      () => showNotice('Clipboard access is unavailable in this browser.'),
    );
    return;
  }

  if (action === 'toggle') {
    const targets = findTargets(document, button.dataset.target);
    const willExpand = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(willExpand));
    for (const target of targets) {
      target.classList.toggle('hidden', !willExpand);
      target.setAttribute('aria-hidden', String(!willExpand));
    }
    if (targets.length === 0) showNotice(button.dataset.notice ?? 'This panel is not available.');
    return;
  }

  if (action === 'tab') {
    const group = button.dataset.group ?? 'tab';
    const peers = Array.from(
      document.querySelectorAll<ActionButton>(`[data-action="tab"][data-group="${group}"]`),
    );
    for (const peer of peers) {
      peer.setAttribute('aria-selected', String(peer === button));
      for (const target of findTargets(document, peer.dataset.target)) {
        target.classList.toggle('hidden', peer !== button);
        target.setAttribute('aria-hidden', String(peer !== button));
      }
    }
    if (peers.length === 0) button.setAttribute('aria-selected', 'true');
    return;
  }

  if (action === 'radio' || action === 'pill') {
    const group = button.dataset.group;
    const peers = group
      ? Array.from(
          document.querySelectorAll<ActionButton>(`[data-action="${action}"][data-group="${group}"]`),
        )
      : [button];
    const stateAttribute = action === 'radio' ? 'aria-checked' : 'aria-pressed';
    for (const peer of peers) {
      const selected = peer === button;
      peer.setAttribute(stateAttribute, String(selected));
      peer.dataset.selected = String(selected);
    }
    showNotice(`${button.dataset.value ?? button.textContent?.trim() ?? 'Option'} selected.`);
    return;
  }

  if (action === 'notice') {
    showNotice(button.dataset.notice ?? 'This action is available through the live CampusFind workflow.');
  }
}

/**
 * The canonical Stitch screens ship as static HTML. This global delegate gives
 * their labelled controls predictable keyboard-accessible behaviour without
 * modifying generated content at runtime.
 */
export default function CanonicalActions() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const element = event.target;
      if (!(element instanceof Element)) return;
      const button = element.closest<ActionButton>('[data-action]');
      if (!button) return;

      event.preventDefault();
      runAction(button);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
