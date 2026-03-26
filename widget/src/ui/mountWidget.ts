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
                    message: getErrorMessage(error, 'Unable to load estimator configuration.')
                }
            });
        }
    }

    function renderApp(root: HTMLElement, state: WidgetState) {
        applyBranding(root, state);
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
            branding: state.clientConfig?.branding ?? null,
            content: modalContent,
            onClose: closeModal
        });

        root.append(modal);
    }

    function renderPhase(state: WidgetState): HTMLElement {
        switch (state.phase) {
            case 'loadingConfig':
                return renderLoadingState('Loading configuration', 'Fetching branding and estimator settings from the server.');
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
                return renderLoadingState('Calculating estimate', 'Submitting the request to the backend.');
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
                return renderLoadingState('Submitting lead', 'Saving contact details and estimate snapshot.');
            case 'success':
                return renderSuccessState({
                    leadId: state.leadId,
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
                    message: getErrorMessage(error, 'Unable to submit the lead.')
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
    const panel = createElement('div', { className: 'ee-panel' });
    const eyebrow = createElement('p', { className: 'ee-eyebrow', textContent: 'Please wait' });
    const title = createElement('h3', { className: 'ee-panel-title', textContent: titleText });
    const description = createElement('p', { className: 'ee-panel-copy', textContent: descriptionText });
    const pulse = createElement('div', { className: 'ee-loading-bar' });

    appendChildren(panel, eyebrow, title, description, pulse);

    return panel;
}

function getRetryLabel(state: WidgetState): string {
    switch (state.error?.context) {
        case 'config':
            return 'Retry Load';
        case 'estimate':
            return 'Back to Form';
        case 'lead':
            return 'Back to Lead Form';
        default:
            return 'Retry';
    }
}

function applyBranding(root: HTMLElement, state: WidgetState) {
    const branding = state.clientConfig?.branding;

    root.style.setProperty('--ee-primary', branding?.primaryColor ?? '#0f766e');
    root.style.setProperty('--ee-secondary', branding?.secondaryColor ?? '#1f2937');
    root.style.setProperty('--ee-font-family', branding?.fontFamily ?? '"Avenir Next", "Segoe UI", sans-serif');
}

const WIDGET_STYLES = `
:host {
    all: initial;
}

.ee-widget-root {
    --ee-primary: #0f766e;
    --ee-secondary: #1f2937;
    --ee-font-family: "Avenir Next", "Segoe UI", sans-serif;
    font-family: var(--ee-font-family);
    color: #0f172a;
    position: relative;
}

.ee-launcher,
.ee-modal,
.ee-modal * {
    box-sizing: border-box;
}

.ee-launcher {
    appearance: none;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--ee-primary), var(--ee-secondary));
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.95rem 1.4rem;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
    transition: transform 150ms ease, box-shadow 150ms ease;
}

.ee-launcher:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 44px rgba(15, 23, 42, 0.22);
}

.ee-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.44);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    z-index: 9999;
}

.ee-modal {
    width: min(100%, 34rem);
    border-radius: 1.5rem;
    background:
        radial-gradient(circle at top right, rgba(15, 118, 110, 0.12), transparent 28%),
        linear-gradient(180deg, #ffffff, #f8fafc);
    box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
    overflow: hidden;
}

.ee-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.25rem 0;
}

.ee-modal-heading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.ee-modal-title {
    margin: 0;
    font-size: 1.3rem;
    line-height: 1.1;
}

.ee-brand-logo {
    width: 2.5rem;
    height: 2.5rem;
    object-fit: contain;
    border-radius: 0.75rem;
    background: #fff;
    padding: 0.3rem;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.ee-modal-close,
.ee-primary-action,
.ee-secondary-action {
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
    border-radius: 999px;
    padding: 0.85rem 1.15rem;
    font-weight: 700;
}

.ee-modal-close {
    background: rgba(148, 163, 184, 0.16);
    color: #0f172a;
}

.ee-modal-body {
    padding: 1.25rem;
}

.ee-panel {
    display: grid;
    gap: 0.9rem;
}

.ee-eyebrow {
    margin: 0;
    color: var(--ee-primary);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.ee-panel-title,
.ee-price {
    margin: 0;
    font-size: clamp(1.4rem, 2vw, 2rem);
    line-height: 1.1;
}

.ee-price {
    color: var(--ee-secondary);
}

.ee-panel-copy {
    margin: 0;
    color: #475569;
    line-height: 1.6;
}

.ee-form {
    display: grid;
    gap: 0.9rem;
}

.ee-field,
.ee-checkbox-field {
    display: grid;
    gap: 0.45rem;
}

.ee-field-label,
.ee-checkbox-label {
    font-size: 0.92rem;
    font-weight: 600;
}

.ee-input {
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.55);
    border-radius: 1rem;
    background: #fff;
    padding: 0.9rem 1rem;
    font: inherit;
    color: #0f172a;
}

.ee-checkbox-field {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.75rem;
}

.ee-form-feedback {
    margin: 0;
    min-height: 1.25rem;
    color: #b91c1c;
    font-size: 0.92rem;
}

.ee-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.ee-primary-action {
    background: linear-gradient(135deg, var(--ee-primary), var(--ee-secondary));
    color: #fff;
}

.ee-secondary-action {
    background: rgba(148, 163, 184, 0.16);
    color: #0f172a;
}

.ee-breakdown {
    display: grid;
    gap: 0.6rem;
    padding: 1rem;
    margin: 0;
    border-radius: 1rem;
    background: rgba(241, 245, 249, 0.9);
}

.ee-breakdown-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.ee-breakdown-label,
.ee-breakdown-value {
    margin: 0;
}

.ee-breakdown-value {
    font-weight: 700;
}

.ee-loading-bar {
    height: 0.45rem;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(15, 118, 110, 0.18), rgba(15, 118, 110, 0.85), rgba(15, 118, 110, 0.18));
    background-size: 200% 100%;
    animation: ee-slide 1.2s linear infinite;
}

.ee-panel-success {
    padding: 0.2rem 0;
}

.ee-panel-error {
    padding: 0.2rem 0;
}

button:disabled,
input:disabled,
select:disabled {
    cursor: not-allowed;
    opacity: 0.65;
}

@keyframes ee-slide {
    from {
        background-position: 200% 0;
    }

    to {
        background-position: -200% 0;
    }
}

@media (max-width: 640px) {
    .ee-modal-overlay {
        padding: 0.75rem;
    }

    .ee-modal {
        width: 100%;
        border-radius: 1.2rem;
    }

    .ee-actions {
        flex-direction: column;
    }
}
`;
