import { Product, Beverage, FoodItem } from './classes/Product';
import { Cart } from './classes/Cart';
import { ModeManager } from './classes/ModeManager';

// Type definitions for global variables or external libraries
declare const google: any;
declare class Lenis {
    raf(time: number): void;
}

const allProducts: Product[] = [
    // Day Menu
    new Beverage("D1", "Zo's Morning Brew", 120, "Day", 50, "/assets/UnderDevelopmentImage.png", "Regular", true),
    new Beverage("D2", "Zo's Iced Matcha Latte", 160, "Day", 30, "/assets/UnderDevelopmentImage.png", "Large", false),
    new FoodItem("F1", "Zo's Avocado Toast", 180, "Day", 20, "/assets/UnderDevelopmentImage.png", "Vegan"),

    // Night Menu
    new Beverage("N1", "Zo's Midnight Espresso", 140, "Night", 40, "/assets/UnderDevelopmentImage.png", "Small", true),
    new Beverage("N2", "Zo's Chamomile Tea", 110, "Night", 25, "/assets/UnderDevelopmentImage.png", "Regular", true),
    new FoodItem("F2", "Zo's Dark Chocolate Cake", 150, "Night", 20, "/assets/UnderDevelopmentImage.png", "Vegetarian"),

    // Both
    new Beverage("B1", "Zo's Signature Latte", 150, "Both", 100, "/assets/UnderDevelopmentImage.png", "Regular", true),
    new FoodItem("B2", "Zo's Blueberry Muffin", 110, "Both", 30, "/assets/UnderDevelopmentImage.png", "Normal")
];

const myCart = new Cart("C1", "GUEST_1");

// --- UI Logic ---

export function renderProducts(): void {
    const drinksGrid = document.getElementById('drinks-grid');
    const pastriesGrid = document.getElementById('pastries-grid');

    if (!drinksGrid || !pastriesGrid) return;

    drinksGrid.innerHTML = '';
    pastriesGrid.innerHTML = '';

    const visibleProducts = ModeManager.filterMenu(allProducts);

    visibleProducts.forEach(product => {
        const isDrink = product instanceof Beverage;
        const targetGrid = isDrink ? drinksGrid : pastriesGrid;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';
        itemDiv.innerHTML = `
            <div class="mode-badge mode-${product.getMode().toLowerCase()}">${product.getMode()}</div>
            <div class="item-img-container">
                <img src="${product.getImage()}" alt="${product.getName()}">
            </div>
            <div class="item-content">
                <h3>${product.getName()}</h3>
                <div class="divider"></div>
                <div class="item-meta">
                    <span class="price">₱${product.getPrice().toFixed(2)}</span>
                    <span class="type">${isDrink ? ((product as Beverage).getIsHot() ? 'Hot' : 'Iced') : (product as FoodItem).getDietType()}</span>
                </div>
                <button onclick="addToCart('${product.getProductId()}')">Add to Cart</button>
            </div>
        `;
        targetGrid.appendChild(itemDiv);
    });
}

(window as any).addToCart = function (productId: string) {
    const product = allProducts.find(p => p.getProductId() === productId);
    if (product) {
        myCart.addItem(product, 1);
    }
};

(window as any).removeFromCart = function (productId: string) {
    myCart.removeItem(productId);
};

(window as any).updateCartUI = updateCartUI;
(window as any).toggleCart = toggleCart;

export function updateCartUI(): void {
    const container = document.getElementById('cart-items-container');
    const totalAmount = document.getElementById('cart-total-amount');
    const cartToggleBtn = document.getElementById('cart-toggle-btn');

    if (!container || !totalAmount || !cartToggleBtn) return;

    container.innerHTML = '';

    let totalItems = 0;

    myCart.items.forEach(item => {
        totalItems += item.getQuantity();
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.getProduct().getName()}</h4>
                <p>₱${item.getProduct().getPrice().toFixed(2)} x ${item.getQuantity()}</p>
                <button class="remove-btn" onclick="removeFromCart('${item.getProduct().getProductId()}')">Remove</button>
            </div>
            <div class="cart-item-total">
                <strong>₱${item.calcTotal().toFixed(2)}</strong>
            </div>
        `;
        container.appendChild(div);
    });

    totalAmount.textContent = myCart.total.toFixed(2);
    
    const cartBadge = document.getElementById('cart-badge');
    if (cartBadge) {
        cartBadge.textContent = totalItems.toString();
        cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

export function toggleCart(): void {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

export function showModal(message: string): void {
    const modal = document.getElementById('shake-modal');
    if (!modal) return;
    const modalText = modal.querySelector('p');
    if (modalText) modalText.innerHTML = message;
    modal.classList.remove('hidden');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 2000);
}

let isLoggedIn = false;

document.addEventListener('DOMContentLoaded', () => {
    ModeManager.applyTheme();
    renderProducts();

    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
        const leafCount = 25;
        for (let i = 0; i < leafCount; i++) {
            createLeaf(overlay);
        }
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 3500);
        }, 100);
    }

    // Mode button is now handled via logo triple-click or shake
    
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    if (cartToggleBtn) cartToggleBtn.addEventListener('click', toggleCart);
    
    const closeCartBtn = document.getElementById('close-cart');
    if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => myCart.checkout());

    // TRIPLE CLICK LOGO TO CHANGE THEME/MENU
    let logoClicks = 0;
    let logoTimer: any;
    let isLocked = false;
    const logoContainer = document.querySelector('.logo') as HTMLElement;

    if (logoContainer) {
        logoContainer.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (isLocked) return;

            // Visual feedback pulse
            logoContainer.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                logoContainer.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 100);

            logoClicks++;
            clearTimeout(logoTimer);

            if (logoClicks >= 3) {
                logoClicks = 0;
                isLocked = true;
                setTimeout(() => { isLocked = false; }, 1500);
                
                ModeManager.toggleMode();
            } else {
                logoTimer = setTimeout(() => { logoClicks = 0; }, 1000);
            }
        });
    }

    // GYROSCOPE SHAKE DETECTION (iOS requires a user gesture like a click)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        document.body.addEventListener('click', function req() {
            // Kickstart video for iOS
            const video = document.getElementById('hero-video') as HTMLVideoElement;
            if (video) {
                video.play().catch(() => {
                    // If it still fails (e.g. Low Power Mode), we just ignore
                });
            }

            (DeviceMotionEvent as any).requestPermission().then((state: string) => {
                if (state === 'granted') {
                    ModeManager.detectShake();
                }
            }).catch(console.error);
            document.body.removeEventListener('click', req);
        }, { once: true });
    } else {
        ModeManager.detectShake();
    }

    (window as any).onload = function () {
        if ((window as any).google) {
            google.accounts.id.initialize({
                client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
                callback: handleCredentialResponse
            });
            google.accounts.id.renderButton(
                document.getElementById("auth-container"),
                { theme: "outline", size: "large", type: "icon", shape: "circle" }
            );
        }
    }
});

function createLeaf(container: HTMLElement): void {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    const size = Math.random() * 30 + 20;
    const startX = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = Math.random() * 2 + 2;

    leaf.style.width = `${size}px`;
    leaf.style.height = `${size}px`;
    leaf.style.left = `${startX}%`;
    leaf.style.animation = `fall ${duration}s linear ${delay}s forwards`;
    container.appendChild(leaf);
}

(window as any).handleAuthClick = function(): void {
    if (!isLoggedIn && (window as any).google) {
        google.accounts.id.prompt();
    }
};

function handleCredentialResponse(response: any): void {
    const responsePayload = parseJwt(response.credential);
    const displayImg = document.getElementById('display-img') as HTMLImageElement;

    isLoggedIn = true;
    if (displayImg) {
        displayImg.src = responsePayload.picture;
        displayImg.classList.add('logged-in');
    }
}

function parseJwt(token: string): any {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (!header) return;
    if (window.scrollY > 40) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Using Lenis to make the scrolling smoother and better user experience
const lenis = new (window as any).Lenis();

function raf(time: number): void {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// Export functions to global scope for HTML/other modules
(window as any).renderProducts = renderProducts;
(window as any).addToCart = addToCart;
(window as any).toggleCart = toggleCart;
(window as any).updateCartUI = updateCartUI;
(window as any).showModal = showModal;
(window as any).handleAuthClick = handleAuthClick;
