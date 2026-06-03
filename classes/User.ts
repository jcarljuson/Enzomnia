export abstract class User {
    protected userId: string;
    protected name: string;
    protected email: string;

    constructor(userId: string, name: string, email: string) {
        this.userId = userId;
        this.name = name;
        this.email = email;
    }

    public abstract login(): boolean;
    public viewOrders(): void {
        console.log("Viewing orders...");
    }
}

export class GuestUser extends User {
    private sessionId: string;

    constructor(userId: string, name: string, email: string, sessionId: string) {
        super(userId, name, email);
        this.sessionId = sessionId;
    }

    public login(): boolean {
        return true;
    }
}

export class RegisteredUser extends User {
    private prefMode: string;

    constructor(userId: string, name: string, email: string, prefMode: string) {
        super(userId, name, email);
        this.prefMode = prefMode;
    }

    public login(): boolean {
        return true;
    }
}
 
