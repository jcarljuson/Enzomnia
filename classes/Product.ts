export abstract class Product {
    protected productId: string;
    protected name: string;
    protected price: number;
    protected mode: 'Day' | 'Night' | 'Both';
    protected stock: number;
    protected image: string;

    constructor(productId: string, name: string, price: number, mode: 'Day' | 'Night' | 'Both', stock: number, image: string) {
        this.productId = productId;
        this.name = name;
        this.price = price;
        this.mode = mode;
        this.stock = stock;
        this.image = image;
    }

    public getProductId(): string { return this.productId; }
    public getName(): string { return this.name; }
    public getPrice(): number { return this.price; }
    public getMode(): string { return this.mode; }
    public getStock(): number { return this.stock; }
    public getImage(): string { return this.image; }

    public reduceStock(qty: number): void {
        this.stock -= qty;
    }
}

export class Beverage extends Product {
    private size: string;
    private isHot: boolean;

    constructor(productId: string, name: string, price: number, mode: 'Day' | 'Night' | 'Both', stock: number, image: string, size: string, isHot: boolean) {
        super(productId, name, price, mode, stock, image);
        this.size = size;
        this.isHot = isHot;
    }

    public getSize(): string { return this.size; }
    public getIsHot(): boolean { return this.isHot; }
}

export class FoodItem extends Product {
    private dietType: string;

    constructor(productId: string, name: string, price: number, mode: 'Day' | 'Night' | 'Both', stock: number, image: string, dietType: string) {
        super(productId, name, price, mode, stock, image);
        this.dietType = dietType;
    }

    public getDietType(): string { return this.dietType; }
}
