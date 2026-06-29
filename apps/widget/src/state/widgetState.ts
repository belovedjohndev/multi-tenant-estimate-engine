import { EstimateInput, EstimateResult, LeadCaptureDetails, WidgetClientConfigData } from '../domain/estimatorTypes';

export type WidgetPhase =
    | 'loadingConfig'
    | 'estimateForm'
    | 'estimating'
    | 'estimateResult'
    | 'leadForm'
    | 'submittingLead'
    | 'success'
    | 'error';

export type ErrorContext = 'config' | 'estimate' | 'lead';

export interface WidgetErrorState {
    context: ErrorContext;
    message: string;
}

export interface WidgetState {
    isOpen: boolean;
    phase: WidgetPhase;
    clientConfig: WidgetClientConfigData | null;
    estimateInput: EstimateInput | null;
    estimateResult: EstimateResult | null;
    leadInput: LeadCaptureDetails | null;
    leadId: number | null;
    error: WidgetErrorState | null;
}

type StateListener = (state: WidgetState) => void;
type StateUpdater = Partial<WidgetState> | ((state: WidgetState) => WidgetState);

export interface WidgetStore {
    getState(): WidgetState;
    setState(nextState: StateUpdater): void;
    subscribe(listener: StateListener): () => void;
}

export function createWidgetStore(): WidgetStore {
    let state: WidgetState = {
        isOpen: false,
        phase: 'loadingConfig',
        clientConfig: null,
        estimateInput: null,
        estimateResult: null,
        leadInput: null,
        leadId: null,
        error: null
    };

    const listeners = new Set<StateListener>();

    return {
        getState() {
            return state;
        },
        setState(nextState) {
            state =
                typeof nextState === 'function'
                    ? nextState(state)
                    : {
                          ...state,
                          ...nextState
                      };

            listeners.forEach((listener) => listener(state));
        },
        subscribe(listener) {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        }
    };
}
