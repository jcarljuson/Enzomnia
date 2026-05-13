export abstract class Order {
    protected orderId: string;
    protected customerName: string;
    protected orderDateTime: string;
    public totalAmount: number;
    protected status: string;
    protected modeAtOrder: string;

    constructor(orderId: string, customerName: string, orderDateTime: string, status: string, modeAtOrder: string) {
        this.orderId = orderId;
        this.customerName = customerName;
        this.orderDateTime = orderDateTime;
        this.totalAmount = 0;
        this.status = status;
        this.modeAtOrder = modeAtOrder;
    }

    public getOrderId(): string { return this.orderId; }
    public calculateTotal(): number { return this.totalAmount; }
    public displayOrderInfo(): void {
        console.log(`Order ${this.orderId} by ${this.customerName}`);
    }
}

export class DineInOrder extends Order {
    private tableNo: number;
    private guests: number;

    constructor(orderId: string, customerName: string, orderDateTime: string, status: string, modeAtOrder: string, tableNo: number, guests: number) {
        super(orderId, customerName, orderDateTime, status, modeAtOrder);
        this.tableNo = tableNo;
        this.guests = guests;
    }

    public assignTable(table: number): void {
        this.tableNo = table;
    }
}

export class PickupOrder extends Order {
    private pickupTime: string;
    private qrCode: string;

    constructor(orderId: string, customerName: string, orderDateTime: string, status: string, modeAtOrder: string, pickupTime: string, qrCode: string) {
        super(orderId, customerName, orderDateTime, status, modeAtOrder);
        this.pickupTime = pickupTime;
        this.qrCode = qrCode;
    }

    public generateQRCode(): void {
        this.qrCode = "QR_" + this.getOrderId();
    }
}
