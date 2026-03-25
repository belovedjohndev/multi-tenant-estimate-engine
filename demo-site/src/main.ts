import { mountWidget } from '../../widget/src';
import { demoConfig } from './demoConfig';
import './styles.css';

const widgetHost = document.getElementById('widget-root');

if (!(widgetHost instanceof HTMLElement)) {
    throw new Error('Widget host element #widget-root was not found');
}

mountWidget(widgetHost, demoConfig);
