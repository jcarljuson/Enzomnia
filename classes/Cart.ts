import { Product, Beverage, FoodItem } from './Product';
import { DineInOrder, PickupOrder, Order } from './Order';
import { CashPayment, CreditCard } from './Payment';
import { ModeManager } from './ModeManager';
import { FileManager } from './FileManager';
import { db, auth } from '../firebase';
import { collection, setDoc, doc, updateDoc, increment } from 'firebase/firestore';

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

    public async finalizeCheckout(data: any): Promise<Order | null> {
        if (this.items.length === 0) {
            alert("Cart is empty!");
            return null;
        }

        const useTokensCb = document.getElementById('use-tokens-checkbox') as HTMLInputElement;
        const isApplyingTokens = useTokensCb ? useTokensCb.checked : false;
        const applicableTokensSpan = document.getElementById('applicable-tokens');
        const tokensRedeemed = isApplyingTokens && applicableTokensSpan ? parseInt(applicableTokensSpan.textContent || '0') : 0;

        const finalAmountPaid = Math.max(0, this.total - tokensRedeemed);

        const currentMode = ModeManager.currentMode;
        const orderId = "ORD" + Date.now();
        const userName = auth.currentUser?.displayName || "Guest";
        
        let order: Order;
        if (data.orderType === 'dinein') {
            order = new DineInOrder(orderId, userName, new Date().toISOString(), "Pending", currentMode, data.tableNo, data.guests);
        } else {
            const pickupTime = data.pickupTime || new Date().toISOString();
            order = new PickupOrder(orderId, userName, new Date().toISOString(), "Pending", currentMode, pickupTime, "");
            (order as PickupOrder).generateQRCode();
        }
        order.totalAmount = finalAmountPaid;

        const paymentId = "PAY" + Date.now();
        let payment;
        if (data.paymentType === 'cash') {
            payment = new CashPayment(paymentId, finalAmountPaid, "Completed", data.cashTender);
        } else {
            payment = new CreditCard(paymentId, finalAmountPaid, "Completed", data.cardNo);
        }

        if (payment.process()) {
            try {
                // Save order to Firestore
                const orderData: any = {
                    orderId: order.getOrderId(),
                    customerName: order.getCustomerName(),
                    orderDate: order.getOrderDateTime(),
                    status: order.getStatus(),
                    mode: order.getModeAtOrder(),
                    orderType: data.orderType,
                    paymentType: data.paymentType,
                    totalAmount: order.totalAmount,
                    originalTotal: this.total,
                    tokensRedeemed: tokensRedeemed,
                    items: this.items.map(i => ({
                        productId: i.getProduct().getProductId(),
                        name: i.getProduct().getName(),
                        quantity: i.getQuantity(),
                        price: i.getProduct().getPrice(),
                        total: i.calcTotal()
                    }))
                };
                if (data.orderType === 'dinein') {
                    orderData.tableNo = data.tableNo;
                    orderData.guests = data.guests;
                } else {
                    orderData.pickupTime = data.pickupTime;
                    orderData.qrCode = "QR_" + order.getOrderId();
                }

                await setDoc(doc(db, "orders", orderId), orderData);
                console.log("Order saved to Firestore:", orderId);

                // Reward/Deduct tokens if user is logged in
                const user = auth.currentUser;
                if (user) {
                    const tokensEarned = Math.floor(finalAmountPaid / 50); // 1 token per 50 spent
                    const netTokens = tokensEarned - tokensRedeemed;
                    if (netTokens !== 0) {
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            tokens: increment(netTokens)
                        });
                        console.log(`Token change: Earned ${tokensEarned}, Redeemed ${tokensRedeemed}. Net: ${netTokens}`);
                    }
                }
                
                if (data.downloadReceipt) {
                    const itemStrings = this.items.map(i => `${i.getProduct().getName()} x${i.getQuantity()} - ₱${i.calcTotal().toFixed(2)}`);
                    FileManager.saveReceipt(order, itemStrings);
                }

            } catch (e) {
                console.error("Error saving order or rewarding tokens:", e);
                alert("Order processed but failed to save to database completely.");
            }

            alert(`Order ${order.getOrderId()} placed successfully! Total: ₱${order.totalAmount.toFixed(2)}`);
            this.items = [];
            this.recalculateTotal();
            if (typeof (window as any).updateCartUI === 'function') (window as any).updateCartUI();
            return order;
        }
        return null;
    }
}
