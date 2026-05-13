export interface IPayment {
    process(): boolean;
}

export abstract class Payment implements IPayment {
    protected paymentId: string;
    protected amount: number;
    protected status: string;

    constructor(paymentId: string, amount: number, status: string) {
        this.paymentId = paymentId;
        this.amount = amount;
        this.status = status;
    }

    public abstract process(): boolean;
}

export class CreditCard extends Payment {
    private cardNo: string;

    constructor(paymentId: string, amount: number, status: string, cardNo: string) {
        super(paymentId, amount, status);
        this.cardNo = cardNo;
    }

    public process(): boolean {
        console.log(`Processing credit card ${this.cardNo}...`);
        return true;
    }
}

export class CashPayment extends Payment {
    private cashTender: number;

    constructor(paymentId: string, amount: number, status: string, cashTender: number) {
        super(paymentId, amount, status);
        this.cashTender = cashTender;
    }

    public process(): boolean {
        console.log(`Processing cash payment of ${this.cashTender}...`);
        return true;
    }
}
