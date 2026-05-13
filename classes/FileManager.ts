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

    /**
     * TRANSACTION: Serializing Inventory data to a JSON file
     * Converts a list of Product objects into a structured JSON backup.
     */
    public static exportInventory(products: Product[]): void {
        const jsonData = JSON.stringify(products, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'inventory_backup.json';
        
        console.log(`[File System] Backing up inventory to: inventory_backup.json`);
        link.click();
        
        URL.revokeObjectURL(link.href);
    }
}
