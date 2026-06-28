import { WidgetBranding } from '../domain/estimatorTypes';
import { ErrorContext, WidgetPhase } from '../state/widgetState';
import { appendChildren, createElement } from '../utils/dom';

export interface ModalOptions {
    title: string;
    businessName: string;
    businessPhone?: string;
    branding: WidgetBranding | null;
    phase: WidgetPhase;
    errorContext: ErrorContext | null;
    content: HTMLElement;
    onClose: () => void;
}

const STEP_META = [
    { step: 1, label: 'Project' },
    { step: 2, label: 'Estimate' },
    { step: 3, label: 'Contact' }
] as const;

export function renderModal(options: ModalOptions): HTMLElement {
    const overlay = createElement('div', { className: 'ee-modal-overlay' });
    const dialog = createElement('section', {
        className: 'ee-modal',
        attributes: {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': options.title
        }
    });
    const header = createElement('header', { className: 'ee-modal-header' });
    const headerTop = createElement('div', { className: 'ee-header-top' });
    const brandBlock = createElement('div', { className: 'ee-brand-block' });
    const brandCopy = createElement('div', { className: 'ee-brand-copy' });
    const eyebrow = createElement('p', { className: 'ee-modal-eyebrow', textContent: 'Instant Estimate' });
    const title = createElement('h2', { className: 'ee-modal-title', textContent: options.title });
    const headerActions = createElement('div', { className: 'ee-header-actions' });
    const headerStatus = createElement('div', { className: 'ee-header-status' });
    const stepMeta = resolveStepMeta(options.phase, options.errorContext);
    const stepKicker = createElement('p', { className: 'ee-step-kicker', textContent: stepMeta.statusText });
    const titleLine = createElement('p', { className: 'ee-title-line', textContent: stepMeta.titleText });
    const companyName = createElement('p', { className: 'ee-company-name', textContent: options.businessName });
    const closeButton = createElement('button', {
        className: 'ee-modal-close',
        textContent: '×',
        attributes: {
            type: 'button',
            'aria-label': 'Close estimator'
        }
    });
    const progress = createElement('div', { className: 'ee-header-progress' });
    const progressTrack = createElement('div', { className: 'ee-progress-track' });
    const progressFill = createElement('div', { className: 'ee-progress-fill' });
    const stepIndicator = createElement('div', { className: 'ee-step-indicator' });

    if (options.branding?.logoUrl) {
        const logo = createElement('img', {
            className: 'ee-brand-logo',
            attributes: {
                src: options.branding.logoUrl,
                alt: `${options.title} logo`
            }
        });

        brandBlock.append(logo);
    }

    progressFill.style.width = `${stepMeta.progressPercent}%`;
    closeButton.addEventListener('click', options.onClose);

    STEP_META.forEach((item) => {
        const pill = createElement('div', {
            className: `ee-step-pill ${resolveStepPillClass(item.step, stepMeta.currentStep, stepMeta.isComplete)}`
        });
        const number = createElement('span', { className: 'ee-step-pill-number', textContent: String(item.step) });
        const label = createElement('span', { className: 'ee-step-pill-label', textContent: item.label });

        appendChildren(pill, number, label);
        stepIndicator.append(pill);
    });

    appendChildren(brandCopy, eyebrow, companyName, title);

    if (options.businessPhone) {
        const phoneLink = createElement('a', {
            className: 'ee-brand-phone',
            textContent: options.businessPhone,
            attributes: {
                href: `tel:${normalizePhoneHref(options.businessPhone)}`
            }
        });

        brandCopy.append(phoneLink);
    }

    appendChildren(brandBlock, brandCopy);
    appendChildren(headerStatus, stepKicker, titleLine);
    appendChildren(headerActions, headerStatus, closeButton);
    appendChildren(headerTop, brandBlock, headerActions);
    appendChildren(progressTrack, progressFill);
    appendChildren(progress, progressTrack, stepIndicator);
    appendChildren(header, headerTop, progress);

    const body = createElement('div', { className: 'ee-modal-body' });
    body.append(options.content);

    appendChildren(dialog, header, body);
    overlay.append(dialog);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            options.onClose();
        }
    });

    return overlay;
}

function resolveStepMeta(phase: WidgetPhase, errorContext: ErrorContext | null) {
    if (phase === 'estimateResult') {
        return buildStepMeta(2, 'Step 2 of 3', 'Estimate Ready');
    }

    if (phase === 'leadForm' || phase === 'submittingLead') {
        return buildStepMeta(3, 'Step 3 of 3', 'Contact Details');
    }

    if (phase === 'success') {
        return {
            ...buildStepMeta(3, 'All steps completed', 'Submitted'),
            progressPercent: 100,
            isComplete: true
        };
    }

    if (phase === 'error') {
        if (errorContext === 'estimate') {
            return buildStepMeta(2, 'Step 2 of 3', 'Estimate Error');
        }

        if (errorContext === 'lead') {
            return buildStepMeta(3, 'Step 3 of 3', 'Contact Error');
        }
    }

    return buildStepMeta(1, 'Step 1 of 3', phase === 'estimating' ? 'Calculating Estimate' : 'Project Details');
}

function buildStepMeta(currentStep: number, statusText: string, titleText: string) {
    return {
        currentStep,
        statusText,
        titleText,
        progressPercent: ((currentStep - 1) / (STEP_META.length - 1)) * 100,
        isComplete: false
    };
}

function resolveStepPillClass(step: number, currentStep: number, isComplete: boolean): string {
    if (isComplete || step < currentStep) {
        return 'ee-step-pill--completed';
    }

    if (step === currentStep) {
        return 'ee-step-pill--active';
    }

    return 'ee-step-pill--upcoming';
}

function normalizePhoneHref(phoneNumber: string): string {
    return phoneNumber.replace(/[^\d+]/g, '');
}
