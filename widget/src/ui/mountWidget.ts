import { fetchClientConfig } from '../api/clientConfigApi';
import { requestEstimate } from '../api/estimateApi';
import { submitLead } from '../api/leadApi';
import { parseRuntimeConfig, WidgetRuntimeConfigInput } from '../config/runtimeConfig';
import { EstimateInput } from '../domain/estimatorTypes';
import { createWidgetStore, WidgetState } from '../state/widgetState';
import { appendChildren, clearElement, createElement, ensureShadowAppRoot, ensureStyles } from '../utils/dom';
import { getErrorMessage } from '../utils/validation';
import { renderErrorState } from './renderErrorState';
import { renderEstimateForm } from './renderEstimateForm';
import { renderEstimateResult } from './renderEstimateResult';
import { renderLauncher } from './renderLauncher';
import { renderLeadForm } from './renderLeadForm';
import { renderModal } from './renderModal';
import { renderSuccessState } from './renderSuccessState';

export interface MountedWidget {
    destroy: () => void;
}

export function mountWidget(container: HTMLElement, input: WidgetRuntimeConfigInput): MountedWidget {
    const config = parseRuntimeConfig(input);
    const store = createWidgetStore();
    const shadowRoot = ensureShadowAppRoot(container);

    ensureStyles(shadowRoot, 'ee-widget-style', WIDGET_STYLES);

    const appRoot = createElement('div', { className: 'ee-widget-root' });
    shadowRoot.append(appRoot);

    const unsubscribe = store.subscribe((state) => {
        renderApp(appRoot, state);
    });

    renderApp(appRoot, store.getState());
    void loadClientConfig();

    return {
        destroy() {
            unsubscribe();
            appRoot.remove();
        }
    };

    async function loadClientConfig() {
        store.setState({
            phase: 'loadingConfig',
            error: null
        });

        try {
            const clientConfig = await fetchClientConfig(config);

            store.setState({
                clientConfig,
                phase: 'estimateForm',
                error: null
            });
        } catch (error) {
            store.setState({
                phase: 'error',
                error: {
                    context: 'config',
                    message: getErrorMessage(error, 'Unable to load pricing settings.')
                }
            });
        }
    }

    function renderApp(root: HTMLElement, state: WidgetState) {
        applyBranding(root, config, state);
        clearElement(root);

        const launcher = renderLauncher({
            label: config.launcherLabel,
            onClick: () => {
                store.setState({ isOpen: true });
            }
        });

        root.append(launcher);

        if (!state.isOpen) {
            return;
        }

        const modalContent = renderPhase(state);
        const modal = renderModal({
            title: config.modalTitle,
            businessName: config.companyName ?? 'Estimate Engine',
            businessPhone: config.phone,
            branding: resolveDisplayBranding(config, state),
            phase: state.phase,
            errorContext: state.error?.context ?? null,
            content: modalContent,
            onClose: closeModal
        });

        root.append(modal);
    }

    function renderPhase(state: WidgetState): HTMLElement {
        switch (state.phase) {
            case 'loadingConfig':
                return renderLoadingState('Loading details', 'Getting company branding and pricing settings.');
            case 'estimateForm':
                return renderEstimateForm({
                    estimatorConfig: state.clientConfig!.config.estimatorConfig,
                    initialValue: state.estimateInput,
                    isSubmitting: false,
                    onSubmit: (estimateInput) => {
                        void handleEstimateSubmit(estimateInput);
                    }
                });
            case 'estimating':
                return renderLoadingState('Preparing your estimate', 'Reviewing the details and calculating pricing.');
            case 'estimateResult':
                return renderEstimateResult({
                    input: state.estimateInput!,
                    result: state.estimateResult!,
                    onAdjust: () => {
                        store.setState({
                            phase: 'estimateForm'
                        });
                    },
                    onContinue: () => {
                        store.setState({
                            phase: 'leadForm',
                            error: null
                        });
                    }
                });
            case 'leadForm':
                return renderLeadForm({
                    estimateResult: state.estimateResult!,
                    businessName: config.companyName ?? 'Estimate Engine',
                    businessPhone: config.phone,
                    initialValue: state.leadInput,
                    isSubmitting: false,
                    onBack: () => {
                        store.setState({
                            phase: 'estimateResult'
                        });
                    },
                    onSubmit: (leadInput) => {
                        void handleLeadSubmit(leadInput);
                    }
                });
            case 'submittingLead':
                return renderLoadingState('Sending your request', 'Saving your contact details and estimate.');
            case 'success':
                return renderSuccessState({
                    leadId: state.leadId,
                    businessName: config.companyName ?? 'Estimate Engine',
                    onStartOver: resetFlow,
                    onClose: closeModal
                });
            case 'error':
                return renderErrorState({
                    message: state.error?.message ?? 'An unexpected error occurred.',
                    retryLabel: getRetryLabel(state),
                    onRetry: handleRetry,
                    onClose: closeModal
                });
            default:
                return renderLoadingState('Loading', 'Preparing estimator.');
        }
    }

    async function handleEstimateSubmit(estimateInput: EstimateInput) {
        store.setState({
            phase: 'estimating',
            estimateInput,
            error: null
        });

        try {
            const estimateResult = await requestEstimate(config, estimateInput);

            store.setState({
                phase: 'estimateResult',
                estimateResult,
                error: null
            });
        } catch (error) {
            store.setState({
                phase: 'error',
                error: {
                    context: 'estimate',
                    message: getErrorMessage(error, 'Unable to calculate the estimate.')
                }
            });
        }
    }

    async function handleLeadSubmit(leadInput: WidgetState['leadInput']) {
        const currentState = store.getState();

        if (!currentState.estimateResult || !currentState.estimateInput || !leadInput) {
            return;
        }

        store.setState({
            phase: 'submittingLead',
            leadInput,
            error: null
        });

        try {
            const response = await submitLead(config, {
                ...leadInput,
                configVersionId: currentState.estimateResult.configVersion.id,
                estimateInput: currentState.estimateInput,
                estimateData: currentState.estimateResult
            });

            store.setState({
                phase: 'success',
                leadId: response.id,
                error: null
            });
        } catch (error) {
            store.setState({
                phase: 'error',
                error: {
                    context: 'lead',
                    message: getErrorMessage(error, 'Unable to send your request.')
                }
            });
        }
    }

    function handleRetry() {
        const currentState = store.getState();
        const errorContext = currentState.error?.context;

        if (errorContext === 'config') {
            void loadClientConfig();
            return;
        }

        if (errorContext === 'estimate') {
            store.setState({
                phase: 'estimateForm',
                error: null
            });
            return;
        }

        if (errorContext === 'lead') {
            store.setState({
                phase: 'leadForm',
                error: null
            });
        }
    }

    function closeModal() {
        const currentState = store.getState();

        store.setState({
            isOpen: false,
            phase: currentState.phase === 'success' ? 'estimateForm' : currentState.phase,
            estimateInput: currentState.phase === 'success' ? null : currentState.estimateInput,
            estimateResult: currentState.phase === 'success' ? null : currentState.estimateResult,
            leadInput: currentState.phase === 'success' ? null : currentState.leadInput,
            leadId: currentState.phase === 'success' ? null : currentState.leadId,
            error: currentState.phase === 'success' ? null : currentState.error
        });
    }

    function resetFlow() {
        store.setState({
            isOpen: true,
            phase: 'estimateForm',
            estimateInput: null,
            estimateResult: null,
            leadInput: null,
            leadId: null,
            error: null
        });
    }
}

function renderLoadingState(titleText: string, descriptionText: string): HTMLElement {
    const panel = createElement('div', { className: 'ee-panel ee-panel-status' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Please wait' });
    const title = createElement('h3', { className: 'ee-panel-title', textContent: titleText });
    const description = createElement('p', { className: 'ee-panel-copy', textContent: descriptionText });
    const helper = createElement('p', {
        className: 'ee-step-helper',
        textContent: 'This is the same live estimate experience shown on your website.'
    });
    const spinner = createElement('div', { className: 'ee-loading-spinner' });
    const pulse = createElement('div', { className: 'ee-loading-bar' });

    appendChildren(panel, eyebrow, title, description, helper, spinner, pulse);

    return panel;
}

function getRetryLabel(state: WidgetState): string {
    switch (state.error?.context) {
        case 'config':
            return 'Try Again';
        case 'estimate':
            return 'Update Details';
        case 'lead':
            return 'Back to Request Form';
        default:
            return 'Retry';
    }
}

function applyBranding(root: HTMLElement, config: ReturnType<typeof parseRuntimeConfig>, state: WidgetState) {
    const branding = state.clientConfig?.branding;

    root.style.setProperty('--ee-primary', config.primaryColor ?? branding?.primaryColor ?? '#0f3554');
    root.style.setProperty('--ee-secondary', config.secondaryColor ?? branding?.secondaryColor ?? '#2ea8ff');
    root.style.setProperty('--ee-font-family', branding?.fontFamily ?? '"Avenir Next", "Segoe UI", sans-serif');
}

function resolveDisplayBranding(config: ReturnType<typeof parseRuntimeConfig>, state: WidgetState) {
    const branding = state.clientConfig?.branding;

    return {
        ...branding,
        logoUrl: config.logoUrl ?? branding?.logoUrl,
        primaryColor: config.primaryColor ?? branding?.primaryColor,
        secondaryColor: config.secondaryColor ?? branding?.secondaryColor
    };
}

const WIDGET_STYLES = `
:host {
    all: initial;
}

.ee-widget-root {
    --ee-primary: #0f3554;
    --ee-secondary: #2ea8ff;
    --ee-font-family: "Avenir Next", "Segoe UI", sans-serif;
    font-family: var(--ee-font-family);
    color: #0f3554;
    position: relative;
}

.ee-launcher,
.ee-modal,
.ee-modal *,
.ee-quick-size-pill {
    box-sizing: border-box;
}

.ee-launcher {
    appearance: none;
    min-width: 180px;
    padding: 14px 28px;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--ee-primary), #2563eb);
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    box-shadow: 0 14px 32px rgba(37, 99, 235, 0.28);
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.ee-launcher:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 36px rgba(37, 99, 235, 0.32);
}

.ee-modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background:
        radial-gradient(circle at top, rgba(47, 164, 255, 0.14), transparent 36%),
        rgba(15, 23, 42, 0.62);
    backdrop-filter: blur(10px);
    z-index: 2147483000;
}

.ee-modal {
    width: min(760px, calc(100vw - 36px));
    max-width: calc(100vw - 36px);
    max-height: min(94vh, 960px);
    overflow-y: auto;
    overflow-x: hidden;
    border: 1px solid rgba(219, 227, 234, 0.9);
    border-radius: 28px;
    background:
        linear-gradient(180deg, rgba(248, 251, 255, 0.94), rgba(255, 255, 255, 0.98) 25%),
        #ffffff;
    box-shadow:
        0 30px 90px rgba(15, 23, 42, 0.26),
        inset 0 1px 0 rgba(255, 255, 255, 0.72);
    color: #0f3554;
    scrollbar-width: thin;
    scrollbar-color: rgba(15, 53, 84, 0.28) transparent;
}

.ee-modal-header {
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 18px 26px 16px;
    border-bottom: 1px solid rgba(219, 227, 234, 0.9);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(14px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.ee-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    min-width: 0;
}

.ee-brand-block {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.ee-brand-logo {
    display: block;
    width: auto;
    max-width: 132px;
    max-height: 40px;
    object-fit: contain;
    filter: drop-shadow(0 5px 14px rgba(15, 53, 84, 0.08));
}

.ee-brand-copy,
.ee-header-status {
    min-width: 0;
}

.ee-modal-eyebrow,
.ee-step-kicker,
.ee-choice-card__eyebrow,
.ee-price-kicker {
    margin: 0;
    color: var(--ee-secondary);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}

.ee-modal-title {
    margin: 4px 0 0;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.15;
    color: #0f3554;
}

.ee-company-name {
    margin: 4px 0 0;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.1;
    color: #0f3554;
}

.ee-brand-phone {
    display: inline-block;
    margin-top: 4px;
    color: var(--ee-secondary);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
}

.ee-brand-phone:hover,
.ee-contact-note:hover {
    text-decoration: underline;
}

.ee-header-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
}

.ee-header-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    text-align: right;
}

.ee-step-kicker {
    color: #64748b;
}

.ee-title-line {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    line-height: 1.1;
    color: #0f3554;
    overflow-wrap: anywhere;
}

.ee-modal-close,
.ee-primary-action,
.ee-secondary-action,
.ee-quick-size-pill {
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
}

.ee-modal-close {
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    color: #64748b;
    font-size: 24px;
    line-height: 1;
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
    transition: transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}

.ee-modal-close:hover {
    transform: translateY(-1px);
    color: #0f3554;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
}

.ee-header-progress {
    margin-top: 14px;
}

.ee-progress-track {
    height: 4px;
    border-radius: 999px;
    overflow: hidden;
    background: #e8eef4;
}

.ee-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--ee-secondary), var(--ee-primary));
    transition: width 0.25s ease;
}

.ee-step-indicator {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
}

.ee-step-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 34px;
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.92);
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.ee-step-pill-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(203, 213, 225, 0.64);
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
    text-align: center;
}

.ee-step-pill--completed {
    border-color: rgba(47, 164, 255, 0.18);
    background: rgba(47, 164, 255, 0.08);
    color: #0f3554;
}

.ee-step-pill--completed .ee-step-pill-number {
    background: rgba(47, 164, 255, 0.2);
}

.ee-step-pill--active {
    border-color: rgba(15, 53, 84, 0.14);
    background: linear-gradient(180deg, rgba(15, 53, 84, 0.94), rgba(37, 99, 235, 0.92));
    color: #ffffff;
    box-shadow: 0 12px 28px rgba(37, 99, 235, 0.18);
}

.ee-step-pill--active .ee-step-pill-number {
    background: rgba(255, 255, 255, 0.18);
}

.ee-modal-body {
    padding: 28px 26px 30px;
}

.ee-panel {
    display: grid;
    gap: 16px;
    width: min(100%, 620px);
    margin: 0 auto;
}

.ee-panel-status,
.ee-panel-success,
.ee-panel-error {
    text-align: center;
}

.ee-eyebrow {
    margin: 0;
    color: #c2410c;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}

.ee-panel-title,
.ee-price {
    margin: 0;
    color: #0f3554;
    font-size: clamp(1.95rem, 4vw, 2.75rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.03em;
}

.ee-panel-copy {
    margin: 0;
    color: #475569;
    font-size: 15px;
    line-height: 1.62;
}

.ee-step-helper {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 9px 14px;
    border-radius: 999px;
    background: rgba(47, 164, 255, 0.08);
    color: #0f3554;
    font-size: 13px;
    font-weight: 700;
    justify-self: start;
}

.ee-step-helper::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ee-secondary);
    box-shadow: 0 0 0 5px rgba(47, 164, 255, 0.12);
}

.ee-step-helper--error {
    background: #fff1f2;
    color: #991b1b;
}

.ee-step-helper--error::before {
    background: #ef4444;
    box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.12);
}

.ee-form {
    display: grid;
    gap: 16px;
}

.ee-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.ee-field,
.ee-fieldset {
    display: grid;
    gap: 8px;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
}

.ee-field-label {
    display: block;
    color: #47607c;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.ee-input {
    display: block;
    width: 100%;
    min-width: 0;
    padding: 15px 16px;
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 16px;
    background: #f3f8ff;
    color: #0f3554;
    font: inherit;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.ee-input--prominent {
    font-size: 18px;
    font-weight: 700;
}

.ee-input:focus {
    outline: none;
    border-color: var(--ee-primary);
    box-shadow:
        0 0 0 4px rgba(59, 130, 246, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.ee-quick-size-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.ee-quick-size-pill {
    min-height: 38px;
    padding: 8px 12px;
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.92);
    color: #47607c;
    font-weight: 700;
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.ee-quick-size-pill:hover {
    transform: translateY(-1px);
    border-color: rgba(37, 99, 235, 0.42);
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.ee-choice-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ee-choice-card {
    display: block;
}

.ee-choice-card__input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.ee-choice-card__surface {
    position: relative;
    display: grid;
    gap: 8px;
    width: 100%;
    min-height: 132px;
    padding: 18px 16px;
    border: 1px solid rgba(203, 213, 225, 0.9);
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(255, 255, 255, 0.96));
    color: #0f3554;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
    transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease,
        background 0.18s ease,
        color 0.18s ease;
}

.ee-choice-card__surface:hover {
    transform: translateY(-2px);
    border-color: rgba(37, 99, 235, 0.42);
    box-shadow: 0 20px 42px rgba(15, 23, 42, 0.1);
}

.ee-choice-card__input:checked + .ee-choice-card__surface {
    border-color: rgba(15, 53, 84, 0.24);
    background: linear-gradient(180deg, rgba(15, 53, 84, 0.94), rgba(37, 99, 235, 0.94));
    color: #ffffff;
    box-shadow: 0 22px 48px rgba(37, 99, 235, 0.25);
}

.ee-choice-card__title {
    font-size: 18px;
    line-height: 1.3;
}

.ee-choice-card__copy {
    color: inherit;
    font-size: 14px;
    line-height: 1.55;
    opacity: 0.86;
}

.ee-form-feedback {
    margin: 0;
    min-height: 1.25rem;
    color: #b91c1c;
    font-size: 14px;
    font-weight: 700;
}

.ee-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.ee-primary-action,
.ee-secondary-action {
    min-width: 170px;
    padding: 14px 28px;
    border-radius: 999px;
    font-weight: 800;
    transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.ee-primary-action:hover,
.ee-secondary-action:hover {
    transform: translateY(-1px);
}

.ee-primary-action {
    background: linear-gradient(180deg, var(--ee-primary), #2563eb);
    color: #ffffff;
    box-shadow: 0 14px 32px rgba(37, 99, 235, 0.28);
}

.ee-secondary-action {
    background: #173f63;
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(15, 53, 84, 0.18);
}

.ee-price-panel,
.ee-inline-summary-card,
.ee-breakdown-card {
    border: 1px solid rgba(219, 227, 234, 0.9);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.07);
}

.ee-price-panel {
    display: grid;
    gap: 10px;
    padding: 22px 24px;
    text-align: center;
}

.ee-price-kicker {
    color: #94a3b8;
}

.ee-price {
    color: #0f3554;
    font-size: 52px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.05em;
}

.ee-version-pill {
    margin: 0 auto;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(47, 164, 255, 0.08);
    color: #0f3554;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.ee-breakdown {
    margin: 0;
}

.ee-breakdown-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.ee-breakdown-row {
    display: grid;
    gap: 6px;
    padding: 18px 18px;
}

.ee-breakdown-label,
.ee-breakdown-value {
    margin: 0;
}

.ee-breakdown-label {
    color: #64748b;
    font-size: 14px;
    font-weight: 700;
}

.ee-breakdown-value {
    color: #0f3554;
    font-size: 18px;
    font-weight: 800;
}

.ee-inline-summary-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
}

.ee-inline-summary-label {
    color: #64748b;
    font-size: 14px;
    font-weight: 700;
}

.ee-inline-summary-value {
    color: #0f3554;
    font-size: 20px;
    font-weight: 800;
}

.ee-contact-note {
    color: var(--ee-secondary);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
}

.ee-loading-spinner {
    width: 52px;
    height: 52px;
    margin: 0 auto;
    border: 4px solid #e5e7eb;
    border-top-color: var(--ee-primary);
    border-radius: 50%;
    animation: ee-spin 0.85s linear infinite;
}

.ee-loading-bar {
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(15, 118, 110, 0.18), rgba(15, 118, 110, 0.85), rgba(15, 118, 110, 0.18));
    background-size: 200% 100%;
    animation: ee-slide 1.2s linear infinite;
}

.ee-success-icon {
    width: 76px;
    height: 76px;
    margin: 0 auto;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(34, 197, 94, 0.14);
    color: #15803d;
    font-size: 34px;
    font-weight: 900;
    box-shadow: 0 18px 34px rgba(34, 197, 94, 0.16);
}

button:disabled,
input:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

@keyframes ee-slide {
    from {
        background-position: 200% 0;
    }

    to {
        background-position: -200% 0;
    }
}

@keyframes ee-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 760px) {
    .ee-modal-overlay {
        align-items: stretch;
        justify-content: flex-start;
        padding: 8px;
    }

    .ee-modal {
        width: 100%;
        max-width: 100%;
        max-height: calc(100dvh - 16px);
        border-radius: 20px;
    }

    .ee-modal-header {
        padding: 14px 16px 12px;
    }

    .ee-modal-body {
        padding: 20px 16px 22px;
    }

    .ee-header-top {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }

    .ee-header-actions {
        justify-content: space-between;
        width: 100%;
    }

    .ee-header-status {
        align-items: flex-start;
        text-align: left;
    }

    .ee-step-indicator {
        display: flex;
        overflow-x: auto;
    }

    .ee-step-pill {
        flex: 0 0 auto;
        min-width: max-content;
        padding-inline: 12px;
    }

    .ee-choice-grid,
    .ee-breakdown-grid,
    .ee-form-grid {
        grid-template-columns: 1fr;
    }

    .ee-actions {
        flex-direction: column-reverse;
        align-items: stretch;
    }

    .ee-primary-action,
    .ee-secondary-action {
        width: 100%;
        min-width: 0;
    }
}

@media (max-width: 520px) {
    .ee-modal-header {
        padding: 12px 14px 10px;
    }

    .ee-modal-body {
        padding: 18px 14px 20px;
    }

    .ee-modal-title {
        font-size: 14px;
    }

    .ee-title-line {
        font-size: 16px;
    }

    .ee-panel-title {
        font-size: clamp(1.85rem, 8vw, 2.3rem);
    }

    .ee-price {
        font-size: 40px;
    }

    .ee-choice-card__surface,
    .ee-price-panel,
    .ee-inline-summary-card,
    .ee-breakdown-card {
        border-radius: 18px;
    }
}
`;
