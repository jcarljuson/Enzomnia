import { Product, Beverage, FoodItem } from './Product';
import { DineInOrder } from './Order';
import { CashPayment } from './Payment';
import { ModeManager } from './ModeManager';

// Define globally used functions to avoid compilation errors if they are not yet defined
declare function updateCartUI(): void;
declare function toggleCart(): void;

export class CartItem {
    private product: Product;
    private quantity: number;
    private itemPrice: number;

    constructor(product: Product, quantity: number) {
        this.product = product;
        this.quantity = quantity;
        this.itemPrice = product.getPrice();
    }

    public getProduct(): Product { return this.product; }
    public getQuantity(): number { return this.quantity; }
    public setQuantity(qty: number): void { this.quantity = qty; }
    public calcTotal(): number { return this.itemPrice * this.quantity; }
}

export class Cart {
    private cartId: string;
    private userId: string;
    public items: CartItem[];
    public total: number;

    constructor(cartId: string, userId: string) {
        this.cartId = cartId;
        this.userId = userId;
        this.items = [];
        this.total = 0;
    }

    public addItem(p: Product, qty: number): void {
        const existing = this.items.find(i => i.getProduct().getProductId() === p.getProductId());
        if (existing) {
            existing.setQuantity(existing.getQuantity() + qty);
        } else {
            this.items.push(new CartItem(p, qty));
        }
        this.recalculateTotal();
        if (typeof (window as any).updateCartUI === 'function') (window as any).updateCartUI();
    }

    public removeItem(prodId: string): void {
        this.items = this.items.filter(i => i.getProduct().getProductId() !== prodId);
        this.recalculateTotal();
        if (typeof (window as any).updateCartUI === 'function') (window as any).updateCartUI();
    }

    private recalculateTotal(): void {
        this.total = this.items.reduce((sum, item) => sum + item.calcTotal(), 0);
    }

    public checkout(): DineInOrder | null {
        if (this.items.length === 0) {
            alert("Cart is empty!");
            return null;
        }
        const currentMode = ModeManager.currentMode;
        const order = new DineInOrder("ORD" + Date.now(), "Guest", new Date().toISOString(), "Pending", currentMode, 1, 1);
        order.totalAmount = this.total;

        const payment = new CashPayment("PAY" + Date.now(), this.total, "Completed", this.total);
        if (payment.process()) {
            alert(`Order ${order.getOrderId()} placed successfully! Total: ₱${order.totalAmount.toFixed(2)}`);
            this.items = [];
            this.recalculateTotal();
            if (typeof (window as any).updateCartUI === 'function') (window as any).updateCartUI();
            if (typeof (window as any).toggleCart === 'function') (window as any).toggleCart();
        }
        return order;
    }
}
