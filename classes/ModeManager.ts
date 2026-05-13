import { Product } from './Product';

// Declare functions used in script.js
declare function renderProducts(): void;
declare function showModal(msg: string): void;

export class ModeManager {
    public static currentMode: 'Day' | 'Night' = (() => {
        const hour = new Date().getHours();
        return (hour >= 18 || hour < 6) ? 'Night' : 'Day';
    })();

    private static lastToggle: number = 0;

    public static toggleMode(): void {
        const now = Date.now();
        if (now - this.lastToggle < 2000) return; // Prevent rapid-fire toggling
        this.lastToggle = now;

        this.currentMode = this.currentMode === 'Day' ? 'Night' : 'Day';
        this.applyTheme();
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof showModal === 'function') showModal(`Switched to ${this.currentMode} Mode!`);
    }

    public static applyTheme(): void {
        const heroTitle = document.getElementById('hero-title');
        const heroSubtitle = document.getElementById('hero-subtitle');
        if (this.currentMode === 'Night') {
            document.body.classList.add('night-mode');
            document.documentElement.classList.add('night-mode');
            if (heroTitle) heroTitle.textContent = "Enzomnia";
            if (heroSubtitle) heroSubtitle.textContent = "Fuel for the night owls.";
        } else {
            document.body.classList.remove('night-mode');
            document.documentElement.classList.remove('night-mode');
            if (heroTitle) heroTitle.textContent = "Enzomnia";
            if (heroSubtitle) heroSubtitle.textContent = "Try out something unique today.";
        }
    }

    public static detectShake(): boolean {
        let lastX: number | null = null;
        let lastY: number | null = null;
        let lastZ: number | null = null;
        let lastTime = Date.now();
        let shakeStartTime: number | null = null;
        const shakeThreshold = 60; // Moderate threshold since duration is now the main filter
        const requiredDuration = 2000; // 2 seconds of continuous shaking

        window.addEventListener('devicemotion', (e: DeviceMotionEvent) => {
            const current = e.accelerationIncludingGravity;
            if (!current || current.x === null || current.y === null || current.z === null) return;

            const currentTime = Date.now();
            if ((currentTime - lastTime) > 100) {
                const diffTime = currentTime - lastTime;
                lastTime = currentTime;

                if (lastX !== null && lastY !== null && lastZ !== null) {
                    const speed = Math.abs(current.x + current.y + current.z - lastX - lastY - lastZ) / diffTime * 10000;
                    
                    if (speed > shakeThreshold) {
                        if (shakeStartTime === null) {
                            shakeStartTime = currentTime;
                        } else if (currentTime - shakeStartTime > requiredDuration) {
                            this.toggleMode();
                            shakeStartTime = null; // Reset after successful toggle
                        }
                    } else {
                        // Reset if the shaking intensity drops
                        shakeStartTime = null;
                    }
                }
                lastX = current.x;
                lastY = current.y;
                lastZ = current.z;
            }
        });
        return true;
    }

    public static filterMenu(products: Product[]): Product[] {
        return products.filter(p => p.getMode() === this.currentMode || p.getMode() === 'Both');
    }
}
