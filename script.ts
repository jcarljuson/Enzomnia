import { Product, Beverage, FoodItem } from './classes/Product';
import { Cart } from './classes/Cart';
import { ModeManager } from './classes/ModeManager';
import { User, GuestUser, RegisteredUser } from './classes/User';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, setDoc, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

// global vars from other files
declare const google: any;
declare class Lenis {
    raf(time: number): void;
}

let allProducts: Product[] = [];

// add products if db is empty
async function loadProductsFromFirestore() {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    
    if (snapshot.empty) {
        console.log("No products found in Firestore. Seeding initial data...");
        const initialProducts = [
            // Day Menu
            new Beverage("D1", "Zo's Morning Brew", 120, "Day", 50, "/assets/products/day/morning-brew.png", "Regular", true),
            new Beverage("D2", "Zo's Iced Matcha Latte", 160, "Day", 30, "/assets/products/day/matcha-latte.png", "Large", false),
            new FoodItem("F1", "Zo's Avocado Toast", 180, "Day", 20, "/assets/products/day/avocado-toast.png", "Vegan"),

            // Night Menu
            new Beverage("N1", "Zo's Midnight Espresso", 140, "Night", 40, "/assets/products/night/midnight-espresso.png", "Small", true),
            new Beverage("N2", "Zo's Chamomile Tea", 110, "Night", 25, "/assets/products/night/chamomile-tea.png", "Regular", true),
            new FoodItem("F2", "Zo's Dark Chocolate Cake", 150, "Night", 20, "/assets/products/night/chocolate-cake.png", "Vegetarian"),

            // Both
            new Beverage("B1", "Zo's Signature Latte", 150, "Both", 100, "/assets/products/both/signature-latte.png", "Regular", true),
            new FoodItem("B2", "Zo's Blueberry Muffin", 110, "Both", 30, "/assets/products/both/blueberry-muffin.png", "Normal")
        ];

        for (const prod of initialProducts) {
            let data: any = {
                id: prod.getProductId(),
                name: prod.getName(),
                price: prod.getPrice(),
                mode: prod.getMode(),
                stock: prod.getStock(),
                image: prod.getImage(),
                type: prod instanceof Beverage ? 'Beverage' : 'FoodItem'
            };
            if (prod instanceof Beverage) {
                data.size = prod.getSize();
                data.isHot = prod.getIsHot();
            } else if (prod instanceof FoodItem) {
                data.dietType = prod.getDietType();
            }
            await setDoc(doc(db, "products", prod.getProductId()), data);
            allProducts.push(prod);
        }
    } else {
        const imageMap: { [key: string]: string } = {
            "D1": "/assets/products/day/morning-brew.png",
            "D2": "/assets/products/day/matcha-latte.png",
            "F1": "/assets/products/day/avocado-toast.png",
            "N1": "/assets/products/night/midnight-espresso.png",
            "N2": "/assets/products/night/chamomile-tea.png",
            "F2": "/assets/products/night/chocolate-cake.png",
            "B1": "/assets/products/both/signature-latte.png",
            "B2": "/assets/products/both/blueberry-muffin.png"
        };

        for (const docSnap of snapshot.docs) {
            let data = docSnap.data();
            
            if (data.image && data.image.includes("UnderDevelopmentImage") && imageMap[data.id]) {
                const newImg = imageMap[data.id];
                console.log(`Updating image for ${data.id} in Firestore to ${newImg}...`);
                await updateDoc(doc(db, "products", data.id), { image: newImg });
                data.image = newImg;
            }

            if (data.type === 'Beverage') {
                allProducts.push(new Beverage(data.id, data.name, data.price, data.mode, data.stock, data.image, data.size, data.isHot));
            } else {
                allProducts.push(new FoodItem(data.id, data.name, data.price, data.mode, data.stock, data.image, data.dietType));
            }
        }
    }
    
    renderProducts();
}

const myCart = new Cart("C1", "GUEST_1");

// UI stuff

export function renderProducts(): void {
    const drinksGrid = document.getElementById('drinks-grid');
    const pastriesGrid = document.getElementById('pastries-grid');

    if (!drinksGrid || !pastriesGrid) return;

    drinksGrid.innerHTML = '';
    pastriesGrid.innerHTML = '';

    const visibleProducts = ModeManager.filterMenu(allProducts, ModeManager.currentMode);

    visibleProducts.forEach(product => {
        const isDrink = product instanceof Beverage;
        const targetGrid = isDrink ? drinksGrid : pastriesGrid;

        const itemDiv = document.createElement('div');
        // bg-[#eef2f5] dark:bg-[#191e1cc9] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none border border-black/5 dark:border-white/5 flex flex-col p-[20px] text-center relative mt-[80px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(30,57,50,0.1)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] dark:backdrop-blur-[10px]
        itemDiv.className = 'item bg-[#eef2f5] dark:bg-[#16201acc] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none border border-black/5 dark:border-white/5 flex flex-col p-[20px] text-center relative mt-[80px] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(30,57,50,0.1)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] dark:backdrop-blur-[10px]';
        itemDiv.innerHTML = `
            <div class="mode-badge mode-${product.getMode().toLowerCase()}">${product.getMode()}</div>
            <div class="item-img-container relative w-full -mt-[110px] flex justify-center items-end mb-[15px]">
                <img src="${product.getImage()}" alt="${product.getName()}" class="h-[230px] w-auto max-w-full object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.15)] transition-transform duration-400 z-[2] group-hover:-translate-y-[10px] group-hover:scale-105">
            </div>
            <div class="item-content flex flex-col flex-1 justify-end">
                <h3 class="m-0 mb-[5px] font-['Plus_Jakarta_Sans'] text-[1.4rem] font-extrabold text-[#2b3a55] dark:text-[#eaf4f0] transition-colors duration-[1500ms]">${product.getName()}</h3>
                <div class="item-meta flex justify-between items-center mb-[20px]">
                    <span class="type text-[0.95rem] text-[#444] dark:text-[#9bb3a6] font-semibold transition-colors duration-[1500ms]">${isDrink ? ((product as Beverage).getIsHot() ? 'Hot' : 'Iced') : (product as FoodItem).getDietType()}</span>
                    <span class="price font-bold text-[1.2rem] text-[#1e3932] dark:text-[#3bbd81] transition-colors duration-[1500ms]">₱${product.getPrice().toFixed(2)}</span>
                </div>
                <div class="divider h-[1px] bg-black/10 dark:bg-white/10 my-[15px] w-full transition-colors duration-[1500ms]"></div>
                <div class="add-to-cart-wrapper flex gap-[8px] items-center justify-between mt-[15px]">
                    <div class="qty-selector flex items-center border border-[#eaeaea] dark:border-[#23332a] rounded-[8px] p-0 mr-[10px] h-[36px] bg-[#f9f9f9] dark:bg-[#1e2a22] shrink-0">
                        <button class="qty-btn bg-transparent border-none py-[5px] px-[12px] text-inherit min-w-auto m-0 text-[1.2rem] cursor-pointer shadow-none transform-none hover:bg-black/5 dark:hover:bg-white/10" onclick="decrementQty('${product.getProductId()}')">-</button>
                        <span class="qty-display px-[10px] font-semibold min-w-[20px] text-center text-[1.1rem]" id="qty-${product.getProductId()}">1</span>
                        <button class="qty-btn bg-transparent border-none py-[5px] px-[12px] text-inherit min-w-auto m-0 text-[1.2rem] cursor-pointer shadow-none transform-none hover:bg-black/5 dark:hover:bg-white/10" onclick="incrementQty('${product.getProductId()}')">+</button>
                    </div>
                    <button class="add-btn bg-[#e8f5e9] dark:bg-transparent text-[#1e3932] dark:text-[#3bbd81] border border-[#1e3932] dark:border-[#3bbd81] p-[10px] rounded-[20px] flex items-center justify-center cursor-pointer font-semibold transition-all duration-200 flex-1 hover:bg-[#1e3932] hover:text-white dark:hover:bg-[#3bbd81] dark:hover:text-[#ffffff]" onclick="addToCart('${product.getProductId()}')" title="Add to Cart">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                    </button>
                    <button class="buy-now-btn bg-[#1e3932] dark:bg-[#2b8a5d] text-white dark:text-[#ffffff] font-extrabold uppercase tracking-[0.05em] border border-[#1e3932] dark:border-[#2b8a5d] p-[10px] rounded-[20px] cursor-pointer transition-all duration-200 flex-1 hover:bg-[#132722] hover:-translate-y-[2px] hover:shadow-[0_5px_15px_rgba(30,57,50,0.3)] dark:hover:bg-[#1e6e49] dark:hover:shadow-[0_5px_15px_rgba(43,138,93,0.3)]" onclick="buyNow('${product.getProductId()}')">Buy</button>
                </div>
            </div>
        `;
        targetGrid.appendChild(itemDiv);
    });
}

export class HapticSoundManager {
    private static ctx: AudioContext | null = null;

    private static init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    public static playPop() {
        try {
            this.init();
            if (this.ctx!.state === 'suspended') this.ctx!.resume();
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.connect(gain);
            gain.connect(this.ctx!.destination);

            // pop sound for buttons
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, this.ctx!.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, this.ctx!.currentTime + 0.05);

            // make it quiet so it doesnt hurt ears
            gain.gain.setValueAtTime(0, this.ctx!.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, this.ctx!.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.1);

            osc.start(this.ctx!.currentTime);
            osc.stop(this.ctx!.currentTime + 0.15);
        } catch (e) { console.warn('Audio play failed', e); }
    }

    public static playClick() {
        try {
            this.init();
            if (this.ctx!.state === 'suspended') this.ctx!.resume();
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.connect(gain);
            gain.connect(this.ctx!.destination);

            // small tick sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.ctx!.currentTime);
            
            // very quiet tick
            gain.gain.setValueAtTime(0, this.ctx!.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, this.ctx!.currentTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.04);

            osc.start(this.ctx!.currentTime);
            osc.stop(this.ctx!.currentTime + 0.05);
        } catch (e) { console.warn('Audio play failed', e); }
    }
}
(window as any).HapticSoundManager = HapticSoundManager;

export function incrementQty(productId: string): void {
    HapticSoundManager.playClick();
    const qtySpan = document.getElementById(`qty-${productId}`);
    if (qtySpan) {
        let currentQty = parseInt(qtySpan.textContent || '1');
        qtySpan.textContent = (currentQty + 1).toString();
    }
}
(window as any).incrementQty = incrementQty;

export function decrementQty(productId: string): void {
    HapticSoundManager.playClick();
    const qtySpan = document.getElementById(`qty-${productId}`);
    if (qtySpan) {
        let currentQty = parseInt(qtySpan.textContent || '1');
        if (currentQty > 1) {
            qtySpan.textContent = (currentQty - 1).toString();
        }
    }
}
(window as any).decrementQty = decrementQty;

export function addToCart(productId: string): void {
    HapticSoundManager.playPop();
    const product = allProducts.find(p => p.getProductId() === productId);
    const qtySpan = document.getElementById(`qty-${productId}`);
    const quantity = qtySpan ? parseInt(qtySpan.textContent || '1') : 1;
    
    if (product) {
        myCart.addItem(product, quantity);
        if (qtySpan) qtySpan.textContent = '1';
        showToast(`${quantity}x ${product.getName()} successfully added to cart`);
    }
}

export function removeFromCart(productId: string): void {
    HapticSoundManager.playClick();
    myCart.removeItem(productId);
}

export function updateCartQuantity(productId: string, change: number): void {
    HapticSoundManager.playClick();
    const item = myCart.items.find(i => i.getProduct().getProductId() === productId);
    if (item) {
        if (item.getQuantity() + change <= 0) {
            myCart.removeItem(productId);
        } else {
            myCart.addItem(item.getProduct(), change); // addItem adds to existing qty and updates UI
        }
    }
}

export function buyNow(productId: string): void {
    addToCart(productId);
    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) checkoutModal.classList.remove('hidden');
}

// export for html

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
        div.className = 'cart-item flex justify-between items-center mb-[20px] pb-[20px] border-b border-[#eee] dark:border-[#23332a] transition-colors duration-[400ms]';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4 class="m-0 mb-[5px] text-[1.1rem]">${item.getProduct().getName()} (x${item.getQuantity()})</h4>
                <p class="m-0 text-[0.9rem] text-[#666] dark:text-[#9bb3a6] transition-colors duration-[400ms]">₱${item.calcTotal().toFixed(2)}</p>
                <button class="remove-btn bg-none border-none text-[#d9534f] cursor-pointer text-[0.85rem] py-[5px] px-0 mt-[5px] font-semibold" onclick="removeFromCart('${item.getProduct().getProductId()}')">Remove</button>
            </div>
            <div class="qty-selector flex items-center border border-[#eaeaea] dark:border-[#23332a] rounded-[8px] p-0 mr-[10px] h-[36px] bg-[#f9f9f9] dark:bg-[#1e2a22] shrink-0">
                <button class="qty-btn bg-transparent border-none py-[5px] px-[12px] text-inherit min-w-auto m-0 text-[1.2rem] cursor-pointer shadow-none transform-none hover:bg-black/5 dark:hover:bg-white/10" onclick="updateCartQuantity('${item.getProduct().getProductId()}', -1)">-</button>
                <span class="qty-display px-[10px] font-semibold min-w-[20px] text-center text-[1.1rem]">${item.getQuantity()}</span>
                <button class="qty-btn bg-transparent border-none py-[5px] px-[12px] text-inherit min-w-auto m-0 text-[1.2rem] cursor-pointer shadow-none transform-none hover:bg-black/5 dark:hover:bg-white/10" onclick="updateCartQuantity('${item.getProduct().getProductId()}', 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });

    const discountSection = document.getElementById('token-discount-section');
    const useTokensCheckbox = document.getElementById('use-tokens-checkbox') as HTMLInputElement;
    const applicableTokensSpan = document.getElementById('applicable-tokens');
    const applicableDiscountSpan = document.getElementById('applicable-discount');
    
    let displayTotal = myCart.total;

    if (isLoggedIn && currentUserTokens > 0) {
        if (discountSection) discountSection.style.display = 'block';
        const applicableTokens = Math.min(currentUserTokens, Math.floor(myCart.total));
        
        if (applicableTokensSpan) applicableTokensSpan.textContent = applicableTokens.toString();
        if (applicableDiscountSpan) applicableDiscountSpan.textContent = applicableTokens.toString();
        
        if (isApplyingTokens && applicableTokens > 0) {
            if (useTokensCheckbox) useTokensCheckbox.checked = true;
            displayTotal = Math.max(0, myCart.total - applicableTokens);
        } else {
            isApplyingTokens = false;
            if (useTokensCheckbox) useTokensCheckbox.checked = false;
        }
    } else {
        if (discountSection) discountSection.style.display = 'none';
        isApplyingTokens = false;
        if (useTokensCheckbox) useTokensCheckbox.checked = false;
    }

    totalAmount.textContent = displayTotal.toFixed(2);
    const checkoutTotal = document.getElementById('checkout-total-amount');
    if (checkoutTotal) checkoutTotal.textContent = displayTotal.toFixed(2);
    
    const cartBadge = document.getElementById('cart-badge');
    if (cartBadge) {
        cartBadge.textContent = totalItems.toString();
        cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

export function toggleCart(): void {
    HapticSoundManager.playClick();
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

export function toggleTokens(): void {
    const cb = document.getElementById('use-tokens-checkbox') as HTMLInputElement;
    if (cb) {
        isApplyingTokens = cb.checked;
        updateCartUI();
    }
}
(window as any).toggleTokens = toggleTokens;

export function toggleZoeModal(): void {
    HapticSoundManager.playClick();
    const mainView = document.getElementById('main-scroll-view');
    const zoeView = document.getElementById('zoe-view');
    const triggerBtn = document.getElementById('zoe-trigger-btn');
    
    if (zoeView && mainView) {
        if (zoeView.classList.contains('hidden')) {
            // Open Zoe
            mainView.classList.add('hidden');
            zoeView.classList.remove('hidden');
            zoeView.classList.add('flex');
            document.body.classList.add('zoe-active');
            window.scrollTo(0, 0); // Jump to top so header is visible
            if (triggerBtn) triggerBtn.classList.add('hidden');
            
            // Reset pre-chats when reopened
            const preChats = document.getElementById('zoe-pre-chats');
            if (preChats) preChats.style.display = 'flex';

            if ((window as any).zoeGreet) {
                (window as any).zoeGreet();
            }
        } else {
            // Close Zoe
            zoeView.classList.add('hidden');
            zoeView.classList.remove('flex');
            document.body.classList.remove('zoe-active');
            mainView.classList.remove('hidden');
            if (triggerBtn) triggerBtn.classList.remove('hidden');
        }
    }
}
(window as any).toggleZoeModal = toggleZoeModal;

export function closeZoeAndScroll(id: string): void {
    const zoeView = document.getElementById('zoe-view');
    const storyView = document.getElementById('story-view');
    const mainView = document.getElementById('main-scroll-view');
    const triggerBtn = document.getElementById('zoe-trigger-btn');
    
    let viewsChanged = false;

    if (zoeView && !zoeView.classList.contains('hidden')) {
        zoeView.classList.add('hidden');
        zoeView.classList.remove('flex');
        document.body.classList.remove('zoe-active');
        viewsChanged = true;
    }

    if (storyView && !storyView.classList.contains('hidden')) {
        storyView.classList.add('hidden');
        viewsChanged = true;
    }

    if (viewsChanged) {
        if (mainView) mainView.classList.remove('hidden');
        if (triggerBtn) triggerBtn.classList.remove('hidden');
    }
    
    // Need a tiny timeout to let the browser unhide the main view before scrolling
    setTimeout(() => {
        const target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    }, 10);
}
(window as any).closeZoeAndScroll = closeZoeAndScroll;

export function toggleStoryView(): void {
    const storyView = document.getElementById('story-view');
    const mainView = document.getElementById('main-scroll-view');
    const zoeView = document.getElementById('zoe-view');
    const triggerBtn = document.getElementById('zoe-trigger-btn');
    
    if (storyView) {
        if (storyView.classList.contains('hidden')) {
            // Open Story View
            storyView.classList.remove('hidden');
            if (mainView) mainView.classList.add('hidden');
            if (zoeView) {
                zoeView.classList.add('hidden');
                zoeView.classList.remove('flex');
            }
            if (triggerBtn) triggerBtn.classList.add('hidden');
            document.body.classList.remove('zoe-active');
            window.scrollTo(0, 0); // scroll to top
        } else {
            // Close Story View
            storyView.classList.add('hidden');
            if (mainView) mainView.classList.remove('hidden');
            if (triggerBtn) triggerBtn.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    }
}
(window as any).toggleStoryView = toggleStoryView;

export function sendZoePreChat(text: string): void {
    const input = document.getElementById('zoe-input') as HTMLInputElement;
    const form = document.getElementById('zoe-form') as HTMLFormElement;
    if (input && form) {
        input.value = text;
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
}
(window as any).sendZoePreChat = sendZoePreChat;

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

export function showToast(message: string): void {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    
    // stop the timer so it doesnt glitch
    if ((window as any).toastTimeout) {
        clearTimeout((window as any).toastTimeout);
    }
    
    (window as any).toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

export let isLoggedIn = false;
export let currentUserTokens = 0;
export let isApplyingTokens = false;
export let currentUser: User = new GuestUser("GUEST_1", "Guest", "", "session_" + Date.now());

document.addEventListener('DOMContentLoaded', () => {
    ModeManager.applyTheme();
    loadProductsFromFirestore(); // Replaced renderProducts with async loader

    // (Removed old iOS WebP fallback block since we now use native WebM with black background trick)

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

    // changed to triple click instead of button
    
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    if (cartToggleBtn) cartToggleBtn.addEventListener('click', toggleCart);
    
    const closeCartBtn = document.getElementById('close-cart');
    if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
    
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const cancelCheckoutBtn = document.getElementById('cancel-checkout-btn');
    const checkoutForm = document.getElementById('checkout-form') as HTMLFormElement;

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (myCart.items.length === 0) {
                alert("Cart is empty!");
                return;
            }
            if (checkoutModal) checkoutModal.classList.remove('hidden');
        });
    }

    if (cancelCheckoutBtn) {
        cancelCheckoutBtn.addEventListener('click', () => {
            if (checkoutModal) checkoutModal.classList.add('hidden');
        });
    }

    // show or hide inputs based on choice
    const orderTypeRadios = document.querySelectorAll('input[name="orderType"]');
    orderTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = (e.target as HTMLInputElement).value;
            const dineinFields = document.getElementById('dinein-fields');
            const pickupFields = document.getElementById('pickup-fields');
            if (val === 'dinein') {
                if (dineinFields) dineinFields.style.display = 'block';
                if (pickupFields) pickupFields.style.display = 'none';
            } else {
                if (dineinFields) dineinFields.style.display = 'none';
                if (pickupFields) pickupFields.style.display = 'block';
            }
        });
    });

    let paypalButtonsRendered = false;

    const paymentTypeRadios = document.querySelectorAll('input[name="paymentType"]');
    paymentTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = (e.target as HTMLInputElement).value;
            const paypalFields = document.getElementById('paypal-fields');
            const confirmBtn = document.getElementById('confirm-checkout-btn');

            if (val === 'cash') {
                if (paypalFields) paypalFields.style.display = 'none';
                if (confirmBtn) confirmBtn.style.display = 'block';
            } else {
                if (paypalFields) paypalFields.style.display = 'block';
                if (confirmBtn) confirmBtn.style.display = 'none';

                if (!paypalButtonsRendered && (window as any).paypal) {
                    paypalButtonsRendered = true;
                    (window as any).paypal.Buttons({
                        createOrder: function(data: any, actions: any) {
                            let finalTotal = myCart.total;
                            if (isApplyingTokens) {
                                finalTotal = Math.max(0, finalTotal - currentUserTokens);
                            }
                            
                            return actions.order.create({
                                purchase_units: [{
                                    amount: {
                                        currency_code: 'PHP',
                                        value: finalTotal.toFixed(2)
                                    }
                                }]
                            });
                        },
                        onApprove: function(data: any, actions: any) {
                            return actions.order.capture().then(function(details: any) {
                                alert('Transaction completed by ' + details.payer.name.given_name);
                                
                                const checkoutForm = document.getElementById('checkout-form') as HTMLFormElement;
                                const formData = new FormData(checkoutForm);
                                const checkoutData = {
                                    orderType: formData.get('orderType') as string,
                                    tableNo: Math.floor(Math.random() * 50) + 1,
                                    guests: 1,
                                    pickupTime: (document.getElementById('pickup-time') as HTMLInputElement)?.value || '',
                                    paymentType: 'paypal',
                                    cashTender: 0,
                                    cardNo: details.id,
                                    downloadReceipt: (document.getElementById('download-receipt') as HTMLInputElement)?.checked || false
                                };
                                
                                myCart.finalizeCheckout(checkoutData).then(order => {
                                    if (order && checkoutData.orderType === 'pickup') {
                                        const qrModal = document.getElementById('qr-modal');
                                        const qrImage = document.getElementById('qr-image') as HTMLImageElement;
                                        if (qrModal && qrImage) {
                                            qrImage.src = (order as any).getQrCode();
                                            qrModal.classList.remove('hidden');
                                        }
                                    }
                                });
                                
                                const checkoutModal = document.getElementById('checkout-modal');
                                if (checkoutModal) checkoutModal.classList.add('hidden');
                            });
                        }
                    }).render('#paypal-button-container');
                }
            }
        });
    });

    const pickupTimeInput = document.getElementById('pickup-time') as HTMLInputElement;
    if (pickupTimeInput) {
        pickupTimeInput.addEventListener('click', () => {
            const now = new Date();
            const hours = ('0' + now.getHours()).slice(-2);
            const minutes = ('0' + now.getMinutes()).slice(-2);
            pickupTimeInput.min = `${hours}:${minutes}`;
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(checkoutForm);
            const data = {
                orderType: formData.get('orderType') as string,
                tableNo: Math.floor(Math.random() * 50) + 1,
                guests: 1,
                pickupTime: (document.getElementById('pickup-time') as HTMLInputElement)?.value || '',
                paymentType: formData.get('paymentType') as string,
                cashTender: myCart.total,
                cardNo: '',
                downloadReceipt: (document.getElementById('download-receipt') as HTMLInputElement)?.checked || false
            };
            
            myCart.finalizeCheckout(data).then(order => {
                if (order && data.orderType === 'pickup') {
                    const qrModal = document.getElementById('qr-modal');
                    const qrImage = document.getElementById('qr-image') as HTMLImageElement;
                    if (qrModal && qrImage) {
                        qrImage.src = (order as any).getQrCode();
                        qrModal.classList.remove('hidden');
                    }
                }
            });
            if (checkoutModal) checkoutModal.classList.add('hidden');
        });
    }

    // click logo 3 times to change theme
    let logoClicks = 0;
    let logoTimer: any;
    let isLocked = false;
    const logoContainer = document.querySelector('.logo') as HTMLElement;

    if (logoContainer) {
        logoContainer.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (isLocked) return;

            // make logo pulse
            logoContainer.style.scale = '0.9';
            setTimeout(() => {
                logoContainer.style.scale = '1';
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

    // shake to change theme (ios needs click first)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        document.body.addEventListener('click', function req() {
            // fix video autoplay on iphone
            const video = document.getElementById('hero-video') as HTMLVideoElement;
            if (video) {
                video.play().catch(() => {
                    // ignore if low power mode
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

    let zoeState = 'initial'; // initial, asked_suggest, suggesting
    let zoeSuggestedProductNames: string[] = [];
    let typingInterval: any = null;

    // Helper for talking video
    let isTalkingVidPlaying = false;
    function startTalkingVid() {
        if (isTalkingVidPlaying) return;
        isTalkingVidPlaying = true;
        const talkingVid = document.getElementById('zoe-vid-talking') as HTMLVideoElement;
        const idleVid = document.getElementById('zoe-vid-idle') as HTMLVideoElement;
        const greetingVid = document.getElementById('zoe-vid-greeting') as HTMLVideoElement;
        const thinkingVid = document.getElementById('zoe-vid-thinking') as HTMLVideoElement;
        if (talkingVid && idleVid) {
            talkingVid.currentTime = 0;
            talkingVid.play().catch(e => console.error(e));
            
            const onPlay = () => {
                talkingVid.style.opacity = '1';
                idleVid.style.opacity = '0';
                if (greetingVid) greetingVid.style.opacity = '0';
                if (thinkingVid) thinkingVid.style.opacity = '0';
                talkingVid.removeEventListener('timeupdate', onPlay);
            };
            talkingVid.addEventListener('timeupdate', onPlay);
            
            const loopCheck = () => {
                if (talkingVid.currentTime >= 7.12) {
                    talkingVid.currentTime = 0;
                }
            };
            talkingVid.addEventListener('timeupdate', loopCheck);
            (talkingVid as any).loopCheck = loopCheck;
        }
    }

    function stopTalkingVid() {
        if (!isTalkingVidPlaying) return;
        isTalkingVidPlaying = false;
        const talkingVid = document.getElementById('zoe-vid-talking') as HTMLVideoElement;
        const idleVid = document.getElementById('zoe-vid-idle') as HTMLVideoElement;
        const thinkingVid = document.getElementById('zoe-vid-thinking') as HTMLVideoElement;
        if (talkingVid && idleVid) {
            if ((talkingVid as any).loopCheck) {
                talkingVid.removeEventListener('timeupdate', (talkingVid as any).loopCheck);
            }
            if (zoeState === 'asked_suggest' && thinkingVid) {
                thinkingVid.style.opacity = '1';
                idleVid.style.opacity = '0';
            } else {
                idleVid.style.opacity = '1';
                if (thinkingVid) thinkingVid.style.opacity = '0';
            }
            talkingVid.style.opacity = '0';
            talkingVid.pause();
        }
    }

    let currentTypingInterval: any = null;
    let stopTalkingVidTimeout: any = null;
    function typeTextEffect(element: HTMLElement, html: string, callback?: () => void, preventTalkingAnim = false, useThinkingAnim = false) {
        if (currentTypingInterval) {
            clearInterval(currentTypingInterval);
        }
        if (stopTalkingVidTimeout) {
            clearTimeout(stopTalkingVidTimeout);
            stopTalkingVidTimeout = null;
        }
        element.innerHTML = '';
        
        if (useThinkingAnim) {
            const talkingVid = document.getElementById('zoe-vid-talking') as HTMLVideoElement;
            const idleVid = document.getElementById('zoe-vid-idle') as HTMLVideoElement;
            const thinkingVid = document.getElementById('zoe-vid-thinking') as HTMLVideoElement;
            if (isTalkingVidPlaying) {
                isTalkingVidPlaying = false;
                if (talkingVid) {
                    if ((talkingVid as any).loopCheck) {
                        talkingVid.removeEventListener('timeupdate', (talkingVid as any).loopCheck);
                    }
                    talkingVid.pause();
                }
            }
            if (thinkingVid) thinkingVid.style.opacity = '1';
            if (idleVid) idleVid.style.opacity = '0';
            if (talkingVid) talkingVid.style.opacity = '0';
        } else if (!preventTalkingAnim) {
            startTalkingVid();
        }
        
        // Split html by <br> only
        const tokens = html.split(/(<br\s*\/?>)/i);

        let tokenIndex = 0;
        let charIndex = 0;
        currentTypingInterval = setInterval(() => {
            if (tokenIndex >= tokens.length) {
                clearInterval(currentTypingInterval);
                currentTypingInterval = null;
                if (!preventTalkingAnim && !useThinkingAnim) {
                    stopTalkingVidTimeout = setTimeout(() => {
                        stopTalkingVid();
                        stopTalkingVidTimeout = null;
                    }, 500);
                }
                if (callback) callback();
                return;
            }
            
            const currentToken = tokens[tokenIndex];
            
            if (currentToken.toLowerCase().startsWith('<br')) {
                element.innerHTML += currentToken;
                tokenIndex++;
            } else {
                if (charIndex < currentToken.length) {
                    element.innerHTML += currentToken[charIndex];
                    charIndex++;
                    // Scroll to bottom as it types
                    const parentBubble = element.parentElement;
                    if (parentBubble) parentBubble.scrollTop = parentBubble.scrollHeight;
                } else {
                    charIndex = 0;
                    tokenIndex++;
                }
            }
        }, 40); // Adjust typing speed here
    }

    let hasGreeted = false;
    (window as any).zoeGreet = function() {
        if (hasGreeted) return;
        hasGreeted = true;

        const zoeAiBubble = document.getElementById('zoe-ai-bubble');
        const zoeAiText = document.getElementById('zoe-ai-text');
        const typingIndicator = document.getElementById('zoe-typing');
        const zoeCharacterContainer = document.getElementById('zoe-character-container');
        const zoeCharacter = document.getElementById('zoe-character-placeholder');

        if (zoeCharacterContainer) {
            zoeCharacterContainer.classList.remove('bottom-[0px]');
            zoeCharacterContainer.classList.add('bottom-[0px]');
        }
        if (zoeAiBubble) {
            zoeAiBubble.classList.remove('opacity-0');
            zoeAiBubble.classList.add('opacity-100');
        }

        // Handle Video Greeting
        const idleVid = document.getElementById('zoe-vid-idle') as HTMLVideoElement;
        const greetingVid = document.getElementById('zoe-vid-greeting') as HTMLVideoElement;
        
        let waitTimeForText = 3500;

        if (idleVid && greetingVid) {
            greetingVid.currentTime = 0;
            greetingVid.play().catch(e => console.error("Video play blocked:", e));
            
            // Wait for the very first frame to actually render on screen before hiding the old video!
            const onPlay = () => {
                greetingVid.style.opacity = '1';
                idleVid.style.opacity = '0';
                greetingVid.removeEventListener('timeupdate', onPlay);
            };
            greetingVid.addEventListener('timeupdate', onPlay);
            
            // After video ends (8 seconds), revert to Idle video and enable chat
            setTimeout(() => {
                idleVid.style.opacity = '1';
                greetingVid.style.opacity = '0';
                
                // Enable inputs
                const zoeInput = document.getElementById('zoe-input') as HTMLInputElement;
                const zoeSubmitBtn = document.getElementById('zoe-submit-btn') as HTMLButtonElement;
                const preChats = document.getElementById('zoe-pre-chats');
                
                if (zoeInput) {
                    zoeInput.disabled = false;
                    zoeInput.placeholder = "Ask Zo something...";
                }
                if (zoeSubmitBtn) zoeSubmitBtn.disabled = false;
                
                if (preChats) {
                    preChats.classList.remove('opacity-0', 'pointer-events-none');
                    preChats.classList.add('opacity-100');
                    const preChatBtns = preChats.querySelectorAll('button');
                    preChatBtns.forEach(btn => btn.disabled = false);
                }
            }, 8000);
        }

        if (typingIndicator) {
            typingIndicator.classList.remove('hidden');
            if (zoeCharacter) zoeCharacter.classList.add('talking');
            
            setTimeout(() => {
                if (zoeCharacter) zoeCharacter.classList.remove('talking');
                typingIndicator.classList.add('hidden');
                if (zoeAiText) {
                    zoeAiText.classList.remove('hidden');
                    typeTextEffect(zoeAiText, "Hey, I'm Zo! Your AI bartender for Enzomnia! How can I help you today, man?", undefined, true);
                }
            }, waitTimeForText);
        }
    };
    
    const closeSuggestionsBtn = document.getElementById('close-suggestions-btn');
    if (closeSuggestionsBtn) {
        closeSuggestionsBtn.addEventListener('click', () => {
            const zoeSuggestions = document.getElementById('zoe-suggestions');
            const zoeCharacterContainer = document.getElementById('zoe-character-container');
            if (zoeSuggestions) {
                zoeSuggestions.classList.add('hidden');
                zoeSuggestions.classList.remove('animate-popup');
            }
            if (zoeCharacterContainer) {
                zoeCharacterContainer.classList.remove('bottom-[-180px]');
                zoeCharacterContainer.classList.add('bottom-[0px]');
            }
            zoeState = 'initial'; // Reset state so she can suggest again
        });
    }

    const zoeForm = document.getElementById('zoe-form') as HTMLFormElement;
    if (zoeForm) {
        zoeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const zoeInput = document.getElementById('zoe-input') as HTMLInputElement;
            const zoeHistoryContainer = document.getElementById('zoe-history-container');
            const zoeAiBubble = document.getElementById('zoe-ai-bubble');
            const zoeAiText = document.getElementById('zoe-ai-text');
            const zoeSuggestions = document.getElementById('zoe-suggestions');
            const zoeSuggestionCards = document.getElementById('zoe-suggestion-cards');
            const zoeCharacter = document.getElementById('zoe-character-placeholder');
            const zoeCharacterContainer = document.getElementById('zoe-character-container');
            const typingIndicator = document.getElementById('zoe-typing');

            const textValue = zoeInput.value.trim();
            if (textValue === '') return;
            
            const lowerText = textValue.toLowerCase();

            // Hide pre-chats once user types something
            const preChats = document.getElementById('zoe-pre-chats');
            if (preChats) {
                preChats.classList.remove('opacity-100');
                preChats.classList.add('opacity-0', 'pointer-events-none');
            }

            // 1. Hide suggestions and center the character
            if (zoeSuggestions) {
                zoeSuggestions.classList.add('hidden');
                zoeSuggestions.classList.remove('animate-popup');
            }
            if (zoeCharacterContainer) {
                zoeCharacterContainer.classList.remove('bottom-[-180px]');
                zoeCharacterContainer.classList.add('bottom-[0px]');
            }

            // 2. Add User Message to History
            if (zoeHistoryContainer) {
                const newMsg = document.createElement('div');
                newMsg.className = 'w-max max-w-full opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]';
                newMsg.innerHTML = `
                    <div class="text-[0.55rem] font-extrabold text-[#1e3932]/60 dark:text-[#9bb3a6]/60 uppercase tracking-[0.2em] mb-[6px] ml-[8px]">You</div>
                    <div class="bg-white/80 dark:bg-[#1a251e]/80 backdrop-blur-xl border border-white/80 dark:border-white/10 px-[16px] py-[12px] rounded-[24px] rounded-bl-[8px] text-[0.9rem] font-medium text-[#222] dark:text-[#eaf4f0] shadow-[0_8px_20px_rgba(0,0,0,0.06)] relative zoe-speech-left inline-block leading-relaxed">
                        <span>${textValue}</span>
                    </div>
                `;
                zoeHistoryContainer.appendChild(newMsg);
                zoeHistoryContainer.scrollTop = zoeHistoryContainer.scrollHeight;
            }
            
            zoeInput.value = '';

            // 3. Show AI typing indicator
            if (zoeAiBubble) {
                zoeAiBubble.classList.remove('opacity-0');
                zoeAiBubble.classList.add('opacity-100');
            }
            if (typingIndicator) typingIndicator.classList.remove('hidden');
            if (zoeAiText) zoeAiText.classList.add('hidden');
            if (zoeCharacter) zoeCharacter.classList.remove('talking');
            
            const idleVid = document.getElementById('zoe-vid-idle') as HTMLVideoElement;
            const talkingVid = document.getElementById('zoe-vid-talking') as HTMLVideoElement;
            const thinkingVid = document.getElementById('zoe-vid-thinking') as HTMLVideoElement;
            if (thinkingVid) thinkingVid.style.opacity = '1';
            if (idleVid) idleVid.style.opacity = '0';
            if (talkingVid) {
                talkingVid.style.opacity = '0';
                talkingVid.pause();
                isTalkingVidPlaying = false;
            }

            // 4. AI Response Logic
            const apiKeys = [
                import.meta.env.VITE_GEMINI_API_KEY,
                import.meta.env.VITE_GEMINI_API_KEY_BACKUP
            ].filter(Boolean);
            const hasApiKey = apiKeys.length > 0;
            
            // Check if user is agreeing to a suggestion prompt
            const agreedWords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please', 'do it'];
            const isAgreed = agreedWords.some(word => lowerText.includes(word));
            const isAskingAboutEnzomnia = lowerText.includes('what is enzomnia') || lowerText.includes('enzomnia');

            if (zoeState === 'asked_suggest' && isAgreed) {
                if (typingIndicator) typingIndicator.classList.add('hidden');
                
                if (zoeAiText) {
                    zoeAiText.classList.remove('hidden');
                    if (zoeCharacter) zoeCharacter.classList.add('talking');
                    typeTextEffect(zoeAiText, "Awesome! Here are my top picks for you!", () => {
                        zoeState = 'suggesting';

                        // 5. Drop character down and show suggestions
                        setTimeout(() => {
                            if (zoeCharacterContainer) {
                                zoeCharacterContainer.classList.remove('bottom-[0px]');
                                zoeCharacterContainer.classList.add('bottom-[-180px]');
                            }
                            
                            setTimeout(() => {
                                if (zoeSuggestions && zoeSuggestionCards) {
                                    zoeSuggestions.classList.remove('hidden');
                                    // Force reflow to restart animation
                                    void zoeSuggestions.offsetWidth;
                                    zoeSuggestions.classList.add('animate-popup');
                                    
                                    let suggestions: any[] = [];
                                    if (zoeSuggestedProductNames.length > 0) {
                                        suggestions = allProducts.filter(p => zoeSuggestedProductNames.includes(p.getName().toLowerCase()));
                                    }
                                    
                                    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
                                    for (const p of shuffled) {
                                        if (suggestions.length >= 3) break;
                                        if (!suggestions.includes(p)) suggestions.push(p);
                                    }
                                    
                                    const numSuggestions = Math.min(3, allProducts.length);
                                    suggestions = suggestions.slice(0, numSuggestions);
                                    
                                    zoeSuggestionCards.innerHTML = '';
                                    const isMobile = window.innerWidth < 768;
                                    const spread = isMobile ? '95%' : '155%';
                                    
                                    suggestions.forEach((prod, index) => {
                                        const card = document.createElement('div');
                                        
                                        card.className = 'absolute w-[130px] bg-white/90 dark:bg-[#23332a]/90 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-[16px] p-[12px] pb-[16px] flex flex-col items-center text-center shadow-[0_15px_35px_rgba(0,0,0,0.15)] cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] hover:!scale-[1.15] hover:!z-50 pointer-events-auto';
                                        
                                        if (suggestions.length === 3) {
                                            if (index === 0) {
                                                card.style.transform = `translateX(-${spread}) rotateY(15deg) scale(0.9)`;
                                                card.style.zIndex = '10';
                                                card.style.opacity = '0.7';
                                            } else if (index === 1) {
                                                card.style.transform = 'translateZ(40px) scale(1.05)';
                                                card.style.zIndex = '30';
                                                card.style.opacity = '1';
                                            } else if (index === 2) {
                                                card.style.transform = `translateX(${spread}) rotateY(-15deg) scale(0.9)`;
                                                card.style.zIndex = '10';
                                                card.style.opacity = '0.7';
                                            }
                                        } else {
                                            card.style.position = 'relative';
                                            card.style.margin = '0 10px';
                                        }
                                        
                                        card.addEventListener('mouseenter', () => {
                                            Array.from(zoeSuggestionCards.children).forEach((c: any, i) => {
                                                if (c !== card) {
                                                    c.style.opacity = '0.4';
                                                    c.style.filter = 'blur(2px)';
                                                    c.style.zIndex = '5';
                                                }
                                            });
                                            card.style.opacity = '1';
                                            card.style.filter = 'blur(0)';
                                            card.style.zIndex = '50';
                                            
                                            // Keep its position but pop it out
                                            if (suggestions.length === 3) {
                                                if (index === 0) card.style.transform = `translateX(-${spread}) translateZ(60px) scale(1.1)`;
                                                if (index === 1) card.style.transform = 'translateZ(80px) scale(1.15)';
                                                if (index === 2) card.style.transform = `translateX(${spread}) translateZ(60px) scale(1.1)`;
                                            } else {
                                                card.style.transform = 'translateZ(60px) scale(1.15)';
                                            }
                                        });
                                        card.addEventListener('mouseleave', () => {
                                            Array.from(zoeSuggestionCards.children).forEach((c: any, i) => {
                                                c.style.filter = 'blur(0)';
                                                if (suggestions.length === 3) {
                                                    if (i === 0) { c.style.transform = `translateX(-${spread}) rotateY(15deg) scale(0.9)`; c.style.opacity = '0.7'; c.style.zIndex = '10'; }
                                                    if (i === 1) { c.style.transform = 'translateZ(40px) scale(1.05)'; c.style.opacity = '1'; c.style.zIndex = '30'; }
                                                    if (i === 2) { c.style.transform = `translateX(${spread}) rotateY(-15deg) scale(0.9)`; c.style.opacity = '0.7'; c.style.zIndex = '10'; }
                                                }
                                            });
                                        });

                                        let labelHtml = '';
                                        if (typeof (prod as any).getIsHot === 'function') {
                                            const isHot = (prod as any).getIsHot();
                                            labelHtml = `<span class="absolute top-[-8px] right-[-5px] bg-[#1e3932] dark:bg-[#3bbd81] text-white text-[0.55rem] font-bold uppercase tracking-wider px-[6px] py-[2px] rounded-full shadow-sm z-10">${isHot ? 'Hot' : 'Cold'}</span>`;
                                        } else if (typeof (prod as any).getDietType === 'function') {
                                            const dietType = (prod as any).getDietType();
                                            if (dietType) {
                                                labelHtml = `<span class="absolute top-[-8px] right-[-5px] bg-[#d68a27] text-white text-[0.55rem] font-bold uppercase tracking-wider px-[6px] py-[2px] rounded-full shadow-sm z-10">${dietType}</span>`;
                                            }
                                        }

                                        card.innerHTML = `
                                            ${labelHtml}
                                            <img src="${prod.getImage()}" class="w-[60px] h-[60px] object-contain mb-[8px] drop-shadow-md relative z-0">
                                            <span class="text-[0.75rem] font-bold text-[#1e3932] dark:text-[#eaf4f0] line-clamp-1 w-full overflow-hidden text-ellipsis whitespace-nowrap mb-[2px]" title="${prod.getName()}">${prod.getName()}</span>
                                            <span class="text-[0.8rem] text-[#d68a27] dark:text-[#3bbd81] font-extrabold tracking-wider">₱${prod.getPrice().toFixed(2)}</span>
                                            <div class="absolute bottom-[-15px] bg-[#1e3932] dark:bg-[#3bbd81] text-white text-[0.6rem] font-bold uppercase tracking-widest px-[10px] py-[4px] rounded-full shadow-md opacity-0 transition-opacity duration-300 card-btn z-10">Add</div>
                                        `;
                                        
                                        const style = document.createElement('style');
                                        style.innerHTML = `div:hover > .card-btn { opacity: 1 !important; transform: translateY(-5px); }`;
                                        card.appendChild(style);

                                        card.onclick = () => {
                                            addToCart(prod.getProductId());
                                            showToast(`Added ${prod.getName()} to cart`);
                                        };
                                        zoeSuggestionCards.appendChild(card);
                                    });
                                }
                            }, 800); // Wait for character to move down before popping up suggestions
                        }, 500); // Small pause after typing before dropping down
                    });
                }
            } else if (hasApiKey) {
                // Call Gemini API
                try {
                    const menuItems = allProducts.map(p => p.getName()).join(', ');
                    const systemPrompt = `You are Zo, the cool, casual AI Bartender for Enzomnia Cafe. 
You can joke around, flirt casually, and provide friendly conversation about Enzomnia Cafe and our menu. Use modern slang naturally (e.g. 'vibes', 'fr', 'no cap', 'sheesh', 'bet') but DO NOT use 'bro' or 'dude'. 
CRITICAL RULES:
1. NEVER break character. You are an AI Bartender named Zo. Do not say you are "Gen Z".
2. NEVER write code, solve math, or discuss highly technical topics. However, casual conversation, jokes, and playful flirting are totally fine!
3. Our actual menu items are: ${menuItems}. NEVER mention drinks outside this list.
4. Keep your replies EXTREMELY straightforward and short (1-2 sentences max).
5. If the user hasn't shared their mood/needs, actively ask for it by giving them specific options (e.g. "Are you looking for a morning boost, a chill evening vibe, or something refreshing?"). If they already shared their mood/needs, SKIP asking and IMMEDIATELY offer a suggestion by ending your response EXACTLY with: 'Would you like me to suggest a product?'.
6. WHENEVER you use the phrase 'Would you like me to suggest a product?', you MUST secretly append your top 3 recommended menu items inside a <suggest> tag at the very end of your response. Example: "You need a boost! Would you like me to suggest a product? <suggest>Espresso, Caramel Macchiato, Americano</suggest>"`;
                    const requestBody = {
                        system_instruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ role: "user", parts: [{ text: textValue }] }],
                        generationConfig: { temperature: 0.8, maxOutputTokens: 1000 }
                    };
                    
                    let data: any = null;
                    let lastError: any = null;
                    
                    for (const currentKey of apiKeys) {
                        const maxRetries = 2; // Reduce retries so it switches to the next key faster
                        for (let attempt = 0; attempt < maxRetries; attempt++) {
                            try {
                                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(requestBody)
                                });
                                
                                const result = await response.json();
                                
                                if (response.ok) {
                                    data = result;
                                    break;
                                } else if (response.status === 429 && attempt < maxRetries - 1) {
                                    // Rate limited — wait and retry this key once
                                    const delay = Math.pow(2, attempt + 1) * 1000;
                                    console.warn(`Rate limited (429). Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
                                    await new Promise(r => setTimeout(r, delay));
                                } else {
                                    console.error("Gemini API HTTP Error with key:", response.status, result);
                                    lastError = new Error(result.error?.message || `HTTP ${response.status}`);
                                    break; // Break retry loop, move to next key
                                }
                            } catch (err: any) {
                                lastError = err;
                                break; // Break retry loop on network error, move to next key
                            }
                        }
                        if (data) break; // Success! Don't try the next key
                    }
                    
                    if (!data) {
                        const groqKey = import.meta.env.VITE_GROQ_API_KEY;
                        if (groqKey) {
                            console.warn("Gemini failed, falling back to Groq API...");
                            const groqMessages = [
                                { role: 'system', content: systemPrompt },
                                { role: 'assistant', content: 'Got it. I am Zo, ready to serve!' },
                                { role: 'user', content: textValue }
                            ];
                            
                            try {
                                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${groqKey}`
                                    },
                                    body: JSON.stringify({
                                        model: 'llama-3.1-8b-instant',
                                        messages: groqMessages
                                    })
                                });
                                
                                const groqResult = await groqRes.json();
                                if (groqRes.ok && groqResult.choices && groqResult.choices[0]) {
                                    data = {
                                        candidates: [
                                            { content: { parts: [{ text: groqResult.choices[0].message.content }] } }
                                        ]
                                    };
                                } else {
                                    console.error("Groq API Error:", groqResult);
                                    lastError = new Error(groqResult.error?.message || `Groq HTTP ${groqRes.status}`);
                                }
                            } catch (groqErr: any) {
                                console.error("Groq Network Error:", groqErr);
                                lastError = groqErr;
                            }
                        }
                    }

                    if (!data) {
                        const mistralKey = import.meta.env.VITE_MISTRAL_API_KEY;
                        if (mistralKey) {
                            console.warn("Groq/Gemini failed, falling back to Mistral API...");
                            const mistralMessages = [
                                { role: 'system', content: systemPrompt },
                                { role: 'assistant', content: 'Got it. I am Zo, ready to serve!' },
                                { role: 'user', content: textValue }
                            ];
                            
                            try {
                                const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${mistralKey}`
                                    },
                                    body: JSON.stringify({
                                        model: 'mistral-small-latest',
                                        messages: mistralMessages
                                    })
                                });
                                
                                const mistralResult = await mistralRes.json();
                                if (mistralRes.ok && mistralResult.choices && mistralResult.choices[0]) {
                                    data = {
                                        candidates: [
                                            { content: { parts: [{ text: mistralResult.choices[0].message.content }] } }
                                        ]
                                    };
                                } else {
                                    console.error("Mistral API Error:", mistralResult);
                                    lastError = new Error(mistralResult.error?.message || `Mistral HTTP ${mistralRes.status}`);
                                }
                            } catch (mistralErr: any) {
                                console.error("Mistral Network Error:", mistralErr);
                                lastError = mistralErr;
                            }
                        }
                    }

                    if (!data) {
                        throw lastError || new Error("Failed after all retries and fallbacks");
                    }
                    
                    // Hide the typing indicator (bouncing dots) but KEEP character talking while typing
                    if (typingIndicator) typingIndicator.classList.add('hidden');
                    
                    if (data.candidates && data.candidates[0].content) {
                        let aiResponse = data.candidates[0].content.parts[0].text;
                        
                        // Strip out <think> blocks if any
                        aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                        
                        // Extract <suggest> tags
                        const suggestMatch = aiResponse.match(/<suggest>(.*?)<\/suggest>/i);
                        if (suggestMatch) {
                            zoeSuggestedProductNames = suggestMatch[1].split(',').map((s: string) => s.trim().toLowerCase());
                            aiResponse = aiResponse.replace(/<suggest>[\s\S]*?<\/suggest>/gi, '').trim();
                        }
                        
                        aiResponse = aiResponse.replace(/\n/g, '<br>');
                        
                        if (zoeAiText) {
                            zoeAiText.classList.remove('hidden');
                            const isSuggest = aiResponse.toLowerCase().includes('suggest a product');
                            
                            // To guarantee it doesn't name a product early as requested, if it's a suggestion prompt, we force it to be simple.
                            if (isSuggest) {
                                // If there are sentences before the question, we could keep them, but to be strictly safe per user request:
                                aiResponse = "I've got just the thing! Would you like me to suggest a product?";
                            }
                            if (zoeCharacter) {
                                if (isSuggest) {
                                    zoeCharacter.classList.remove('talking');
                                } else {
                                    zoeCharacter.classList.add('talking');
                                }
                            }
                            typeTextEffect(zoeAiText, aiResponse, () => {
                                // Stop talking animation when typing finishes
                                if (zoeCharacter) zoeCharacter.classList.remove('talking');
                                
                                if (isSuggest) {
                                    zoeState = 'asked_suggest';
                                    const preChats = document.getElementById('zoe-pre-chats');
                                    if (preChats) {
                                        preChats.innerHTML = `
                                            <button type="button" class="bg-white/80 dark:bg-[#1a251e]/80 backdrop-blur-md border border-black/10 dark:border-white/10 px-[12px] md:px-[16px] py-[6px] md:py-[8px] rounded-full text-[0.75rem] md:text-[0.85rem] font-semibold text-[#1e3932] dark:text-[#eaf4f0] shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] transition-transform cursor-pointer" onclick="sendZoePreChat('Yes')">Yes, please!</button>
                                            <button type="button" class="bg-white/80 dark:bg-[#1a251e]/80 backdrop-blur-md border border-black/10 dark:border-white/10 px-[12px] md:px-[16px] py-[6px] md:py-[8px] rounded-full text-[0.75rem] md:text-[0.85rem] font-semibold text-[#1e3932] dark:text-[#eaf4f0] shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] transition-transform cursor-pointer" onclick="sendZoePreChat('No')">No thanks</button>
                                        `;
                                        preChats.classList.remove('opacity-0', 'pointer-events-none');
                                    }
                                } else {
                                    zoeState = 'initial';
                                    const preChats = document.getElementById('zoe-pre-chats');
                                    if (preChats) {
                                        preChats.classList.add('opacity-0', 'pointer-events-none');
                                    }
                                }
                            }, false, isSuggest);
                        }
                    } else {
                        throw new Error("Invalid response");
                    }
                } catch (e: any) {
                    console.error("Gemini API Error:", e);
                    if (zoeCharacter) zoeCharacter.classList.remove('talking');
                    if (typingIndicator) typingIndicator.classList.add('hidden');
                    if (zoeAiText) {
                        zoeAiText.classList.remove('hidden');
                        if (zoeCharacter) zoeCharacter.classList.remove('talking');
                        const errorMsg = e instanceof Error ? e.message : String(e);
                        
                        let displayMsg = "Oops, I'm having trouble connecting right now! (" + errorMsg + ") Would you like me to suggest a product anyway?";
                        if (errorMsg.includes('429')) {
                            displayMsg = "Woah, we're chatting too fast! We just hit the Google API rate limit (max 15 messages per minute on the free tier). Give me about 60 seconds to catch my breath, but would you like me to suggest a product in the meantime?";
                        }
                        
                        typeTextEffect(zoeAiText, displayMsg, () => {
                            zoeState = 'asked_suggest';
                        }, false, true);
                    }
                }
            } else {
                // Fallback Mock Logic if no API key
                setTimeout(() => {
                    if (zoeCharacter) zoeCharacter.classList.remove('talking');
                    if (typingIndicator) typingIndicator.classList.add('hidden');
                    
                    if (isAskingAboutEnzomnia) {
                        if (zoeAiText) {
                            zoeAiText.classList.remove('hidden');
                            if (zoeCharacter) zoeCharacter.classList.remove('talking');
                            typeTextEffect(zoeAiText, "Enzomnia is a revolutionary cafe that seamlessly blends daytime energy with nighttime relaxation through our dynamic Day & Night modes!<br><br>Would you like me to suggest a product?", () => {
                                zoeState = 'asked_suggest';
                            }, false, true);
                        }
                    } else {
                        if (zoeAiText) {
                            zoeAiText.classList.remove('hidden');
                            if (zoeCharacter) zoeCharacter.classList.remove('talking');
                            typeTextEffect(zoeAiText, "Hmm, I see! Would you like me to suggest you a product?", () => {
                                zoeState = 'asked_suggest';
                            }, false, true);
                        }
                    }
                }, 1000);
            }
        });
    }

    let tokenUnsub: (() => void) | null = null;

    // check if user is logged in
    onAuthStateChanged(auth, async (user) => {
        const displayImg = document.getElementById('display-img') as HTMLImageElement;
        const defaultIcon = document.getElementById('default-user-icon');
        const authLabel = document.getElementById('auth-label');
        const logoutBtn = document.getElementById('logout-btn');
        const tokenPromo = document.getElementById('token-promo');

        if (user) {
            isLoggedIn = true;
            currentUser = new RegisteredUser(user.uid, user.displayName || "User", user.email || "", "Day");
            
            if (logoutBtn) logoutBtn.style.display = 'inline';
            if (tokenPromo) tokenPromo.style.display = 'none';

            if (displayImg && user.photoURL && defaultIcon) {
                displayImg.src = user.photoURL;
                displayImg.style.display = 'block';
                defaultIcon.style.display = 'none';
                displayImg.classList.add('logged-in');
            }

            // get user data from db
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    name: user.displayName,
                    email: user.email,
                    tokens: 0
                });
            } else {
                // make sure token field exists
                if (userSnap.data().tokens === undefined) {
                    await setDoc(userRef, { tokens: 0 }, { merge: true });
                }
            }

            // update tokens when it changes
            tokenUnsub = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists() && authLabel) {
                    const data = docSnap.data();
                    currentUserTokens = data.tokens || 0;
                    authLabel.textContent = `Tokens: ${currentUserTokens}`;
                    
                    const popupTokens = document.getElementById('popup-tokens');
                    if (popupTokens) popupTokens.textContent = currentUserTokens.toString();
                    
                    updateCartUI();
                }
            });

        } else {
            isLoggedIn = false;
            currentUser = new GuestUser("GUEST_1", "Guest", "", "session_" + Date.now());
            currentUserTokens = 0;
            isApplyingTokens = false;
            updateCartUI();
            
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (tokenPromo) tokenPromo.style.display = 'block';

            if (tokenUnsub) {
                tokenUnsub();
                tokenUnsub = null;
            }
            if (displayImg && defaultIcon) {
                displayImg.src = "";
                displayImg.style.display = 'none';
                defaultIcon.style.display = 'block';
                displayImg.classList.remove('logged-in');
            }
            if (authLabel) {
                authLabel.textContent = 'Login';
            }
        }
    });
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

export async function handleLogin(): Promise<void> {
    if (!isLoggedIn) {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    }
}

export async function handleLogout(): Promise<void> {
    if (isLoggedIn) {
        try {
            await signOut(auth);
            const popup = document.getElementById('profile-popup');
            if (popup) popup.classList.add('hidden');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }
}

export function handleProfileClick(): void {
    if (!isLoggedIn) {
        handleLogin();
    } else {
        if (window.innerWidth <= 640) {
            const popup = document.getElementById('profile-popup');
            if (popup) {
                if (popup.classList.contains('hidden')) {
                    popup.classList.remove('hidden');
                    popup.style.display = 'flex';
                } else {
                    popup.classList.add('hidden');
                    popup.style.display = 'none';
                }
            }
        }
    }
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

// smooth scrolling
const lenis = new (window as any).Lenis();

function raf(time: number): void {
    lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// export functions for html
(window as any).renderProducts = renderProducts;
(window as any).addToCart = addToCart;
(window as any).buyNow = buyNow;
(window as any).removeFromCart = removeFromCart;
(window as any).updateCartQuantity = updateCartQuantity;
(window as any).toggleCart = toggleCart;
(window as any).updateCartUI = updateCartUI;
(window as any).showModal = showModal;
(window as any).handleLogin = handleLogin;
(window as any).handleLogout = handleLogout;
(window as any).handleProfileClick = handleProfileClick;
 
// Magical AI Button Appearance after 10 seconds
setTimeout(() => {
    const triggerBtn = document.getElementById('zoe-trigger-btn');
    if (triggerBtn) {
        triggerBtn.classList.remove('opacity-0', 'translate-y-[50px]', 'scale-50', 'pointer-events-none');
    }
}, 10000);
