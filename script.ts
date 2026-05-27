import { Product, Beverage, FoodItem } from './classes/Product';
import { Cart } from './classes/Cart';
import { ModeManager } from './classes/ModeManager';
import { User, GuestUser, RegisteredUser } from './classes/User';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, setDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';

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
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'Beverage') {
                allProducts.push(new Beverage(data.id, data.name, data.price, data.mode, data.stock, data.image, data.size, data.isHot));
            } else {
                allProducts.push(new FoodItem(data.id, data.name, data.price, data.mode, data.stock, data.image, data.dietType));
            }
        });
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
            <div class="item-img-container relative w-full -mt-[90px] flex justify-center items-end mb-[15px]">
                <img src="${product.getImage()}" alt="${product.getName()}" class="h-[180px] w-auto max-w-full object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.15)] transition-transform duration-400 z-[2] group-hover:-translate-y-[10px] group-hover:scale-105">
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
export let currentUser: User = new GuestUser("GUEST_1", "Guest", "", "", "session_" + Date.now());

document.addEventListener('DOMContentLoaded', () => {
    ModeManager.applyTheme();
    loadProductsFromFirestore(); // Replaced renderProducts with async loader

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
                                
                                myCart.finalizeCheckout(checkoutData);
                                
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
            
            myCart.finalizeCheckout(data);
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
            currentUser = new RegisteredUser(user.uid, user.displayName || "User", user.email || "", "", "Day");
            
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
            currentUser = new GuestUser("GUEST_1", "Guest", "", "", "session_" + Date.now());
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
 
