import '@testing-library/jest-dom';

// Polyfill for PointerEvent methods missing in JSDOM
if (typeof window !== 'undefined') {
    // JSDOM doesn't implement PointerEvent
    if (!window.PointerEvent) {
        class PointerEvent extends MouseEvent {
            public pointerId?: number;
            public pointerType?: string;

            constructor(type: string, params: PointerEventInit = {}) {
                super(type, params);
                this.pointerId = params.pointerId;
                this.pointerType = params.pointerType;
            }
        }
        window.PointerEvent = PointerEvent as any;
    }

    // JSDOM doesn't implement hasPointerCapture or releasePointerCapture
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = function (pointerId: number): boolean {
            // Basic stub implementation
            // You might need a more sophisticated mock depending on your tests
            return false;
        };
    }

    if (!Element.prototype.releasePointerCapture) {
        Element.prototype.releasePointerCapture = function (pointerId: number): void {
            // Basic stub implementation
            // No operation needed for most tests
        };
    }

     if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = function (pointerId: number): void {
            // Basic stub implementation
        };
    }

    // JSDOM doesn't implement scrollIntoView
    if (!Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = function () {
            // Basic stub implementation
            // No operation needed for most tests
        };
    }
} 