import { Product } from './Product';
import { Order } from './Order';

/**
 * FileManager Class
 * Handles file transactions for the Enzomnia Cafe system.
 * Demonstrates serialization and file stream handling in a web environment.
 */
export class FileManager {
    /**
     * TRANSACTION: Writing a human-readable Receipt to a .txt file
     * This creates a Blob and triggers a browser download to simulate file writing.
     */
    public static saveReceipt(order: Order, items: string[]): void {
        const receiptContent = `
====================================
         ENZOMNIA CAFE
    "Try something unique"
====================================
Order ID: ${order.getOrderId()}
Date: ${new Date().toLocaleString()}
${(order as any).tableNo ? `Table No: ${(order as any).tableNo}` : ((order as any).pickupTime ? `Pickup Time: ${(order as any).pickupTime}` : '')}
------------------------------------
ITEMS:
${items.map(item => `- ${item}`).join('\n')}
------------------------------------
TOTAL AMOUNT: ₱${order.totalAmount.toFixed(2)}
====================================
      Thank you for coming!
====================================
        `;

        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `receipt_${order.getOrderId()}.txt`;
        
        console.log(`[File System] Generating file: receipt_${order.getOrderId()}.txt`);
        link.click();
        
        URL.revokeObjectURL(link.href);
    }
}
