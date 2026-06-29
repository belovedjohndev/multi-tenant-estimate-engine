import { EstimateInput, EstimateResult } from '../../api/estimateApi';
import { formatCurrency } from '../../shared/format';
import { escapeHtmlAttribute } from '../../shared/html';

export function buildEstimateDemoMarkup(): string {
    return `
        <section class="estimate-demo" aria-labelledby="estimate-demo-title">
            <div class="estimate-demo__intro">
                <p class="card-label">Step 1 - Estimate Details</p>
                <h3 id="estimate-demo-title">Try the live estimate demo</h3>
                <p class="surface-copy">
                    Start with sample service details. The result uses the same public estimate endpoint as the embedded widget.
                </p>
                <p class="estimate-demo__config" id="estimate-config-status">Loading demo pricing...</p>
            </div>

            <form class="estimate-form" id="estimate-demo-form">
                <label class="estimate-field">
                    <span>Project size</span>
                    <input type="number" name="size" min="1" step="1" value="1200" required />
                </label>

                <label class="estimate-field">
                    <span>Complexity</span>
                    <select name="complexity" required>
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </label>

                <label class="estimate-check">
                    <input type="checkbox" name="bulk" checked />
                    <span>Apply bulk discount</span>
                </label>

                <button class="cta-link estimate-submit" type="submit">Calculate Estimate</button>
                <p class="estimate-form__status" id="estimate-demo-status" role="status" aria-live="polite"></p>
            </form>

            <div class="estimate-result" id="estimate-demo-result" aria-live="polite"></div>
            <div class="lead-capture" id="estimate-demo-lead"></div>
        </section>
    `;
}

export function buildEstimateResultMarkup(input: EstimateInput, result: EstimateResult): string {
    return `
        <article class="estimate-result-card">
            <div>
                <p class="card-label">Step 2 - Estimate Snapshot</p>
                <h4>${formatCurrency(result.total)}</h4>
                <p class="surface-copy">
                    ${input.size.toLocaleString()} sq ft, ${input.complexity} complexity, ${
                        input.bulk ? 'bulk discount applied' : 'standard pricing'
                    }.
                </p>
            </div>
            <dl class="estimate-breakdown">
                <div>
                    <dt>Base price</dt>
                    <dd>${formatCurrency(result.breakdown.basePrice)}</dd>
                </div>
                <div>
                    <dt>Size multiplier</dt>
                    <dd>${result.breakdown.sizeMultiplier.toFixed(2)}x</dd>
                </div>
                <div>
                    <dt>Complexity multiplier</dt>
                    <dd>${result.breakdown.complexityMultiplier.toFixed(2)}x</dd>
                </div>
                <div>
                    <dt>Discount</dt>
                    <dd>${(result.breakdown.discount * 100).toFixed(0)}%</dd>
                </div>
            </dl>
            <p class="estimate-version">Config version v${result.configVersion.versionNumber}</p>
        </article>
    `;
}

export function buildLeadCaptureMarkup(result: EstimateResult, portalUrl: string): string {
    return `
        <form class="lead-form" id="estimate-lead-form">
            <div>
                <p class="card-label">Step 3 - Send Request To Dashboard</p>
                <h4>Send request to dashboard</h4>
                <p class="surface-copy">
                    Add contact details to create a demo request with this ${formatCurrency(result.total)} estimate snapshot.
                </p>
            </div>
            <label class="estimate-field">
                <span>Name</span>
                <input type="text" name="name" autocomplete="name" placeholder="Beloved John" />
            </label>
            <label class="estimate-field">
                <span>Email</span>
                <input type="email" name="email" autocomplete="email" placeholder="belovedjohn@example.com" required />
            </label>
            <label class="estimate-field">
                <span>Phone</span>
                <input type="tel" name="phone" autocomplete="tel" placeholder="+1 555 123 4567" />
            </label>
            <button class="cta-link estimate-submit" type="submit">Send request to dashboard</button>
            <a class="estimate-portal-cta" href="${escapeHtmlAttribute(portalUrl)}">Portal login or signup</a>
            <p class="estimate-form__status" id="estimate-lead-status" role="status" aria-live="polite"></p>
        </form>
    `;
}
